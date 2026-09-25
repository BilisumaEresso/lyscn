import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, UserPlus, Shield, ShieldCheck, ChefHat, Utensils,
  Check, Copy, AlertCircle, UserX, UserCheck, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: ShieldCheck,
    bg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    description: 'Full restaurant ownership & settings',
  },
  manager: {
    label: 'Manager',
    icon: Shield,
    bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    description: 'Menu, tables, orders & staff oversight',
  },
  kitchen: {
    label: 'Kitchen',
    icon: ChefHat,
    bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    description: 'Kitchen display system & order status',
  },
  waiter: {
    label: 'Floor / Waiter',
    icon: Utensils,
    bg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    description: 'Order management & guest assistance',
  },
};

export default function Staff() {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();

  const isOwner = currentUser?.role === 'owner';
  const isManager = currentUser?.role === 'manager';
  const canManage = isOwner || isManager;

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'waiter',
    password: '',
  });

  // Query users
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: canManage,
  });

  const users = data?.users || [];

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (body) => api.post('/users', body).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member created successfully!');
      setAddModalOpen(false);
      if (res.tempPassword) {
        setCreatedCredentials({
          email: res.user.email,
          password: res.tempPassword,
        });
      }
      setFormData({ name: '', email: '', role: 'waiter', password: '' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create staff member.');
    },
  });

  // Update role/status mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => api.patch(`/users/${id}`, updates).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member updated.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Update failed.');
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff member deactivated.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Deactivation failed.');
    },
  });

  if (!canManage) {
    return (
      <div className="p-8">
        <EmptyState
          icon={AlertCircle}
          title="Restricted Access"
          description="Only restaurant owners and managers have permission to manage team members."
        />
      </div>
    );
  }

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `LayoScan Login Credentials:\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Credentials copied to clipboard!');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
      ...(formData.password.trim() && { password: formData.password.trim() }),
    });
  };

  return (
    <div className="px-6 py-6 lg:pt-14 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-ink/8">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Staff & Team</h1>
          <p className="text-sm text-ink-muted mt-1">
            Manage your kitchen, floor, and management team access.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2">
          <UserPlus size={16} />
          Add Staff Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Team', count: users.length, icon: Users, color: 'text-ink' },
          {
            label: 'Managers',
            count: users.filter((u) => u.role === 'manager').length,
            icon: Shield,
            color: 'text-blue-500',
          },
          {
            label: 'Kitchen Crew',
            count: users.filter((u) => u.role === 'kitchen').length,
            icon: ChefHat,
            color: 'text-amber-500',
          },
          {
            label: 'Floor Staff',
            count: users.filter((u) => u.role === 'waiter').length,
            icon: Utensils,
            color: 'text-teal',
          },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-ink/8 shadow-xs">
            <div className="flex items-center justify-between text-ink-muted mb-1.5">
              <span className="text-xs font-medium">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className="font-display font-semibold text-2xl text-ink">{count}</p>
          </div>
        ))}
      </div>

      {/* Credentials Banner */}
      {createdCredentials && (
        <div className="bg-teal/10 border border-teal/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal text-white flex items-center justify-center shrink-0">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">Temporary Login Credentials Generated</p>
              <p className="text-xs text-ink-muted font-mono mt-0.5">
                {createdCredentials.email} • Password: <span className="bg-black/5 px-1.5 py-0.5 rounded font-semibold text-ink">{createdCredentials.password}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="sm" variant="outline" onClick={handleCopyCredentials} className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
              {copied ? <Check size={14} className="text-teal" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy Credentials'}
            </Button>
            <button
              onClick={() => setCreatedCredentials(null)}
              className="text-xs text-ink-muted hover:text-ink px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-ink/8 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-ink-muted">Loading team members…</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 text-center text-danger text-sm">
            Failed to load team members. Please refresh the page.
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members yet"
            description="Add your first manager, kitchen cook, or waiter to start delegating orders."
            action={() => setAddModalOpen(true)}
            actionLabel="Add Staff Member"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/8 bg-ink/2 text-ink-muted text-xs uppercase font-medium">
                  <th className="py-3 px-6">Member</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Joined</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/6">
                {users.map((staff) => {
                  const roleMeta = ROLE_CONFIG[staff.role] || ROLE_CONFIG.waiter;
                  const isCurrentAccount = staff._id === currentUser?.userId || staff.email === currentUser?.email;
                  const isStaffOwner = staff.role === 'owner';

                  return (
                    <tr key={staff._id} className="hover:bg-ink/1 transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-ink/5 text-ink font-semibold text-xs flex items-center justify-center shrink-0">
                            {staff.name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-ink flex items-center gap-1.5">
                              {staff.name}
                              {isCurrentAccount && (
                                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-ink/6 text-ink-muted">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-muted font-mono">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        {isOwner && !isStaffOwner ? (
                          <select
                            value={staff.role}
                            onChange={(e) =>
                              updateMutation.mutate({
                                id: staff._id,
                                updates: { role: e.target.value },
                              })
                            }
                            className="text-xs font-medium bg-ink/4 hover:bg-ink/8 border border-ink/8 rounded-lg px-2.5 py-1 text-ink focus:outline-none focus:ring-2 focus:ring-teal"
                          >
                            <option value="manager">Manager</option>
                            <option value="kitchen">Kitchen</option>
                            <option value="waiter">Floor / Waiter</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleMeta.bg}`}>
                            <roleMeta.icon size={13} />
                            {roleMeta.label}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-muted font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-ink/30" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-xs text-ink-muted">
                        {staff.createdAt
                          ? new Date(staff.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        {isOwner && !isStaffOwner && !isCurrentAccount && (
                          <div className="flex items-center justify-end gap-1">
                            {staff.isActive ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Deactivate ${staff.name}? They will not be able to log in.`)) {
                                    deactivateMutation.mutate(staff._id);
                                  }
                                }}
                                className="p-1.5 text-ink-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                title="Deactivate staff member"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: staff._id,
                                    updates: { isActive: true },
                                  })
                                }
                                className="p-1.5 text-ink-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Reactivate staff member"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Team Member"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Chef Mario"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="mario@restaurant.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Role & Permissions
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'manager', label: 'Manager', icon: Shield },
                { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                { id: 'waiter', label: 'Waiter', icon: Utensils },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setFormData({ ...formData, role: id })}
                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                    formData.role === id
                      ? 'border-teal bg-teal/10 text-teal font-medium shadow-xs'
                      : 'border-ink/8 text-ink-muted hover:border-ink/20 hover:text-ink'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Initial Password (Optional)"
            type="password"
            placeholder="Leave blank to auto-generate"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            helperText="If blank, a secure temporary password will be generated for you to share."
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
