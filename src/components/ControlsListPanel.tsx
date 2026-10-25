import React, { useEffect, useRef } from 'react';
import {
  BindFamily,
  GAMEPAD_CONTROL_OPTIONS,
  GamepadType,
  REBIND_CATALOG,
  RebindEntryDef,
  RebindSection,
  SECTION_ORDER,
  SECTION_TITLES,
} from '../data/catalog';
import { ControlGlyph } from './ControlGlyph';
import {
  BindingsMap,
  getEffectivePath,
  isEntryModified,
  isEntryRebindable,
} from '../services/rebindEngine';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface ControlsListPanelProps {
  family: BindFamily;
  onFamilyChange: (family: BindFamily) => void;
  gamepadType: GamepadType;
  bindings: BindingsMap;
  focusedEntry: RebindEntryDef | null;
  listeningEntry: RebindEntryDef | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sectionFilter: RebindSection | 'ALL';
  onSectionFilterChange: (sec: RebindSection | 'ALL') => void;
  lang: 'ru' | 'en';
  onFocusEntry: (entry: RebindEntryDef | null) => void;
  onStartListening: (entry: RebindEntryDef) => void;
  onCancelListening: () => void;
  onAssignPath: (entry: RebindEntryDef, family: BindFamily, path: string) => void;
  onRevertSingle: (entry: RebindEntryDef, family: BindFamily) => void;
  onResetAll: () => void;
}

export const ControlsListPanel: React.FC<ControlsListPanelProps> = ({
  family,
  onFamilyChange,
  gamepadType,
  bindings,
  focusedEntry,
  listeningEntry,
  searchQuery,
  onSearchChange,
  sectionFilter,
  onSectionFilterChange,
  lang,
  onFocusEntry,
  onStartListening,
  onCancelListening,
  onAssignPath,
  onRevertSingle,
  onResetAll,
}) => {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll focused entry into view when selected from a 3D callout
  useEffect(() => {
    if (!focusedEntry) return;
    const el = rowRefs.current[focusedEntry.key];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedEntry]);

  const toggleFamily = () => {
    if (listeningEntry) return;
    onFamilyChange(family === 'Gamepad' ? 'KeyboardMouse' : 'Gamepad');
  };

  const q = searchQuery.trim().toLowerCase();

  return (
    <div className="controls-panel">
      {/* Device Switcher Row (exact match of ControlsView.SpawnDeviceRow) */}
      <div className="device-switch-row" onClick={toggleFamily}>
        <span className="device-switch-label">
          {lang === 'ru' ? 'Устройство ввода' : 'Device'}
        </span>
        <div className="device-switch-selector">
          <button
            type="button"
            className="device-arrow-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFamily();
            }}
            aria-label="Previous device"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="device-switch-value">
            {family === 'Gamepad'
              ? lang === 'ru'
                ? 'Геймпад (3D)'
                : 'Gamepad'
              : lang === 'ru'
              ? 'Клавиатура и Мышь'
              : 'Keyboard & Mouse'}
          </span>
          <button
            type="button"
            className="device-arrow-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFamily();
            }}
            aria-label="Next device"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Quick Filter & Search Bar */}
      <div className="list-filter-bar">
        <div className="search-input-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              lang === 'ru'
                ? 'Поиск действия (Прыжок, Атака, Дрифт...)'
                : 'Filter actions (Jump, Attack, Drift...)'
            }
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="section-Tabs-scroll">
          <button
            type="button"
            className={`sec-filter-chip ${sectionFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => onSectionFilterChange('ALL')}
          >
            {lang === 'ru' ? 'Все (39)' : 'All (39)'}
          </button>
          {SECTION_ORDER.map((sec) => (
            <button
              key={sec}
              type="button"
              className={`sec-filter-chip ${sectionFilter === sec ? 'active' : ''}`}
              onClick={() => onSectionFilterChange(sec)}
            >
              {lang === 'ru' ? SECTION_TITLES[sec].ru.split(' ')[0] : SECTION_TITLES[sec].en}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Rebind List */}
      <div className="rebind-scroll-list">
        {SECTION_ORDER.map((section) => {
          if (sectionFilter !== 'ALL' && sectionFilter !== section) return null;

          const entries = REBIND_CATALOG.filter((e) => {
            if (e.section !== section) return false;
            if (!q) return true;
            return (
              e.labelRu.toLowerCase().includes(q) ||
              e.labelEn.toLowerCase().includes(q) ||
              e.key.toLowerCase().includes(q)
            );
          });

          if (entries.length === 0) return null;

          const secInfo = SECTION_TITLES[section];

          return (
            <div key={section} className="rebind-section-block">
              <div className="rebind-section-header">
                <span className="section-header-title">
                  {lang === 'ru' ? secInfo.ru : secInfo.en}
                </span>
                <span className="section-header-subtitle">
                  {lang === 'ru' ? secInfo.subtitleRu : secInfo.subtitleEn}
                </span>
              </div>

              <div className="rebind-rows-group">
                {entries.map((entry) => {
                  const isFocused = focusedEntry?.key === entry.key;
                  const isListening = listeningEntry?.key === entry.key;
                  const canRebind = isEntryRebindable(entry, family);
                  const currentPath = getEffectivePath(entry, family, bindings);
                  const modified = isEntryModified(entry, bindings, family);
                  const note = lang === 'ru' ? entry.noteRu : entry.noteEn;

                  return (
                    <div
                      key={entry.key}
                      ref={(el) => {
                        rowRefs.current[entry.key] = el;
                      }}
                      className={`rebind-row-wrapper ${isFocused ? 'focused' : ''} ${
                        isListening ? 'listening' : ''
                      } ${!canRebind ? 'readonly' : ''} ${
                        modified ? 'modified' : ''
                      }`}
                      onMouseEnter={() => {
                        if (!listeningEntry) onFocusEntry(entry);
                      }}
                    >
                      <div
                        className="rebind-row-main"
                        onClick={() => {
                          onFocusEntry(entry);
                          if (!canRebind) return;
                          if (isListening) {
                            onCancelListening();
                          } else {
                            onStartListening(entry);
                          }
                        }}
                      >
                        <div className="rebind-row-left">
                          <div className="rebind-label-line">
                            <span className="rebind-label-primary">
                              {lang === 'ru' ? entry.labelRu : entry.labelEn}
                            </span>
                            {lang === 'ru' && (
                              <span className="rebind-label-secondary">
                                {entry.labelEn}
                              </span>
                            )}
                            {modified && (
                              <span
                                className="modified-dot"
                                title={
                                  lang === 'ru'
                                    ? 'Изменено относительно дефолта'
                                    : 'Modified from default'
                                }
                              />
                            )}
                          </div>
                          {note && <span className="rebind-row-note">{note}</span>}
                        </div>

                        <div className="rebind-row-right">
                          {isListening ? (
                            <div className="listening-badge">
                              <Sparkles size={14} className="spin-pulse" />
                              <span>
                                {family === 'Gamepad'
                                  ? lang === 'ru'
                                    ? 'Нажмите кнопку или кликните 3D...'
                                    : 'Press button or click 3D...'
                                  : lang === 'ru'
                                  ? 'Нажмите клавишу / мышь...'
                                  : 'Press any key / mouse...'}
                              </span>
                            </div>
                          ) : (
                            <div className="rebind-glyph-slot">
                              <ControlGlyph
                                path={currentPath}
                                gamepadType={gamepadType}
                                size="md"
                                dimmed={!canRebind}
                              />
                              {!canRebind && (
                                <span
                                  className="readonly-lock-icon"
                                  title={
                                    lang === 'ru'
                                      ? 'Направление стика/скролла не переназначается'
                                      : 'Stick direction / scroll cannot be reassigned'
                                  }
                                >
                                  <Lock size={12} />
                                </span>
                              )}
                            </div>
                          )}

                          {/* Quick revert button when modified */}
                          {modified && !isListening && (
                            <button
                              type="button"
                              className="row-quick-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRevertSingle(entry, family);
                              }}
                              title={
                                lang === 'ru'
                                  ? 'Сбросить на дефолтную кнопку'
                                  : 'Reset to default button'
                              }
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline Quick-Pick Palette while Listening (so user can also pick any button with 1 click) */}
                      {isListening && family === 'Gamepad' && (
                        <div
                          className="inline-button-picker"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-picker-header">
                            <span>
                              {lang === 'ru'
                                ? 'Быстрый выбор кнопки геймпада (или кликните по 3D-модели справа):'
                                : 'Quick-select gamepad button (or click on the 3D controller):'}
                            </span>
                            <div className="inline-picker-tools">
                              {currentPath && (
                                <button
                                  type="button"
                                  className="picker-tool-btn danger"
                                  onClick={() => onAssignPath(entry, 'Gamepad', '')}
                                >
                                  <Trash2 size={12} />
                                  <span>
                                    {lang === 'ru' ? 'Очистить' : 'Unbind'}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="picker-tool-btn"
                                onClick={onCancelListening}
                              >
                                <X size={12} />
                                <span>{lang === 'ru' ? 'Отмена' : 'Cancel'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="inline-picker-chips">
                            {GAMEPAD_CONTROL_OPTIONS.map((opt) => {
                              const isCurrent =
                                currentPath.toLowerCase() === opt.path.toLowerCase();
                              return (
                                <button
                                  key={opt.path}
                                  type="button"
                                  className={`picker-chip ${isCurrent ? 'current' : ''}`}
                                  onClick={() =>
                                    onAssignPath(entry, 'Gamepad', opt.path)
                                  }
                                  title={lang === 'ru' ? opt.descRu : opt.descEn}
                                >
                                  <ControlGlyph
                                    path={opt.path}
                                    gamepadType={gamepadType}
                                    size="sm"
                                  />
                                  <span>
                                    {gamepadType === 'PlayStation'
                                      ? opt.labelPs
                                      : opt.labelXbox}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Authored last row of the list ("Reset to defaults") just like ControlsView.cs */}
        <div className="reset-defaults-row">
          <button
            type="button"
            className="btn-reset-all"
            onClick={onResetAll}
          >
            <RotateCcw size={15} />
            <span>
              {lang === 'ru'
                ? 'Сбросить все настройки по умолчанию (Reset to defaults)'
                : 'Reset to defaults'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
