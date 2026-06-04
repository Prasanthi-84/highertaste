require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');

async function test() {
    await mongoose.connect(process.env.MONGO_URI);
    const set = await Settings.findOne();
    console.log(JSON.stringify(set, null, 2));
    process.exit();
}
test();
