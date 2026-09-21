import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Download, RefreshCw, QrCode, ChevronDown, ChevronUp, Archive,
  Trash2, Edit2, Check, X, Layers, AlertTriangle, MoreVertical, Clock3,
  Sparkles, ListChecks, RotateCcw, Search, SlidersHorizontal, Users, CircleCheck, CircleDot, MapPin
} from 'lucide-react';
import api from '../lib/api';
import socket from '../lib/socket';
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

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL;
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
      mobileSheet
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

function formatElapsed(date, now) {
  if (!date) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours < 24) return `${hours}h ${remainder}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function TableActionSheet({ table, open, onClose, onViewQR, onRelease, onEdit, onRegenerate, onDeactivate, canRelease }) {
  if (!table || !open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close table actions" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-4">
        <div className="flex items-center justify-between px-2 pb-3 border-b border-ink/8">
          <div>
            <p className="font-display font-bold text-ink">{table.label}</p>
            <p className="text-xs text-ink-muted mt-0.5">Table actions</p>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close actions for ${table.label}`} className="min-h-11 min-w-11 p-2 rounded-xl text-ink-muted hover:bg-ink/5"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3">
          <button type="button" onClick={onViewQR} className="action-sheet-button"><QrCode size={17} /> View QR code</button>
          <button type="button" onClick={onEdit} className="action-sheet-button"><Edit2 size={17} /> Edit label</button>
          <button type="button" onClick={onRegenerate} className="action-sheet-button"><RefreshCw size={17} /> Regenerate QR</button>
          {canRelease && (
            <button type="button" onClick={onRelease} aria-label={`Release ${table.label}`} className="action-sheet-button text-teal"><RotateCcw size={17} /> Release table</button>
          )}
          <button type="button" onClick={onDeactivate} className="action-sheet-button text-danger"><Trash2 size={17} /> Deactivate</button>
        </div>
      </div>
      <style>{`.action-sheet-button{display:flex;align-items:center;gap:.55rem;border:1px solid rgba(18,26,44,.08);border-radius:.85rem;padding:.8rem .75rem;font-size:.8rem;font-weight:600;color:#121A2C;background:#fff;transition:background .15s}.action-sheet-button:hover{background:#f5f8f7}`}</style>
    </div>
  );
}

// ── Mobile-first table card with inline label edit ────────────────────────────
function TableRow({ table, isSelected, onToggleSelect, onViewQR, onOpenActions, needsAttention, readyToClear, onRelease, selectionMode, now }) {
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

  const status = table.status || 'available';
  const statusLabel = status === 'occupied' ? 'Occupied' : 'Available';
  const occupiedMinutes = table.occupiedSince ? Math.max(0, Math.floor((now - new Date(table.occupiedSince).getTime()) / 60000)) : 0;
  const statusClass = status === 'occupied' && occupiedMinutes >= 90
      ? 'bg-danger/10 text-danger border-danger/25'
      : status === 'occupied' && occupiedMinutes >= 45
      ? 'bg-amber/10 text-amber border-amber/25'
      : status === 'occupied'
      ? 'bg-teal/10 text-teal border-teal/20'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const elapsed = formatElapsed(table.occupiedSince, now);

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
    <div className={`relative p-4 sm:p-5 border border-ink/8 rounded-2xl bg-white shadow-sm transition-all ${
      isSelected ? 'bg-teal/5' : 'hover:bg-ink/[.015]'
    }`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(table._id)}
          aria-label={`Select ${table.label}`}
          className={`w-5 h-5 mt-1 rounded border-ink/20 text-teal focus:ring-teal cursor-pointer shrink-0 ${selectionMode ? '' : 'hidden'}`}
        />
        <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusClass}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {statusLabel}{elapsed ? ` · ${elapsed}` : ''}
            </span>
            {needsAttention && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber bg-amber/10 px-2 py-1 rounded-full">
                <AlertTriangle size={11} /> Needs attention
              </span>
            )}
            {table.sessionLocationVerified === false && (
              <span
                title="Location unverified for this table session"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-ink-muted bg-ink/5 px-2 py-1 rounded-full"
              >
                <MapPin size={11} /> Location unverified
              </span>
            )}
          </div>
          <button type="button" onClick={() => onOpenActions(table)} className="min-h-11 min-w-11 -mr-2 -mt-2 p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-ink/5" aria-label={`Actions for ${table.label}`}>
            <MoreVertical size={18} />
          </button>
        </div>
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
          <div className="flex items-start gap-2 group">
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
        {readyToClear && table.status === 'occupied' && (
          <div className="mt-3 rounded-xl border border-amber/25 bg-amber/10 px-3 py-2.5 flex items-center gap-2">
            <Sparkles size={16} className="text-amber shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-amber">Ready to clear</p>
              <p className="text-[11px] text-amber/80">All orders served &amp; paid</p>
            </div>
            <button type="button" onClick={() => onRelease(table._id)} aria-label={`Mark ${table.label} available`} className="min-h-11 px-2 text-xs font-bold text-amber hover:underline whitespace-nowrap">
              Mark available
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-xs text-ink-muted font-mono truncate">{table.qrToken}</p>
          <button type="button" onClick={() => onViewQR(table)} className="min-h-11 min-w-11 rounded-xl bg-mint/40 hover:bg-mint/80 flex items-center justify-center shrink-0 transition-colors" aria-label={`View QR code for ${table.label}`}>
            <QrCode size={17} className="text-teal" />
          </button>
        </div>
        {!table.isActive && <span className="inline-block text-xs font-semibold text-ink-muted mt-2">Inactive</span>}
        {status === 'occupied' && (
          <button type="button" onClick={() => onRelease(table._id)} className="w-full min-h-11 mt-3 rounded-xl border border-teal/25 text-teal text-sm font-semibold hover:bg-teal/5" aria-label={`Release ${table.label}`}>
            Release table
          </button>
        )}
      </div>
      </div>
      {confirmRegen && (
        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-amber/10">
          <span className="text-xs text-amber flex-1">Invalidate the current QR code?</span>
          <Button variant="danger" size="sm" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending}>Confirm</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmRegen(false)}>Cancel</Button>
        </div>
      )}
      {confirmDeactivate && (
        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-danger/10">
          <span className="text-xs text-danger flex-1">Deactivate this table?</span>
          <Button variant="danger" size="sm" onClick={() => deactivateMutation.mutate()} disabled={deactivateMutation.isPending}>Deactivate</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

// ── Branch group with select-all ──────────────────────────────────────────────
function BranchGroup({ branch, tables, selectedIds, onToggleSelect, onToggleSelectBranch, onViewQR, onOpenActions, onAddClick, attentionIds, readyToClearIds, onRelease, selectionMode, now }) {
  const [collapsed, setCollapsed] = useState(false);

  const branchTableIds = tables.map((t) => t._id);
  const isAllSelected = branchTableIds.length > 0 && branchTableIds.every((id) => selectedIds.has(id));

  return (
    <div className="border border-ink/8 rounded-xl bg-white overflow-hidden mb-4 shadow-sm">
      {/* Branch header */}
      <div className="w-full flex items-center justify-between px-4 py-3.5 bg-ink/2 border-b border-ink/4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={() => onToggleSelectBranch(branchTableIds)}
            aria-label={`Select all tables in ${branch.name}`}
            className={`w-5 h-5 rounded border-ink/20 text-teal focus:ring-teal cursor-pointer ${selectionMode ? '' : 'hidden'}`}
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
            <span className="hidden sm:inline text-[11px] text-emerald-700">{tables.filter((table) => table.status !== 'occupied').length} available</span>
            <span className="hidden sm:inline text-[11px] text-teal">{tables.filter((table) => table.status === 'occupied').length} occupied</span>
            {tables.some((table) => attentionIds.has(String(table._id))) && (
               <span className="text-[10px] font-semibold text-amber bg-amber/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <AlertTriangle size={11} /> Attention
               </span>
            )}
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
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
            {tables.map((t) => (
              <TableRow
                key={t._id}
                table={t}
                isSelected={selectedIds.has(t._id)}
                onToggleSelect={onToggleSelect}
                onViewQR={onViewQR}
                onOpenActions={onOpenActions}
                needsAttention={attentionIds.has(String(t._id))}
                readyToClear={readyToClearIds.has(String(t._id))}
                onRelease={onRelease}
                selectionMode={selectionMode}
                now={now}
              />
            ))
            }
            </div>
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
  const [actionTable, setActionTable] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [readyToClearIds, setReadyToClearIds] = useState(new Set());
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Bulk Confirmation Modals
  const [bulkConfirmRegen, setBulkConfirmRegen] = useState(false);
  const [bulkConfirmDeactivate, setBulkConfirmDeactivate] = useState(false);

  const { restaurant, user } = useAuthStore();
  const canRelease = user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: branchData, isLoading: branchLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then((r) => r.data),
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/tables').then((r) => r.data),
  });
  const { data: assistanceData } = useQuery({
    queryKey: ['assistance'],
    queryFn: () => api.get('/assistance').then((r) => r.data),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    socket.connect();
    const onTableUpdated = (updatedTable) => {
      if (updatedTable?.status === 'available') {
        setReadyToClearIds((current) => {
          const next = new Set(current);
          next.delete(String(updatedTable._id));
          return next;
        });
      }
      qc.setQueryData(['tables'], (old) => {
        if (!old?.tables || !updatedTable?._id) return old;
        return {
          ...old,
          tables: old.tables.map((table) =>
            String(table._id) === String(updatedTable._id) ? { ...table, ...updatedTable } : table
          ),
        };
      });
    };
    const onReadyToClear = ({ tableId }) => {
      if (!tableId) return;
      setReadyToClearIds((current) => new Set(current).add(String(tableId)));
    };
    const onOrderUpdated = (order) => {
      const tableId = order?.tableId?._id || order?.tableId;
      if (tableId) {
        setReadyToClearIds((current) => {
          const next = new Set(current);
          next.delete(String(tableId));
          return next;
        });
      }
      qc.invalidateQueries({ queryKey: ['tables'] });
    };
    socket.on('table:updated', onTableUpdated);
    socket.on('table:readyToClear', onReadyToClear);
    socket.on('order:updated', onOrderUpdated);
    socket.on('order:created', onOrderUpdated);
    return () => {
      socket.off('table:updated', onTableUpdated);
      socket.off('table:readyToClear', onReadyToClear);
      socket.off('order:updated', onOrderUpdated);
      socket.off('order:created', onOrderUpdated);
    };
  }, [qc]);

  const branches = branchData?.branches ?? [];
  const tables = tableData?.tables ?? [];
  const attentionIds = new Set(
    (assistanceData?.assistance ?? [])
      .filter((request) => request.status === 'pending' || request.status === 'acknowledged')
      .map((request) => String(request.tableId?._id || request.tableId))
  );
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTables = tables.filter((table) => {
    const matchesBranch = branchFilter === 'all' || String(table.branchId) === String(branchFilter);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'attention' ? attentionIds.has(String(table._id)) : (table.status || 'available') === statusFilter);
    const matchesSearch = !normalizedSearch || table.label.toLowerCase().includes(normalizedSearch);
    return matchesBranch && matchesStatus && matchesSearch;
  });
  const isLoading = branchLoading || tableLoading;

  // Group tables by branch
  const grouped = branches.map((b) => ({
    branch: b,
    tables: filteredTables.filter((t) => String(t.branchId) === String(b._id)),
  })).filter(({ tables: branchTables }) => branchTables.length > 0 || branchFilter === 'all');

  const occupiedCount = tables.filter((table) => table.status === 'occupied').length;
  const availableCount = tables.length - occupiedCount;
  const attentionCount = attentionIds.size;

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

  const closeActionSheet = () => setActionTable(null);

  const releaseMutation = useMutation({
    mutationFn: (id) => api.patch(`/tables/${id}/release`).then((r) => r.data),
    onSuccess: (_, releasedId) => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      setReadyToClearIds((current) => {
        const next = new Set(current);
        next.delete(String(releasedId));
        return next;
      });
      closeActionSheet();
      toast.success('Table released');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to release table'),
  });

  const actionRegenMutation = useMutation({
    mutationFn: (id) => api.post(`/tables/${id}/regenerate-qr`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      closeActionSheet();
      toast.success('QR code regenerated');
    },
    onError: () => toast.error('Failed to regenerate QR code'),
  });

  const actionDeactivateMutation = useMutation({
    mutationFn: (id) => api.delete(`/tables/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      closeActionSheet();
      toast.success('Table deactivated');
    },
    onError: () => toast.error('Failed to deactivate table'),
  });

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

  const bulkReleaseMutation = useMutation({
    mutationFn: () =>
      api.patch('/tables/bulk/release', { ids: Array.from(selectedIds) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Released ${selectedIds.size} tables.`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setReadyToClearIds((current) => {
        const next = new Set(current);
        selectedIds.forEach((id) => next.delete(String(id)));
        return next;
      });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to release selected tables'),
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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 relative pb-32">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink">Tables</h1>
            {tables.length > 0 && (
              <span className="text-xs font-bold text-ink-muted bg-ink/5 rounded-full px-2.5 py-1">{tables.length} total</span>
            )}
          </div>
          <p className="text-sm text-ink-muted mt-1">Live floor status and QR codes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tables.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setSelectionMode((value) => !value)}
            >
              <ListChecks size={15} /> {selectionMode ? 'Done selecting' : 'Select'}
            </Button>
          )}
          {tables.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDownloadAllZip}
              disabled={isZipping}
            >
              <Archive size={15} /> <span className="hidden sm:inline">{isZipping ? 'Exporting ZIP…' : 'Download all cards'}</span><span className="sm:hidden">Export</span>
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

      {/* Floor summary: tap a metric to filter the cards. */}
      <div className="flex gap-3 overflow-x-auto pb-1 mb-5 snap-x">
        {[
          ['all', 'Total tables', tables.length, Users, 'bg-ink/5 text-ink'],
          ['available', 'Available', availableCount, CircleCheck, 'bg-emerald-50 text-emerald-700'],
          ['occupied', 'Occupied', occupiedCount, CircleDot, 'bg-teal/10 text-teal'],
        ].map(([value, label, count, Icon, tone]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`min-w-[132px] snap-start rounded-2xl border px-4 py-3 text-left transition-colors ${
              statusFilter === value ? 'border-teal ring-2 ring-teal/15' : 'border-ink/8'
            } ${tone}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
              <Icon size={16} />
            </div>
            <span className="block text-2xl font-display font-bold mt-1">{count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStatusFilter('attention')}
          className={`min-w-[132px] snap-start rounded-2xl border px-4 py-3 text-left transition-colors ${
            statusFilter === 'attention' ? 'border-amber ring-2 ring-amber/15' : 'border-ink/8'
          } bg-amber/10 text-amber`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Attention</span>
            <AlertTriangle size={16} />
          </div>
          <span className="block text-2xl font-display font-bold mt-1">{attentionCount}</span>
        </button>
      </div>

      {/* Filters remain touch-friendly and scroll horizontally on phones. */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <label className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3 top-3 text-ink-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search table label"
            aria-label="Search tables"
            className="w-full min-h-11 rounded-xl border border-ink/10 bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-teal"
          />
        </label>
        <label className="relative">
          <span className="sr-only">Filter by branch</span>
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)} className="w-full sm:w-48 min-h-11 rounded-xl border border-ink/10 bg-white px-3 text-sm">
            <option value="all">All branches</option>
            {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="relative">
          <SlidersHorizontal size={15} className="absolute left-3 top-3 text-ink-muted pointer-events-none" />
          <span className="sr-only">Filter by status</span>
          <select value={statusFilter === 'attention' ? 'all' : statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full sm:w-40 min-h-11 rounded-xl border border-ink/10 bg-white pl-9 pr-3 text-sm">
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
          </select>
        </label>
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
      ) : filteredTables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-5 py-12 text-center">
          <Search size={24} className="mx-auto text-ink-muted" />
          <p className="text-sm font-semibold text-ink mt-3">No tables match these filters</p>
          <button type="button" onClick={() => { setSearch(''); setBranchFilter('all'); setStatusFilter('all'); }} className="mt-3 min-h-11 px-4 rounded-xl text-sm font-semibold text-teal hover:bg-teal/5">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {grouped.map(({ branch, tables: bTables }) => (
            <BranchGroup
              key={branch._id}
              branch={branch}
              tables={bTables}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectBranch={handleToggleSelectBranch}
              onViewQR={setQrModalTable}
              onOpenActions={setActionTable}
              onAddClick={openAddModal}
              attentionIds={attentionIds}
              readyToClearIds={readyToClearIds}
              onRelease={(id) => releaseMutation.mutate(id)}
              selectionMode={selectionMode}
              now={now}
            />
          ))}
        </>
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

      {/* FAB: primary add action on mobile/tablet (placed above bottom tab bar) */}
      <button
        type="button"
        onClick={() => openAddModal('single')}
        aria-label="Add table"
        className="lg:hidden fixed right-4 z-50 rounded-full flex items-center justify-center shadow-lg text-white"
        style={{
          width: '56px',
          height: '56px',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
          background: 'var(--color-primary)'
        }}
      >
        <Plus size={20} />
      </button>

      {/* QR Code Modal */}
      <QRModal
        table={qrModalTable}
        open={!!qrModalTable}
        onClose={() => setQrModalTable(null)}
      />

      <TableActionSheet
        table={actionTable}
        open={!!actionTable}
        onClose={closeActionSheet}
        onViewQR={() => {
          setQrModalTable(actionTable);
          closeActionSheet();
        }}
        onEdit={() => {
          const nextLabel = window.prompt('Table label', actionTable?.label || '');
          if (nextLabel && nextLabel.trim() && nextLabel.trim() !== actionTable?.label) {
            api.patch(`/tables/${actionTable._id}`, { label: nextLabel.trim() })
              .then(() => {
                qc.invalidateQueries({ queryKey: ['tables'] });
                toast.success('Table updated');
              })
              .catch(() => toast.error('Failed to update table'));
          }
          closeActionSheet();
        }}
        onRelease={() => releaseMutation.mutate(actionTable._id)}
        onRegenerate={() => {
          if (window.confirm('Regenerate this QR code? Previously printed codes will stop working.')) {
            actionRegenMutation.mutate(actionTable._id);
          }
        }}
        onDeactivate={() => {
          if (window.confirm('Deactivate this table? Customers will no longer be able to order from it.')) {
            actionDeactivateMutation.mutate(actionTable._id);
          }
        }}
        canRelease={canRelease && actionTable?.status !== 'available'}
      />

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:bottom-4 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 bg-ink text-white rounded-2xl px-3 sm:px-6 py-3.5 shadow-2xl flex flex-wrap items-center justify-center gap-2 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15">
            {selectedIds.size} selected
          </span>

          <div className="hidden sm:block h-4 w-px bg-white/20" />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setBulkConfirmRegen(true)}
            >
              <RefreshCw size={13} /> Regenerate QR
            </Button>

            {canRelease && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => bulkReleaseMutation.mutate()}
                disabled={bulkReleaseMutation.isPending}
              >
                <RotateCcw size={13} /> {bulkReleaseMutation.isPending ? 'Releasing…' : 'Release'}
              </Button>
            )}

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
            onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
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
