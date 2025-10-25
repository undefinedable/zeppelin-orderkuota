module.exports = {
  API_URL: process.env.API_URL || 'https://zeppelin-api.vercel.app',
  EXPIRY_TIME_MIN: parseInt(process.env.EXPIRY_TIME || '5', 10),
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  ZEPPELIN_AUTH: {
    auth_username: process.env.AUTH_USERNAME,
    auth_token: process.env.AUTH_TOKEN,
  },
};
