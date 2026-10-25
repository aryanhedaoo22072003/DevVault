import nextConfig from 'eslint-config-next';

const config = [...nextConfig, { ignores: ['.devvault-private/**'] }];

export default config;
