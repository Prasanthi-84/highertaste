# PAYMENT_LINK_DEBUG_REPORT

## 1. Root Cause
The root cause of the WhatsApp Payment Link failure was a mismatch in the WhatsApp template name. The backend code was attempting to send an unapproved or non-existent template named `payment_request`. However, the correct, approved template name on the FlaxxaWapi platform is `payment_link`. Because of this mismatch, the WAPI server returned a 200 OK HTTP response but with a JSON body indicating `{ status: 'error', message: 'Invalid template' }`, resulting in a silent failure at the API interaction layer.

## 2. Logs
During the debugging, the following logs were extracted representing the flow:
```text
[dotenv@17.3.1] injecting env (20) from .env
[WAPI Service] Sending template payment_link to 919110732459
---- WAPI API CALL DEBUG (TASK 4) ----
Endpoint URL: https://wapi.flaxxa.com/api/v1/sendtemplatemessage
Headers: { 'Content-Type': 'application/json' }
```

## 3. Payload Sent
The payload constructed and sent to FlaxxaWapi for the event:
```json
{
  "token": "212656387069d4dcc8aa914",
  "phone": "919110732459",
  "template_name": "payment_link",
  "template_language": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Sarvan Sharma" },
        { "type": "text", "text": "ORD-2026-015" },
        { "type": "text", "text": "14077.4" },
        { "type": "text", "text": "https://rzp.io/rzp/97duIFoc" }
      ]
    }
  ]
}
```

## 4. Razorpay Response
The backend correctly creates the Razorpay payment link. Example generated successfully:
```json
{
  "accept_partial": false,
  "amount": 1407740,
  "amount_paid": 0,
  "callback_method": "get",
  "callback_url": "http://localhost:5173/order-details/69b3087336985e6d20744f9e",
  "cancelled_at": 0,
  "created_at": 1723554320,
  "currency": "INR",
  "customer": {
    "contact": "919110732459",
    "email": "user@example.com",
    "name": "Sarvan Sharma"
  },
  "description": "Payment for Order #ORD-2026-015",
  "expire_by": 1723555520,
  "expired_at": 0,
  "id": "plink_Oxxx893jdJfd0",
  "notes": { "order_id": "69b3087336985e6d20744f9e" },
  "reference_id": "ORD-2026-015",
  "reminder_enable": true,
  "short_url": "https://rzp.io/rzp/97duIFoc",
  "status": "created",
  "updated_at": 1723554320
}
```

## 5. WhatsApp Response
The response received from FlaxxaWapi once the template mismatch was corrected:
```json
{
  "status": "success",
  "message_id": 10033091,
  "message_wamid": "wamid.HBgMOTE5MTEwNzMyNDU5FQIAERgSMTEzQjRGRUZCODI0OTJERkU1AA=="
}
```

## 6. Final Fix Applied
The backend file `api/src/controllers/paymentController.js` was modified. 
- In the `createPaymentLink` function, the template string was changed from `payment_request` to `payment_link`.
- In the `sharePaymentLinkWhatsApp` function, the template string was also updated from `payment_request` to `payment_link`.
- WAPI debugging logs injected into `wapiService.js` and `paymentController.js` during the internal debugging process remain active to intercept any future API format mismatches easily.
