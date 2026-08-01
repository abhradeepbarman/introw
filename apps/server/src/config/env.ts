const _envConfig = {
  PORT: Number(process.env.PORT) || 9000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  CRAWLBASE_PROXY_HOST: process.env.CRAWLBASE_PROXY_HOST || '',
  CRAWLBASE_PROXY_KEY: process.env.CRAWLBASE_PROXY_KEY || '',
  CRAWLBASE_PROXY_PORT: Number(process.env.CRAWLBASE_PROXY_PORT) || 8012,

  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
