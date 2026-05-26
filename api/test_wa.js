const { sendWhatsAppMessage } = require('./src/services/whatsappService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Testing WhatsApp with current credentials...');
        
        const result = await sendWhatsAppMessage({
            to: '919014163914', // Testing with a real number or a placeholder
            templateName: 'order_created',
            variables: ['Test User', 'ORD-TEST', '26/05/2026']
        });

        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
