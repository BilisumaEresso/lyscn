import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  MapPin,
  Palette,
  Settings as SettingsIcon,
  Upload,
  Check,
  Volume2,
  VolumeX,
  Bell,
  Play,
  Monitor,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import ImageUploader from "../components/ui/ImageUploader";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { playSoundByType } from "../lib/soundEffects";

function SectionHeader({ title, description }) {
  return (
    <div className="pb-4 border-b border-ink/8 mb-5">
      <h2 className="font-display font-semibold text-base text-ink">{title}</h2>
      {description && (
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}

export default function Settings() {
  const { setRestaurant } = useAuthStore();
  const qc = useQueryClient();
  const [locationSaving, setLocationSaving] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  // Notification & Sound Store
  const {
    soundEnabled,
    soundVolume,
    eventSounds,
    desktopNotificationsEnabled,
    setSoundEnabled,
    setSoundVolume,
    setEventSound,
    setDesktopNotificationsEnabled,
  } = useNotificationStore();

  const [desktopPermission, setDesktopPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const handleRequestDesktopPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser desktop notifications are not supported on this device.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setDesktopPermission(permission);
      if (permission === 'granted') {
        setDesktopNotificationsEnabled(true);
        toast.success('Desktop notifications enabled!');
        new Notification('LayoScan Alerts Active', {
          body: 'You will receive background alerts when orders or requests arrive.',
          icon: '/favicon.ico',
        });
      } else {
        setDesktopNotificationsEnabled(false);
        toast.error('Notification permission was denied or dismissed.');
      }
    } catch {
      toast.error('Failed to request notification permission.');
    }
  };

  // Fetch latest restaurant data
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-me"],
    queryFn: () => api.get("/restaurants/me").then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const restaurant = data?.restaurant;
  const { data: branchData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get("/branches").then((r) => r.data),
  });
  const branch = branchData?.branches?.[0];

  const hasInitializedRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      brandColor: "#4F46E5",
      logoUrl: "",
      coverUrl: "",
      contactPhone: "",
      contactEmail: "",
      contactAddress: "",
      instagram: "",
      facebook: "",
      website: "",
    },
  });

  // Explicitly register logoUrl & coverUrl for react-hook-form dirty state tracking
  useEffect(() => {
    register("logoUrl");
    register("coverUrl");
  }, [register]);

  // Watch fields for live preview
  const brandColor = watch("brandColor") || "#4F46E5";
  const logoUrl = watch("logoUrl");
  const coverUrl = watch("coverUrl");

  // Populate form only on initial data load to prevent window focus from wiping dirty state
  useEffect(() => {
    if (!restaurant || hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    reset({
      name: restaurant.name ?? "",
      description: restaurant.description ?? "",
      brandColor: restaurant.brandColor ?? "#4F46E5",
      logoUrl: restaurant.logoUrl ?? "",
      coverUrl: restaurant.coverUrl ?? "",
      contactPhone: restaurant.contactInfo?.phone ?? "",
      contactEmail: restaurant.contactInfo?.email ?? "",
      contactAddress: restaurant.contactInfo?.address ?? "",
      instagram: restaurant.socialLinks?.instagram ?? "",
      facebook: restaurant.socialLinks?.facebook ?? "",
      tiktok: restaurant.socialLinks?.tiktok ?? "",
      website: restaurant.socialLinks?.website ?? "",
    });
  }, [restaurant, reset]);

  const updateMutation = useMutation({
    mutationFn: (body) =>
      api.patch("/restaurants/me", body).then((r) => r.data),
    onSuccess: (d) => {
      setRestaurant(d.restaurant);
      reset({
        name: d.restaurant.name ?? "",
        description: d.restaurant.description ?? "",
        brandColor: d.restaurant.brandColor ?? "#4F46E5",
        logoUrl: d.restaurant.logoUrl ?? "",
        coverUrl: d.restaurant.coverUrl ?? "",
        contactPhone: d.restaurant.contactInfo?.phone ?? "",
        contactEmail: d.restaurant.contactInfo?.email ?? "",
        contactAddress: d.restaurant.contactInfo?.address ?? "",
        instagram: d.restaurant.socialLinks?.instagram ?? "",
        facebook: d.restaurant.socialLinks?.facebook ?? "",
        tiktok: d.restaurant.socialLinks?.tiktok ?? "",
        website: d.restaurant.socialLinks?.website ?? "",
      });
      qc.invalidateQueries({ queryKey: ["restaurant-me"] });
      toast.success("Settings saved successfully");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Save failed"),
  });

  const onSubmit = (form) => {
    updateMutation.mutate({
      name: form.name,
      description: form.description,
      brandColor: form.brandColor,
      logoUrl: form.logoUrl ? form.logoUrl.trim() : null,
      coverUrl: form.coverUrl ? form.coverUrl.trim() : null,
      contactInfo: {
        phone: form.contactPhone,
        email: form.contactEmail,
        address: form.contactAddress,
      },
      socialLinks: {
        instagram: form.instagram,
        facebook: form.facebook,
        tiktok: form.tiktok,
        website: form.website,
      },
    });
  };

  const handleBrandImageChange = async (field, url) => {
    const cleanUrl = url ? url.trim() : null;
    setValue(field, cleanUrl || "", { shouldDirty: true, shouldValidate: true });
    try {
      const res = await api.patch("/restaurants/me", { [field]: cleanUrl });
      if (res.data?.success && res.data?.restaurant) {
        setRestaurant(res.data.restaurant);
        qc.invalidateQueries({ queryKey: ["restaurant-me"] });
        toast.success(
          cleanUrl
            ? `${field === "logoUrl" ? "Restaurant logo" : "Cover banner"} saved`
            : `${field === "logoUrl" ? "Restaurant logo" : "Cover banner"} removed`
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to save ${field === "logoUrl" ? "logo" : "cover"}`);
    }
  };

  const handleColorChange = (colorHex) => {
    setValue("brandColor", colorHex, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const verifyBranchLocation = () => {
    if (!branch?._id || !navigator.geolocation) {
      toast.error("Location services are not available in this browser.");
      return;
    }
    setLocationSaving(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          await api.patch(`/branches/${branch._id}/location`, {
            lat: coords.latitude,
            lng: coords.longitude,
            radiusMeters: branch.location?.radiusMeters || 150,
            locationStrictMode: true,
          });
          qc.invalidateQueries({ queryKey: ["branches"] });
          toast.success("Cafe location calibrated and strict verification enabled.");
        } catch (err) {
          toast.error(
            err.response?.data?.message || "Could not save cafe location.",
          );
        } finally {
          setLocationSaving(false);
        }
      },
      (error) => {
        setLocationSaving(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location in your browser.");
        } else {
          toast.error("Could not read your current location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  };

  const toggleStrictLocation = async (event) => {
    if (!branch?._id || !branch.location) return;
    try {
      await api.patch(`/branches/${branch._id}/location`, {
        lat: branch.location.lat,
        lng: branch.location.lng,
        radiusMeters: branch.location.radiusMeters,
        locationStrictMode: event.target.checked,
      });
      qc.invalidateQueries({ queryKey: ["branches"] });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not update location setting.",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:pt-14">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-ink/6 flex items-center justify-center">
          <SettingsIcon
            size={18}
            className="text-ink-muted"
            strokeWidth={1.75}
          />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Settings</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Restaurant profile &amp; preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* ── Restaurant profile & identity ──────────────────────────── */}
        <section>
          <SectionHeader
            title="Restaurant profile"
            description="This information appears on your customer-facing menu and branding."
          />
          <div className="space-y-4">
            <Input
              label="Restaurant name"
              placeholder="The Green Bistro"
              error={errors.name?.message}
              {...register("name", { required: "Name is required" })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted">
                Description
              </label>
              <textarea
                id="restaurant-description"
                rows={3}
                placeholder="A short description of your restaurant for customers…"
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/15"
                {...register("description")}
              />
            </div>

            {/* Brand color */}
            <div className="flex flex-col gap-1">
              <label htmlFor="brand-color-picker" className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                <Palette size={12} /> Brand color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="brand-color-picker"
                  name="brandColorPicker"
                  type="color"
                  value={brandColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-ink/12 cursor-pointer p-0.5 bg-white shrink-0"
                />
                <Input
                  placeholder="#4F46E5"
                  wrapperClassName="flex-1"
                  value={brandColor}
                  {...register("brandColor", {
                    pattern: {
                      value: /^#[0-9A-Fa-f]{6}$/,
                      message: "Enter a valid hex color (e.g. #14B8A6)",
                    },
                  })}
                  onChange={(e) => handleColorChange(e.target.value)}
                />
                <div
                  className="w-10 h-10 rounded-lg border border-ink/12 shrink-0 shadow-sm transition-colors"
                  style={{ backgroundColor: brandColor }}
                  title="Color Preview"
                />
              </div>
              {errors.brandColor && (
                <p className="text-xs text-danger">
                  {errors.brandColor.message}
                </p>
              )}
              <p className="text-xs text-ink-muted">
                Applied dynamically across both customer mobile menu and staff
                dashboard.
              </p>
            </div>
          </div>
        </section>

        {/* ── Logo & Cover media ─────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Branding images"
            description="Logo and cover banner shown on customer menu and QR code landing."
          />
          <input type="hidden" {...register("logoUrl")} />
          <input type="hidden" {...register("coverUrl")} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUploader
              label="Restaurant Logo"
              description="Uploaded to Cloudinary. Appears on QR cards, customer header, and bill receipts."
              value={logoUrl}
              onChange={(url) => handleBrandImageChange("logoUrl", url)}
              folder="branding"
              aspectRatio="square"
            />
            <ImageUploader
              label="Cover Banner Photo"
              description="Uploaded to Cloudinary. High-res banner image displayed at the top of your customer menu."
              value={coverUrl}
              onChange={(url) => handleBrandImageChange("coverUrl", url)}
              folder="branding"
              aspectRatio="banner"
            />
          </div>
        </section>

        {/* ── Contact info ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Contact information"
            description="Shown to customers on the menu footer and order status pages."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 555 000 0000"
              {...register("contactPhone")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="hello@restaurant.com"
              {...register("contactEmail")}
            />
            <div className="sm:col-span-2">
              <Input
                label={
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} /> Cafe location
                  </span>
                }
                placeholder="Bole, Addis Ababa"
                {...register("contactAddress")}
              />
            </div>
          </div>
        </section>

        {/* ── Social links ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Social links" />
          <div className="space-y-4">
            <Input
              label="Instagram"
              placeholder="https://instagram.com/yourrestaurant"
              {...register("instagram")}
            />
            <Input
              label="Facebook"
              placeholder="https://facebook.com/yourrestaurant"
              {...register("facebook")}
            />
            <Input
              label="TikTok"
              placeholder="https://tiktok.com/@yourrestaurant"
              {...register("tiktok")}
            />
            <Input
              label="Website"
              placeholder="https://yourrestaurant.com"
              {...register("website")}
            />
          </div>
        </section>

        {canInstall && (
          <section>
            <SectionHeader
              title="Install app"
              description="Install LayoScan on this device for quicker access and a native app experience."
            />
            <div className="rounded-2xl border border-ink/8 bg-ink/2 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Install LayoScan Dashboard
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  This browser supports installation.
                </p>
              </div>
              <Button type="button" onClick={() => promptInstall()}>
                Install app
              </Button>
            </div>
          </section>
        )}

        <section>
          <SectionHeader
            title="Strict table location verification"
            description="Mandatory location verification blocks remote ordering by requiring customers to be physically present at the cafe table."
          />
          <div className="rounded-2xl border border-ink/8 bg-ink/2 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {branch?.location
                    ? "Cafe location configured"
                    : "Cafe location not configured"}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Stand inside the cafe and use your current location to
                  configure the ordering radius.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={verifyBranchLocation}
                disabled={locationSaving || !branch}
              >
                <MapPin size={14} />{" "}
                {locationSaving ? "Checking…" : "Use my current location"}
              </Button>
            </div>
            <label
              className={`flex items-start gap-3 ${branch?.location ? "cursor-pointer" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                checked={Boolean(branch?.locationStrictMode)}
                onChange={toggleStrictLocation}
                disabled={!branch?.location}
                className="mt-1 accent-teal"
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  Require customers to be nearby to order
                </span>
                <span className="block text-xs text-ink-muted mt-0.5">
                  Strict mode blocks ordering when a customer&apos;s location
                  cannot be verified within the cafe radius.
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* ── Notifications & Real-Time Sound Alerts ─────────────────────── */}
        <section className="bg-white rounded-2xl border border-ink/8 p-6 shadow-2xs">
          <SectionHeader
            title="Notifications & Sound Alerts"
            description="Customize audio chimes, event triggers, and browser background notifications"
          />

          <div className="space-y-6">
            {/* Master Sound Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-paper/70 border border-ink/8">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    soundEnabled ? "bg-teal/15 text-teal" : "bg-ink/5 text-ink-muted"
                  }`}
                >
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Master Sound Alerts</p>
                  <p className="text-xs text-ink-muted">
                    {soundEnabled
                      ? "Audio chimes are currently active"
                      : "All audio alerts are muted"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                {/* Volume Slider */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    disabled={!soundEnabled}
                    className="w-24 sm:w-28 accent-teal cursor-pointer disabled:opacity-40"
                  />
                  <span className="text-xs font-mono text-ink-muted w-8 text-right">
                    {Math.round(soundVolume * 100)}%
                  </span>
                </div>

                {/* Master Switch Button */}
                <Button
                  type="button"
                  variant={soundEnabled ? "outline" : "primary"}
                  size="sm"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playSoundByType("order_created", soundVolume);
                  }}
                >
                  {soundEnabled ? "Mute All" : "Enable Audio"}
                </Button>
              </div>
            </div>

            {/* Event Specific Sound Cues */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                Event Sound Triggers & Previews
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    id: "order_created",
                    label: "New Order Placed",
                    sub: "Ascending 2-tone melodic chime",
                  },
                  {
                    id: "order_ready",
                    label: "Order Ready for Pickup",
                    sub: "Bright upward tri-tone fanfare",
                  },
                  {
                    id: "assistance",
                    label: "Guest Call / Bill Request",
                    sub: "Attention-grabbing double pulse ding",
                  },
                  {
                    id: "table_occupied",
                    label: "Table Occupied",
                    sub: "Warm presence welcoming duo-tone",
                  },
                  {
                    id: "table_ready_to_clear",
                    label: "Table Ready to Clear",
                    sub: "Crisp double bussing chime",
                  },
                  {
                    id: "order_cancelled",
                    label: "Order Cancelled",
                    sub: "Downward warning tone",
                  },
                ].map(({ id, label, sub }) => (
                  <div
                    key={id}
                    className="p-3 rounded-xl border border-ink/8 bg-white hover:border-ink/15 transition-all flex items-center justify-between gap-3"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={Boolean(eventSounds?.[id])}
                        onChange={(e) => setEventSound(id, e.target.checked)}
                        disabled={!soundEnabled}
                        className="mt-0.5 accent-teal rounded disabled:opacity-40"
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-ink truncate">
                          {label}
                        </span>
                        <span className="block text-[11px] text-ink-muted truncate">
                          {sub}
                        </span>
                      </div>
                    </label>

                    <button
                      type="button"
                      onClick={() => playSoundByType(id, soundVolume)}
                      className="p-1.5 rounded-lg border border-ink/10 text-ink-muted hover:text-teal hover:border-teal/40 transition-colors shrink-0 text-xs flex items-center gap-1"
                      title={`Test ${label} sound`}
                    >
                      <Play size={11} />
                      <span className="text-[10px]">Test</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Browser Notifications */}
            <div className="p-4 rounded-xl border border-ink/8 bg-paper/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      Desktop Push Notifications
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        desktopPermission === "granted"
                          ? "bg-emerald-100 text-emerald-800"
                          : desktopPermission === "denied"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {desktopPermission}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {desktopPermission === "granted"
                      ? "Active. You will receive notifications when the dashboard is minimized or in a background tab."
                      : desktopPermission === "denied"
                      ? "Blocked by browser permissions. Allow notifications in your browser address bar settings."
                      : "Receive instant desktop popups when new orders and table requests arrive."}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {desktopPermission !== "granted" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRequestDesktopPermission}
                    disabled={desktopPermission === "denied"}
                  >
                    Enable Notifications
                  </Button>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={desktopNotificationsEnabled}
                      onChange={(e) =>
                        setDesktopNotificationsEnabled(e.target.checked)
                      }
                      className="accent-teal rounded"
                    />
                    Deliver in background
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/8">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty}
          >
            Discard changes
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      {/* FAB: quick Save button on mobile/tablet */}
      <button
        type="button"
        onClick={handleSubmit(onSubmit)}
        disabled={updateMutation.isPending}
        aria-label="Save settings"
        className="lg:hidden fixed right-6 z-50 rounded-full flex items-center gap-2 px-5 shadow-xl text-white font-semibold text-xs transition-transform active:scale-95 hover:shadow-2xl"
        style={{
          height: '52px',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          background: isDirty ? 'var(--color-primary)' : '#121A2C',
          opacity: updateMutation.isPending ? 0.7 : 1
        }}
      >
        <Check size={18} strokeWidth={2.5} />
        <span>{updateMutation.isPending ? 'Saving…' : isDirty ? 'Save changes*' : 'Save changes'}</span>
      </button>
    </div>
  );
}
