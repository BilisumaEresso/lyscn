const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────
const modifierOptionSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const modifierGroupSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    required:  { type: Boolean, default: false },
    minSelect: { type: Number, default: 0 },
    maxSelect: { type: Number, default: 1 },
    options:   [modifierOptionSchema],
  },
  { _id: false }
);

const specOptionSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    nameAmharic: { type: String, default: '' },
    priceDelta:  { type: Number, default: 0 },
  },
  { _id: false }
);

const specGroupSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    nameAmharic: { type: String, default: '' },
    required:    { type: Boolean, default: false },
    options:     [specOptionSchema],
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name:        { type: String, required: true, trim: true },
    description: { type: String },
    price:       { type: Number, required: true, min: 0 },
    imageUrl:    { type: String, default: null },
    isAvailable: { type: Boolean, default: true },

    modifierGroups: [modifierGroupSchema],
    specs:          [specGroupSchema],
    quickTags:      [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
