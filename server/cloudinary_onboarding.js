#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'dzduqrakd',
  api_key: '588192396156523',
  api_secret: '85x9telhzHTn9sAgqloZXVdfKm0',
  secure: true
});

async function run() {
  try {
    console.log("Uploading sample image...");
    // 2. Upload an image from Cloudinary's demo domains
    const result = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg');
    
    console.log('Secure URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    
    // 3. Get image details
    console.log('Width:', result.width);
    console.log('Height:', result.height);
    console.log('Format:', result.format);
    console.log('File Size (bytes):', result.bytes);
    
    // 4. Transform the image
    // f_auto: Automatic format selection selects the best image format for the client browser (e.g. WebP/AVIF).
    // q_auto: Automatic quality optimizes compression level to reduce size without noticeable visual loss.
    const transformedUrl = cloudinary.url(result.public_id, {
      fetch_format: 'auto',
      quality: 'auto',
      secure: true
    });
    
    console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);
  } catch (error) {
    console.error('Error during execution:', error);
    process.exit(1);
  }
}

run();
