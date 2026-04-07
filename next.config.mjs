/** @type {import('next').NextConfig} */
const nextConfig = {
  // Necesario para que transformers.js funcione en el browser
  // Los workers se cargan desde el CDN de Hugging Face
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }
    return config
  },
}

export default nextConfig
