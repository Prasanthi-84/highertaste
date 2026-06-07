const axios = require('axios');
const fs = require('fs');

async function testOrderConfirmation() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  try {
    const res = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'order_confirmation',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: 'ORD-1'},
            {type: 'text', text: 'Date'},
            {type: 'text', text: 'Venue'},
            {type: 'text', text: '100'},
            {type: 'text', text: '5000'}
          ]
        }
      ]
    });
    fs.writeFileSync('flaxxa_test2.json', JSON.stringify(res.data, null, 2));
  } catch(err) {
    fs.writeFileSync('flaxxa_test2.json', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}
testOrderConfirmation();
