const axios = require('axios');
const logger = require('../utils/logger');
const WhatsappLog = require('../models/WhatsappLog');

const sendWhatsAppMessage = async ({ to, templateName, variables }) => {
    if (!to) {
        logger.warn('WhatsApp: No phone number provided, skipping.');
        return { success: false, error: 'No phone number' };
    }

    try {
        // Fetch current settings from DB
        const Settings = require('../models/Settings');
        const dbSettings = await Settings.findOne();
        
        const settings = dbSettings?.integrations?.whatsapp;
        const WHATSAPP_TOKEN = settings?.enabled && settings?.apiKey ? settings.apiKey : process.env.WHATSAPP_ACCESS_TOKEN;
        const PHONE_NUMBER_ID = settings?.enabled && settings?.phoneNumberId ? settings.phoneNumberId : process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            logger.error('WhatsApp: Missing API credentials (not in DB or .env)');
            return { success: false, error: 'WhatsApp credentials not configured' };
        }

        // Clean phone number
        let cleanPhone = String(to).replace(/[\s\-\(\)\+]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '91' + cleanPhone.slice(1);
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
        
        const data = {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
                name: templateName,
                language: { code: "en" },
                components: variables && variables.length > 0 ? [{
                    type: "body",
                    parameters: variables.map(v => ({ type: "text", text: String(v) }))
                }] : []
            }
        };

        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        await WhatsappLog.create({
            phone: cleanPhone,
            type: templateName,
            status: 'success',
            response: response.data
        }).catch(err => logger.error('Failed to log WhatsApp success', err));

        logger.info(`WhatsApp message (${templateName}) sent to ${cleanPhone}`);
        return { success: true, data: response.data };

    } catch (error) {
        const errorData = error?.response?.data || error.message;
        
        await WhatsappLog.create({
            phone: String(to),
            type: templateName,
            status: 'failed',
            response: errorData
        }).catch(err => logger.error('Failed to log WhatsApp error', err));

        logger.error(`WhatsApp ${templateName} failed:`, errorData);
        return { success: false, error: errorData };
    }
};

module.exports = { sendWhatsAppMessage };
