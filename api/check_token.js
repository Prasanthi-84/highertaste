require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');

async function checkToken() {
  await mongoose.connect(process.env.MONGO_URI);
  const s = await Settings.findOne();
  console.log("DB TOKEN:", s?.integrations?.flaxxaWapi?.token);
  process.exit();
}
checkToken();
