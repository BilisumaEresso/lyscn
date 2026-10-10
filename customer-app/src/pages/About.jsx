import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Star, MessageSquare, CheckCircle2, ChevronDown, Quote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { applyBrandColor } from '../lib/theme';
import { useSessionStore } from '../store/sessionStore';
import PoweredBy from '../components/PoweredBy';
import { getRestaurantLogo, getRestaurantCover } from '../lib/branding';

// ── Single-color inline brand SVG icons ───────────────────────────────────────
function InstagramIcon({ className = 'w-5 h-5', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-5 h-5', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon({ className = 'w-5 h-5', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function GlobeIcon({ className = 'w-5 h-5', style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Ensure link has http:// or https:// protocol
function formatUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export default function About() {
  const navigate = useNavigate();
  const session = useSessionStore();
  const { restaurant, branch } = session;

  // Re-apply brand color on mount or session update
  useEffect(() => {
    if (restaurant?.brandColor) {
      applyBrandColor(restaurant.brandColor);
    }
  }, [restaurant?.brandColor]);

  // Page title
  useEffect(() => {
    document.title = restaurant?.name ? `About ${restaurant.name} · LayoScan` : 'About · LayoScan';
    return () => { document.title = 'LayoScan'; };
  }, [restaurant?.name]);

  const [coverImgError, setCoverImgError] = useState(false);
  const [logoImgError, setLogoImgError] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => { setCoverImgError(false); }, [restaurant?.coverUrl]);
  useEffect(() => { setLogoImgError(false); }, [restaurant?.logoUrl]);

  const contact = restaurant?.contactInfo || {};
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();
  const address = (contact.address || branch?.address)?.trim();
  const hasContactInfo = !!(phone || email || address);

  const socials = restaurant?.socialLinks || {};
  const instagram = socials.instagram?.trim();
  const facebook = socials.facebook?.trim();
  const tiktok = socials.tiktok?.trim();
  const website = socials.website?.trim();

  const socialList = [
    { key: 'instagram', label: 'Instagram', url: instagram, Icon: InstagramIcon },
    { key: 'facebook',  label: 'Facebook',  url: facebook,  Icon: FacebookIcon },
    { key: 'tiktok',    label: 'TikTok',    url: tiktok,    Icon: TikTokIcon },
    { key: 'website',   label: 'Website',   url: website,   Icon: GlobeIcon },
  ].filter((s) => !!s.url);

  const hasSocials = socialList.length > 0;

  const { data: publicData } = useQuery({
    queryKey: ['public-restaurant-about', restaurant?._id],
    queryFn: () => api.get(`/public/restaurant/${restaurant._id}`).then((r) => r.data),
    enabled: !!restaurant?._id,
    staleTime: 60_000,
  });

  const reviewsSummary = publicData?.reviewsSummary;
  const averageRating  = reviewsSummary?.averageRating;
  const totalReviews   = reviewsSummary?.totalReviews || 0;
  const recentReviews  = reviewsSummary?.recentReviews || [];
  const distribution   = reviewsSummary?.distribution || {};

  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto flex flex-col relative pb-8">
      {/* ── Expressive Hero Section ────────────────────────────────────────── */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={getRestaurantCover(restaurant, coverImgError)}
          alt={`${restaurant?.name || 'Restaurant'} cover`}
          className="w-full h-full object-cover"
          onError={() => setCoverImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-black/20" />

        {/* Floating Top Nav (Back to Menu) */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate('/menu')}
            className="px-3.5 py-2 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold hover:bg-white/30 transition-all flex items-center gap-1.5 shadow-sm border border-white/20 active:scale-95"
            aria-label="Back to menu"
          >
            <ArrowLeft size={14} />
            <span>Back to menu</span>
          </button>
        </div>

        {/* Hero Branding Info */}
        <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col items-center text-center">
          <img
            src={getRestaurantLogo(restaurant, logoImgError)}
            alt={`${restaurant?.name || 'Restaurant'} logo`}
            className="w-20 h-20 rounded-3xl border-4 border-white/40 shadow-xl object-cover -mb-3 z-10 bg-white"
            onError={() => setLogoImgError(true)}
          />
        </div>
      </div>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <div className="px-6 pt-5 space-y-6 flex-1">
        {/* Restaurant Name & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="font-display font-bold text-2xl text-ink leading-tight">
            {restaurant?.name || 'Our Restaurant'}
          </h1>
          {branch?.name && (
            <p className="text-xs text-ink-muted font-medium">
              {branch.name}
            </p>
          )}

          {/* Overall Rating Badge if available */}
          {averageRating ? (
            <div className="flex items-center justify-center gap-2 pt-1.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 font-display font-bold text-xs shadow-2xs">
                <Star size={13} className="text-amber-500 fill-amber-400" />
                <span>{averageRating}</span>
                <span className="text-amber-700/80 font-normal">/ 5</span>
              </span>
              <span className="text-xs text-ink-muted font-medium">
                ({totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-ink/40 pt-1">Welcome to our cafe</p>
          )}
        </div>

        {/* ── Customer Ratings & Verified Reviews: Minimal & Refined ── */}
        {totalReviews > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-ink/6 shadow-2xs space-y-3">
            {/* Minimal Header with score & verified badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <Star size={16} className="fill-amber-400 text-amber-500" />
                </span>
                <div>
                  <div className="flex items-baseline gap-1.5 leading-tight">
                    <span className="font-display font-bold text-base text-ink">
                      {averageRating}
                    </span>
                    <span className="text-xs text-ink-muted">
                      ({totalReviews} verified {totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className={i < Math.round(averageRating) ? 'fill-amber-400 text-amber-500' : 'text-ink/15'}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 size={10} /> Verified
              </span>
            </div>

            {/* Curated Recent Review Cards (Compact & Elegant) */}
            {recentReviews.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-ink/5">
                {(showAllReviews ? recentReviews : recentReviews.slice(0, 2)).map((rev) => (
                  <div
                    key={rev._id}
                    className="p-2.5 rounded-xl bg-paper/80 border border-ink/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[11px] text-ink truncate">
                        {rev.guestName || 'Diner'}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} size={9} className="fill-amber-400 text-amber-500" />
                        ))}
                      </div>
                    </div>
                    {rev.feedback && (
                      <p className="text-[11px] text-ink/75 italic leading-snug line-clamp-2">
                        &ldquo;{rev.feedback}&rdquo;
                      </p>
                    )}
                    <span className="text-[9px] text-ink/35 block">
                      {new Date(rev.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}

                {recentReviews.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full py-1.5 text-center text-[11px] font-semibold text-ink-muted hover:text-ink transition-colors flex items-center justify-center gap-1 pt-0.5"
                  >
                    <span>{showAllReviews ? 'Show less' : `Show all (${recentReviews.length}) reviews`}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showAllReviews ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Full Description */}
        {restaurant?.description && (
          <div className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              About Us
            </h2>
            <p className="text-ink text-sm leading-relaxed whitespace-pre-line">
              {restaurant.description}
            </p>
          </div>
        )}

        {/* Social Links Row */}
        {hasSocials && (
          <div className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Connect With Us
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {socialList.map(({ key, label, url, Icon }) => (
                <a
                  key={key}
                  href={formatUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit our ${label}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-ink/8 hover:border-ink/20 transition-all group active:scale-[0.98]"
                  style={{ background: 'var(--color-surface-wash)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                      color: 'var(--color-primary-dark, var(--color-primary))',
                    }}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold text-ink truncate group-hover:text-ink">
                    {label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info Block */}
        {hasContactInfo && (
          <div className="bg-white rounded-2xl p-5 border border-ink/6 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Contact & Location
            </h2>
            <div className="space-y-3">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-ink/5 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                      color: 'var(--color-primary-dark, var(--color-primary))',
                    }}
                  >
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink-muted font-medium">Phone</p>
                    <p className="text-xs font-semibold text-ink truncate group-hover:underline">
                      {phone}
                    </p>
                  </div>
                </a>
              )}

              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-ink/5 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                      color: 'var(--color-primary-dark, var(--color-primary))',
                    }}
                  >
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink-muted font-medium">Email</p>
                    <p className="text-xs font-semibold text-ink truncate group-hover:underline">
                      {email}
                    </p>
                  </div>
                </a>
              )}

              {address && (
                <div className="flex items-start gap-3 p-2.5 rounded-xl">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                      color: 'var(--color-primary-dark, var(--color-primary))',
                    }}
                  >
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink-muted font-medium">Cafe location</p>
                    <p className="text-xs font-semibold text-ink leading-relaxed">
                      {address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explicit "Back to menu" CTA button */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/menu')}
            className="w-full py-3.5 rounded-2xl font-display font-semibold text-base shadow-md transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-on-primary)',
              outlineColor: 'var(--color-primary)',
            }}
          >
            <ArrowLeft size={18} />
            <span>Back to menu</span>
          </button>
        </div>

        {/* Footer */}
        <PoweredBy />
      </div>
    </div>
  );
}
