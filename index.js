require('./keep-alive');
const mineflayer = require('mineflayer');

const [host, port] = process.env.SERVER.split(':');

function createBot() {
  const bot = mineflayer.createBot({
    host: host,
    port: parseInt(port),
    username: 'uptimebot',
    version: false
  });

  let afkEnabled = true;
  let isSleeping = false;

  bot.on('spawn', () => {
    console.log('✅ Bot joined the server!');
    startAfkMovements();
    autoSleepLoop();
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', err => {
    console.log('⚠️ Error:', err);
  });

  function startAfkMovements() {
    if (!afkEnabled || isSleeping) return;

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

  async function placeBed() {
    return new Promise(async (resolve, reject) => {
      try {
        bot.chat('/give @s bed');
        await bot.waitForTicks(10); // wait for the bed to appear in inventory

        const bedItem = bot.inventory.items().find(item => item.name.includes('bed'));
        if (!bedItem) return reject('No bed in inventory');

        const refBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0)); // block under the bot
        if (!refBlock || !bot.canPlaceBlock(refBlock)) return reject('No good place to place bed');

        await bot.equip(bedItem, 'hand');
        await bot.placeBlock(refBlock, { x: 0, y: 1, z: 0 });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  function autoSleepLoop() {
    setInterval(async () => {
      if (bot.time.isDay || isSleeping) return;

      let bed = bot.findBlock({
        matching: block => bot.isABed(block),
        maxDistance: 10
      });

      if (!bed) {
        try {
          await placeBed();
          // give time to place
          await bot.waitForTicks(20);
          bed = bot.findBlock({
            matching: block => bot.isABed(block),
            maxDistance: 10
          });
        } catch (err) {
          console.log('❌ Failed to place bed:', err);
          return;
        }
      }

      if (!bed) return;

      try {
        await bot.sleep(bed);
        isSleeping = true;
        afkEnabled = false;
        bot.clearControlStates();
       } catch (err) {
        console.log("❌ Couldn't sleep:", err.message);
      }
    }, 1000);
  }

  bot.on('time', async () => {
    if (isSleeping && bot.time.isDay) {
      try {
        await bot.wake();
        isSleeping = false;
        afkEnabled = true;
        startAfkMovements();
      } catch (err) {
        console.log("❌ Couldn't wake up:", err.message);
      }
    }
  });

  bot.on('death', () => {
    console.log('💀 Bot died! Respawning...');
    bot.once('respawn', () => {
      isSleeping = false;
      afkEnabled = true;
      startAfkMovements();
      autoSleepLoop();
    });
  });
}

createBot();
