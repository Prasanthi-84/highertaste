const axios = require('axios');
const fs = require('fs');

async function testTemplates() {
  const wapiToken = '212656387069d4dcc8aa914';
  const phone = '919876543210';
  
  const templatesToTest = [
    { name: 'enquiry_quotation', hasDoc: true, paramCount: 3 },
    { name: 'enquiry_quotation', hasDoc: false, paramCount: 3 },
    { name: 'enquiry_quotation', hasDoc: true, paramCount: 4 },
    { name: 'enquiry_quotation', hasDoc: false, paramCount: 4 },
  ];

  const results = {};

  for (const t of templatesToTest) {
    const key = `${t.name}_doc:${t.hasDoc}_params:${t.paramCount}`;
    const params = Array(t.paramCount).fill({type: 'text', text: 'T'});

    const payload = {
      token: wapiToken,
      phone: phone,
      template_name: t.name,
      template_language: 'en_US',
      components: t.hasDoc ? [
        {
          type: 'header',
          parameters: [{type: 'document', document: {link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', filename: 'dummy.pdf'}}]
        },
        {
          type: 'body',
          parameters: params
        }
      ] : [
        {
          type: 'body',
          parameters: params
        }
      ]
    };
    
    try {
      const res = await axios.post('https://wapi.flaxxa.com/api/v1/sendtemplatemessage', payload);
      results[key] = res.data;
    } catch(err) {
      results[key] = err.response?.data || err.message;
    }
  }

  fs.writeFileSync('flaxxa_test_enquiry.json', JSON.stringify(results, null, 2));
}

testTemplates();
