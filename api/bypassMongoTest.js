require('dotenv').config();
const axios = require('axios');

async function testDirect() {
    let wapiToken = process.env.WAPI_TOKEN;
    const baseUrl = 'https://wapi.flaxxa.com/api/v1';

    const payload = {
      token: wapiToken,
      phone: '919876543210',
      template_name: 'order_confirmation',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Mukunda' },
            { type: 'text', text: 'ORD-123' },
            { type: 'text', text: '04 Apr 2026' },
            { type: 'text', text: 'Gajuwaka' },
            { type: 'text', text: '50' },
            { type: 'text', text: '27140' }
          ]
        }
      ]
    };

    try {
        const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Success:', response.data);
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testDirect();
