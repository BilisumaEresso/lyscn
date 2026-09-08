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

    description: { type: String },
    socialLinks: {
      instagram: { type: String },
      facebook:  { type: String },
      website:   { type: String },
    },
    contactInfo: {
      phone:   { type: String },
      email:   { type: String },
      address: { type: String },
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

  let baseSlug = slugify(this.name);
  let slug = baseSlug;
  let count = 0;

  // Ensure uniqueness
  // eslint-disable-next-line no-constant-condition
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
