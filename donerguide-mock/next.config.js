module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/old-route',
        destination: '/new-route',
        permanent: true,
      },
    ];
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3000/api',
  },
};