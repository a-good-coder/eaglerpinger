const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('AFK bot is alive!');
});

app.listen(3000);