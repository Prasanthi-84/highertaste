require('dotenv').config();
const axios = require('axios');

async function testDirect() {
    let wapiToken = process.env.WAPI_TOKEN;
    const baseUrl = 'https://wapi.flaxxa.com/api/v1';

    const payload = {
      token: wapiToken,
      phone: '919876543210',
      template_name: 'payment_request',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Mukunda' },
            { type: 'text', text: 'ORD-123' },
            { type: 'text', text: '500' },
            { type: 'text', text: 'https://rzp.io/i/test1234' }
          ]
        }
      ]
    };

    try {
        const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Success rzp URL:', response.data);
    } catch (err) {
        console.error('Error rzp URL:', err.response ? err.response.data : err.message);
    }

    payload.components[0].parameters[3].text = 'https://google.com';
    try {
        const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('Success google URL:', response.data);
    } catch (err) {
        console.error('Error google URL:', err.response ? err.response.data : err.message);
    }
}

testDirect();
