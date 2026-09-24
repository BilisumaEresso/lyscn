import { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Loader2, RefreshCw, Cloud, CheckCircle2, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../lib/api';

/**
 * ImageUploader component for LayoScan dashboard.
 * Dedicated direct-to-Cloudinary image uploader.
 * Uploads image files directly to the server's Cloudinary storage (/api/upload)
 * and stores the resulting public Cloudinary URL.
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
  const [hasImgError, setHasImgError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setHasImgError(false);
  }, [value]);

  const isCloudinaryUrl = typeof value === 'string' && value.includes('res.cloudinary.com');

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
        toast.success('Image uploaded directly to Cloudinary');
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

  const handleRemove = () => {
    onChange('');
    toast.success('Image removed');
  };

  return (
    <div className={clsx('space-y-2', className)}>
      {/* Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            {label}
          </label>
          {value && (
            <span className="inline-flex items-center gap-1 text-[11px] text-teal font-medium">
              <Cloud size={12} />
              {isCloudinaryUrl ? 'Cloudinary Hosted' : 'Image Set'}
            </span>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
        className="hidden"
      />

      {value ? (
        /* Preview mode with active image */
        <div className="space-y-2.5">
          <div className="relative group rounded-2xl border border-ink/12 overflow-hidden bg-ink/4 shadow-xs">
            <div
              className={clsx(
                'w-full relative flex items-center justify-center bg-ink/2 overflow-hidden',
                aspectRatio === 'banner' ? 'h-40' : aspectRatio === 'square' ? 'h-36' : 'h-44'
              )}
            >
              {!hasImgError ? (
                <img
                  src={value}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                  onError={() => setHasImgError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-ink/50 text-center">
                  <ImageOff size={24} className="text-ink/40" />
                  <span className="text-[11px] font-medium">Image preview unavailable</span>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 bg-ink/65 backdrop-blur-xs flex items-center justify-center text-white gap-2 text-xs font-medium z-20">
                  <Loader2 size={20} className="animate-spin text-teal" />
                  Uploading directly to Cloudinary…
                </div>
              )}
            </div>

            {/* Desktop hover actions overlay */}
            <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl bg-white text-ink text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-white/95 transition-transform active:scale-95"
              >
                <RefreshCw size={13} /> Change Image
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl bg-danger text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-danger/90 transition-transform active:scale-95"
              >
                <Trash2 size={13} /> Remove
              </button>
            </div>
          </div>

          {/* Always-visible action buttons below preview (mobile & accessibility friendly) */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] text-ink-muted truncate">
              <CheckCircle2 size={13} className="text-teal shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-xs">{value}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-2.5 py-1 text-xs font-medium text-ink bg-ink/6 hover:bg-ink/10 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
              >
                <RefreshCw size={11} /> Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger/10 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Direct Upload Drag & Drop Dropzone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center text-center group select-none',
            aspectRatio === 'banner' ? 'h-36' : 'h-32',
            isDragOver
              ? 'border-teal bg-teal/5 scale-[1.01]'
              : 'border-ink/15 hover:border-teal/50 hover:bg-ink/2 bg-paper'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-teal">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs font-semibold">Uploading directly to Cloudinary…</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-ink/6 group-hover:bg-teal/10 flex items-center justify-center mb-2 transition-colors">
                <Upload size={18} className="text-ink/60 group-hover:text-teal transition-colors" />
              </div>
              <p className="text-xs font-semibold text-ink group-hover:text-teal transition-colors">
                Click or drag image to upload
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                PNG, JPG, WebP up to 5MB · Auto-stored on Cloudinary
              </p>
            </>
          )}
        </div>
      )}

      {description && <p className="text-xs text-ink-muted leading-snug">{description}</p>}
    </div>
  );
}
