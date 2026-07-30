const _env = {
  API_BASE_URL: process.env.BUN_PUBLIC_API_BASE_URL || '',
};

const env = Object.freeze(_env);
export default env;
