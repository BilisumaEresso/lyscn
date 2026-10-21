const mongoose = require('mongoose');

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ── Schema ────────────────────────────────────────────────────────────────────
const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },

    logoUrl:  { type: String, default: null },
    coverUrl: { type: String, default: null },
    brandColor: { type: String, default: '#4F46E5' },
    qrCardTemplate: {
      type: String,
      enum: [
        // Modern declarative designs
        'artisan_linen',
        'bold_street',
        'fresh_emerald',
        'midnight_gold',
        'habesha_heritage',
        'velvet_lounge',
        'juice_spris',
        'cafe_tent_classic',
        'modern_minimal',
        // Legacy archetype aliases
        'cafe_artisan',
        'fast_casual',
        'fresh_mart',
        'luxury_hotel',
        'cultural_heritage',
        'liquor_bar',
      ],
      default: 'artisan_linen',
    },

    description: { type: String },
    socialLinks: {
      instagram: { type: String },
      facebook:  { type: String },
      tiktok:    { type: String },
      website:   { type: String },
    },
    contactInfo: {
      phone:   { type: String },
      email:   { type: String },
      address: { type: String },
    },

    paymentAccounts: {
      telebirr: {
        accountType:   { type: String, enum: ['merchant', 'phone'], default: 'phone' },
        accountNumber: { type: String, trim: true, default: '' },
        accountName:   { type: String, trim: true, default: '' },
        qrCodeUrl:     { type: String, default: null },
        isActive:      { type: Boolean, default: true },
      },
      cbeBirr: {
        accountNumber: { type: String, trim: true, default: '' },
        accountName:   { type: String, trim: true, default: '' },
        qrCodeUrl:     { type: String, default: null },
        isActive:      { type: Boolean, default: true },
      },
      awashBank: {
        accountNumber: { type: String, trim: true, default: '' },
        accountName:   { type: String, trim: true, default: '' },
        qrCodeUrl:     { type: String, default: null },
        isActive:      { type: Boolean, default: true },
      },
      otherBank: {
        bankName:      { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        accountName:   { type: String, trim: true, default: '' },
        qrCodeUrl:     { type: String, default: null },
        isActive:      { type: Boolean, default: false },
      },
      instructions: { type: String, trim: true, default: '' },
    },

    subscriptionPlan: {
      type: String,
      enum: ['starter', 'business', 'premium'],
      default: 'starter',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Pre-save: auto-generate slug from name if not supplied ────────────────────
restaurantSchema.pre('save', async function (next) {
  if (this.slug) return next();

  const baseSlug = slugify(this.name);
  let slug = baseSlug;
  let count = 0;

  // Ensure uniqueness
  while (true) {
    // Use the model reference via mongoose.model to avoid circular issues
    const existing = await mongoose.model('Restaurant').findOne({ slug });
    if (!existing || existing._id.equals(this._id)) break;
    count += 1;
    slug = `${baseSlug}-${count}`;
  }

  this.slug = slug;
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
