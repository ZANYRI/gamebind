import {
  BindFamily,
  conflictGroupOfSection,
  getEntryId,
  REBIND_CATALOG,
  RebindEntryDef,
} from '../data/catalog';

export interface EntryBindingState {
  kbm: string; // "" means unbound
  pad: string; // "" means unbound
}

export type BindingsMap = Record<string, EntryBindingState>;

export type CaptureStatus =
  | 'Applied'
  | 'Unchanged'
  | 'Conflict'
  | 'Reserved'
  | 'NotRebindable'
  | 'Cancelled';

export type ConflictChoice = 'Swap' | 'Replace' | 'Share' | 'Cancel';

export interface PendingCaptureResult {
  status: CaptureStatus;
  family: BindFamily;
  path: string;
  entry: RebindEntryDef;
  conflictsWith: RebindEntryDef[];
}

const STORAGE_KEY = 'lunoris_gamebind_state_v1';

const RESERVED_ALWAYS = [
  '<Keyboard>/escape',
  '<Keyboard>/enter',
  '<Keyboard>/numpadEnter',
  '<Gamepad>/start',
];

const RESERVED_FOR_CHARACTER = [
  '<Keyboard>/w',
  '<Keyboard>/a',
  '<Keyboard>/s',
  '<Keyboard>/d',
  '<Keyboard>/upArrow',
  '<Keyboard>/downArrow',
  '<Keyboard>/leftArrow',
  '<Keyboard>/rightArrow',
];

export function createDefaultBindings(): BindingsMap {
  const map: BindingsMap = {};
  for (const entry of REBIND_CATALOG) {
    map[entry.key] = {
      kbm: entry.defaultKbm,
      pad: entry.defaultPad,
    };
  }
  return map;
}

export function isEntryRebindable(entry: RebindEntryDef, family: BindFamily): boolean {
  if (family === 'Gamepad' && entry.gamepadReadOnly) return false;
  if (family === 'KeyboardMouse' && entry.keyboardReadOnly) return false;
  const authored = family === 'Gamepad' ? entry.defaultPad : entry.defaultKbm;
  if (authored && authored.toLowerCase().includes('stick/')) return false;
  return true;
}

export function isPathReserved(entry: RebindEntryDef, path: string): boolean {
  const lower = path.toLowerCase();
  if (RESERVED_ALWAYS.some((r) => r.toLowerCase() === lower)) return true;
  if (entry.section !== 'Car') {
    if (RESERVED_FOR_CHARACTER.some((r) => r.toLowerCase() === lower)) return true;
  }
  return false;
}

export function getEffectivePath(
  entry: RebindEntryDef,
  family: BindFamily,
  bindings: BindingsMap
): string {
  const st = bindings[entry.key];
  if (!st) return family === 'Gamepad' ? entry.defaultPad : entry.defaultKbm;
  return family === 'Gamepad' ? st.pad : st.kbm;
}

export function isEntryModified(
  entry: RebindEntryDef,
  bindings: BindingsMap,
  family?: BindFamily
): boolean {
  const st = bindings[entry.key];
  if (!st) return false;
  if (family === 'Gamepad') return st.pad !== entry.defaultPad;
  if (family === 'KeyboardMouse') return st.kbm !== entry.defaultKbm;
  return st.pad !== entry.defaultPad || st.kbm !== entry.defaultKbm;
}

export function findConflicts(
  self: RebindEntryDef,
  family: BindFamily,
  path: string,
  bindings: BindingsMap
): RebindEntryDef[] {
  if (!path) return [];
  const group = conflictGroupOfSection(self.section);
  const lower = path.toLowerCase();
  const list: RebindEntryDef[] = [];

  for (const other of REBIND_CATALOG) {
    if (other.key === self.key) continue;
    if (conflictGroupOfSection(other.section) !== group) continue;
    const otherPath = getEffectivePath(other, family, bindings);
    if (otherPath && otherPath.toLowerCase() === lower) {
      list.push(other);
    }
  }
  return list;
}

export function evaluateAssignment(
  entry: RebindEntryDef,
  family: BindFamily,
  path: string,
  bindings: BindingsMap
): PendingCaptureResult {
  if (!isEntryRebindable(entry, family)) {
    return { status: 'NotRebindable', family, path, entry, conflictsWith: [] };
  }
  if (path && isPathReserved(entry, path)) {
    return { status: 'Reserved', family, path, entry, conflictsWith: [] };
  }

  const current = getEffectivePath(entry, family, bindings);
  if (current.toLowerCase() === path.toLowerCase()) {
    return { status: 'Unchanged', family, path, entry, conflictsWith: [] };
  }

  const conflicts = findConflicts(entry, family, path, bindings);
  if (conflicts.length > 0) {
    return { status: 'Conflict', family, path, entry, conflictsWith: conflicts };
  }

  return { status: 'Applied', family, path, entry, conflictsWith: [] };
}

export function applyBindingChange(
  bindings: BindingsMap,
  entry: RebindEntryDef,
  family: BindFamily,
  newPath: string
): BindingsMap {
  const next = { ...bindings };
  const current = next[entry.key] || { kbm: entry.defaultKbm, pad: entry.defaultPad };
  next[entry.key] = {
    ...current,
    [family === 'Gamepad' ? 'pad' : 'kbm']: newPath,
  };
  return next;
}

export function resolveConflictBinding(
  bindings: BindingsMap,
  pending: PendingCaptureResult,
  choice: ConflictChoice
): BindingsMap {
  if (choice === 'Cancel' || pending.status !== 'Conflict') return bindings;

  let next = { ...bindings };
  const previousPath = getEffectivePath(pending.entry, pending.family, bindings) ?? '';

  if (choice === 'Swap') {
    // Swap with the first conflicting entry
    const target = pending.conflictsWith[0];
    if (target) {
      next = applyBindingChange(next, target, pending.family, previousPath);
    }
  } else if (choice === 'Replace') {
    // Unbind all conflicting entries in this group
    for (const conflict of pending.conflictsWith) {
      next = applyBindingChange(next, conflict, pending.family, '');
    }
  }
  // If 'Share', we keep the existing binding on the conflicting entries and also bind pending.entry
  next = applyBindingChange(next, pending.entry, pending.family, pending.path);
  return next;
}

// ============================================================================
// Persistence (LocalStorage, URL Hash, PlayerPrefs JSON)
// ============================================================================

export interface PlayerPrefsSavedItem {
  id: string;
  kbm: string;
  pad: string;
}

export interface PlayerPrefsSavedPayload {
  v: number;
  items: PlayerPrefsSavedItem[];
}

export function toPlayerPrefsJson(bindings: BindingsMap): PlayerPrefsSavedPayload {
  const items: PlayerPrefsSavedItem[] = [];
  for (const entry of REBIND_CATALOG) {
    const st = bindings[entry.key];
    if (!st) continue;
    const kbmChanged = st.kbm !== entry.defaultKbm;
    const padChanged = st.pad !== entry.defaultPad;
    if (!kbmChanged && !padChanged) continue;

    items.push({
      id: getEntryId(entry),
      kbm: kbmChanged ? (st.kbm === '' ? '-' : st.kbm) : '',
      pad: padChanged ? (st.pad === '' ? '-' : st.pad) : '',
    });
  }
  return { v: 1, items };
}

export function fromPlayerPrefsJson(payload: PlayerPrefsSavedPayload): BindingsMap {
  const map = createDefaultBindings();
  if (!payload || !Array.isArray(payload.items)) return map;

  const byId = new Map<string, RebindEntryDef>();
  const byKey = new Map<string, RebindEntryDef>();
  for (const e of REBIND_CATALOG) {
    byId.set(getEntryId(e).toLowerCase(), e);
    byKey.set(e.key.toLowerCase(), e);
  }

  for (const item of payload.items) {
    if (!item || !item.id) continue;
    const entry =
      byId.get(item.id.toLowerCase()) || byKey.get(item.id.toLowerCase());
    if (!entry) continue;

    if (item.kbm) {
      map[entry.key].kbm = item.kbm === '-' ? '' : item.kbm;
    }
    if (item.pad) {
      map[entry.key].pad = item.pad === '-' ? '' : item.pad;
    }
  }
  return map;
}

export function encodeBindingsToUrlHash(bindings: BindingsMap): string {
  const compact: Record<string, [string?, string?]> = {};
  let hasAny = false;
  for (const entry of REBIND_CATALOG) {
    const st = bindings[entry.key];
    if (!st) continue;
    const kDiff = st.kbm !== entry.defaultKbm;
    const pDiff = st.pad !== entry.defaultPad;
    if (kDiff || pDiff) {
      hasAny = true;
      compact[entry.key] = [
        kDiff ? (st.kbm === '' ? '-' : st.kbm) : undefined,
        pDiff ? (st.pad === '' ? '-' : st.pad) : undefined,
      ];
    }
  }
  if (!hasAny) return '';
  try {
    const json = JSON.stringify(compact);
    const b64 = btoa(encodeURIComponent(json));
    return `#cfg=${b64}`;
  } catch {
    return '';
  }
}

export function decodeBindingsFromUrlHash(hash: string): BindingsMap | null {
  if (!hash || !hash.includes('cfg=')) return null;
  try {
    const idx = hash.indexOf('cfg=');
    const b64 = hash.substring(idx + 4).split('&')[0];
    const json = decodeURIComponent(atob(b64));
    const compact = JSON.parse(json) as Record<string, [string?, string?]>;
    const map = createDefaultBindings();
    for (const entry of REBIND_CATALOG) {
      const pair = compact[entry.key];
      if (!pair) continue;
      if (pair[0] !== undefined && pair[0] !== null) {
        map[entry.key].kbm = pair[0] === '-' ? '' : pair[0];
      }
      if (pair[1] !== undefined && pair[1] !== null) {
        map[entry.key].pad = pair[1] === '-' ? '' : pair[1];
      }
    }
    return map;
  } catch {
    return null;
  }
}

export function saveBindingsToStorage(bindings: BindingsMap): void {
  try {
    const payload = toPlayerPrefsJson(bindings);
    if (payload.items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // ignore storage errors
  }
}

export function loadBindingsFromStorage(): BindingsMap {
  // First check URL hash if someone shared a config link!
  if (typeof window !== 'undefined' && window.location.hash.includes('cfg=')) {
    const fromHash = decodeBindingsFromUrlHash(window.location.hash);
    if (fromHash) return fromHash;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultBindings();
    return fromPlayerPrefsJson(JSON.parse(raw));
  } catch {
    return createDefaultBindings();
  }
}

// ============================================================================
// Keyboard & Mouse Event Helper
// ============================================================================

export function domKeyboardEventToUnityPath(e: KeyboardEvent): string | null {
  const code = e.code;
  if (!code) return null;

  if (code === 'Escape') return '<Keyboard>/escape';
  if (code === 'Space') return '<Keyboard>/space';
  if (code === 'Tab') return '<Keyboard>/tab';
  if (code === 'Enter') return '<Keyboard>/enter';
  if (code === 'NumpadEnter') return '<Keyboard>/numpadEnter';
  if (code === 'Backspace') return '<Keyboard>/backspace';
  if (code === 'Backslash') return '<Keyboard>/backslash';
  if (code === 'Slash') return '<Keyboard>/slash';
  if (code === 'Comma') return '<Keyboard>/comma';
  if (code === 'Period') return '<Keyboard>/period';
  if (code === 'Semicolon') return '<Keyboard>/semicolon';
  if (code === 'Quote') return '<Keyboard>/quote';
  if (code === 'BracketLeft') return '<Keyboard>/leftBracket';
  if (code === 'BracketRight') return '<Keyboard>/rightBracket';
  if (code === 'Minus') return '<Keyboard>/minus';
  if (code === 'Equal') return '<Keyboard>/equals';
  if (code === 'Backquote') return '<Keyboard>/backquote';

  if (code === 'ShiftLeft' || code === 'ShiftRight') return '<Keyboard>/shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return '<Keyboard>/ctrl';
  if (code === 'AltLeft' || code === 'AltRight') return '<Keyboard>/alt';
  if (code === 'CapsLock') return '<Keyboard>/capsLock';

  if (code === 'ArrowUp') return '<Keyboard>/upArrow';
  if (code === 'ArrowDown') return '<Keyboard>/downArrow';
  if (code === 'ArrowLeft') return '<Keyboard>/leftArrow';
  if (code === 'ArrowRight') return '<Keyboard>/rightArrow';

  if (code.startsWith('Key') && code.length === 4) {
    return `<Keyboard>/${code.substring(3).toLowerCase()}`;
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return `<Keyboard>/${code.substring(5)}`;
  }
  if (/^F\d+$/.test(code)) {
    return `<Keyboard>/${code.toLowerCase()}`;
  }

  return null;
}

export function domMouseButtonToUnityPath(button: number): string | null {
  switch (button) {
    case 0:
      return '<Mouse>/leftButton';
    case 1:
      return '<Mouse>/middleButton';
    case 2:
      return '<Mouse>/rightButton';
    case 3:
      return '<Mouse>/backButton';
    case 4:
      return '<Mouse>/forwardButton';
    default:
      return null;
  }
}
