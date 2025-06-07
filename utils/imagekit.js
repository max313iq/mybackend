// utils/imagekit.js
const ImageKit = require('imagekit');

// الآن هذا الكود سيعمل بشكل صحيح وآمن
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

module.exports = imagekit;