import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  MapPin,
  Palette,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Spinner from "../components/ui/Spinner";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

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

  // Fetch latest restaurant data
  const { data, isLoading } = useQuery({
    queryKey: ["restaurant-me"],
    queryFn: () => api.get("/restaurants/me").then((r) => r.data),
  });

  const restaurant = data?.restaurant;
  const { data: branchData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.get("/branches").then((r) => r.data),
  });
  const branch = branchData?.branches?.[0];

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

  // Watch fields for live preview
  const brandColor = watch("brandColor") || "#4F46E5";
  const logoUrl = watch("logoUrl");
  const coverUrl = watch("coverUrl");

  // Populate form when restaurant data loads
  useEffect(() => {
    if (!restaurant) return;
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
      logoUrl: form.logoUrl || null,
      coverUrl: form.coverUrl || null,
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
            locationStrictMode: branch.locationStrictMode || false,
          });
          qc.invalidateQueries({ queryKey: ["branches"] });
          toast.success("Cafe location verified and saved.");
        } catch (err) {
          toast.error(
            err.response?.data?.message || "Could not save cafe location.",
          );
        } finally {
          setLocationSaving(false);
        }
      },
      () => {
        setLocationSaving(false);
        toast.error("Could not read your current location.");
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
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                rows={3}
                placeholder="A short description of your restaurant for customers…"
                className="w-full px-3 py-2 text-sm border border-ink/12 rounded-lg resize-none focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal/15"
                {...register("description")}
              />
            </div>

            {/* Brand color */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-muted flex items-center gap-1.5">
                <Palette size={12} /> Brand color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
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
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl border border-ink/12 bg-ink/4 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload size={22} className="text-ink/25" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  label="Logo URL"
                  placeholder="https://example.com/logo.png"
                  {...register("logoUrl")}
                />
                <p className="text-xs text-ink-muted">
                  Paste a direct image link for your restaurant logo mark.
                </p>
              </div>
            </div>

            {/* Cover photo */}
            <div className="flex items-start gap-5">
              <div className="w-32 h-20 rounded-2xl border border-ink/12 bg-ink/4 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon
                    size={22}
                    className="text-ink/25"
                    strokeWidth={1.5}
                  />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  label="Cover Photo URL"
                  placeholder="https://example.com/cover.jpg"
                  {...register("coverUrl")}
                />
                <p className="text-xs text-ink-muted">
                  Banner image displayed at the top of your customer-facing
                  menu.
                </p>
              </div>
            </div>
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
            title="Order location verification"
            description="Optionally verify that customers are near this branch when they scan a table QR code."
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
    </div>
  );
}
