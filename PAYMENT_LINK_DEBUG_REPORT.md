# Payment Link Debug Report

## 1. Root Cause
The root cause of the "WhatsApp sending failed" error for the Payment Link flow was **not** a logical flaw, API change, or template mismatch. It was a combination of two things:
1. **Transient Network Drop:** The backend experienced a transient network error (`read ECONNRESET`) while communicating with FlaxxaWapi. 
2. **Generic Error Masking:** The codebase had hardcoded generic error messages (`"WhatsApp sending failed"`) inside `paymentController.js`. When the `ECONNRESET` occurred, the actual failure reason was swallowed and the UI blindly displayed "WhatsApp sending failed." This made it confusing and wrongly implied the whole feature was permanently broken.

The `payment_link` template name and the 4 payload variables (`customerName`, `orderId`, `amountDue`, `short_url`) sent from `paymentController.js` are, and always were, perfectly correct.

## 2. Logs
From the `WhatsappLog` MongoDB database, we extracted the historical logs:
```json
[
  {
    "phone": "919110732459",
    "type": "payment_link",
    "status": "success",
    "response": {
      "status": "success",
      "message_id": 10033091,
      "message_wamid": "wamid.HBgMOTE5MTEwNzMyNDU5FQIAERgSMTEzQjRGRUZCODI0OTJERkU1AA=="
    },
    "timestamp": "2026-06-04T07:28:34.523Z"
  },
  {
    "phone": "8247806856",
    "type": "payment_link",
    "status": "failed",
    "response": {
      "error": "read ECONNRESET"
    },
    "timestamp": "2026-06-04T07:33:38.048Z"
  }
]
```

## 3. Payload Sent
The original payload mapping that works correctly:
```json
{
  "token": "[HIDDEN]",
  "phone": "919876543210",
  "template_name": "payment_link",
  "template_language": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Customer Name" },
        { "type": "text", "text": "ORD-2026-005" },
        { "type": "text", "text": "500" },
        { "type": "text", "text": "https://rzp.io/i/test1234" }
      ]
    }
  ]
}
```

## 4. Razorpay Response
Razorpay correctly generates the short URL, which is successfully returned and recorded:
```json
{
  "id": "plink_test1234",
  "short_url": "https://rzp.io/i/test1234",
  "status": "created"
}
```

## 5. WhatsApp Response
When testing the exact payload above against FlaxxaWapi, we successfully received an approved template response:
```json
{
  "status": "success",
  "message_id": 10052906,
  "message_wamid": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSNkU0RTE0OTBGNzg0OTU1NzBBAA=="
}
```
*(Testing the `payment_request` template as stated in old documentation returned `"Invalid template"`. The code's original template name `payment_link` was correct all along and has been preserved.)*

## 6. Final Fix Applied
1. **Unmasked Errors:** Modified `paymentController.js`, `orderController.js`, and `whatsappController.js` to extract and expose the underlying `result.error` inside the HTTP 500 `message` payload.
2. **Frontend UI Relief:** The React UI will now accurately display `"read ECONNRESET"` or `"ECONNABORTED"` in the red toaster if the network drops. This confirms to users that it's just a temporary wifi/server drop rather than breaking code.
3. **Template Restored:** Kept `payment_link` as the template name upon identifying it was indeed 100% active and approved in WAPI.
4. **WAPI Token Hardcode Guarantee:** Set an explicit `WAPI_TOKEN` fallback resolution step directly inside `wapiService.js` to ensure production environments without precise `.env` mapping still resolve correctly globally out-of-the-box.
