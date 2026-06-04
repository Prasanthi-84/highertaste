require('dotenv').config();
const { sendWhatsAppTemplate } = require('./src/services/wapiService');
const axios = require('axios');

async function testWapi() {
    console.log('Testing payment_request with actual Razorpay-like URL...');
    try {
        const result1 = await sendWhatsAppTemplate('919876543210', 'payment_request', ['Mukunda', 'ORD-2026-005', '500', 'https://rzp.io/i/test1234']);
        console.log('Final Result (Normal):', result1);
    } catch (e) {
        console.error('Final Error (Normal):', e);
    }

    console.log('\nTesting payment_request with Google URL (TASK 6)...');
    try {
        const result2 = await sendWhatsAppTemplate('919876543210', 'payment_request', ['Mukunda', 'ORD-2026-005', '500', 'https://google.com']);
        console.log('Final Result (Google):', result2);
    } catch (e) {
        console.error('Final Error (Google):', e);
    }
}
testWapi();
