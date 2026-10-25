import React, { useMemo, useState } from 'react';
import {
  GamepadType,
  partPathFor,
  REBIND_CATALOG,
  RebindEntryDef,
  SECTION_ORDER,
  SECTION_TITLES,
} from '../data/catalog';
import { ControlGlyph, formatReadableBinding } from './ControlGlyph';
import {
  BindingsMap,
  getEffectivePath,
  isEntryRebindable,
} from '../services/rebindEngine';
import { partToDefaultBindingPath } from './GamepadStage3D';
import { Check, Gamepad2, Plus, Search, Trash2, X } from 'lucide-react';

interface PartInspectorModalProps {
  partPath: string | null;
  gamepadType: GamepadType;
  bindings: BindingsMap;
  lang: 'ru' | 'en';
  onClose: () => void;
  onAssignEntryToPart: (entry: RebindEntryDef, bindingPath: string) => void;
  onUnbindEntry: (entry: RebindEntryDef) => void;
}

export const PartInspectorModal: React.FC<PartInspectorModalProps> = ({
  partPath,
  gamepadType,
  bindings,
  lang,
  onClose,
  onAssignEntryToPart,
  onUnbindEntry,
}) => {
  const [search, setSearch] = useState('');

  const bindingPath = useMemo(
    () => (partPath ? partToDefaultBindingPath(partPath) : ''),
    [partPath]
  );

  const boundEntries = useMemo(() => {
    if (!partPath) return [];
    return REBIND_CATALOG.filter((e) => {
      const eff = getEffectivePath(e, 'Gamepad', bindings);
      return partPathFor(eff) === partPath;
    });
  }, [partPath, bindings]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REBIND_CATALOG.filter((e) => {
      if (!isEntryRebindable(e, 'Gamepad')) return false;
      if (!q) return true;
      return (
        e.labelRu.toLowerCase().includes(q) ||
        e.labelEn.toLowerCase().includes(q) ||
        e.key.toLowerCase().includes(q)
      );
    });
  }, [search]);

  if (!partPath) return null;

  const isReservedStart = partPath === 'start';
  const isSystemOrMic = partPath === 'systemButton' || partPath === 'micButton';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card inspector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <ControlGlyph path={bindingPath} gamepadType={gamepadType} size="lg" />
            <div>
              <h3>
                {formatReadableBinding(bindingPath, gamepadType)}{' '}
                <code className="part-code-badge">{partPath}</code>
              </h3>
              <p className="modal-subtitle">
                {lang === 'ru'
                  ? 'Управление действиями, привязанными к этой 3D-кнопке'
                  : 'Manage actions bound to this 3D controller button'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="inspector-body">
          {isReservedStart && (
            <div className="inspector-alert">
              {lang === 'ru'
                ? 'Кнопка Start / Options зарезервирована под «Меню паузы» и отмену захвата.'
                : 'Start / Options is reserved for the Pause Menu and capture cancellation.'}
            </div>
          )}

          {isSystemOrMic && (
            <div className="inspector-alert">
              {lang === 'ru'
                ? 'Системная кнопка контроллера (обычно перехватывается ОС / Steam / консолью).'
                : 'System hardware button (usually intercepted by OS / console overlay).'}
            </div>
          )}

          {/* Currently bound actions */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">
              {lang === 'ru'
                ? `Сейчас назначено на эту кнопку (${boundEntries.length}):`
                : `Currently bound to this button (${boundEntries.length}):`}
            </h4>
            {boundEntries.length === 0 ? (
              <div className="inspector-empty">
                {lang === 'ru'
                  ? 'На эту кнопку сейчас не назначено ни одного переназначаемого действия.'
                  : 'No rebindable actions are currently assigned to this button.'}
              </div>
            ) : (
              <div className="inspector-bound-list">
                {boundEntries.map((entry) => {
                  const secTitle =
                    lang === 'ru'
                      ? SECTION_TITLES[entry.section].ru
                      : SECTION_TITLES[entry.section].en;
                  const canEdit = isEntryRebindable(entry, 'Gamepad');
                  return (
                    <div key={entry.key} className="inspector-bound-item">
                      <div>
                        <span className="bound-item-section">{secTitle}</span>
                        <div className="bound-item-label">
                          {lang === 'ru' ? entry.labelRu : entry.labelEn}
                          <small className="bound-item-en">
                            {lang === 'ru' ? ` (${entry.labelEn})` : ''}
                          </small>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn-unbind-mini"
                          onClick={() => onUnbindEntry(entry)}
                          title={
                            lang === 'ru' ? 'Отвязать действие' : 'Unbind action'
                          }
                        >
                          <Trash2 size={14} />
                          <span>{lang === 'ru' ? 'Снять' : 'Unbind'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assign any action to this button */}
          {!isReservedStart && !isSystemOrMic && (
            <div className="inspector-section">
              <div className="inspector-assign-header">
                <h4 className="inspector-section-title">
                  <Gamepad2 size={15} />
                  <span>
                    {lang === 'ru'
                      ? 'Назначить действие на эту кнопку:'
                      : 'Assign an action to this button:'}
                  </span>
                </h4>
                <div className="inspector-search">
                  <Search size={14} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      lang === 'ru' ? 'Поиск действия...' : 'Search action...'
                    }
                  />
                </div>
              </div>

              <div className="inspector-catalog-scroll">
                {SECTION_ORDER.map((section) => {
                  const items = filteredCatalog.filter(
                    (e) => e.section === section
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={section} className="inspector-cat-group">
                      <div className="inspector-cat-header">
                        {lang === 'ru'
                          ? SECTION_TITLES[section].ru
                          : SECTION_TITLES[section].en}
                      </div>
                      {items.map((entry) => {
                        const currentPath = getEffectivePath(
                          entry,
                          'Gamepad',
                          bindings
                        );
                        const alreadyHere =
                          partPathFor(currentPath) === partPath;
                        return (
                          <button
                            key={entry.key}
                            type="button"
                            className={`inspector-action-row ${
                              alreadyHere ? 'already-bound' : ''
                            }`}
                            onClick={() => {
                              if (!alreadyHere) {
                                onAssignEntryToPart(entry, bindingPath);
                              }
                            }}
                          >
                            <div className="inspector-action-main">
                              <span className="inspector-action-name">
                                {lang === 'ru' ? entry.labelRu : entry.labelEn}
                              </span>
                              {lang === 'ru' && (
                                <span className="inspector-action-sub">
                                  {entry.labelEn}
                                </span>
                              )}
                            </div>

                            <div className="inspector-action-right">
                              <ControlGlyph
                                path={currentPath}
                                gamepadType={gamepadType}
                                size="sm"
                              />
                              {alreadyHere ? (
                                <span className="assign-badge assigned">
                                  <Check size={13} />
                                  {lang === 'ru' ? 'Назначено' : 'Bound'}
                                </span>
                              ) : (
                                <span className="assign-badge">
                                  <Plus size={13} />
                                  {lang === 'ru' ? 'Назначить' : 'Bind'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
