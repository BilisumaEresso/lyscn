const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

/**
 * Uploads a Buffer (from Multer memory storage) to Cloudinary via upload stream.
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Cloudinary upload options (e.g. folder, public_id, transformation)
 * @returns {Promise<Object>} - Cloudinary upload result object
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: 'layoscan',
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(defaultOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Deletes an asset from Cloudinary by public_id
 * @param {string} publicId
 * @returns {Promise<Object>}
 */
const deleteAsset = (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadStream,
  deleteAsset,
};
