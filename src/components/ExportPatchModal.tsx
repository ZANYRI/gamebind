import React, { useMemo, useState } from 'react';
import {
  AssetName,
  BindFamily,
  GamepadType,
  getEntryId,
  RebindEntryDef,
} from '../data/catalog';
import { ControlGlyph, formatReadableBinding } from './ControlGlyph';
import {
  BindingsMap,
  encodeBindingsToUrlHash,
  fromPlayerPrefsJson,
  toPlayerPrefsJson,
} from '../services/rebindEngine';
import {
  buildPatchedInputActions,
  downloadUnityPatchZip,
  generateMarkdownReport,
  getAllDiffs,
  triggerBrowserDownload,
  UNITY_ASSET_PATHS,
} from '../services/unityExporter';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  FileJson,
  FileText,
  FolderArchive,
  Link2,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

interface ExportPatchModalProps {
  open: boolean;
  bindings: BindingsMap;
  gamepadType: GamepadType;
  lang: 'ru' | 'en';
  onClose: () => void;
  onRevertEntry: (entry: RebindEntryDef, family: BindFamily) => void;
  onImportBindings: (next: BindingsMap) => void;
}

export const ExportPatchModal: React.FC<ExportPatchModalProps> = ({
  open,
  bindings,
  gamepadType,
  lang,
  onClose,
  onRevertEntry,
  onImportBindings,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'markdown' | 'json' | 'import'>('diff');
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const diffs = useMemo(() => getAllDiffs(bindings), [bindings]);
  const markdownReport = useMemo(
    () => generateMarkdownReport(bindings, gamepadType, lang),
    [bindings, gamepadType, lang]
  );
  const playerPrefsJson = useMemo(
    () => JSON.stringify(toPlayerPrefsJson(bindings), null, 2),
    [bindings]
  );

  if (!open) return null;

  const markCopied = (key: string) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      markCopied(key);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      markCopied(key);
    }
  };

  const handleCopyShareUrl = () => {
    const hash = encodeBindingsToUrlHash(bindings);
    const base = window.location.origin + window.location.pathname;
    const url = hash ? `${base}${hash}` : base;
    handleCopyText(url, 'share_url');
  };

  const handleDownloadZip = async () => {
    setBusy(true);
    try {
      await downloadUnityPatchZip(bindings, gamepadType, lang);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSingleAsset = async (assetName: AssetName) => {
    setBusy(true);
    try {
      const patched = await buildPatchedInputActions(bindings);
      const info = patched[assetName];
      if (info) {
        const blob = new Blob([info.json], { type: 'application/json' });
        triggerBrowserDownload(blob, `${assetName}.inputactions`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImportSubmit = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);
      const loaded = fromPlayerPrefsJson(parsed);
      onImportBindings(loaded);
      setImportText('');
      setActiveTab('diff');
    } catch {
      setImportError(
        lang === 'ru'
          ? 'Неверный формат JSON. Вставьте JSON в формате Controls_Bindings.'
          : 'Invalid JSON format. Paste a valid Controls_Bindings JSON payload.'
      );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card export-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <FolderArchive size={21} className="text-accent" />
            <div>
              <h3>
                {lang === 'ru'
                  ? 'Экспорт патча для Unity и отчёт об изменениях'
                  : 'Unity Patch Export & Changes Report'}
              </h3>
              <p className="modal-subtitle">
                {lang === 'ru'
                  ? 'Готовые пропатченные .inputactions для проекта Lunoris + таблица изменений'
                  : 'Patched .inputactions assets ready to drop into Lunoris + diff report'}
              </p>
            </div>
          </div>
          <button type="button" className="icon-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Primary Action Cards */}
        <div className="export-hero-cards">
          <div className="export-hero-card primary-card">
            <div className="hero-card-info">
              <div className="hero-card-badge">UNITY PATCH (.ZIP)</div>
              <h4>
                {lang === 'ru'
                  ? 'Скачать готовый архив для Unity'
                  : 'Download Unity Patch Archive'}
              </h4>
              <p>
                {lang === 'ru'
                  ? 'Содержит пропатченные файлы .inputactions в точной структуре папок Assets/..., Markdown-отчёт и JSON.'
                  : 'Contains patched .inputactions files in exact Assets/... structure, Markdown diff report, and JSON.'}
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-glow"
              disabled={busy}
              onClick={handleDownloadZip}
            >
              <Download size={17} />
              <span>
                {busy
                  ? lang === 'ru'
                    ? 'Сборка...'
                    : 'Building...'
                  : 'Lunoris_Controls_UnityPatch.zip'}
              </span>
            </button>
          </div>

          <div className="export-hero-card">
            <div className="hero-card-info">
              <div className="hero-card-badge">БЫСТРАЯ ОТПРАВКА</div>
              <h4>
                {lang === 'ru'
                  ? 'Поделиться ссылкой или отчётом'
                  : 'Share Config Link or Report'}
              </h4>
              <p>
                {lang === 'ru'
                  ? 'Скопируйте ссылку с зашитыми биндами или отчёт со списком изменений для отправки в чат.'
                  : 'Copy a URL with encoded bindings or a Markdown diff report to paste in chat.'}
              </p>
            </div>
            <div className="hero-card-btn-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCopyShareUrl}
              >
                {copiedKey === 'share_url' ? (
                  <Check size={15} className="text-green" />
                ) : (
                  <Link2 size={15} />
                )}
                <span>
                  {copiedKey === 'share_url'
                    ? lang === 'ru'
                      ? 'Ссылка скопирована!'
                      : 'Link Copied!'
                    : lang === 'ru'
                    ? 'Скопировать ссылку'
                    : 'Copy Share URL'}
                </span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleCopyText(markdownReport, 'md_report')}
              >
                {copiedKey === 'md_report' ? (
                  <Check size={15} className="text-green" />
                ) : (
                  <Copy size={15} />
                )}
                <span>
                  {copiedKey === 'md_report'
                    ? lang === 'ru'
                      ? 'Отчёт скопирован!'
                      : 'Report Copied!'
                    : lang === 'ru'
                    ? 'Скопировать отчёт'
                    : 'Copy Diff Report'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Individual .inputactions Download Bar */}
        <div className="export-assets-strip">
          <span className="strip-label">
            <FileCode2 size={14} />
            {lang === 'ru'
              ? 'Скачать отдельные .inputactions:'
              : 'Download individual .inputactions:'}
          </span>
          {(Object.keys(UNITY_ASSET_PATHS) as AssetName[]).map((assetName) => {
            const count = diffs.filter((d) => d.entry.asset === assetName).length;
            return (
              <button
                key={assetName}
                type="button"
                className={`asset-chip-btn ${count > 0 ? 'modified' : ''}`}
                onClick={() => handleDownloadSingleAsset(assetName)}
                title={UNITY_ASSET_PATHS[assetName]}
              >
                <Download size={13} />
                <span>{assetName}.inputactions</span>
                {count > 0 && <span className="asset-chip-count">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="export-tabs">
          <button
            type="button"
            className={`export-tab ${activeTab === 'diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('diff')}
          >
            <FileText size={14} />
            <span>
              {lang === 'ru'
                ? `Изменения относительно дефолта (${diffs.length})`
                : `Changes vs Default (${diffs.length})`}
            </span>
          </button>
          <button
            type="button"
            className={`export-tab ${activeTab === 'markdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('markdown')}
          >
            <FileCode2 size={14} />
            <span>{lang === 'ru' ? 'Markdown-отчёт' : 'Markdown Report'}</span>
          </button>
          <button
            type="button"
            className={`export-tab ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <FileJson size={14} />
            <span>PlayerPrefs JSON</span>
          </button>
          <button
            type="button"
            className={`export-tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={14} />
            <span>{lang === 'ru' ? 'Импорт JSON' : 'Import JSON'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="export-tab-body">
          {activeTab === 'diff' && (
            <div className="diff-list-container">
              {diffs.length === 0 ? (
                <div className="diff-empty-state">
                  <p>
                    {lang === 'ru'
                      ? 'Все 39 действий сейчас находятся на своих стандартных (дефолтных) кнопках.'
                      : 'All 39 actions are currently at their default bindings.'}
                  </p>
                  <span>
                    {lang === 'ru'
                      ? 'Измените любую кнопку в списке слева или кликните по 3D-геймпаду, чтобы увидеть список отличий здесь.'
                      : 'Modify any binding in the list or on the 3D controller to see the diff here.'}
                  </span>
                </div>
              ) : (
                <table className="diff-table">
                  <thead>
                    <tr>
                      <th>{lang === 'ru' ? 'Секция' : 'Section'}</th>
                      <th>{lang === 'ru' ? 'Действие' : 'Action'}</th>
                      <th>{lang === 'ru' ? 'Устройство' : 'Device'}</th>
                      <th>{lang === 'ru' ? 'Было (Дефолт)' : 'Default'}</th>
                      <th>{lang === 'ru' ? 'Стало' : 'New Binding'}</th>
                      <th>Unity Asset / Action</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d) => (
                      <tr key={`${d.entry.key}_${d.family}`}>
                        <td>
                          <span className="diff-sec-badge">{d.entry.section}</span>
                        </td>
                        <td>
                          <div className="diff-action-cell">
                            <strong>
                              {lang === 'ru' ? d.entry.labelRu : d.entry.labelEn}
                            </strong>
                            {lang === 'ru' && <small>{d.entry.labelEn}</small>}
                          </div>
                        </td>
                        <td>
                          <span className="diff-family-tag">
                            {d.family === 'Gamepad' ? 'Gamepad' : 'KBM'}
                          </span>
                        </td>
                        <td>
                          <div className="diff-glyph-cell">
                            <ControlGlyph
                              path={d.oldPath}
                              gamepadType={gamepadType}
                              size="sm"
                            />
                            <span>
                              {formatReadableBinding(d.oldPath, gamepadType)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="diff-glyph-cell new-val">
                            <ControlGlyph
                              path={d.newPath}
                              gamepadType={gamepadType}
                              size="sm"
                            />
                            <strong>
                              {formatReadableBinding(d.newPath, gamepadType)}
                            </strong>
                          </div>
                        </td>
                        <td>
                          <code className="diff-id-code">
                            {getEntryId(d.entry)}
                          </code>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-revert-row"
                            onClick={() => onRevertEntry(d.entry, d.family)}
                            title={
                              lang === 'ru'
                                ? 'Вернуть дефолтное значение'
                                : 'Revert to default'
                            }
                          >
                            <RotateCcw size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="code-preview-box">
              <div className="code-preview-toolbar">
                <span>CHANGES_REPORT.md</span>
                <button
                  type="button"
                  className="btn-mini-copy"
                  onClick={() => handleCopyText(markdownReport, 'md_tab')}
                >
                  {copiedKey === 'md_tab' ? <Check size={13} /> : <Copy size={13} />}
                  <span>
                    {copiedKey === 'md_tab'
                      ? lang === 'ru'
                        ? 'Скопировано'
                        : 'Copied'
                      : lang === 'ru'
                      ? 'Копировать Markdown'
                      : 'Copy Markdown'}
                  </span>
                </button>
              </div>
              <pre className="code-preview-pre">{markdownReport}</pre>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="code-preview-box">
              <div className="code-preview-toolbar">
                <span>
                  PlayerPrefs Key: <code>Controls_Bindings</code> (InputRebindService.cs)
                </span>
                <button
                  type="button"
                  className="btn-mini-copy"
                  onClick={() => handleCopyText(playerPrefsJson, 'json_tab')}
                >
                  {copiedKey === 'json_tab' ? (
                    <Check size={13} />
                  ) : (
                    <Copy size={13} />
                  )}
                  <span>
                    {copiedKey === 'json_tab'
                      ? lang === 'ru'
                        ? 'Скопировано'
                        : 'Copied'
                      : lang === 'ru'
                      ? 'Копировать JSON'
                      : 'Copy JSON'}
                  </span>
                </button>
              </div>
              <pre className="code-preview-pre">{playerPrefsJson}</pre>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="import-box">
              <p>
                {lang === 'ru'
                  ? 'Вставьте сюда JSON в формате Controls_Bindings, чтобы загрузить сохранённую раскладку:'
                  : 'Paste a Controls_Bindings JSON payload below to load a saved layout:'}
              </p>
              <textarea
                className="import-textarea"
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{"v":1,"items":[{"id":"Malbers Inputs/Gameplay/Jump","kbm":"","pad":"<Gamepad>/buttonNorth"}]}'
              />
              {importError && <div className="import-error">{importError}</div>}
              <button
                type="button"
                className="btn-primary-glow"
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
              >
                <Upload size={15} />
                <span>
                  {lang === 'ru' ? 'Применить JSON-раскладку' : 'Apply JSON Layout'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
