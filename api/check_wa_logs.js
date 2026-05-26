const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const WhatsappLog = require('./src/models/WhatsappLog');

async function checkLogs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const logs = await WhatsappLog.find().sort({ timestamp: -1 }).limit(10);
        console.log('--- WhatsApp Logs (Last 10) ---');
        logs.forEach(log => {
            const timeStr = log.timestamp ? log.timestamp.toISOString() : 'N/A';
            console.log(`[${timeStr}] Phone: ${log.phone} Type: ${log.type} Status: ${log.status}`);
            console.log(`Response: ${JSON.stringify(log.response, null, 2)}`);
            console.log('----------------------------');
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkLogs();
