require('./keep-alive');
const mineflayer = require('mineflayer');

const [host, port] = process.env.SERVER.split(':');

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: host,
    port: parseInt(port),
    username: 'uptimebot',
    version: false,
  });

  bot.on('spawn', () => {
    console.log('✅ Bot joined the server!');
    startAfkMovements();
  });

  bot.on('death', () => {
    console.log('💀 Bot died! Respawning...');
    bot.once('respawn', () => {
      console.log('♻️ Bot respawned, restarting AFK movements');
      startAfkMovements();
    });
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting in 5 seconds...');
    setTimeout(startBot, 5000);
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err);
  });

  function startAfkMovements() {
    const directions = ['forward', 'back', 'left', 'right'];

    function randomMovement() {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      bot.setControlState(dir, true);

      if (Math.random() < 0.3) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
      }

      const moveDuration = Math.floor(Math.random() * 2000) + 1000;

      setTimeout(() => {
        bot.setControlState(dir, false);
        const nextDelay = Math.floor(Math.random() * 4000) + 1000;
        setTimeout(randomMovement, nextDelay);
      }, moveDuration);
    }

    randomMovement();
  }
}

startBot();
