import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Share2,
  Navigation,
  ArrowLeft,
  Search,
  X,
  Sparkles,
  UtensilsCrossed,
  QrCode,
  Users,
  Compass,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import api from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import Currency from '../components/Currency';
import CulinaryPlaceholder from '../components/menu/CulinaryPlaceholder';
import PoweredBy from '../components/PoweredBy';
import cafeLogoPlaceholder from '../assets/cafe_logo_placeholder.png';
import cafeCoverPlaceholder from '../assets/cafe_cover_placeholder.png';
import toast from 'react-hot-toast';

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CafePreview() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();

  const [activeCat, setActiveCat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetProduct, setSheetProduct] = useState(null);
  const [showQrNotice, setShowQrNotice] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [isVerifyingLoc, setIsVerifyingLoc] = useState(false);
  const [locationError, setLocationError] = useState('');

  // ── 1. Fetch Cafe Details & Live Table Availability ───────────────────────
  const { data: cafeData, isLoading: cafeLoading } = useQuery({
    queryKey: ['public-restaurant', restaurantId],
    queryFn: () => api.get(`/public/restaurant/${restaurantId}`).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 15_000, // Live table availability updates
  });

  const restaurant = cafeData?.restaurant;
  const branch = cafeData?.branch;
  const availability = cafeData?.tableAvailability;
  const isStrictMode = Boolean(branch?.locationStrictMode);
  const hasGps = Number.isFinite(branch?.location?.lat) && Number.isFinite(branch?.location?.lng);

  useEffect(() => {
    if (restaurant?.brandColor) {
      applyBrandColor(restaurant.brandColor);
    }
    if (restaurant?.name) {
      document.title = `${restaurant.name} · Menu & Info`;
    }
    return () => {
      document.title = 'LayoScan';
    };
  }, [restaurant]);

  // ── 2. Location Check in Strict Mode ──────────────────────────────────────
  const handleVerifyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsVerifyingLoc(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsVerifyingLoc(false);
        if (hasGps) {
          const dist = haversineMeters(
            branch.location.lat,
            branch.location.lng,
            coords.latitude,
            coords.longitude
          );
          const radius = branch.location.radiusMeters || 150;
          if (dist <= radius + 35) {
            setLocationVerified(true);
            toast.success('Location confirmed! You are near the cafe.');
          } else {
            setLocationError(
              `You appear to be ${Math.round(dist)}m away from the cafe. Location within ${radius}m is required to view this menu.`
            );
          }
        } else {
          setLocationVerified(true);
        }
      },
      (err) => {
        setIsVerifyingLoc(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access was denied. Please allow location in your browser settings.');
        } else {
          setLocationError('Unable to detect location. Please check your GPS settings.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── 3. Fetch Products ─────────────────────────────────────────────────────
  const isMenuAccessible = !isStrictMode || locationVerified;

  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['public-products', restaurant?._id || restaurantId],
    queryFn: () =>
      api
        .get('/products/public', { params: { restaurantId: restaurant?._id || restaurantId } })
        .then((r) => r.data),
    enabled: !!(restaurant?._id || restaurantId) && isMenuAccessible,
    staleTime: 60_000,
  });

  const products = productData?.products ?? [];

  const categories = useMemo(() => {
    const seen = new Map();
    for (const p of products) {
      const cat = p.categoryId;
      if (cat && !seen.has(cat._id)) seen.set(cat._id, cat);
    }
    return [...seen.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  useEffect(() => {
    if (categories.length > 0 && !activeCat) {
      setActiveCat(categories[0]._id);
    }
  }, [categories, activeCat]);

  const filteredProducts = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return activeCat
      ? products.filter((p) => p.categoryId?._id === activeCat)
      : products;
  }, [products, activeCat, searchQuery]);

  // ── 4. Location Sharing & Directions ──────────────────────────────────────
  const handleGetDirections = () => {
    if (hasGps) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${branch.location.lat},${branch.location.lng}`,
        '_blank'
      );
    } else if (branch?.address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`,
        '_blank'
      );
    } else {
      toast.error('Location coordinates not available for this venue.');
    }
  };

  const handleShareLocation = async () => {
    const mapUrl = hasGps
      ? `https://www.google.com/maps/dir/?api=1&destination=${branch.location.lat},${branch.location.lng}`
      : window.location.href;

    const shareData = {
      title: restaurant?.name || 'Cafe Location',
      text: `Visit ${restaurant?.name || 'this cafe'}${branch?.address ? ` at ${branch.address}` : ''}`,
      url: mapUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${mapUrl}`);
        toast.success('Cafe address and map link copied to clipboard!');
      } catch {
        toast('Address: ' + (branch?.address || 'Cafe location'));
      }
    }
  };

  if (cafeLoading) {
    return (
      <div className="min-h-screen bg-paper max-w-[560px] mx-auto p-6 flex flex-col items-center justify-center">
        <RefreshCw size={28} className="animate-spin text-teal mb-3" />
        <p className="text-sm font-semibold text-ink">Loading cafe details…</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-paper max-w-[560px] mx-auto p-6 flex flex-col items-center justify-center text-center">
        <UtensilsCrossed size={40} className="text-ink/20 mb-3" />
        <h2 className="font-display font-bold text-xl text-ink mb-1">Cafe Not Found</h2>
        <p className="text-xs text-ink-muted mb-5">This restaurant could not be found or is inactive.</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-teal text-white font-semibold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col relative pb-20">
      {/* ── Top Header & Cover ────────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden shrink-0">
        <img
          src={restaurant.coverUrl || cafeCoverPlaceholder}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = cafeCoverPlaceholder; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Share Button */}
        <button
          onClick={handleShareLocation}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform"
          title="Share Cafe Location"
        >
          <Share2 size={16} />
        </button>

        {/* Cafe Identity Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3 text-white">
          <img
            src={restaurant.logoUrl || cafeLogoPlaceholder}
            alt={restaurant.name}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-lg bg-white shrink-0"
            onError={(e) => { e.currentTarget.src = cafeLogoPlaceholder; }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-xl leading-tight truncate">
              {restaurant.name}
            </h1>
            <p className="text-xs text-white/80 truncate mt-0.5 flex items-center gap-1">
              <MapPin size={12} className="shrink-0 text-white/70" />
              <span>{branch?.address || 'Cafe location'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Real-Time Table & Seat Availability Card ──────────────────── */}
      <div className="px-4 -mt-3 z-10">
        <div className="bg-white rounded-2xl p-4 border border-ink/8 shadow-md">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  (availability?.availableTables || 0) > 0
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <p className="font-display font-bold text-sm text-ink">
                {(availability?.availableTables || 0) > 0 ? (
                  <span>
                    {availability.availableTables} of {availability.totalTables} Tables Available
                  </span>
                ) : (
                  <span>Currently Full (0 Free Tables)</span>
                )}
              </p>
            </div>

            <span className="text-[11px] font-semibold text-ink-muted bg-paper px-2.5 py-1 rounded-full flex items-center gap-1">
              <Users size={12} className="text-teal" />
              <span>{availability?.availableSeats || 0} seats free</span>
            </span>
          </div>

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Live table status updated in real-time. Tables can only be occupied when seated at the cafe with a QR scan.
          </p>

          {/* Location Actions: Directions & Share */}
          <div className="mt-3 pt-3 border-t border-ink/6 flex items-center gap-2">
            <button
              onClick={handleGetDirections}
              className="flex-1 py-2 px-3 rounded-xl bg-teal/10 hover:bg-teal/15 text-teal text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation size={13} />
              <span>Get Directions</span>
            </button>
            <button
              onClick={handleShareLocation}
              className="py-2 px-3 rounded-xl bg-paper hover:bg-ink/5 text-ink text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-ink/10"
            >
              <Share2 size={13} />
              <span>Share Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Browsing Notice / Mode Banner ─────────────────────────────── */}
      <div className="px-4 mt-3">
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
          <QrCode size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Browsing Mode</p>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
              You are viewing this menu from away. To occupy a table or place orders, please visit {restaurant.name} and scan the QR code on your table.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-2.5 py-1.5 rounded-xl bg-amber-600 text-white font-semibold text-[11px] shrink-0 active:scale-95"
          >
            Scan QR
          </button>
        </div>
      </div>

      {/* ── Strict Mode Gate (If enabled and not verified) ────────────── */}
      {isStrictMode && !locationVerified ? (
        <div className="p-6 text-center mt-6">
          <div className="max-w-xs mx-auto bg-white rounded-3xl p-6 border border-ink/10 shadow-lg text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto mb-3">
              <Compass size={28} />
            </div>
            <h3 className="font-display font-bold text-base text-ink mb-1.5">
              Location Verification Required
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed mb-4">
              {restaurant.name} requires guests to be physically near the cafe to view the menu.
            </p>

            {locationError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-[11px] text-left border border-rose-200 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            <button
              onClick={handleVerifyLocation}
              disabled={isVerifyingLoc}
              className="w-full py-3 rounded-2xl bg-teal text-white font-semibold text-xs shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              {isVerifyingLoc ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Checking GPS…</span>
                </>
              ) : (
                <>
                  <Navigation size={14} />
                  <span>Verify I am at the Cafe</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── Menu Categories & Items List ────────────────────────────── */
        <div className="mt-4 flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="px-4 mb-3">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-3.5 text-ink-muted pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items…"
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-ink/8 text-sm placeholder:text-ink-muted/70 focus:outline-none focus:border-teal shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 w-5 h-5 rounded-full bg-ink/10 flex items-center justify-center text-ink-muted"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Category Chips */}
          {!searchQuery && categories.length > 0 && (
            <div className="px-4 mb-3 overflow-x-auto flex items-center gap-2" style={{ scrollbarWidth: 'none' }}>
              {categories.map((cat) => {
                const isActive = activeCat === cat._id;
                return (
                  <button
                    key={cat._id}
                    onClick={() => setActiveCat(cat._id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-teal text-white shadow-xs'
                        : 'bg-white border border-ink/10 text-ink-muted hover:text-ink'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid */}
          <div className="px-4 flex-1">
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-ink/6 animate-pulse">
                    <div className="aspect-[4/3] bg-ink/6" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-ink/6 rounded w-3/4" />
                      <div className="h-4 bg-ink/6 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-ink-muted">
                <UtensilsCrossed size={32} className="mx-auto text-ink/20 mb-2" />
                <p className="text-xs font-semibold">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => setSheetProduct(p)}
                    className="bg-white rounded-2xl overflow-hidden border border-ink/8 shadow-2xs hover:border-teal/40 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full aspect-[4/3] object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[4/3] relative">
                          <CulinaryPlaceholder name={p.name} size="md" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-ink text-xs line-clamp-1">{p.name}</p>
                        {p.description && (
                          <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="px-3 pb-3 flex items-center justify-between">
                      <p className="font-display font-bold text-sm text-ink">
                        <Currency value={p.price} />
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQrNotice(true);
                        }}
                        className="text-[11px] font-semibold text-teal hover:underline"
                      >
                        Order at table
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Product Sheet Modal ───────────────────────────────────────── */}
      {sheetProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-0">
          <div className="bg-white rounded-t-3xl max-w-[560px] w-full p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-lg text-ink">{sheetProduct.name}</h3>
              <button
                onClick={() => setSheetProduct(null)}
                className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-ink-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {sheetProduct.imageUrl && (
              <img
                src={sheetProduct.imageUrl}
                alt={sheetProduct.name}
                className="w-full h-48 rounded-2xl object-cover mb-3"
              />
            )}

            <p className="font-display font-bold text-base text-ink mb-2">
              <Currency value={sheetProduct.price} />
            </p>
            {sheetProduct.description && (
              <p className="text-xs text-ink-muted leading-relaxed mb-4">
                {sheetProduct.description}
              </p>
            )}

            <div className="p-3.5 rounded-2xl bg-paper border border-ink/8 text-center space-y-2">
              <p className="text-xs font-semibold text-ink">Want to order this dish?</p>
              <p className="text-[11px] text-ink-muted">
                To order, please visit {restaurant.name}, take a seat, and scan the QR code on your table.
              </p>
              <button
                onClick={() => {
                  setSheetProduct(null);
                  navigate('/');
                }}
                className="w-full py-3 rounded-xl bg-teal text-white font-semibold text-xs shadow-md active:scale-98 flex items-center justify-center gap-1.5 mt-2"
              >
                <QrCode size={15} />
                <span>Scan Table QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Scan Required Notice Modal ──────────────────────────── */}
      {showQrNotice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-ink/10">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto mb-3">
              <QrCode size={26} />
            </div>
            <h3 className="font-display font-bold text-base text-ink mb-1.5">
              Ready to take a table?
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed mb-4">
              To protect tables and ensure orders are served to the right seat, you must be physically at {restaurant.name} and scan the QR code on your table.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-2xl bg-teal text-white font-semibold text-xs shadow-md active:scale-98 flex items-center justify-center gap-1.5"
              >
                <QrCode size={15} />
                <span>Scan Table QR Code</span>
              </button>
              <button
                onClick={() => setShowQrNotice(false)}
                className="w-full py-2.5 rounded-2xl bg-ink/5 hover:bg-ink/10 text-ink font-semibold text-xs"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      <PoweredBy className="mt-8 mb-4" />
    </div>
  );
}
