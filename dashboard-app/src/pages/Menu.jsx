import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  X, ImageOff, Check, GripVertical,
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

// ── Category item ─────────────────────────────────────────────────────────────
function CategoryItem({ cat, isSelected, onClick, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-lg mx-2 mb-0.5 transition-all ${
        isSelected ? 'bg-teal/10 text-teal' : 'hover:bg-ink/5 text-ink'
      }`}
    >
      <GripVertical size={14} className="text-ink/20 shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{cat.name}</span>
      <div className="hidden group-hover:flex items-center gap-0.5">
        {!isFirst && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="p-1 rounded hover:bg-ink/8 text-ink-muted"
          >
            <ChevronUp size={12} />
          </button>
        )}
        {!isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="p-1 rounded hover:bg-ink/8 text-ink-muted"
          >
            <ChevronDown size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-danger/10 text-ink-muted hover:text-danger"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Modifier group options sub-form ───────────────────────────────────────────
function OptionsFieldArray({ groupIndex, control, register }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `modifierGroups.${groupIndex}.options`,
  });

  return (
    <div className="mt-2 space-y-1.5">
      {fields.map((field, optIdx) => (
        <div key={field.id} className="flex items-center gap-2">
          <input
            {...register(`modifierGroups.${groupIndex}.options.${optIdx}.name`)}
            placeholder="Option name"
            className="flex-1 px-2.5 py-1.5 text-xs border border-ink/12 rounded-lg focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/15"
          />
          <div className="flex items-center">
            <span className="text-xs text-ink-muted px-1">+$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register(`modifierGroups.${groupIndex}.options.${optIdx}.priceDelta`, { valueAsNumber: true })}
              placeholder="0.00"
              className="w-16 px-2 py-1.5 text-xs border border-ink/12 rounded-lg focus:outline-none focus:border-teal"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(optIdx)}
            className="p-1 text-ink/30 hover:text-danger rounded"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => append({ name: '', priceDelta: 0 })}
        className="text-xs text-teal hover:text-teal/80 font-medium flex items-center gap-1 mt-1"
      >
        <Plus size={12} /> Add option
      </button>
    </div>
  );
}

// ── Product slide-over panel ──────────────────────────────────────────────────
function ProductPanel({ product, categoryId, restaurantId, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEditing = !!product;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: product
      ? {
          name: product.name,
          description: product.description ?? '',
          price: product.price,
          isAvailable: product.isAvailable,
          modifierGroups: product.modifierGroups ?? [],
        }
      : {
          name: '',
          description: '',
          price: '',
          isAvailable: true,
          modifierGroups: [],
        },
  });

  const { fields: groupFields, append: addGroup, remove: removeGroup } = useFieldArray({
    control,
    name: 'modifierGroups',
  });

  const isAvailable = watch('isAvailable');

  const saveMutation = useMutation({
    mutationFn: (body) =>
      isEditing
        ? api.patch(`/products/${product._id}`, body).then((r) => r.data)
        : api.post('/products', { ...body, categoryId, restaurantId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(isEditing ? 'Product updated' : 'Product created');
      onSaved();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/${product._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product removed from menu');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  });

  const onSubmit = (data) => saveMutation.mutate({ ...data, price: Number(data.price) });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-20"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-30 flex flex-col"
        style={{ animation: 'slide-in 200ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
          <h2 className="font-display font-semibold text-lg text-ink">
            {isEditing ? 'Edit product' : 'Add product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Basic info */}
          <Input
            label="Product name"
            placeholder="e.g. Grilled Chicken Burger"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description for customers…"
              className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/15"
              {...register('description')}
            />
          </div>
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.price?.message}
            {...register('price', {
              required: 'Price is required',
              min: { value: 0, message: 'Price must be 0 or more' },
            })}
          />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-ink">Available on menu</p>
              <p className="text-xs text-ink-muted">Customers can see and order this item</p>
            </div>
            <Toggle
              checked={isAvailable}
              onChange={(val) => setValue('isAvailable', val)}
              id="product-available"
            />
          </div>

          {/* Modifier groups */}
          <div className="border-t border-ink/8 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-ink">Modifier groups</p>
                <p className="text-xs text-ink-muted">e.g. Size, Spice level, Add-ons</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  addGroup({
                    name: '',
                    required: false,
                    minSelect: 0,
                    maxSelect: 1,
                    options: [{ name: '', priceDelta: 0 }],
                  })
                }
              >
                <Plus size={13} /> Add group
              </Button>
            </div>

            {groupFields.length === 0 && (
              <p className="text-xs text-ink/40 text-center py-4 border border-dashed border-ink/12 rounded-lg">
                No modifier groups — add one above if this product has customisations.
              </p>
            )}

            <div className="space-y-4">
              {groupFields.map((group, gIdx) => (
                <div key={group.id} className="border border-ink/10 rounded-xl p-4 bg-ink/1.5">
                  <div className="flex items-start gap-2 mb-3">
                    <input
                      {...register(`modifierGroups.${gIdx}.name`)}
                      placeholder="Group name (e.g. Spice level)"
                      className="flex-1 px-2.5 py-1.5 text-sm border border-ink/12 rounded-lg focus:outline-none focus:border-teal"
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(gIdx)}
                      className="p-1.5 text-ink/30 hover:text-danger rounded-lg"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                      <input
                        type="checkbox"
                        {...register(`modifierGroups.${gIdx}.required`)}
                        className="accent-teal"
                      />
                      Required
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-ink-muted">Min</span>
                      <input
                        type="number"
                        min="0"
                        {...register(`modifierGroups.${gIdx}.minSelect`, { valueAsNumber: true })}
                        className="w-12 px-1.5 py-1 text-xs border border-ink/12 rounded focus:outline-none focus:border-teal"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-ink-muted">Max</span>
                      <input
                        type="number"
                        min="1"
                        {...register(`modifierGroups.${gIdx}.maxSelect`, { valueAsNumber: true })}
                        className="w-12 px-1.5 py-1 text-xs border border-ink/12 rounded focus:outline-none focus:border-teal"
                      />
                    </div>
                  </div>

                  <div className="border-t border-ink/8 pt-2">
                    <p className="text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-2">
                      Options
                    </p>
                    <OptionsFieldArray groupIndex={gIdx} control={control} register={register} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink/8">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { if (confirm('Remove this product?')) deleteMutation.mutate(); }}
              className="text-danger hover:text-danger hover:bg-danger/8"
            >
              <Trash2 size={14} /> Remove
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="product-form"
              size="sm"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Add product'}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit }) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (val) =>
      api.patch(`/products/${product._id}`, { isAvailable: val }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: () => toast.error('Failed to update availability'),
  });

  return (
    <div className="border border-ink/8 rounded-xl bg-white overflow-hidden hover:border-ink/16 transition-colors group">
      {/* Image area */}
      <div
        onClick={() => onEdit(product)}
        className="h-36 bg-ink/4 flex items-center justify-center cursor-pointer relative"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageOff size={28} className="text-ink/20" strokeWidth={1.5} />
        )}
        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 rounded-full p-2 shadow">
            <Pencil size={14} className="text-ink" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p
            className="text-sm font-semibold text-ink leading-tight cursor-pointer hover:text-teal transition-colors"
            onClick={() => onEdit(product)}
          >
            {product.name}
          </p>
          <span className="text-sm font-bold text-ink shrink-0">
            ${product.price.toFixed(2)}
          </span>
        </div>
        {product.modifierGroups?.length > 0 && (
          <p className="text-xs text-ink-muted mb-2">
            {product.modifierGroups.length} modifier group{product.modifierGroups.length !== 1 ? 's' : ''}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium ${product.isAvailable ? 'text-emerald-700' : 'text-ink-muted'}`}
          >
            {product.isAvailable ? 'Available' : 'Hidden'}
          </span>
          <Toggle
            checked={product.isAvailable}
            onChange={(val) => toggleMutation.mutate(val)}
            id={`toggle-${product._id}`}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Menu page ────────────────────────────────────────────────────────────
export default function Menu() {
  const [selectedCat, setSelectedCat] = useState(null);
  const [panelProduct, setPanelProduct] = useState(undefined); // undefined=closed, null=new
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const qc = useQueryClient();
  const { restaurant } = useAuthStore();

  // Categories
  const { data: catData, isLoading: catsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });
  const categories = catData?.categories ?? [];

  // Products for selected category
  const { data: prodData, isLoading: prodsLoading } = useQuery({
    queryKey: ['products', selectedCat?._id],
    queryFn: () =>
      api.get('/products', { params: { categoryId: selectedCat._id } }).then((r) => r.data),
    enabled: !!selectedCat,
  });
  const products = prodData?.products ?? [];

  // Mutations
  const addCatMutation = useMutation({
    mutationFn: (name) => api.post('/categories', { name }).then((r) => r.data),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setNewCatName('');
      setAddingCat(false);
      setSelectedCat(d.category);
      toast.success('Category added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add category'),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setSelectedCat((prev) => (prev?._id === deletedId ? null : prev));
      toast.success('Category removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove category'),
  });

  const moveCatMutation = useMutation({
    mutationFn: ({ id, sortOrder }) =>
      api.patch(`/categories/${id}`, { sortOrder }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleMoveUp = (idx) => {
    const cat = categories[idx];
    const above = categories[idx - 1];
    Promise.all([
      moveCatMutation.mutateAsync({ id: cat._id, sortOrder: above.sortOrder }),
      moveCatMutation.mutateAsync({ id: above._id, sortOrder: cat.sortOrder }),
    ]);
  };

  const handleMoveDown = (idx) => {
    const cat = categories[idx];
    const below = categories[idx + 1];
    Promise.all([
      moveCatMutation.mutateAsync({ id: cat._id, sortOrder: below.sortOrder }),
      moveCatMutation.mutateAsync({ id: below._id, sortOrder: cat.sortOrder }),
    ]);
  };

  const isPanelOpen = panelProduct !== undefined;

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 0px)' }}>
      {/* ── Left: Categories ─────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-ink/8 flex flex-col bg-white">
        <div className="px-4 py-4 border-b border-ink/8">
          <h2 className="font-display font-semibold text-base text-ink">Menu</h2>
          <p className="text-xs text-ink-muted mt-0.5">Select a category</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {catsLoading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs text-ink-muted">No categories yet.</p>
              <p className="text-xs text-ink/40 mt-0.5">Add your first one below.</p>
            </div>
          ) : (
            categories.map((cat, idx) => (
              <CategoryItem
                key={cat._id}
                cat={cat}
                isSelected={selectedCat?._id === cat._id}
                onClick={() => setSelectedCat(cat)}
                onDelete={() => {
                  if (confirm(`Remove category "${cat.name}"?`)) {
                    deleteCatMutation.mutate(cat._id);
                  }
                }}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)}
                isFirst={idx === 0}
                isLast={idx === categories.length - 1}
              />
            ))
          )}
        </div>

        {/* Add category */}
        <div className="px-3 py-3 border-t border-ink/8">
          {addingCat ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCatName.trim()) addCatMutation.mutate(newCatName.trim());
                  if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); }
                }}
                placeholder="Category name…"
                className="flex-1 px-2.5 py-1.5 text-xs border border-ink/12 rounded-lg focus:outline-none focus:border-teal"
              />
              <button
                onClick={() => newCatName.trim() && addCatMutation.mutate(newCatName.trim())}
                className="p-1.5 bg-teal text-white rounded-lg hover:bg-teal/90"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => { setAddingCat(false); setNewCatName(''); }}
                className="p-1.5 text-ink-muted rounded-lg hover:bg-ink/8"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCat(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-ink-muted hover:text-teal rounded-lg hover:bg-teal/6 transition-colors"
            >
              <Plus size={13} /> Add category
            </button>
          )}
        </div>
      </div>

      {/* ── Right: Products ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selectedCat ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <UtensilsCrossedIcon />
              <p className="text-sm font-medium text-ink mt-3">Select a category</p>
              <p className="text-xs text-ink-muted mt-1 max-w-xs">
                Choose a category on the left to view and manage its products.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 max-w-[1000px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-semibold text-xl text-ink">{selectedCat.name}</h2>
                <p className="text-sm text-ink-muted mt-0.5">
                  {products.length} product{products.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button onClick={() => setPanelProduct(null)}>
                <Plus size={15} /> Add product
              </Button>
            </div>

            {prodsLoading ? (
              <div className="flex items-center gap-3 py-8 text-ink-muted">
                <Spinner /><span className="text-sm">Loading products…</span>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="No products yet"
                description={`Add your first product to the ${selectedCat.name} category to get started.`}
                action={() => setPanelProduct(null)}
                actionLabel="Add first product"
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} onEdit={setPanelProduct} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product side panel ────────────────────────────────────────── */}
      {isPanelOpen && (
        <ProductPanel
          product={panelProduct ?? null}
          categoryId={selectedCat?._id}
          restaurantId={restaurant?._id}
          onClose={() => setPanelProduct(undefined)}
          onSaved={() => setPanelProduct(undefined)}
        />
      )}
    </div>
  );
}

// Tiny inline icon wrappers to avoid import issues
function UtensilsCrossedIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>
    </svg>
  );
}
