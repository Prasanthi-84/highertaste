const axios = require('axios');
const fs = require('fs');

async function testFlaxxa() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  const templateName = 'quotation_inquiry';
  
  const results = {};

  try {
    const docRes = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: templateName,
      template_language: 'en_US',
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                filename: 'dummy.pdf'
              }
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test User'},
            {type: 'text', text: 'Catering'},
            {type: 'text', text: 'QT-123'},
            {type: 'text', text: '1000'}
          ]
        }
      ]
    });
    results.with_document = docRes.data;
  } catch (err) {
    results.with_document = err.response?.data || err.message;
  }

  try {
    const noDocRes = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', {
      token: wapiToken,
      phone: phone,
      template_name: templateName,
      template_language: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            {type: 'text', text: 'Test User'},
            {type: 'text', text: 'Catering'},
            {type: 'text', text: 'QT-123'},
            {type: 'text', text: '1000'}
          ]
        }
      ]
    });
    results.no_document = noDocRes.data;
  } catch (err) {
    results.no_document = err.response?.data || err.message;
  }

  fs.writeFileSync('flaxxa_test.json', JSON.stringify(results, null, 2));
}

testFlaxxa();
