import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  X, ImageOff, Check, GripVertical, Sparkles, Search, CheckCircle2,
  SlidersHorizontal, PackageOpen, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import Currency from '../components/ui/Currency';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';
import menuRecs from '../data/menuRecommendations.json';

// ── Category item ─────────────────────────────────────────────────────────────
function CategoryItem({ cat, isSelected, onClick, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-3 min-h-14 cursor-pointer rounded-xl mx-2 mb-1 transition-all border ${
        isSelected ? 'border-teal/20 bg-teal/10 text-teal font-semibold' : 'border-transparent hover:bg-ink/5 text-ink font-medium'
      }`}
    >
      <GripVertical size={14} className="text-ink/20 shrink-0" />
      <span className="flex-1 min-w-0 text-sm truncate">{cat.name}</span>
      <span className="text-[11px] text-ink-muted tabular-nums">{cat.productCount ?? cat.productsCount ?? ''}</span>
      <div className="flex items-center gap-0.5">
        {!isFirst && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="min-h-10 min-w-10 p-2 rounded-lg hover:bg-ink/8 text-ink-muted flex items-center justify-center"
            title="Move up"
          >
            <ChevronUp size={12} />
          </button>
        )}
        {!isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="min-h-10 min-w-10 p-2 rounded-lg hover:bg-ink/8 text-ink-muted flex items-center justify-center"
            title="Move down"
          >
            <ChevronDown size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="min-h-10 min-w-10 p-2 rounded-lg hover:bg-danger/10 text-ink-muted hover:text-danger flex items-center justify-center"
          title="Remove category"
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
            <span className="text-xs text-ink-muted px-1">+Br</span>
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

// ── Browse Recommended Products Modal ─────────────────────────────────────────
function BrowseRecommendedModal({ open, onClose, categoryName, onSelect }) {
  const [search, setSearch] = useState('');

  if (!open) return null;

  // Find matching category or fallback to all items
  const catData = menuRecs.categories.find(
    (c) => c.name.toLowerCase() === (categoryName || '').toLowerCase()
  );
  const items = catData ? catData.items : menuRecs.categories.flatMap((c) => c.items);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose} title={`Recommended items — ${categoryName || 'Menu'}`} size="md">
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${categoryName || 'recommended'} items…`}
            className="w-full pl-9 pr-3 py-2 text-xs border border-ink/12 rounded-xl focus:outline-none focus:border-teal bg-ink/2"
            autoFocus
          />
        </div>

        {/* Item list */}
        <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-ink-muted">
              <p className="text-xs">No matching items found.</p>
              <p className="text-[11px] text-ink/40 mt-1">Try a different search or type a custom product name directly.</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => { onSelect(item); onClose(); }}
                className="p-3 rounded-xl border border-ink/8 hover:border-teal/50 hover:bg-teal/5 cursor-pointer transition-all group flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-ink group-hover:text-teal transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <button
                  type="button"
                  className="px-2.5 py-1 bg-teal/10 text-teal text-[11px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  Use item
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Product slide-over panel ──────────────────────────────────────────────────
function ProductPanel({ product, selectedCategory, restaurantId, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEditing = !!product;
  const categoryId = selectedCategory?._id;
  const categoryName = selectedCategory?.name ?? '';

  const [browseOpen, setBrowseOpen] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const dropdownRef = useRef(null);

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
  const typedName = watch('name') || '';

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute category-prioritized suggestions
  const suggestions = (() => {
    const query = typedName.trim().toLowerCase();
    if (!query || query.length < 2) return { categoryItems: [], otherItems: [] };

    const currentCatData = menuRecs.categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    );

    const categoryItems = (currentCatData?.items ?? []).filter((item) =>
      item.name.toLowerCase().includes(query)
    ).sort((a, b) => {
      const aStart = a.name.toLowerCase().startsWith(query) ? -1 : 1;
      const bStart = b.name.toLowerCase().startsWith(query) ? -1 : 1;
      return aStart - bStart;
    });

    const otherItems = menuRecs.categories
      .filter((c) => c.name.toLowerCase() !== categoryName.toLowerCase())
      .flatMap((c) => c.items)
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 5);

    return { categoryItems: categoryItems.slice(0, 6), otherItems };
  })();

  const hasSuggestions = suggestions.categoryItems.length > 0 || suggestions.otherItems.length > 0;

  const handleSelectSuggestion = (item) => {
    setValue('name', item.name, { shouldDirty: true, shouldValidate: true });
    setValue('description', item.description, { shouldDirty: true });
    setShowAutocomplete(false);
    toast.success(`Autofilled "${item.name}"`);
  };

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

  const [activeIndex, setActiveIndex] = useState(-1);

  const allSuggestions = [...suggestions.categoryItems, ...suggestions.otherItems];

  const handleKeyDownCombobox = (e) => {
    if (!showAutocomplete || allSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % allSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + allSuggestions.length) % allSuggestions.length);
    } else if (e.key === 'Enter' && activeIndex >= 0 && allSuggestions[activeIndex]) {
      e.preventDefault();
      handleSelectSuggestion(allSuggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setActiveIndex(-1);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-[2px] z-20"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed inset-x-0 bottom-0 top-auto h-[92dvh] max-w-full rounded-t-3xl bg-white shadow-2xl z-50 flex flex-col lg:inset-y-0 lg:inset-x-auto lg:right-0 lg:top-0 lg:bottom-auto lg:h-screen lg:max-h-screen lg:w-[480px] lg:rounded-none"
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
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {/* Product Name Field + Autocomplete Combobox */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-ink-muted">Product name</label>
              <button
                type="button"
                onClick={() => setBrowseOpen(true)}
                className="text-[11px] text-teal hover:text-teal/80 font-semibold flex items-center gap-1"
              >
                <Sparkles size={12} /> Browse recommended items
              </button>
            </div>
            <Input
              placeholder="e.g. Grilled Chicken Burger"
              error={errors.name?.message}
              role="combobox"
              aria-expanded={showAutocomplete && hasSuggestions}
              aria-autocomplete="list"
              aria-controls="product-name-suggestions"
              {...register('name', { required: 'Name is required' })}
              onFocus={() => { setShowAutocomplete(true); setActiveIndex(-1); }}
              onKeyDown={handleKeyDownCombobox}
              onChange={(e) => {
                register('name').onChange(e);
                setShowAutocomplete(true);
                setActiveIndex(-1);
              }}
            />

            {/* Autocomplete Dropdown */}
            {showAutocomplete && hasSuggestions && (
              <div
                id="product-name-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-ink/10 z-40 max-h-60 overflow-y-auto py-1"
              >
                {suggestions.categoryItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-3 py-1 bg-ink/3">
                      From {categoryName || 'Category'}
                    </p>
                    {suggestions.categoryItems.map((item, idx) => {
                      const itemFlatIndex = idx;
                      const isActive = activeIndex === itemFlatIndex;
                      return (
                        <div
                          key={idx}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`px-3 py-2 cursor-pointer transition-colors ${
                            isActive ? 'bg-teal/15 text-teal font-medium' : 'hover:bg-teal/8'
                          }`}
                        >
                          <p className="text-xs font-bold text-ink">{item.name}</p>
                          <p className="text-[11px] text-ink-muted truncate">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {suggestions.otherItems.length > 0 && (
                  <div className="border-t border-ink/6">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-3 py-1 bg-ink/3">
                      Other suggestions
                    </p>
                    {suggestions.otherItems.map((item, idx) => {
                      const itemFlatIndex = suggestions.categoryItems.length + idx;
                      const isActive = activeIndex === itemFlatIndex;
                      return (
                        <div
                          key={idx}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelectSuggestion(item)}
                          className={`px-3 py-2 cursor-pointer transition-colors ${
                            isActive ? 'bg-teal/15 text-teal font-medium' : 'hover:bg-teal/8'
                          }`}
                        >
                          <p className="text-xs font-medium text-ink">{item.name}</p>
                          <p className="text-[11px] text-ink-muted truncate">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description for customers…"
              className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/15"
              {...register('description')}
            />
          </div>

          {/* Price */}
          <Input
            label="Price (Br)"
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

          {/* Available toggle */}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
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
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-ink/8 bg-white">
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

      {/* Browse modal */}
      <BrowseRecommendedModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        categoryName={categoryName}
        onSelect={(item) => {
          setValue('name', item.name, { shouldDirty: true, shouldValidate: true });
          setValue('description', item.description, { shouldDirty: true });
          toast.success(`Selected "${item.name}"`);
        }}
      />

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

// ── Add Category Modal with Recommended Picker ─────────────────────────────────
function AddCategoryModal({ open, onClose, existingCategories, onCategoryAdded }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState('recommended'); // 'recommended' or 'custom'
  const [search, setSearch] = useState('');
  const [selectedRecs, setSelectedRecs] = useState([]);
  const [customName, setCustomName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!open) return null;

  const existingNamesLower = existingCategories.map((c) => c.name.toLowerCase());

  const filteredCategories = menuRecs.categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectRec = (name) => {
    setSelectedRecs((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleAddRecommended = async () => {
    if (selectedRecs.length === 0) return;
    try {
      setIsAdding(true);
      let addedCount = 0;

      for (let i = 0; i < selectedRecs.length; i++) {
        const catName = selectedRecs[i];
        const nextOrder = existingCategories.length + i + 1;
        const res = await api.post('/categories', { name: catName, sortOrder: nextOrder });
        if (i === 0 && onCategoryAdded && res.data?.category) {
          onCategoryAdded(res.data.category);
        }
        addedCount += 1;
      }

      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Added ${addedCount} categor${addedCount === 1 ? 'y' : 'ies'}`);
      setSelectedRecs([]);
      setSearch('');
      onClose();
    } catch (err) {
      toast.error('Failed to add categories');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddCustom = async (e) => {
    e.preventDefault();
    if (!customName.trim()) return;
    try {
      setIsAdding(true);
      const res = await api.post('/categories', { name: customName.trim() });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Added category "${customName.trim()}"`);
      if (onCategoryAdded && res.data?.category) {
        onCategoryAdded(res.data.category);
      }
      setCustomName('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add category" size="md">
      <div className="space-y-4">
        {/* Mode Toggle Tabs */}
        <div className="flex p-0.5 bg-ink/6 rounded-xl border border-ink/8">
          <button
            type="button"
            onClick={() => setMode('recommended')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'recommended' ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Sparkles size={13} className={mode === 'recommended' ? 'text-teal' : ''} />
            Choose from recommended
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'custom' ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Plus size={13} />
            Custom category
          </button>
        </div>

        {mode === 'recommended' ? (
          /* Recommended Picker Mode */
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-ink-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recommended categories…"
                className="w-full pl-9 pr-3 py-2 text-xs border border-ink/12 rounded-xl focus:outline-none focus:border-teal bg-ink/2"
              />
            </div>

            {/* Category chips grid */}
            <div className="max-h-[300px] overflow-y-auto grid grid-cols-2 gap-2 p-1">
              {filteredCategories.length === 0 ? (
                <div className="col-span-2 text-center py-6 text-ink-muted">
                  <p className="text-xs">No matching categories found.</p>
                  <button
                    type="button"
                    onClick={() => { setMode('custom'); setCustomName(search); }}
                    className="text-xs text-teal font-semibold mt-1 hover:underline"
                  >
                    Create custom category "{search}"
                  </button>
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isExisting = existingNamesLower.includes(cat.name.toLowerCase());
                  const isSelected = selectedRecs.includes(cat.name);

                  if (isExisting) {
                    return (
                      <div
                        key={cat.name}
                        className="px-3 py-2 rounded-xl border border-ink/8 bg-ink/3 text-ink/40 text-xs font-medium flex items-center justify-between cursor-not-allowed select-none"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-ink/40 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Added
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.name}
                      onClick={() => toggleSelectRec(cat.name)}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal bg-teal/10 text-teal shadow-2xs'
                          : 'border-ink/10 bg-white hover:border-ink/20 text-ink'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="accent-teal rounded"
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-ink/8">
              <span className="text-xs text-ink-muted">
                {selectedRecs.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddRecommended}
                  disabled={selectedRecs.length === 0 || isAdding}
                >
                  {isAdding ? 'Adding…' : `Add selected (${selectedRecs.length})`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Custom Category Mode */
          <form onSubmit={handleAddCustom} className="space-y-4 pt-1">
            <Input
              label="Category name"
              placeholder="e.g. Daily Chef Specials"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/8">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!customName.trim() || isAdding}>
                {isAdding ? 'Creating…' : 'Create category'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
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
    <article className="border border-ink/8 rounded-2xl bg-white overflow-hidden hover:border-ink/16 transition-colors group shadow-xs">
      {/* Image area */}
      <div
        onClick={() => onEdit(product)}
        className="h-40 sm:h-36 bg-ink/4 flex items-center justify-center cursor-pointer relative"
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
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p
            className="text-sm font-semibold text-ink leading-tight cursor-pointer hover:text-teal transition-colors"
            onClick={() => onEdit(product)}
          >
            {product.name}
          </p>
          <span className="text-sm font-bold text-ink shrink-0">
            <Currency value={product.price} />
          </span>
        </div>
        {product.modifierGroups?.length > 0 && (
          <p className="text-xs text-ink-muted mb-2">
            {product.modifierGroups.length} modifier group{product.modifierGroups.length !== 1 ? 's' : ''}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-ink/6">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${product.isAvailable ? 'text-emerald-700' : 'text-ink-muted'}`}
          >
            {product.isAvailable ? <Eye size={13} /> : <EyeOff size={13} />}
            {product.isAvailable ? 'Available' : 'Hidden'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(product)}
              aria-label={`Edit ${product.name}`}
              className="min-h-10 min-w-10 rounded-lg text-ink-muted hover:bg-ink/6 flex items-center justify-center"
            >
              <Pencil size={15} />
            </button>
            <Toggle checked={product.isAvailable} onChange={(val) => toggleMutation.mutate(val)} id={`toggle-${product._id}`} />
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Main Menu page ────────────────────────────────────────────────────────────
export default function Menu() {
  const [selectedCat, setSelectedCat] = useState(null);
  const [mobileCategoryList, setMobileCategoryList] = useState(true);
  const [panelProduct, setPanelProduct] = useState(undefined); // undefined=closed, null=new
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
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
  const visibleProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    const matchesSearch = !query
      || product.name.toLowerCase().includes(query)
      || (product.description || '').toLowerCase().includes(query);
    const matchesFilter = productFilter === 'all'
      || (productFilter === 'available' && product.isAvailable)
      || (productFilter === 'hidden' && !product.isAvailable)
      || (productFilter === 'modifiers' && product.modifierGroups?.length > 0);
    return matchesSearch && matchesFilter;
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
    <div className="flex flex-col lg:flex-row h-full bg-paper" style={{ height: 'calc(100vh - 0px)' }}>
      {/* ── Left: Categories (full width on mobile, fixed width on md+) ───────────────── */}
      <div className={`w-full lg:w-64 shrink-0 border-r border-ink/8 flex-col bg-white ${mobileCategoryList ? 'flex' : 'hidden'} lg:flex`}>
        <div className="px-4 py-5 border-b border-ink/8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display font-semibold text-xl text-ink">Menu</h1>
              <p className="text-xs text-ink-muted mt-1">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · Organize your offerings</p>
            </div>
            <PackageOpen size={22} className="text-teal/70 mt-1" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {catsLoading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-xs text-ink-muted">No categories yet.</p>
              <p className="text-xs text-ink/40 mt-0.5">Add your first one below.</p>
            </div>
          ) : (
            categories.map((cat, idx) => (
              <CategoryItem
                key={cat._id}
                cat={cat}
                isSelected={selectedCat?._id === cat._id}
                onClick={() => {
                  setSelectedCat(cat);
                  setMobileCategoryList(false);
                }}
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

        {/* Add category button */}
        <div className="px-3 py-3 border-t border-ink/8">
          <button
            onClick={() => setAddCategoryOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal hover:bg-teal/8 border border-teal/30 rounded-lg transition-colors shadow-2xs"
          >
            <Plus size={13} /> Add category
          </button>
        </div>
      </div>

      {/* ── Right: Products ───────────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto ${mobileCategoryList ? 'hidden' : 'block'} lg:block`}>
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
          <div className="px-4 sm:px-6 lg:px-8 py-5 lg:py-7 max-w-[1200px]">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileCategoryList(true)}
                  className="lg:hidden mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal"
                >
                  <ArrowLeft size={16} /> Categories
                </button>
                <h2 className="font-display font-semibold text-2xl text-ink truncate">{selectedCat.name}</h2>
                <p className="text-sm text-ink-muted mt-0.5">
                  {visibleProducts.length} of {products.length} product{products.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button className="hidden lg:inline-flex shrink-0" onClick={() => setPanelProduct(null)}>
                <Plus size={15} /> Add product
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-ink-muted" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-full min-h-11 pl-9 pr-3 rounded-xl border border-ink/10 bg-white text-sm focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  ['all', 'All'],
                  ['available', 'Available'],
                  ['hidden', 'Hidden'],
                  ['modifiers', 'Modifiers'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setProductFilter(value)}
                    className={`min-h-11 px-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
                      productFilter === value ? 'border-teal bg-teal/10 text-teal' : 'border-ink/10 bg-white text-ink-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/12 bg-white py-14 px-5 text-center">
                <SlidersHorizontal size={28} className="mx-auto text-ink/25" />
                <p className="text-sm font-semibold text-ink mt-3">No matching products</p>
                <p className="text-xs text-ink-muted mt-1">Try a different search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleProducts.map((p) => (
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
          selectedCategory={selectedCat}
          restaurantId={restaurant?._id}
          onClose={() => setPanelProduct(undefined)}
          onSaved={() => setPanelProduct(undefined)}
        />
      )}

      {/* ── Add Category Modal with Recommended Picker ────────────────── */}
      <AddCategoryModal
        open={addCategoryOpen}
        onClose={() => setAddCategoryOpen(false)}
        existingCategories={categories}
        onCategoryAdded={(newCat) => {
          setSelectedCat(newCat);
          setMobileCategoryList(false);
        }}
      />

      {/* FAB: primary add action on mobile/tablet (placed above bottom tab bar) */}
      {mobileCategoryList && <button
        type="button"
        onClick={() => setAddCategoryOpen(true)}
        aria-label="Add category"
        className="lg:hidden fixed right-4 z-50 rounded-full flex items-center justify-center shadow-lg text-white"
        style={{
          width: '56px',
          height: '56px',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
          background: 'var(--color-primary)'
        }}
      >
        <Plus size={20} />
      </button>}
      {!mobileCategoryList && (
        <button
          type="button"
          onClick={() => setPanelProduct(null)}
          aria-label={`Add product to ${selectedCat?.name || 'category'}`}
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
      )}
    </div>
  );
}

// Tiny inline icon wrapper
function UtensilsCrossedIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
      <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>
    </svg>
  );
}
