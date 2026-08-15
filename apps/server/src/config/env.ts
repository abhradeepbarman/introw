const _envConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 9000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',

  CRAWLBASE_PROXY_HOST: process.env.CRAWLBASE_PROXY_HOST || '',
  CRAWLBASE_PROXY_KEY: process.env.CRAWLBASE_PROXY_KEY || '',
  CRAWLBASE_PROXY_PORT: Number(process.env.CRAWLBASE_PROXY_PORT) || 8012,

  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',

  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  ACCESS_SECRET: process.env.ACCESS_SECRET || '',
  REFRESH_SECRET: process.env.REFRESH_SECRET || '',

  GOOGLE_AUTH_CLIENT_ID: process.env.GOOGLE_AUTH_CLIENT_ID || '',
  GOOGLE_AUTH_CLIENT_SECRET: process.env.GOOGLE_AUTH_CLIENT_SECRET || '',
  GOOGLE_AUTH_REDIRECT_URI:
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT) || 9000}/api/v1/auth/google/callback`,

  IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Intervue <no-reply@intervue.app>',

  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
