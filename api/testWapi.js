require('dotenv').config();
const { sendWhatsAppTemplate } = require('./src/services/wapiService');

async function testWapi() {
    console.log('Testing WAPI...');
    try {
        const result = await sendWhatsAppTemplate('919876543210', 'order_confirmation', ['Test User', 'ORD-123', '26/05/2026', 'Venue', '100', '1000']);
        console.log('Final Result:', result);
    } catch (e) {
        console.error('Final Error:', e);
    }
}
testWapi();
