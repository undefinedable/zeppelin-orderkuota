require('dotenv').config();
const ZeppelinBot = require('./src/bot');

(async () => {
  try {
    const bot = new ZeppelinBot();
    bot.launch();
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
})();
