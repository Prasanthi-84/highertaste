const Quote = require('../models/Quote');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const generateNumber = require('../utils/generateNumber');
const { createError } = require('../middleware/errorHandler');

// ── Helper: compute totals from line items ────────────────────────────────────
const computeTotals = (lineItems = [], taxRate = 18, discountAmount = 0) => {
    const subTotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = parseFloat(((subTotal - discountAmount) * (taxRate / 100)).toFixed(2));
    const totalAmount = parseFloat((subTotal - discountAmount + taxAmount).toFixed(2));
    return { subTotal, taxAmount, totalAmount };
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all quotes (filterable by status, customerId, date range)
// @route   GET /api/quotes
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getQuotes = async (req, res, next) => {
    try {
        const {
            status,
            customerId,
            fromDate,
            toDate,
            search,
            page = 1,
            limit = 20,
        } = req.query;

        const query = {};

        if (status) query.status = status;
        if (customerId) query.customerId = customerId;

        if (fromDate || toDate) {
            query.eventDate = {};
            if (fromDate) query.eventDate.$gte = new Date(fromDate);
            if (toDate) query.eventDate.$lte = new Date(toDate);
        }

        if (search) {
            query.$or = [
                { quoteNumber: { $regex: search, $options: 'i' } },
                { eventName: { $regex: search, $options: 'i' } },
                { venue: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [quotes, total] = await Promise.all([
            Quote.find(query)
                .populate('customerId', 'name phone email company')
                .populate('createdBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Quote.countDocuments(query),
        ]);

        res.json({
            success: true,
            count: quotes.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: quotes,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new quote
// @route   POST /api/quotes
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const createQuote = async (req, res, next) => {
    try {
        const {
            customerId, eventName, eventDate, venue, pax,
            lineItems = [], taxRate = 18, discountAmount = 0,
            validUntil, notes, termsConditions,
        } = req.body;

        if (!customerId) return next(createError(400, 'Customer is required.'));

        // Validate customer exists
        const customer = await Customer.findById(customerId);
        if (!customer) return next(createError(404, 'Customer not found.'));

        // Validate & compute line item totals
        const computedItems = lineItems.map((item) => {
            const qty = parseFloat(item.qty);
            const unitPrice = parseFloat(item.unitPrice);
            
            // Fallback to 0 if invalid to prevent NaN, or you could return an error
            const validQty = isNaN(qty) ? 0 : qty;
            const validPrice = isNaN(unitPrice) ? 0 : unitPrice;

            return {
                menuItemId: item.menuItemId,
                name: item.name,
                qty: validQty,
                unitPrice: validPrice,
                total: parseFloat((validQty * validPrice).toFixed(2)),
            };
        });

        const { subTotal, taxAmount, totalAmount } = computeTotals(computedItems, taxRate, discountAmount);

        const quoteNumber = await generateNumber('QT', Quote);

        const quote = await Quote.create({
            quoteNumber,
            customerId,
            eventName,
            eventDate,
            venue,
            pax,
            lineItems: computedItems,
            subTotal,
            taxRate,
            taxAmount,
            discountAmount,
            totalAmount,
            validUntil,
            notes,
            termsConditions,
            createdBy: req.user.id,
        });

        const populated = await quote.populate('customerId', 'name phone email company');

        // 🔥 TRIGGER WHATSAPP QUOTATION
        const { sendQuotationWithPDF, getApiBaseUrl } = require('../services/wapiService');
        try {
            const apiBase = getApiBaseUrl();
            const pdfUrl = `${apiBase}/api/quotes/download/${quote._id}`;

            const response = await sendQuotationWithPDF(
                populated.customerId.phone,
                pdfUrl,
                populated.quoteNumber,
                populated.customerId.name,
                populated.eventName,
                populated.totalAmount
            );

            let changed = false;
            if (response.templateResponse?.success) {
                quote.whatsappSent = true;
                quote.whatsappSentAt = new Date();
                quote.status = 'Sent';
                changed = true;
            } else {
                console.warn(`Template failed: ${response.templateResponse?.error}`);
            }

            if (response.pdfResponse?.success) {
                quote.pdfSent = true;
                quote.pdfSentAt = new Date();
                changed = true;
            } else {
                console.warn(`PDF failed: ${response.pdfResponse?.error}`);
            }

            if (changed) {
                await quote.save();
            }

        } catch (err) {
            console.error(`[Quote WhatsApp] Failed: ${err.message}`);
        }

        res.status(201).json({
            success: true,
            message: `Quote ${quoteNumber} created successfully`,
            data: populated,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single quote by ID
// @route   GET /api/quotes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const getQuoteById = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id)
            .populate('customerId', 'name phone email company address gstin')
            .populate('createdBy', 'name')
            .populate('convertedToOrderId', 'orderNumber status')
            .lean();

        if (!quote) return next(createError(404, 'Quote not found'));

        res.json({ success: true, data: quote });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update a quote
// @route   PUT /api/quotes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const updateQuote = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return next(createError(404, 'Quote not found'));

        if (quote.status === 'Converted') {
            return next(createError(400, 'Cannot edit a quote that has already been converted to an order.'));
        }

        const allowedFields = [
            'eventName', 'eventDate', 'venue', 'pax', 'lineItems',
            'taxRate', 'discountAmount', 'validUntil', 'status',
            'notes', 'termsConditions', 'customerId',
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) quote[field] = req.body[field];
        });

        // Recompute totals if line items were updated
        if (req.body.lineItems) {
            quote.lineItems = quote.lineItems.map((item) => {
                const qty = parseFloat(item.qty);
                const unitPrice = parseFloat(item.unitPrice);
                const validQty = isNaN(qty) ? 0 : qty;
                const validPrice = isNaN(unitPrice) ? 0 : unitPrice;

                return {
                    ...(item.toObject ? item.toObject() : item),
                    qty: validQty,
                    unitPrice: validPrice,
                    total: parseFloat((validQty * validPrice).toFixed(2)),
                };
            });
            const { subTotal, taxAmount, totalAmount } = computeTotals(
                quote.lineItems, quote.taxRate, quote.discountAmount
            );
            quote.subTotal = subTotal;
            quote.taxAmount = taxAmount;
            quote.totalAmount = totalAmount;
        }

        await quote.save();

        const populated = await quote.populate('customerId', 'name phone email company');

        res.json({
            success: true,
            message: 'Quote updated successfully',
            data: populated,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a quote (only if Draft)
// @route   DELETE /api/quotes/:id
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const deleteQuote = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return next(createError(404, 'Quote not found'));

        if (quote.status !== 'Draft') {
            return next(createError(400, `Only Draft quotes can be deleted. This quote is "${quote.status}".`));
        }

        await quote.deleteOne();

        res.json({
            success: true,
            message: `Quote ${quote.quoteNumber} deleted successfully`,
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Convert a quote into an Order
// @route   POST /api/quotes/:id/convert
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const convertQuoteToOrder = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id);
        if (!quote) return next(createError(404, 'Quote not found'));

        if (quote.status === 'Converted') {
            return next(createError(400, 'This quote has already been converted to an order.'));
        }
        if (quote.status === 'Rejected' || quote.status === 'Expired') {
            return next(createError(400, `Cannot convert a ${quote.status} quote.`));
        }

        const { eventDate, venue, pax } = req.body;

        // Auto-generate order number
        const orderNumber = await generateNumber('ORD', Order);

        const order = await Order.create({
            orderNumber,
            customerId: quote.customerId,
            quoteId: quote._id,
            eventName: quote.eventName,
            eventDate: eventDate || quote.eventDate,
            venue: venue || quote.venue,
            pax: pax || quote.pax,
            lineItems: quote.lineItems,
            subTotal: quote.subTotal,
            taxRate: quote.taxRate,
            taxAmount: quote.taxAmount,
            discountAmount: quote.discountAmount,
            totalAmount: quote.totalAmount,
            amountPaid: 0,
            amountDue: quote.totalAmount,
            status: 'Confirmed',
            notes: quote.notes,
            createdBy: req.user.id,
        });

        // Update quote to Converted and link the order
        quote.status = 'Converted';
        quote.convertedToOrderId = order._id;
        await quote.save();

        // Increment customer totalOrders counter
        await Customer.findByIdAndUpdate(quote.customerId, { $inc: { totalOrders: 1 } });

        const populatedOrder = await order.populate('customerId', 'name phone email company');

        // 🔥 TRIGGER WHATSAPP ORDER CREATED (On Conversion)
        const { sendWhatsAppTemplate } = require('../services/wapiService');
        try {
            // order_confirmation: customerName, orderId, eventDate, venue, guests, totalAmount
            const variables = [
                populatedOrder.customerId.name,
                populatedOrder.orderNumber,
                populatedOrder.eventDate ? new Date(populatedOrder.eventDate).toLocaleDateString('en-IN') : 'N/A',
                populatedOrder.venue || 'N/A',
                populatedOrder.pax || 'N/A',
                populatedOrder.totalAmount || '0'
            ];
            await sendWhatsAppTemplate(populatedOrder.customerId.phone, 'order_confirmation', variables);
        } catch (err) {
            console.error(`[Quote Convert WhatsApp] Failed: ${err.message}`);
        }

        res.status(201).json({
            success: true,
            message: `Quote ${quote.quoteNumber} successfully converted to Order ${orderNumber}`,
            data: {
                order: populatedOrder,
                quote: { _id: quote._id, quoteNumber: quote.quoteNumber, status: quote.status },
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Send Quote notification via WhatsApp (Manual trigger)
// @route   POST /api/quotes/:id/send-whatsapp
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
const sendQuoteWhatsApp = async (req, res, next) => {
    try {
        console.log(`\n${'#'.repeat(60)}`);
        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 1: POST /api/quotes/:id/send-whatsapp HIT`);
        console.log(`[CTRL-DEBUG]   Quote ID: ${req.params.id}`);
        console.log(`[CTRL-DEBUG]   User    : ${req.user?.id || 'unknown'}`);

        const { id } = req.params;
        const quote = await Quote.findById(id).populate('customerId');

        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 2: DB lookup done`);
        if (!quote) {
            console.error(`[CTRL-DEBUG] ✖ CTRL-STEP 2 FAILED: Quote not found for id=${id}`);
            return next(createError(404, 'Quote not found'));
        }
        console.log(`[CTRL-DEBUG]   Quote found: ${quote.quoteNumber}, status: ${quote.status}`);

        const phone = quote.customerId?.phone;
        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 3: Customer phone = "${phone}"`);
        console.log(`[CTRL-DEBUG]   Customer name : ${quote.customerId?.name}`);
        console.log(`[CTRL-DEBUG]   Customer _id  : ${quote.customerId?._id}`);
        if (!phone) {
            console.error(`[CTRL-DEBUG] ✖ CTRL-STEP 3 FAILED: No phone on customerId`);
            return next(createError(400, 'Customer phone number not found'));
        }

        const { sendQuotationWithPDF, getApiBaseUrl } = require('../services/wapiService');
        const apiBase = getApiBaseUrl();
        const pdfUrl = `${apiBase}/api/quotes/download/${quote._id}`;

        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 4: PDF URL built`);
        console.log(`[CTRL-DEBUG]   API Base: ${apiBase}`);
        console.log(`[CTRL-DEBUG]   PDF URL : ${pdfUrl}`);
        console.log(`[CTRL-DEBUG]   (If API Base is localhost, Flaxxa cannot fetch this PDF — URL must be public!)`);

        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 5: Calling sendQuotationWithPDF...`);
        const response = await sendQuotationWithPDF(
            phone,
            pdfUrl,
            quote.quoteNumber,
            quote.customerId.name,
            quote.eventName,
            quote.totalAmount
        );

        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 6: sendQuotationWithPDF returned`);
        console.log(`[CTRL-DEBUG]   templateResponse: ${JSON.stringify(response.templateResponse)}`);
        console.log(`[CTRL-DEBUG]   pdfResponse     : ${JSON.stringify(response.pdfResponse)}`);

        if (!response.templateResponse?.success) {
            console.error(`[CTRL-DEBUG] ✖ CTRL-STEP 6: Template FAILED → ${response.templateResponse?.error}`);
            return res.status(500).json({ success: false, message: 'WhatsApp template sending failed', error: response.templateResponse?.error });
        }

        if (!response.pdfResponse?.success) {
            console.warn(`[CTRL-DEBUG] ⚠ CTRL-STEP 6: PDF non-blocking failure → ${response.pdfResponse?.error}`);
        }

        console.log(`[CTRL-DEBUG] ▶ CTRL-STEP 7: Saving quote flags to DB...`);
        quote.whatsappSent = true;
        quote.whatsappSentAt = new Date();
        if (response.pdfResponse?.success) {
            quote.pdfSent = true;
            quote.pdfSentAt = new Date();
        }
        if (quote.status === 'Draft') {
            quote.status = 'Sent';
        }
        await quote.save();
        console.log(`[CTRL-DEBUG] ✔ CTRL-STEP 7: Quote saved. whatsappSent=true, status=${quote.status}`);
        console.log(`${'#'.repeat(60)}\n`);

        res.json({ success: true, message: `Quotation WhatsApp and PDF sent successfully to ${phone}` });
    } catch (err) {
        console.error(`[CTRL-DEBUG] ✖ EXCEPTION in sendQuoteWhatsApp: ${err.message}`);
        console.error(err.stack);
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Download Quote as PDF publicly (for WhatsApp retrieval)
// @route   GET /api/quotes/download/:id
// @access  Public
// ─────────────────────────────────────────────────────────────────────────────
const downloadQuotePDF = async (req, res, next) => {
    try {
        const quote = await Quote.findById(req.params.id)
            .populate('customerId', 'name company phone email gstin address');

        if (!quote) return next(createError(404, 'Quote not found'));

        const customer = quote.customerId;
        const { generateQuotePDF } = require('../services/pdfService');
        const pdfBuffer = await generateQuotePDF(quote, customer);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${quote.quoteNumber}.pdf"`
        );
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getQuotes,
    createQuote,
    getQuoteById,
    updateQuote,
    deleteQuote,
    convertQuoteToOrder,
    sendQuoteWhatsApp,
    downloadQuotePDF,
};
