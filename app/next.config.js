/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure image optimization
  images: {
    domains: ['localhost'],
    minimumCacheTTL: 60, // Cache optimized images for 60 seconds only in development
    dangerouslyAllowSVG: true,
  },
  // Configure webpack to handle MDX files and CSS processing
  webpack: (config) => {
    config.module.rules.push({
      test: /\.mdx?$/,
      use: [
        {
          loader: '@mdx-js/loader',
          options: {},
        },
      ],
    });

    return config;
  },
};

module.exports = nextConfig;
