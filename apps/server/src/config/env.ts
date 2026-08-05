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

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'Intervue <no-reply@intervue.app>',
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
