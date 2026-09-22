const { uploadStream, deleteAsset } = require('../config/cloudinary');

// ── POST /api/upload ──────────────────────────────────────────────────────────
// Protected endpoint: Uploads an image file to Cloudinary
const uploadImage = async (req, res, next) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary environment variables are not configured on server.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Please upload an image file.',
      });
    }

    // Target folder inside Cloudinary bucket: layoscan/<tenantId>/<folderName>
    const targetSubfolder = (req.body.folder || req.query.folder || 'media').replace(/[^a-zA-Z0-9_-]/g, '');
    const tenantId = req.tenantId ? String(req.tenantId) : 'general';
    const folder = `layoscan/${tenantId}/${targetSubfolder}`;

    const result = await uploadStream(req.file.buffer, { folder });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (err) {
    return next(err);
  }
};

// ── DELETE /api/upload ────────────────────────────────────────────────────────
// Protected endpoint: Deletes an asset by publicId
const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'publicId is required.',
      });
    }

    const result = await deleteAsset(publicId);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};
