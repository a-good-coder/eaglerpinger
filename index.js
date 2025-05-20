require('./keep-alive');
const mineflayer = require('mineflayer');

// Get and split the host + port
const [host, port] = process.env.SERVER.split(':');

function createBot() {
  const bot = mineflayer.createBot({
    host: host,
    port: parseInt(port),
    username: 'AFK_Bot',
    version: false
  });

  let afkEnabled = true;
  let isSleeping = false;

  bot.on('spawn', () => {
    console.log('✅ Bot joined the server!');
    bot.chat("I'm here and AFK-ready 😴");

    startAfkMovements();
    autoSleepLoop(); // start checking for sleep
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', err => {
    console.log('⚠️ Error:', err);
  });

  function startAfkMovements() {
    if (!afkEnabled) return;

    const directions = ['forward', 'back', 'left', 'right'];

    function randomMovement() {
      if (!afkEnabled || isSleeping) return;

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

  // Auto sleep loop
  function autoSleepLoop() {
    setInterval(async () => {
      if (bot.time.isDay || isSleeping) return;

      const bed = bot.findBlock({
        matching: block => bot.isABed(block),
        maxDistance: 10
      });

      if (!bed) return;

      try {
        await bot.sleep(bed);
        isSleeping = true;
        afkEnabled = false;
        bot.clearControlStates();
        bot.chat("💤 Sleeping... goodnight!");
      } catch (err) {
        // Sleep failed, ignore
      }
    }, 1000);
  }

  // Wake up automatically when day
  bot.on('time', async () => {
    if (isSleeping && bot.time.isDay) {
      try {
        await bot.wake();
        isSleeping = false;
        afkEnabled = true;
        bot.chat("☀️ Morning! Back to AFK.");
        startAfkMovements();
      } catch (err) {
        // Waking failed, ignore
      }
    }
  });

  bot.on('death', () => {
    console.log('💀 Bot died! Respawning...');
    bot.once('respawn', () => {
      console.log('♻️ Bot respawned, restarting AFK loop');
      afkEnabled = true;
      isSleeping = false;
      startAfkMovements();
      autoSleepLoop();
    });
  });
}

createBot();
