import JSZip from 'jszip';
import {
  AssetName,
  BindFamily,
  GamepadType,
  getEntryId,
  REBIND_CATALOG,
  RebindEntryDef,
} from '../data/catalog';
import { formatReadableBinding } from '../components/ControlGlyph';
import { BindingsMap, toPlayerPrefsJson } from './rebindEngine';

export interface DiffItem {
  entry: RebindEntryDef;
  family: BindFamily;
  oldPath: string;
  newPath: string;
}

export const UNITY_ASSET_PATHS: Record<AssetName, string> = {
  InputSystem_Actions: 'Assets/InputSystem_Actions.inputactions',
  'Malbers Inputs':
    'Assets/External/Malbers Animations/Common/Input System/Assets/Malbers Inputs.inputactions',
  VehicleInputActions:
    'Assets/External/NWH/Vehicle Physics 2/Scripts/VehicleController/Input/InputProviders/InputSystem/VehicleInputActions.inputactions',
};

function familyOfBindingPath(path: string | undefined): BindFamily | null {
  if (!path) return null;
  if (
    path.startsWith('<Keyboard>/') ||
    path.startsWith('<Mouse>/') ||
    path.startsWith('<Pointer>/')
  ) {
    return 'KeyboardMouse';
  }
  if (
    path.startsWith('<Gamepad>/') ||
    path.startsWith('<XInputController>/') ||
    path.startsWith('<DualShockGamepad>/')
  ) {
    return 'Gamepad';
  }
  return null;
}

function generateGuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface InputActionBindingJson {
  name: string;
  id: string;
  path: string;
  interactions: string;
  processors: string;
  groups: string;
  action: string;
  isComposite: boolean;
  isPartOfComposite: boolean;
}

interface InputActionMapJson {
  name: string;
  id: string;
  actions: Array<{ name: string; id: string }>;
  bindings: InputActionBindingJson[];
}

interface InputActionAssetJson {
  name: string;
  maps: InputActionMapJson[];
  controlSchemes?: Array<{ name: string; bindingGroup: string }>;
}

function findBindingSlotIndex(
  bindings: InputActionBindingJson[],
  actionName: string,
  family: BindFamily,
  compositePart: string
): number {
  if (compositePart) {
    for (let i = 0; i < bindings.length; i++) {
      const b = bindings[i];
      if (b.action !== actionName || !b.isPartOfComposite) continue;
      if (b.name.toLowerCase() !== compositePart.toLowerCase()) continue;
      if (familyOfBindingPath(b.path) === family) return i;
    }
  }

  for (let i = 0; i < bindings.length; i++) {
    const b = bindings[i];
    if (b.action !== actionName) continue;
    if (b.isComposite || b.isPartOfComposite || b.name === 'RebindAlias') continue;
    if (familyOfBindingPath(b.path) === family) return i;
  }

  return -1;
}

function groupForAsset(asset: InputActionAssetJson, family: BindFamily): string {
  const token = family === 'Gamepad' ? 'Gamepad' : 'Keyboard';
  if (Array.isArray(asset.controlSchemes)) {
    for (const s of asset.controlSchemes) {
      if (s.name && s.name.toLowerCase().includes(token.toLowerCase())) {
        return s.bindingGroup || s.name;
      }
    }
  }
  return family === 'Gamepad' ? 'Gamepad' : 'Keyboard and Mouse';
}

function applySlotToMap(
  asset: InputActionAssetJson,
  map: InputActionMapJson,
  actionName: string,
  family: BindFamily,
  compositePart: string,
  newPath: string,
  defaultPath: string,
  defaultInteractions?: string,
  hasTouchpadAlias?: boolean
): void {
  const slotIdx = findBindingSlotIndex(map.bindings, actionName, family, compositePart);

  if (slotIdx >= 0) {
    const b = map.bindings[slotIdx];
    b.path = newPath;
    if (family === 'Gamepad' && defaultInteractions) {
      const atDefault = newPath.toLowerCase() === defaultPath.toLowerCase();
      b.interactions = atDefault ? defaultInteractions : '';
    }
    if (family === 'Gamepad' && hasTouchpadAlias) {
      const atDefault = newPath.toLowerCase() === defaultPath.toLowerCase();
      for (const other of map.bindings) {
        if (other.action === actionName && other.name === 'RebindAlias') {
          other.path = atDefault ? '<DualShockGamepad>/touchpadButton' : '';
        }
      }
    }
  } else if (newPath) {
    // Action previously had no slot for this family (e.g. SpeedUp, SpeedDown, WeaponAction, Vinyl)
    const groups = groupForAsset(asset, family);
    const newBinding: InputActionBindingJson = {
      name: '',
      id: generateGuid(),
      path: newPath,
      interactions: '',
      processors: '',
      groups,
      action: actionName,
      isComposite: false,
      isPartOfComposite: false,
    };

    // Insert right after the last binding for this action
    let insertAt = map.bindings.length;
    for (let i = map.bindings.length - 1; i >= 0; i--) {
      if (map.bindings[i].action === actionName) {
        insertAt = i + 1;
        break;
      }
    }
    map.bindings.splice(insertAt, 0, newBinding);
  }
}

export async function buildPatchedInputActions(
  bindings: BindingsMap
): Promise<Record<AssetName, { json: string; modifiedCount: number }>> {
  const baseUrl = import.meta.env.BASE_URL || './';
  const assetNames: AssetName[] = [
    'Malbers Inputs',
    'InputSystem_Actions',
    'VehicleInputActions',
  ];

  const results = {} as Record<AssetName, { json: string; modifiedCount: number }>;

  for (const assetName of assetNames) {
    const url = `${baseUrl}inputactions/${encodeURIComponent(assetName)}.inputactions`;
    const resp = await fetch(url);
    const data = (await resp.json()) as InputActionAssetJson;

    let modifiedCount = 0;
    const entriesForAsset = REBIND_CATALOG.filter((e) => e.asset === assetName);

    for (const entry of entriesForAsset) {
      const st = bindings[entry.key];
      if (!st) continue;

      const map = data.maps.find((m) => m.name === entry.map);
      if (!map) continue;

      // Keyboard & Mouse
      if (st.kbm !== entry.defaultKbm) {
        modifiedCount++;
        applySlotToMap(
          data,
          map,
          entry.action,
          'KeyboardMouse',
          entry.compositePart,
          st.kbm,
          entry.defaultKbm
        );
        if (entry.linkedCompositePart) {
          const [linkedAction, linkedPart] = entry.linkedCompositePart.split('/');
          if (linkedAction && linkedPart) {
            applySlotToMap(
              data,
              map,
              linkedAction,
              'KeyboardMouse',
              linkedPart,
              st.kbm,
              entry.defaultKbm
            );
          }
        }
      }

      // Gamepad
      if (st.pad !== entry.defaultPad) {
        modifiedCount++;
        applySlotToMap(
          data,
          map,
          entry.action,
          'Gamepad',
          entry.compositePart,
          st.pad,
          entry.defaultPad,
          entry.defaultPadInteractions,
          entry.hasTouchpadAlias
        );
        if (entry.linkedCompositePart) {
          const [linkedAction, linkedPart] = entry.linkedCompositePart.split('/');
          if (linkedAction && linkedPart) {
            applySlotToMap(
              data,
              map,
              linkedAction,
              'Gamepad',
              linkedPart,
              st.pad,
              entry.defaultPad
            );
          }
        }
      }
    }

    results[assetName] = {
      json: JSON.stringify(data, null, 4),
      modifiedCount,
    };
  }

  return results;
}

export function getAllDiffs(bindings: BindingsMap): DiffItem[] {
  const diffs: DiffItem[] = [];
  for (const entry of REBIND_CATALOG) {
    const st = bindings[entry.key];
    if (!st) continue;
    if (st.pad !== entry.defaultPad) {
      diffs.push({
        entry,
        family: 'Gamepad',
        oldPath: entry.defaultPad,
        newPath: st.pad,
      });
    }
    if (st.kbm !== entry.defaultKbm) {
      diffs.push({
        entry,
        family: 'KeyboardMouse',
        oldPath: entry.defaultKbm,
        newPath: st.kbm,
      });
    }
  }
  return diffs;
}

export function generateMarkdownReport(
  bindings: BindingsMap,
  gamepadType: GamepadType = 'PlayStation',
  lang: 'ru' | 'en' = 'en'
): string {
  const diffs = getAllDiffs(bindings);
  const lines: string[] = [];

  lines.push(
    lang === 'ru'
      ? `# Отчёт по раскладке управления — Lunoris`
      : `# Lunoris Controls Layout Report`
  );
  lines.push(
    lang === 'ru'
      ? `Сгенерировано: ${new Date().toLocaleString('ru-RU')} | Контроллер: ${
          gamepadType === 'PlayStation' ? 'DualSense (PS5)' : 'Xbox Series'
        }`
      : `Generated: ${new Date().toISOString()} | Controller: ${gamepadType}`
  );
  lines.push('');

  if (diffs.length === 0) {
    lines.push(
      lang === 'ru'
        ? `> Изменений относительно дефолтной раскладки нет (все 39 экшенов на стандартных кнопках).`
        : `> No changes relative to the default layout (all 39 actions are at their defaults).`
    );
  } else {
    lines.push(
      lang === 'ru'
        ? `## Изменённые бинды (${diffs.length})`
        : `## Modified Bindings (${diffs.length})`
    );
    lines.push('');
    lines.push(
      lang === 'ru'
        ? `| Секция | Действие | Устройство | Было (Дефолт) | Стало | Unity Action ID |`
        : `| Section | Action | Device | Default | New Binding | Unity Action ID |`
    );
    lines.push(`|---|---|---|---|---|---|`);
    for (const d of diffs) {
      const name = lang === 'ru' ? `${d.entry.labelRu} (${d.entry.labelEn})` : d.entry.labelEn;
      const dev = d.family === 'Gamepad' ? 'Gamepad' : 'Keyboard/Mouse';
      const oldReadable = `${formatReadableBinding(d.oldPath, gamepadType)} (\`${
        d.oldPath || 'unbound'
      }\`)`;
      const newReadable = `**${formatReadableBinding(d.newPath, gamepadType)}** (\`${
        d.newPath || 'unbound'
      }\`)`;
      lines.push(
        `| ${d.entry.section} | ${name} | ${dev} | ${oldReadable} | ${newReadable} | \`${getEntryId(
          d.entry
        )}\` |`
      );
    }
  }

  lines.push('');
  lines.push(
    lang === 'ru'
      ? `## Полная таблица раскладки Геймпада`
      : `## Complete Gamepad Layout Table`
  );
  lines.push('');
  lines.push(
    lang === 'ru'
      ? `| Секция | Ключ | Действие | PS5 (DualSense) | Xbox | Unity Path | Клавиатура/Мышь |`
      : `| Section | Key | Action | PS5 (DualSense) | Xbox | Unity Path | Keyboard/Mouse |`
  );
  lines.push(`|---|---|---|---|---|---|---|`);

  for (const e of REBIND_CATALOG) {
    const st = bindings[e.key] || { kbm: e.defaultKbm, pad: e.defaultPad };
    const changedMark = st.pad !== e.defaultPad ? ' *' : '';
    const label = lang === 'ru' ? `${e.labelRu} / ${e.labelEn}` : e.labelEn;
    lines.push(
      `| ${e.section} | \`${e.key}\` | ${label}${changedMark} | **${formatReadableBinding(
        st.pad,
        'PlayStation'
      )}** | **${formatReadableBinding(st.pad, 'Xbox')}** | \`${
        st.pad || '—'
      }\` | ${formatReadableBinding(st.kbm, gamepadType)} (\`${st.kbm || '—'}\`) |`
    );
  }

  return lines.join('\n');
}

export async function downloadUnityPatchZip(
  bindings: BindingsMap,
  gamepadType: GamepadType = 'PlayStation',
  lang: 'ru' | 'en' = 'en'
): Promise<void> {
  const patched = await buildPatchedInputActions(bindings);
  const zip = new JSZip();

  // Include exact Unity project paths so the archive can be extracted directly over Lunoris_Unity_Project
  for (const [assetName, info] of Object.entries(patched) as Array<
    [AssetName, { json: string; modifiedCount: number }]
  >) {
    const unityRelPath = UNITY_ASSET_PATHS[assetName];
    zip.file(unityRelPath, info.json);
  }

  // Also include the Markdown report and the PlayerPrefs JSON
  const report = generateMarkdownReport(bindings, gamepadType, lang);
  zip.file('CHANGES_REPORT.md', report);

  const prefs = toPlayerPrefsJson(bindings);
  zip.file('Controls_Bindings_PlayerPrefs.json', JSON.stringify(prefs, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBrowserDownload(blob, 'Lunoris_Controls_UnityPatch.zip');
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
