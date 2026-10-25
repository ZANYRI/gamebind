import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BindFamily,
  contextOfSection,
  GamepadType,
  RebindEntryDef,
  RebindSection,
} from './data/catalog';
import {
  applyBindingChange,
  BindingsMap,
  ConflictChoice,
  createDefaultBindings,
  domKeyboardEventToUnityPath,
  domMouseButtonToUnityPath,
  encodeBindingsToUrlHash,
  evaluateAssignment,
  loadBindingsFromStorage,
  PendingCaptureResult,
  resolveConflictBinding,
  saveBindingsToStorage,
} from './services/rebindEngine';
import { getAllDiffs, downloadUnityPatchZip } from './services/unityExporter';
import { ControlsListPanel } from './components/ControlsListPanel';
import { GamepadStage3D } from './components/GamepadStage3D';
import { ConflictModal } from './components/ConflictModal';
import { PartInspectorModal } from './components/PartInspectorModal';
import { ExportPatchModal } from './components/ExportPatchModal';
import { formatReadableBinding } from './components/ControlGlyph';
import {
  Check,
  Download,
  FolderArchive,
  Gamepad2,
  Globe,
  Link2,
  RotateCcw,
} from 'lucide-react';

export function App() {
  const [bindings, setBindings] = useState<BindingsMap>(() =>
    loadBindingsFromStorage()
  );
  const [family, setFamily] = useState<BindFamily>('Gamepad');
  const [gamepadType, setGamepadType] = useState<GamepadType>('PlayStation');
  const [lang, setLang] = useState<'ru' | 'en'>('en');

  const [focusedEntry, setFocusedEntry] = useState<RebindEntryDef | null>(null);
  const [listeningEntry, setListeningEntry] = useState<RebindEntryDef | null>(
    null
  );
  const [flashedBindingPath, setFlashedBindingPath] = useState<string | null>(
    null
  );
  const [activeContext, setActiveContext] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<RebindSection | 'ALL'>(
    'ALL'
  );

  // Modals
  const [pendingConflict, setPendingConflict] =
    useState<PendingCaptureResult | null>(null);
  const [inspectedPart, setInspectedPart] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; tone?: 'info' | 'warn' | 'ok' } | null>(
    null
  );

  const showToast = useCallback(
    (text: string, tone: 'info' | 'warn' | 'ok' = 'info') => {
      setToast({ text, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Persist changes to localStorage
  useEffect(() => {
    saveBindingsToStorage(bindings);
  }, [bindings]);

  // Sync 3D callout context with the focused entry's section (exact GamepadLayoutPanel.ApplyFocus behavior)
  const handleFocusEntry = useCallback((entry: RebindEntryDef | null) => {
    setFocusedEntry(entry);
    if (entry) {
      setActiveContext(contextOfSection(entry.section));
    }
  }, []);

  const triggerFlash = useCallback((path: string) => {
    setFlashedBindingPath(null);
    setTimeout(() => setFlashedBindingPath(path), 10);
  }, []);

  // Core assignment handler (used by 3D click, physical gamepad press, inline picker, and keyboard/mouse capture)
  const handleAssignPath = useCallback(
    (entry: RebindEntryDef, targetFamily: BindFamily, newPath: string) => {
      setListeningEntry(null);

      // Empty path = explicit unbind
      if (newPath === '') {
        setBindings((prev) => applyBindingChange(prev, entry, targetFamily, ''));
        showToast(
          lang === 'ru'
            ? `Кнопка снята с «${entry.labelRu}»`
            : `Unbound "${entry.labelEn}"`,
          'info'
        );
        return;
      }

      const result = evaluateAssignment(entry, targetFamily, newPath, bindings);

      switch (result.status) {
        case 'Reserved':
          showToast(
            lang === 'ru'
              ? 'Эта кнопка зарезервирована (Start / Esc / WASD)'
              : 'That key is reserved',
            'warn'
          );
          return;

        case 'NotRebindable':
          showToast(
            lang === 'ru'
              ? 'Направления стиков не переназначаются'
              : "Stick directions can't be reassigned",
            'warn'
          );
          return;

        case 'Unchanged':
          triggerFlash(newPath);
          return;

        case 'Conflict':
          setPendingConflict(result);
          return;

        case 'Applied': {
          setBindings((prev) =>
            applyBindingChange(prev, entry, targetFamily, newPath)
          );
          triggerFlash(newPath);
          const readable = formatReadableBinding(newPath, gamepadType);
          showToast(
            lang === 'ru'
              ? `«${entry.labelRu}» → ${readable}`
              : `"${entry.labelEn}" → ${readable}`,
            'ok'
          );
          return;
        }
      }
    },
    [bindings, gamepadType, lang, showToast, triggerFlash]
  );

  // Keyboard & Mouse capture listener while listeningEntry is active
  useEffect(() => {
    if (!listeningEntry) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setListeningEntry(null);
        return;
      }
      if (family !== 'KeyboardMouse') return;
      e.preventDefault();
      e.stopPropagation();
      const path = domKeyboardEventToUnityPath(e);
      if (path) {
        handleAssignPath(listeningEntry, 'KeyboardMouse', path);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (family !== 'KeyboardMouse') return;
      // Only capture middle / right / side mouse buttons globally, or left click if inside listening badge
      if (e.button >= 1) {
        e.preventDefault();
        e.stopPropagation();
        const path = domMouseButtonToUnityPath(e.button);
        if (path) {
          handleAssignPath(listeningEntry, 'KeyboardMouse', path);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('mousedown', onMouseDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('mousedown', onMouseDown, true);
    };
  }, [listeningEntry, family, handleAssignPath]);

  const handleResolveConflict = useCallback(
    (choice: ConflictChoice) => {
      if (!pendingConflict) return;
      if (choice !== 'Cancel') {
        setBindings((prev) =>
          resolveConflictBinding(prev, pendingConflict, choice)
        );
        triggerFlash(pendingConflict.path);
      }
      setPendingConflict(null);
    },
    [pendingConflict, triggerFlash]
  );

  // When user clicks a 3D button on the controller
  const handlePartClicked = useCallback(
    (partPath: string, defaultBindingPath: string) => {
      if (listeningEntry) {
        if (partPath === 'start') {
          setListeningEntry(null);
          showToast(
            lang === 'ru'
              ? 'Захват отменён (Start зарезервирован)'
              : 'Capture cancelled (Start is reserved)',
            'info'
          );
          return;
        }
        handleAssignPath(listeningEntry, 'Gamepad', defaultBindingPath);
        return;
      }
      // Otherwise open the 3D Button Inspector Modal so user can see/assign actions to this 3D part
      setInspectedPart(partPath);
    },
    [listeningEntry, handleAssignPath, lang, showToast]
  );

  const handlePhysicalGamepadCapture = useCallback(
    (bindingPath: string) => {
      if (!listeningEntry) return;
      if (bindingPath === '<Gamepad>/start') {
        setListeningEntry(null);
        return;
      }
      handleAssignPath(listeningEntry, 'Gamepad', bindingPath);
    },
    [listeningEntry, handleAssignPath]
  );

  const handleRevertSingle = useCallback(
    (entry: RebindEntryDef, targetFamily: BindFamily) => {
      const defPath =
        targetFamily === 'Gamepad' ? entry.defaultPad : entry.defaultKbm;
      setBindings((prev) =>
        applyBindingChange(prev, entry, targetFamily, defPath)
      );
      if (defPath) triggerFlash(defPath);
    },
    [triggerFlash]
  );

  const handleResetAll = useCallback(() => {
    setListeningEntry(null);
    setBindings(createDefaultBindings());
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
    showToast(
      lang === 'ru'
        ? 'Все бинды сброшены к стандартным настройкам игры'
        : 'All bindings reset to defaults',
      'info'
    );
  }, [lang, showToast]);

  const handleCopyShareLink = useCallback(async () => {
    const hash = encodeBindingsToUrlHash(bindings);
    const url = window.location.origin + window.location.pathname + hash;
    try {
      await navigator.clipboard.writeText(url);
      showToast(
        lang === 'ru'
          ? 'Ссылка с текущей раскладкой скопирована в буфер обмена!'
          : 'Shareable layout URL copied to clipboard!',
        'ok'
      );
    } catch {
      showToast(url, 'info');
    }
  }, [bindings, lang, showToast]);

  const diffsCount = useMemo(() => getAllDiffs(bindings).length, [bindings]);

  return (
    <div className="app-shell">
      {/* Top Studio Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo-orb">
            <Gamepad2 size={20} />
          </div>
          <div>
            <div className="brand-title-row">
              <h1>LUNORIS — CONTROLS &amp; REBIND STUDIO</h1>
              <span className="brand-tag">3D Configurator</span>
            </div>
            <p className="brand-subtitle">
              {lang === 'ru'
                ? 'Интерактивная 3D-настройка управления и генератор патчей .inputactions для Unity'
                : 'Interactive 3D gamepad keybinding configurator & Unity .inputactions patch generator'}
            </p>
          </div>
        </div>

        <div className="header-actions">
          {diffsCount > 0 && (
            <button
              type="button"
              className="header-diff-pill"
              onClick={() => setExportModalOpen(true)}
            >
              <span className="diff-pill-dot" />
              <span>
                {lang === 'ru'
                  ? `Изменено биндов: ${diffsCount}`
                  : `${diffsCount} modified`}
              </span>
            </button>
          )}

          <button
            type="button"
            className="btn-header-ghost"
            onClick={() => setLang((l) => (l === 'ru' ? 'en' : 'ru'))}
            title="Switch Language (RU / EN)"
          >
            <Globe size={15} />
            <span>{lang === 'ru' ? 'RU / EN' : 'EN / RU'}</span>
          </button>

          <button
            type="button"
            className="btn-header-ghost"
            onClick={handleCopyShareLink}
            title={
              lang === 'ru'
                ? 'Скопировать ссылку с зашитым конфигом'
                : 'Copy shareable URL with encoded config'
            }
          >
            <Link2 size={15} />
            <span>{lang === 'ru' ? 'Ссылка' : 'Share URL'}</span>
          </button>

          <button
            type="button"
            className="btn-header-ghost"
            onClick={handleResetAll}
            disabled={diffsCount === 0}
            title={
              lang === 'ru'
                ? 'Сбросить все изменения к дефолту'
                : 'Reset all bindings to default'
            }
          >
            <RotateCcw size={15} />
            <span>{lang === 'ru' ? 'Сброс' : 'Reset'}</span>
          </button>

          <button
            type="button"
            className="btn-header-secondary"
            onClick={() => downloadUnityPatchZip(bindings, gamepadType, lang)}
            title={
              lang === 'ru'
                ? 'Быстро скачать ZIP с пропатченными .inputactions и отчётом'
                : 'Quick download Unity .inputactions patch ZIP'
            }
          >
            <Download size={15} />
            <span>{lang === 'ru' ? 'Скачать .ZIP патч' : 'Download .ZIP'}</span>
          </button>

          <button
            type="button"
            className="btn-primary-glow"
            onClick={() => setExportModalOpen(true)}
          >
            <FolderArchive size={16} />
            <span>
              {lang === 'ru' ? 'Экспорт в Unity / Отчёт' : 'Unity Export & Diff'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace: Left = Controls List, Right = 3D Gamepad Stage */}
      <main className="app-workspace">
        <ControlsListPanel
          family={family}
          onFamilyChange={setFamily}
          gamepadType={gamepadType}
          bindings={bindings}
          focusedEntry={focusedEntry}
          listeningEntry={listeningEntry}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sectionFilter={sectionFilter}
          onSectionFilterChange={setSectionFilter}
          lang={lang}
          onFocusEntry={handleFocusEntry}
          onStartListening={(entry) => {
            handleFocusEntry(entry);
            setListeningEntry(entry);
          }}
          onCancelListening={() => setListeningEntry(null)}
          onAssignPath={handleAssignPath}
          onRevertSingle={handleRevertSingle}
          onResetAll={handleResetAll}
        />

        <GamepadStage3D
          gamepadType={gamepadType}
          onGamepadTypeChange={setGamepadType}
          bindings={bindings}
          focusedEntry={focusedEntry}
          listeningEntry={listeningEntry}
          flashedBindingPath={flashedBindingPath}
          activeContext={activeContext}
          onContextChange={setActiveContext}
          lang={lang}
          onPartClicked={handlePartClicked}
          onSelectEntryFromCallout={(entry, startRebind) => {
            handleFocusEntry(entry);
            if (startRebind) {
              setFamily('Gamepad');
              setListeningEntry(entry);
            }
          }}
          onPhysicalGamepadCapture={handlePhysicalGamepadCapture}
        />
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`studio-toast toast-${toast.tone || 'info'}`}>
          {toast.tone === 'ok' && <Check size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Conflict Resolution Modal (Swap / Replace / Share / Cancel) */}
      <ConflictModal
        pending={pendingConflict}
        gamepadType={gamepadType}
        lang={lang}
        onResolve={handleResolveConflict}
      />

      {/* 3D Part Inspector & Quick-Bind Modal */}
      <PartInspectorModal
        partPath={inspectedPart}
        gamepadType={gamepadType}
        bindings={bindings}
        lang={lang}
        onClose={() => setInspectedPart(null)}
        onAssignEntryToPart={(entry, path) => {
          setInspectedPart(null);
          handleFocusEntry(entry);
          handleAssignPath(entry, 'Gamepad', path);
        }}
        onUnbindEntry={(entry) => {
          handleAssignPath(entry, 'Gamepad', '');
        }}
      />

      {/* Unity Patch Export & Diff Report Modal */}
      <ExportPatchModal
        open={exportModalOpen}
        bindings={bindings}
        gamepadType={gamepadType}
        lang={lang}
        onClose={() => setExportModalOpen(false)}
        onRevertEntry={handleRevertSingle}
        onImportBindings={(next) => {
          setBindings(next);
          showToast(
            lang === 'ru'
              ? 'Раскладка успешно импортирована из JSON'
              : 'Layout imported from JSON',
            'ok'
          );
        }}
      />
    </div>
  );
}

export default App;
