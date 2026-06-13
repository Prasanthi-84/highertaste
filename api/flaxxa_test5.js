const axios = require('axios');
const fs = require('fs');

async function testFlaxxa() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  const results = {};

  try {
    const resPayment = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_link',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: '123'},
            {type: 'text', text: '100'}
          ]
        },
        {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'https://google.com' }]
        }
      ]
    });
    results.payment_link_str = resPayment.data;
  } catch(e) {
    results.payment_link_str = e.response?.data || e.message;
  }

  try {
    const resPayment1 = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_link',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: '123'},
            {type: 'text', text: '100'}
          ]
        }
      ]
    });
    results.payment_link_no_button = resPayment1.data;
  } catch(e) {
    results.payment_link_no_button = e.response?.data || e.message;
  }
  
  try {
    const resPayment2 = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_link',
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test'},
            {type: 'text', text: '123'},
            {type: 'text', text: '100'},
            {type: 'text', text: 'google.com'}
          ]
        }
      ]
    });
    results.payment_link_4_args = resPayment2.data;
  } catch(e) {
    results.payment_link_4_args = e.response?.data || e.message;
  }

  fs.writeFileSync('flaxxa_test5.json', JSON.stringify(results, null, 2));
}

testFlaxxa();
