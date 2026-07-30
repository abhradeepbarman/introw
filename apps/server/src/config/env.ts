const _envConfig = {
  PORT: Number(process.env.PORT) || 9000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  CRAWLBASE_PROXY_HOST: process.env.CRAWLBASE_PROXY_HOST || '',
  CRAWLBASE_PROXY_KEY: process.env.CRAWLBASE_PROXY_KEY || '',
  CRAWLBASE_PROXY_PORT: Number(process.env.CRAWLBASE_PROXY_PORT) || 8012,
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
