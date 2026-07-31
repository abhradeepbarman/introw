const _envConfig = {
  API_BASE_URL: process.env.BUN_PUBLIC_API_BASE_URL || '',
};

const envConfig = Object.freeze(_envConfig);
export default envConfig;
