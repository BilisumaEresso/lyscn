const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { uploadImage, deleteImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

// Multer memory storage configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
  fileFilter,
});

// Middleware to accept single file from either 'file' or 'image' field name
const uploadSingleMiddleware = (req, res, next) => {
  const singleHandler = upload.single('file');
  singleHandler(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds the 5MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error.',
      });
    }

    // Fallback check if field was named 'image' instead of 'file'
    if (!req.file) {
      const altHandler = upload.single('image');
      return altHandler(req, res, (altErr) => {
        if (altErr) {
          return res.status(400).json({
            success: false,
            message: altErr.message || 'File upload error.',
          });
        }
        next();
      });
    }
    next();
  });
};

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(protect, resolveTenantFromAuth);

router.post('/', uploadSingleMiddleware, uploadImage);
router.delete('/', deleteImage);

module.exports = router;
