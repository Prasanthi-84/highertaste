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
      template_name: 'payment_request',
      template_language: 'en',
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
            index: 0,
            parameters: [{ type: 'text', text: 'google.com' }]
        }
      ]
    });
    results.payment_index_int = resPayment.data;
  } catch(e) {
    results.payment_index_int = e.response?.data || e.message;
  }
  
  try {
    const resPayment2 = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: 'payment_request',
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
            index: 0,
            parameters: [{ type: 'text', text: 'google.com' }]
        }
      ]
    });
    results.payment_index_int_enUS = resPayment2.data;
  } catch(e) {
    results.payment_index_int_enUS = e.response?.data || e.message;
  }

  try {
    const resPayment3 = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
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
            index: 0,
            parameters: [{ type: 'text', text: 'google.com' }]
        }
      ]
    });
    results.payment_link = resPayment3.data;
  } catch(e) {
    results.payment_link = e.response?.data || e.message;
  }

  fs.writeFileSync('flaxxa_test4.json', JSON.stringify(results, null, 2));
}

testFlaxxa();
