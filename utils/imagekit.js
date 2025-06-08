// utils/imagekit.js
const ImageKit = require('imagekit');
const path = require('path');

// Configure ImageKit using environment variables
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Helper to derive a file ID from an ImageKit URL. This assumes the file name
// represents the ID, which is true for files uploaded by this backend.
imagekit.getFileId = imageUrl => {
  try {
    const fileName = path.basename(imageUrl).split('?')[0];
    return fileName.split('.')[0];
  } catch (err) {
    return null;
  }
};

module.exports = imagekit;