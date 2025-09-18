/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'mongodb']
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
}

module.exports = nextConfig
