const axios = require('axios');
const WhatsappLog = require('../models/WhatsappLog'); // Might need this later for logging

/**
 * Format phone number to E.164 without the '+' sign
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-numeric characters
  let cleanPhone = phone.toString().replace(/\D/g, '');
  
  // If it's a 10 digit Indian number, prefix with 91
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }
  return cleanPhone;
};

/**
 * Generic reusable function to send a WhatsApp template
 * 
 * @param {string} phone - The recipient's phone number
 * @param {string} templateName - The name of the approved template
 * @param {Array} variables - An array of variable values in sequence (or an array of objects)
 */
const sendWhatsAppTemplate = async (phone, templateName, variables) => {
  try {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      throw new Error('Invalid phone number provided');
    }

    const wapiToken = process.env.WAPI_TOKEN || process.env.WAPI_API_TOKEN;
    const baseUrl = process.env.WAPI_BASE_URL || 'https://wapi.flaxxa.com/api/v1';
    const language = process.env.WAPI_LANGUAGE || 'en_US';

    if (!wapiToken) {
      throw new Error('WAPI_TOKEN is not configured');
    }

    // Format variables into the parameters array for body component
    const parameters = variables.map((variable) => ({
      type: 'text',
      text: variable ? variable.toString() : 'N/A'
    }));

    const payload = {
      token: wapiToken,
      phone: formattedPhone,
      template_name: templateName,
      template_language: language,
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters
        }
      ] : []
    };

    console.log(`[WAPI Service] Sending template ${templateName} to ${formattedPhone}`);
    console.log(`[WAPI Service] Payload:`, JSON.stringify(payload));

    const response = await axios.post(`${baseUrl}/sendtemplatemessage`, payload, {
      headers: {
        'Content-Type': 'application/json'
        // 'Authorization': `Bearer ${wapiToken}` // Just in case, some platforms allow both
      }
    });

    console.log(`[WAPI Service] Success:`, response.data);

    // Save log if Covid requires (Optional but requested for detailed logs)
    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: formattedPhone,
        templateName: templateName,
        status: 'SUCCESS',
        response: response.data
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[WAPI Service] Error sending ${templateName} to ${phone}: ${errorMessage}`);
    
    if (WhatsappLog) {
      await WhatsappLog.create({
        phone: phone,
        templateName: templateName,
        status: 'FAILED',
        error: errorMessage
      }).catch(err => console.error('[WAPI Service] Failed to save DB log:', err.message));
    }

    // Return rather than throw to prevent breaking API flows
    return {
      success: false,
      error: errorMessage
    };
  }
};

module.exports = {
  sendWhatsAppTemplate
};
