const axios = require('axios');
const fs = require('fs');

async function checkTemplates() {
  const wapiToken = '212656387069d4dcc8aa914';
  
  try {
    const res = await axios.get(`https://wapi.flaxxa.com/api/v1/getTemplates?token=${wapiToken}`);
    fs.writeFileSync('flaxxa_templates_get.json', JSON.stringify(res.data, null, 2));
  } catch(err) {
    fs.writeFileSync('flaxxa_templates_get.json', JSON.stringify(err.response?.data || err.message, null, 2));
  }
}

checkTemplates();
