const _envConfig = {
  PORT: Number(process.env.PORT) || 9000,
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
