import React, { useEffect } from 'react';
import { GamepadType } from '../data/catalog';
import { ControlGlyph, formatReadableBinding } from './ControlGlyph';
import { ConflictChoice, PendingCaptureResult } from '../services/rebindEngine';
import { AlertTriangle, ArrowLeftRight, Replace, Layers, X } from 'lucide-react';

interface ConflictModalProps {
  pending: PendingCaptureResult | null;
  gamepadType: GamepadType;
  lang: 'ru' | 'en';
  onResolve: (choice: ConflictChoice) => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  pending,
  gamepadType,
  lang,
  onResolve,
}) => {
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResolve('Cancel');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, onResolve]);

  if (!pending) return null;

  const targetNames = pending.conflictsWith
    .map((c) => (lang === 'ru' ? c.labelRu : c.labelEn))
    .join(', ');
  const selfName = lang === 'ru' ? pending.entry.labelRu : pending.entry.labelEn;

  return (
    <div className="modal-backdrop" onClick={() => onResolve('Cancel')}>
      <div className="modal-card conflict-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <AlertTriangle size={20} className="text-amber" />
            <h3>
              {lang === 'ru' ? 'Конфликт назначения кнопки' : 'Key Binding Conflict'}
            </h3>
          </div>
          <button
            type="button"
            className="icon-close-btn"
            onClick={() => onResolve('Cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="conflict-body">
          <div className="conflict-key-preview">
            <ControlGlyph
              path={pending.path}
              gamepadType={gamepadType}
              size="lg"
            />
            <span className="conflict-key-name">
              {formatReadableBinding(pending.path, gamepadType)}
            </span>
          </div>

          <p className="conflict-desc">
            {lang === 'ru' ? (
              <>
                Кнопка уже привязана к действию <strong>«{targetNames}»</strong> в этой
                же группе управления. Как поступить при назначении на{' '}
                <strong>«{selfName}»</strong>?
              </>
            ) : (
              <>
                This key is already bound to <strong>{targetNames}</strong> in the same
                control group. How would you like to bind <strong>{selfName}</strong>?
              </>
            )}
          </p>

          <div className="conflict-actions-grid">
            <button
              type="button"
              className="conflict-choice-btn choice-swap"
              onClick={() => onResolve('Swap')}
            >
              <ArrowLeftRight size={17} />
              <div>
                <div className="choice-title">
                  {lang === 'ru' ? 'Поменять местами (Swap)' : 'Swap'}
                </div>
                <div className="choice-sub">
                  {lang === 'ru'
                    ? `Отдать старую кнопку от «${selfName}» действию «${targetNames}»`
                    : `Give ${selfName}'s previous key to ${targetNames}`}
                </div>
              </div>
            </button>

            <button
              type="button"
              className="conflict-choice-btn choice-replace"
              onClick={() => onResolve('Replace')}
            >
              <Replace size={17} />
              <div>
                <div className="choice-title">
                  {lang === 'ru' ? 'Заменить (Replace)' : 'Replace'}
                </div>
                <div className="choice-sub">
                  {lang === 'ru'
                    ? `Назначить на «${selfName}», а «${targetNames}» оставить без кнопки`
                    : `Bind to ${selfName} and unbind ${targetNames}`}
                </div>
              </div>
            </button>

            <button
              type="button"
              className="conflict-choice-btn choice-share"
              onClick={() => onResolve('Share')}
            >
              <Layers size={17} />
              <div>
                <div className="choice-title">
                  {lang === 'ru'
                    ? 'Совместить на одной кнопке (Share)'
                    : 'Share Same Button'}
                </div>
                <div className="choice-sub">
                  {lang === 'ru'
                    ? `Оставить кнопку сразу на обоих действиях (как Карта + Дневник или Блок + Импульс)`
                    : `Keep both actions bound to this button simultaneously`}
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onResolve('Cancel')}
          >
            {lang === 'ru' ? 'Отмена (Esc)' : 'Cancel (Esc)'}
          </button>
        </div>
      </div>
    </div>
  );
};
