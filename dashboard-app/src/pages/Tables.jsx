import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, Download, RefreshCw, QrCode, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:5173';

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ table, open, onClose }) {
  const qc = useQueryClient();
  const qrRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const qrUrl = `${CUSTOMER_URL}/t/${table?.qrToken}`;

  const regenMutation = useMutation({
    mutationFn: () => api.post(`/tables/${table._id}/regenerate-qr`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR code regenerated — old codes are now invalid.');
      setConfirmRegen(false);
    },
    onError: () => toast.error('Failed to regenerate QR code'),
  });

  const downloadQR = () => {
    const canvas = document.getElementById('table-qr-canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = `${(table.label || 'table').replace(/\s+/g, '-')}-QR.png`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!table) return null;

  return (
    <Modal open={open} onClose={onClose} title={`QR Code — ${table.label}`} size="sm">
      <div className="flex flex-col items-center gap-5">
        {/* QR code with reveal animation */}
        <div
          className="p-5 rounded-2xl border border-ink/8 bg-white shadow-sm"
          style={{ animation: 'qr-reveal 300ms ease-out' }}
        >
          <QRCodeCanvas
            id="table-qr-canvas"
            value={qrUrl}
            size={192}
            level="H"
            includeMargin={false}
            fgColor="#121A2C"
          />
        </div>

        {/* URL */}
        <div className="w-full bg-ink/3 rounded-lg px-3 py-2 border border-ink/8">
          <p className="text-[10px] text-ink-muted font-medium mb-0.5">Scan target URL</p>
          <p className="text-xs text-ink break-all font-mono">{qrUrl}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1" onClick={downloadQR}>
            <Download size={14} /> Download PNG
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
                {regenMutation.isPending ? 'Regenerating…' : 'Confirm regenerate'}
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
              variant="ghost"
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
            ⚠ Regenerating will invalidate any printed QR codes for this table.
          </p>
        )}
      </div>

      <style>{`
        @keyframes qr-reveal {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </Modal>
  );
}

// ── Add Table Modal ───────────────────────────────────────────────────────────
function AddTableModal({ open, onClose, branches }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/tables', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table added — QR code generated');
      reset();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add table'),
  });

  const onSubmit = (data) => createMutation.mutate(data);

  return (
    <Modal open={open} onClose={onClose} title="Add table">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Branch</label>
          <select
            {...register('branchId', { required: 'Branch is required' })}
            className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg bg-white focus:outline-none focus:border-teal"
          >
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-xs text-danger">{errors.branchId.message}</p>
          )}
        </div>
        <Input
          label="Table label"
          placeholder="e.g. Table 7, Patio 3, Bar 1"
          error={errors.label?.message}
          {...register('label', { required: 'Label is required' })}
        />
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Add table'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function TableRow({ table, onViewQR }) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (isActive) =>
      api.patch(`/tables/${table._id}`, { isActive }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated');
    },
    onError: () => toast.error('Failed to update table'),
  });

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-ink/4 last:border-0 hover:bg-ink/1.5 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-mint/40 flex items-center justify-center shrink-0">
        <QrCode size={15} className="text-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{table.label}</p>
        <p className="text-xs text-ink-muted font-mono mt-0.5">{table.qrToken}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${table.isActive ? 'text-emerald-700' : 'text-ink-muted'}`}>
          {table.isActive ? 'Active' : 'Inactive'}
        </span>
        <Toggle
          checked={table.isActive}
          onChange={(val) => toggleMutation.mutate(val)}
          id={`table-toggle-${table._id}`}
        />
        <Button variant="outline" size="sm" onClick={() => onViewQR(table)}>
          <QrCode size={13} /> View QR
        </Button>
      </div>
    </div>
  );
}

// ── Branch group ──────────────────────────────────────────────────────────────
function BranchGroup({ branch, tables }) {
  const [collapsed, setCollapsed] = useState(false);
  const [qrTable, setQrTable] = useState(null);

  return (
    <div className="border border-ink/8 rounded-xl bg-white overflow-hidden mb-4">
      {/* Branch header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-ink/2 hover:bg-ink/4 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{branch.name}</span>
          <span className="text-xs text-ink-muted bg-ink/6 px-2 py-0.5 rounded-full">
            {tables.length} table{tables.length !== 1 ? 's' : ''}
          </span>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-ink-muted" /> : <ChevronUp size={16} className="text-ink-muted" />}
      </button>

      {!collapsed && (
        <>
          {tables.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-ink-muted">
                No tables in this branch yet — add one above.
              </p>
            </div>
          ) : (
            tables.map((t) => (
              <TableRow key={t._id} table={t} onViewQR={setQrTable} />
            ))
          )}
        </>
      )}

      <QRModal
        table={qrTable}
        open={!!qrTable}
        onClose={() => setQrTable(null)}
      />
    </div>
  );
}

// ── Main Tables page ──────────────────────────────────────────────────────────
export default function Tables() {
  const [addOpen, setAddOpen] = useState(false);
  const qc = useQueryClient();

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

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Tables & QR codes</h1>
          <p className="text-sm text-ink-muted mt-1">
            Each table has a unique QR code customers scan to order.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add table
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-ink-muted py-8">
          <Spinner /><span className="text-sm">Loading tables…</span>
        </div>
      ) : tables.length === 0 && branches.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No tables yet"
          description="Add your first table to generate a QR code that customers can scan to order."
          action={() => setAddOpen(true)}
          actionLabel="Add first table"
        />
      ) : branches.length === 0 ? (
        <div className="border border-amber/30 bg-amber/5 rounded-xl p-5 text-sm text-amber">
          No branches configured. Go to Settings to add a branch first.
        </div>
      ) : (
        grouped.map(({ branch, tables: bTables }) => (
          <BranchGroup key={branch._id} branch={branch} tables={bTables} />
        ))
      )}

      <AddTableModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        branches={branches}
      />
    </div>
  );
}
