/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js', 'sharp'],
    outputFileTracingIncludes: {
      '/api/ocr': ['./eng.traineddata'],
    },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

module.exports = nextConfig;
