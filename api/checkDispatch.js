require('dotenv').config();
const { sendWhatsAppTemplate } = require('./src/services/wapiService');

async function testWapi() {
    console.log('Testing order_dispatched...');
    try {
        const result = await sendWhatsAppTemplate('919876543210', 'order_dispatched', ['Mukunda', 'ORD-2026-005', 'Catering Items', 'Soon', 'Vizag']);
        console.log('Final Result:', result);
    } catch (e) {
        console.error('Final Error:', e);
    }
}
testWapi();
