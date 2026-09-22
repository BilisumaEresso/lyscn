import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, Link as LinkIcon, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../lib/api';

/**
 * ImageUploader component for LayoScan dashboard.
 * Supports direct drag-and-drop upload to Cloudinary via backend (/api/upload),
 * as well as direct URL paste input.
 */
export default function ImageUploader({
  value = '',
  onChange,
  folder = 'media',
  label,
  description,
  aspectRatio = 'square', // 'square' | 'banner' | 'auto'
  className = '',
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPEG, PNG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.url) {
        onChange(res.data.url);
        toast.success('Image uploaded to Cloudinary');
      } else {
        toast.error('Upload failed. Please try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload image to Cloudinary';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUrlApply = () => {
    if (urlDraft.trim()) {
      onChange(urlDraft.trim());
      setUrlDraft('');
      setShowUrlInput(false);
      toast.success('Image URL set');
    }
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="text-[11px] text-teal hover:underline flex items-center gap-1 font-medium"
          >
            <LinkIcon size={12} />
            {showUrlInput ? 'Upload file' : 'Paste URL'}
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
        className="hidden"
      />

      {showUrlInput ? (
        /* Manual URL paste mode */
        <div className="flex gap-2">
          <input
            type="text"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://res.cloudinary.com/... or image link"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-ink/15 bg-paper focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
          <button
            type="button"
            onClick={handleUrlApply}
            disabled={!urlDraft.trim()}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal text-white hover:opacity-90 disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      ) : value ? (
        /* Preview mode with existing image */
        <div className="relative group rounded-2xl border border-ink/12 overflow-hidden bg-ink/4 shadow-xs">
          <div
            className={clsx(
              'w-full relative flex items-center justify-center bg-ink/2 overflow-hidden',
              aspectRatio === 'banner' ? 'h-36' : aspectRatio === 'square' ? 'h-32' : 'h-40'
            )}
          >
            <img
              src={value}
              alt="Uploaded thumbnail"
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-ink/60 backdrop-blur-xs flex items-center justify-center text-white gap-2 text-xs font-medium">
                <Loader2 size={18} className="animate-spin text-teal" />
                Uploading…
              </div>
            )}
          </div>

          {/* Hover overlay actions */}
          <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-ink text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <RefreshCw size={13} /> Change
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-lg bg-danger/90 hover:bg-danger text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        </div>
      ) : (
        /* Upload Drag & Drop Dropzone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer flex flex-col items-center justify-center text-center group',
            aspectRatio === 'banner' ? 'h-32' : 'h-28',
            isDragOver
              ? 'border-teal bg-teal/5 scale-[1.01]'
              : 'border-ink/15 hover:border-teal/50 hover:bg-ink/2 bg-paper'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-teal">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-semibold">Uploading to Cloudinary…</span>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-ink/6 group-hover:bg-teal/10 flex items-center justify-center mb-1.5 transition-colors">
                <Upload size={18} className="text-ink/50 group-hover:text-teal transition-colors" />
              </div>
              <p className="text-xs font-semibold text-ink group-hover:text-teal transition-colors">
                Click or drag image to upload
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                PNG, JPG, WebP up to 5MB · Cloudinary auto-optimized
              </p>
            </>
          )}
        </div>
      )}

      {description && <p className="text-xs text-ink-muted leading-snug">{description}</p>}
    </div>
  );
}
