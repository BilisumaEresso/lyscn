import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Download, RefreshCw, QrCode, ChevronDown, ChevronUp, Archive,
  Trash2, Edit2, Check, X, Layers, AlertTriangle
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { generateThemeFromColor } from '../lib/theme';
import { createStyledQR, downloadTableCard, downloadAllTablesZip } from '../lib/qrCardComposer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import logoImg from '../assets/logo.png';

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:5173';
const PREFIX_CHIPS = ['Table', 'Booth', 'Patio', 'VIP', 'Bar', 'Outdoor'];

// ── Helper: Parse label trailing number ───────────────────────────────────────
function parseLabelNumber(label) {
  const match = (label || '').trim().match(/^(.*?)\s*(\d+)$/);
  if (match) {
    return { prefix: match[1].trim() || 'Table', num: parseInt(match[2], 10) };
  }
  return null;
}

// ── Helper: Calculate next suggested label for branch ────────────────────────
function getSuggestedLabelInfo(tables, branchId, currentPrefix = 'Table') {
  const branchTables = tables.filter((t) => String(t.branchId) === String(branchId));
  let maxNum = 0;
  let detectedPrefix = currentPrefix;

  for (const t of branchTables) {
    const parsed = parseLabelNumber(t.label);
    if (parsed) {
      if (parsed.num > maxNum) {
        maxNum = parsed.num;
        if (parsed.prefix) detectedPrefix = parsed.prefix;
      }
    }
  }

  const nextNum = maxNum + 1;
  const prefixToUse = detectedPrefix || currentPrefix || 'Table';
  return {
    prefix: prefixToUse,
    nextNum,
    suggestedLabel: `${prefixToUse} ${nextNum}`,
  };
}

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ table, open, onClose }) {
  const qc = useQueryClient();
  const { restaurant } = useAuthStore();
  const qrContainerRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const qrUrl = `${CUSTOMER_URL}/t/${table?.qrToken}`;
  const brandColor = restaurant?.brandColor || '#14B8A6';
  const theme = generateThemeFromColor(brandColor);

  useEffect(() => {
    if (!open || !table || !qrContainerRef.current) return;

    const qrStyling = createStyledQR({
      url: qrUrl,
      brandColor,
      logoUrl: restaurant?.logoUrl,
      size: 210,
    });

    qrContainerRef.current.innerHTML = '';
    qrStyling.append(qrContainerRef.current);
  }, [open, table, qrUrl, brandColor, restaurant?.logoUrl]);

  const regenMutation = useMutation({
    mutationFn: () => api.post(`/tables/${table._id}/regenerate-qr`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR code regenerated — old codes are now invalid.');
      setConfirmRegen(false);
    },
    onError: () => toast.error('Failed to regenerate QR code'),
  });

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadTableCard({ table, restaurant });
      toast.success('Downloaded print-ready QR card PNG!');
    } catch (err) {
      toast.error('Failed to generate PNG card');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!table) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Table Card — ${table.label}`} size="md">
      <div className="flex flex-col items-center gap-5">
        <div
          className="w-full max-w-sm rounded-3xl p-6 border border-ink/10 shadow-lg flex flex-col items-center relative overflow-hidden transition-all"
          style={{
            background: `linear-gradient(160deg, ${theme.surfaceWash} 0%, #FFFFFF 60%, ${theme.surfaceWash} 100%)`,
            animation: 'qr-reveal 300ms ease-out',
          }}
        >
          <div className="absolute top-0 inset-x-0 h-2.5" style={{ backgroundColor: theme.primary }} />

          <div className="flex flex-col items-center mb-4 mt-1 text-center">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm border border-ink/10 mb-2 bg-white flex items-center justify-center">
              <img
                src={restaurant?.logoUrl || logoImg}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-display font-bold text-lg text-ink leading-tight">
              {restaurant?.name || 'LayoScan'}
            </h3>
            <div
              className="w-12 h-0.5 rounded-full mt-1"
              style={{ backgroundColor: theme.primaryLight || theme.primary }}
            />
          </div>

          <div className="relative p-3 mb-4">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: theme.primaryDark || theme.primary }} />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: theme.primaryDark || theme.primary }} />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: theme.primaryDark || theme.primary }} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: theme.primaryDark || theme.primary }} />

            <div
              ref={qrContainerRef}
              className="p-3 bg-white rounded-2xl shadow-sm border border-ink/8 flex items-center justify-center overflow-hidden"
              style={{ width: '234px', height: '234px' }}
            />
          </div>

          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
            Scan to order
          </p>
          <div
            className="px-6 py-1.5 rounded-xl font-display font-bold text-lg shadow-sm border"
            style={{
              backgroundColor: theme.surfaceWash || '#E6FAF8',
              color: theme.primaryDark || theme.primary,
              borderColor: theme.primaryLight || theme.primary,
            }}
          >
            {table.label}
          </div>

          <div className="flex items-center gap-1.5 mt-4 opacity-40">
            <img src={logoImg} alt="" className="w-3.5 h-3.5 rounded object-cover" />
            <span className="text-[10px] text-ink-muted font-medium">Powered by LayoScan</span>
          </div>
        </div>

        <div className="w-full bg-ink/3 rounded-lg px-3 py-2 border border-ink/8">
          <p className="text-[10px] text-ink-muted font-medium mb-0.5">Scan target URL</p>
          <p className="text-xs text-ink break-all font-mono">{qrUrl}</p>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            variant="primary"
            size="sm"
            className="flex-1 shadow-sm"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download size={14} /> {isDownloading ? 'Exporting card…' : 'Download Card PNG'}
          </Button>

          {confirmRegen ? (
            <div className="flex gap-1 flex-1">
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => regenMutation.mutate()}
                disabled={regenMutation.isPending}
              >
                {regenMutation.isPending ? 'Regenerating…' : 'Confirm'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRegen(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setConfirmRegen(true)}
            >
              <RefreshCw size={14} /> Regenerate
            </Button>
          )}
        </div>

        {confirmRegen && (
          <p className="text-xs text-amber text-center -mt-1">
            ⚠ Regenerating invalidates all previously printed QR codes for this table.
          </p>
        )}
      </div>

      <style>{`
        @keyframes qr-reveal {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </Modal>
  );
}

// ── Smarter Single & Bulk Add Table Modal ─────────────────────────────────────
function AddTableModal({ open, onClose, branches, allTables, defaultMode = 'single', initialBranchId = '' }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState(defaultMode); // 'single' | 'bulk'

  // Single form state
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [singleLabel, setSingleLabel] = useState('');

  // Bulk form state
  const [bulkPrefix, setBulkPrefix] = useState('Table');
  const [bulkStartNum, setBulkStartNum] = useState(1);
  const [bulkCount, setBulkCount] = useState(5);
  const [previewRows, setPreviewRows] = useState([]);
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);

  // Sync mode and initial branch when modal opens
  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      const bId = initialBranchId || branches[0]?._id || '';
      setSelectedBranchId(bId);
    }
  }, [open, defaultMode, initialBranchId, branches]);

  // Auto-suggest single label & bulk start number when branch or open changes
  useEffect(() => {
    if (!open || !selectedBranchId) return;
    const info = getSuggestedLabelInfo(allTables, selectedBranchId, 'Table');
    setSingleLabel(info.suggestedLabel);
    setBulkPrefix(info.prefix);
    setBulkStartNum(info.nextNum);
    setHasGeneratedPreview(false);
    setPreviewRows([]);
  }, [open, selectedBranchId, allTables]);

  // Single Create Mutation
  const singleMutation = useMutation({
    mutationFn: (body) => api.post('/tables', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table added — QR code generated');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add table'),
  });

  // Bulk Create Mutation
  const bulkMutation = useMutation({
    mutationFn: (body) => api.post('/tables/bulk', body).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      const count = data.tables?.length || 0;
      toast.success(`Successfully created ${count} tables!`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create bulk tables'),
  });

  // Quick prefix chip handler for single mode
  const handleChipClick = (chip) => {
    const parsed = parseLabelNumber(singleLabel);
    const num = parsed ? parsed.num : getSuggestedLabelInfo(allTables, selectedBranchId).nextNum;
    setSingleLabel(`${chip} ${num}`);
  };

  // Generate preview rows for bulk mode
  const handleGeneratePreview = () => {
    const rows = [];
    const countVal = Math.max(1, Math.min(100, parseInt(bulkCount, 10) || 1));
    const startVal = Math.max(1, parseInt(bulkStartNum, 10) || 1);

    for (let i = 0; i < countVal; i++) {
      const num = startVal + i;
      rows.push({
        id: `row-${Date.now()}-${i}`,
        label: `${bulkPrefix.trim()} ${num}`,
      });
    }
    setPreviewRows(rows);
    setHasGeneratedPreview(true);
  };

  // Bulk row edit handlers
  const handlePreviewLabelChange = (id, newLabel) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, label: newLabel } : r))
    );
  };

  const handleRemovePreviewRow = (id) => {
    setPreviewRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddPreviewRow = () => {
    const nextNum = previewRows.length + (parseInt(bulkStartNum, 10) || 1);
    setPreviewRows((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${Math.random()}`, label: `${bulkPrefix.trim()} ${nextNum}` },
    ]);
  };

  // Form submit handlers
  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error('Please select a branch.');
      return;
    }
    if (!singleLabel.trim()) {
      toast.error('Table label cannot be empty.');
      return;
    }
    singleMutation.mutate({ branchId: selectedBranchId, label: singleLabel.trim() });
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error('Please select a branch.');
      return;
    }
    const validTables = previewRows
      .map((r) => ({ label: r.label.trim() }))
      .filter((r) => r.label.length > 0);

    if (validTables.length === 0) {
      toast.error('Please add at least one table label in the preview list.');
      return;
    }

    bulkMutation.mutate({ branchId: selectedBranchId, tables: validTables });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'single' ? 'Add Single Table' : 'Bulk Add Tables'}
      size={mode === 'bulk' && hasGeneratedPreview ? 'lg' : 'md'}
    >
      {/* Mode Tabs */}
      <div className="flex border-b border-ink/8 mb-5">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors ${
            mode === 'single'
              ? 'border-teal text-teal'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Single Table
        </button>
        <button
          type="button"
          onClick={() => setMode('bulk')}
          className={`flex-1 py-2 text-sm font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'bulk'
              ? 'border-teal text-teal'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Layers size={14} /> Bulk Add
        </button>
      </div>

      {mode === 'single' ? (
        /* ── SINGLE ADD FORM ────────────────────────────────────────────── */
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Branch</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
            >
              <option value="">Select branch…</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-ink-muted">Quick Prefix</label>
            <div className="flex flex-wrap gap-1.5">
              {PREFIX_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 text-xs rounded-full border border-ink/12 bg-ink/3 hover:bg-teal/10 hover:border-teal hover:text-teal font-medium transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Table label"
            placeholder="e.g. Table 6, Patio 1"
            value={singleLabel}
            onChange={(e) => setSingleLabel(e.target.value)}
          />

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={singleMutation.isPending}>
              {singleMutation.isPending ? 'Creating…' : 'Add table'}
            </Button>
          </div>
        </form>
      ) : (
        /* ── BULK ADD FORM ─────────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">Branch</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">Naming Prefix</label>
              <input
                type="text"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="e.g. Table, Patio, VIP"
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">Start Number</label>
              <input
                type="number"
                min="1"
                value={bulkStartNum}
                onChange={(e) => setBulkStartNum(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">Number of Tables</label>
              <input
                type="number"
                min="1"
                max="100"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeneratePreview}
            >
              Generate Preview
            </Button>
          </div>

          {/* Working Preview Table */}
          {hasGeneratedPreview && (
            <div className="border border-ink/10 rounded-xl bg-ink/2 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Editable Preview ({previewRows.length} tables)
                </h4>
                <p className="text-xs text-ink-muted">Edit labels or remove rows before saving</p>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {previewRows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-muted w-6 text-right">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => handlePreviewLabelChange(row.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePreviewRow(row.id)}
                      className="p-1.5 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
                      title="Remove row"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-ink/8">
                <button
                  type="button"
                  onClick={handleAddPreviewRow}
                  className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Add another row
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={bulkMutation.isPending || !hasGeneratedPreview || previewRows.length === 0}
              onClick={handleBulkSubmit}
            >
              {bulkMutation.isPending ? 'Creating…' : `Create ${previewRows.length} tables`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Table row with inline label edit ──────────────────────────────────────────
function TableRow({ table, isSelected, onToggleSelect, onViewQR }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(table.label);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // Sync state if table prop updates
  useEffect(() => {
    setEditLabel(table.label);
  }, [table.label]);

  const updateMutation = useMutation({
    mutationFn: (updates) =>
      api.patch(`/tables/${table._id}`, updates).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update table');
      setEditLabel(table.label);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.delete(`/tables/${table._id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deactivated');
      setConfirmDeactivate(false);
    },
    onError: () => toast.error('Failed to deactivate table'),
  });

  const regenMutation = useMutation({
    mutationFn: () => api.post(`/tables/${table._id}/regenerate-qr`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR code regenerated');
      setConfirmRegen(false);
    },
    onError: () => toast.error('Failed to regenerate QR code'),
  });

  const handleSaveLabel = () => {
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setEditLabel(table.label);
      setIsEditing(false);
      return;
    }
    if (trimmed !== table.label) {
      updateMutation.mutate({ label: trimmed });
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveLabel();
    if (e.key === 'Escape') {
      setEditLabel(table.label);
      setIsEditing(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-ink/4 last:border-0 transition-colors ${
      isSelected ? 'bg-teal/5' : 'hover:bg-ink/1.5'
    }`}>
      {/* Row Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect(table._id)}
        aria-label={`Select ${table.label}`}
        className="w-4 h-4 rounded border-ink/20 text-teal focus:ring-teal cursor-pointer shrink-0"
      />

      {/* QR Thumbnail icon button */}
      <button
        type="button"
        onClick={() => onViewQR(table)}
        className="w-8 h-8 rounded-lg bg-mint/40 hover:bg-mint/80 flex items-center justify-center shrink-0 transition-colors"
        title="Click to view QR print card"
      >
        <QrCode size={15} className="text-teal" />
      </button>

      {/* Editable Label / QR Token */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1 max-w-xs">
            <input
              type="text"
              autoFocus
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveLabel}
              className="px-2 py-0.5 text-sm font-semibold text-ink border border-teal rounded focus:outline-none w-full"
            />
            <button
              type="button"
              onMouseDown={handleSaveLabel}
              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onMouseDown={() => { setEditLabel(table.label); setIsEditing(false); }}
              className="p-1 text-ink-muted hover:bg-ink/5 rounded"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <p
              onClick={() => setIsEditing(true)}
              className="text-sm font-semibold text-ink cursor-pointer hover:text-teal transition-colors flex items-center gap-1.5"
              title="Click to edit label"
            >
              <span>{table.label}</span>
              <Edit2 size={12} className="opacity-0 group-hover:opacity-60 transition-opacity text-ink-muted" />
            </p>
          </div>
        )}
        <p className="text-xs text-ink-muted font-mono mt-0.5">{table.qrToken}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${table.isActive ? 'text-emerald-700' : 'text-ink-muted'}`}>
          {table.isActive ? 'Active' : 'Inactive'}
        </span>

        <Toggle
          checked={table.isActive}
          onChange={(val) => updateMutation.mutate({ isActive: val })}
          id={`table-toggle-${table._id}`}
        />

        <Button variant="outline" size="sm" onClick={() => onViewQR(table)}>
          <QrCode size={13} /> View QR
        </Button>

        {/* Per-row inline confirmation for Regenerate */}
        {confirmRegen ? (
          <div className="flex items-center gap-1">
            <Button
              variant="danger"
              size="sm"
              onClick={() => regenMutation.mutate()}
              disabled={regenMutation.isPending}
            >
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmRegen(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            className="p-1.5 text-ink-muted hover:text-amber rounded-lg hover:bg-amber/10 transition-colors"
            title="Regenerate QR"
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* Per-row inline confirmation for Deactivate */}
        {confirmDeactivate ? (
          <div className="flex items-center gap-1">
            <Button
              variant="danger"
              size="sm"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}
            >
              Deactivate
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDeactivate(true)}
            className="p-1.5 text-ink-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
            title="Deactivate table"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Branch group with select-all ──────────────────────────────────────────────
function BranchGroup({ branch, tables, selectedIds, onToggleSelect, onToggleSelectBranch, onViewQR, onAddClick }) {
  const [collapsed, setCollapsed] = useState(false);

  const branchTableIds = tables.map((t) => t._id);
  const isAllSelected = branchTableIds.length > 0 && branchTableIds.every((id) => selectedIds.has(id));

  return (
    <div className="border border-ink/8 rounded-xl bg-white overflow-hidden mb-4 shadow-sm">
      {/* Branch header */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-ink/2 border-b border-ink/4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => onToggleSelectBranch(branchTableIds)}
            aria-label={`Select all tables in ${branch.name}`}
            className="w-4 h-4 rounded border-ink/20 text-teal focus:ring-teal cursor-pointer"
            title="Select all tables in branch"
          />
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm font-semibold text-ink">{branch.name}</span>
            <span className="text-xs text-ink-muted bg-ink/6 px-2 py-0.5 rounded-full">
              {tables.length} table{tables.length !== 1 ? 's' : ''}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {tables.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-3">
              <p className="text-xs text-ink-muted">
                No tables in this branch yet — add one individually, or use Bulk Add to set up several at once.
              </p>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onAddClick('single', branch._id)}>
                  <Plus size={14} /> Add single table
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAddClick('bulk', branch._id)}>
                  <Layers size={14} /> Bulk add
                </Button>
              </div>
            </div>
          ) : (
            tables.map((t) => (
              <TableRow
                key={t._id}
                table={t}
                isSelected={selectedIds.has(t._id)}
                onToggleSelect={onToggleSelect}
                onViewQR={onViewQR}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}

// ── Main Tables page ──────────────────────────────────────────────────────────
export default function Tables() {
  const qc = useQueryClient();
  const [addModalState, setAddModalState] = useState({ open: false, mode: 'single', branchId: '' });
  const [qrModalTable, setQrModalTable] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isZipping, setIsZipping] = useState(false);

  // Bulk Confirmation Modals
  const [bulkConfirmRegen, setBulkConfirmRegen] = useState(false);
  const [bulkConfirmDeactivate, setBulkConfirmDeactivate] = useState(false);

  const { restaurant } = useAuthStore();

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then((r) => r.data),
  });

  const branches = branchData?.branches ?? [];
  const tables   = tableData?.tables   ?? [];
  const isLoading = branchLoading || tableLoading;

  // Group tables by branch
  const grouped = branches.map((b) => ({
    branch: b,
    tables: tables.filter((t) => String(t.branchId) === String(b._id)),
  }));

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectBranch = (branchTableIds) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allIn = branchTableIds.length > 0 && branchTableIds.every((id) => next.has(id));
      if (allIn) {
        branchTableIds.forEach((id) => next.delete(id));
      } else {
        branchTableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Bulk actions
  const bulkRegenMutation = useMutation({
    mutationFn: () =>
      api.patch('/tables/bulk/regenerate-qr', { ids: Array.from(selectedIds) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Regenerated QR codes for ${selectedIds.size} tables.`);
      setSelectedIds(new Set());
      setBulkConfirmRegen(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to regenerate selected QR codes'),
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: () =>
      api.patch('/tables/bulk/deactivate', { ids: Array.from(selectedIds) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Deactivated ${selectedIds.size} tables.`);
      setSelectedIds(new Set());
      setBulkConfirmDeactivate(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to deactivate selected tables'),
  });

  const handleDownloadSelectedZip = async () => {
    const selectedTables = tables.filter((t) => selectedIds.has(t._id));
    if (selectedTables.length === 0) return;

    try {
      setIsZipping(true);
      const toastId = toast.loading(`Exporting ${selectedTables.length} selected cards ZIP…`);
      await downloadAllTablesZip({
        tables: selectedTables,
        restaurant,
        onProgress: (current, total, label) => {
          toast.loading(`Generating card ${current}/${total} (${label})…`, { id: toastId });
        },
      });
      toast.success(`Exported ${selectedTables.length} table cards (.zip)!`, { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to export table cards ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (tables.length === 0) {
      toast.error('No tables available to export.');
      return;
    }
    try {
      setIsZipping(true);
      const toastId = toast.loading('Generating print-ready QR cards ZIP…');
      await downloadAllTablesZip({
        tables,
        restaurant,
        onProgress: (current, total, label) => {
          toast.loading(`Generating card ${current}/${total} (${label})…`, { id: toastId });
        },
      });
      toast.success('Exported all table QR cards (.zip)!', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to export table cards ZIP');
    } finally {
      setIsZipping(false);
    }
  };

  const openAddModal = (mode = 'single', branchId = '') => {
    setAddModalState({ open: true, mode, branchId });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8 relative pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Tables &amp; QR codes</h1>
          <p className="text-sm text-ink-muted mt-1">
            Each table has a unique QR code customers scan to order.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tables.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDownloadAllZip}
              disabled={isZipping}
            >
              <Archive size={15} /> {isZipping ? 'Exporting ZIP…' : 'Download all cards (.zip)'}
            </Button>
          )}
          <Button variant="outline" onClick={() => openAddModal('bulk')}>
            <Layers size={15} /> Bulk add
          </Button>
          <Button onClick={() => openAddModal('single')}>
            <Plus size={15} /> Add table
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-ink-muted py-8">
          <Spinner /><span className="text-sm">Loading tables…</span>
        </div>
      ) : tables.length === 0 && branches.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tables yet"
          description="Add your first table or use Bulk Add to set up your entire floor plan at once."
          action={() => openAddModal('single')}
          actionLabel="Add first table"
        />
      ) : branches.length === 0 ? (
        <div className="border border-amber/30 bg-amber/5 rounded-xl p-5 text-sm text-amber">
          No branches configured. Go to Settings to add a branch first.
        </div>
      ) : (
        grouped.map(({ branch, tables: bTables }) => (
          <BranchGroup
            key={branch._id}
            branch={branch}
            tables={bTables}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectBranch={handleToggleSelectBranch}
            onViewQR={setQrModalTable}
            onAddClick={openAddModal}
          />
        ))
      )}

      {/* Add Table Modal (Single / Bulk) */}
      <AddTableModal
        open={addModalState.open}
        onClose={() => setAddModalState({ ...addModalState, open: false })}
        branches={branches}
        allTables={tables}
        defaultMode={addModalState.mode}
        initialBranchId={addModalState.branchId}
      />

      {/* QR Code Modal */}
      <QRModal
        table={qrModalTable}
        open={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
      />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-white rounded-2xl px-6 py-3.5 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
            {selectedIds.size} selected
          </span>

          <div className="h-4 w-px bg-white/20" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setBulkConfirmRegen(true)}
            >
              <RefreshCw size={13} /> Regenerate QR
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setBulkConfirmDeactivate(true)}
            >
              <Trash2 size={13} /> Deactivate
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={handleDownloadSelectedZip}
              disabled={isZipping}
            >
              <Download size={13} /> ZIP
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 hover:bg-white/15 rounded-lg transition-colors text-white/70 hover:text-white ml-1"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bulk Regenerate Confirmation Modal */}
      <Modal
        open={bulkConfirmRegen}
        onClose={() => setBulkConfirmRegen(false)}
        title="Regenerate QR Codes"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber/10 border border-amber/20 rounded-xl text-amber">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to regenerate QR codes for <strong>{selectedIds.size}</strong> selected tables?
              All previously printed physical QR codes for these tables will become <strong>invalid immediately</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBulkConfirmRegen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => bulkRegenMutation.mutate()}
              disabled={bulkRegenMutation.isPending}
            >
              {bulkRegenMutation.isPending ? 'Regenerating…' : 'Confirm Regenerate'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Deactivate Confirmation Modal */}
      <Modal
        open={bulkConfirmDeactivate}
        onClose={() => setBulkConfirmDeactivate(false)}
        title="Deactivate Tables"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to deactivate <strong>{selectedIds.size}</strong> selected tables?
              Customers will no longer be able to place orders from these tables.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBulkConfirmDeactivate(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => bulkDeactivateMutation.mutate()}
              disabled={bulkDeactivateMutation.isPending}
            >
              {bulkDeactivateMutation.isPending ? 'Deactivating…' : 'Confirm Deactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
