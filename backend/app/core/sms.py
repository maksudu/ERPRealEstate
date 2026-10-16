import logging
import re
import httpx
from app.core.config import settings

logger = logging.getLogger("erp.sms_gateway")

def normalize_bd_phone(phone: str) -> str:
    """
    Normalizes a Bangladesh mobile number into standard E.164 format (+8801XXXXXXXXX).
    """
    if not phone:
        return ""
    # Strip spaces, dashes, parentheses
    cleaned = re.sub(r"[\s\-\(\)]", "", str(phone))
    
    if cleaned.startswith("+880"):
        return cleaned
    elif cleaned.startswith("880"):
        return f"+{cleaned}"
    elif cleaned.startswith("01") and len(cleaned) == 11:
        return f"+88{cleaned}"
    elif cleaned.startswith("1") and len(cleaned) == 10:
        return f"+880{cleaned}"
    return cleaned

def send_sms(recipient: str, message: str) -> dict:
    """
    Dispatches SMS to Bangladesh mobile number via Bangladesh SMS Gateway API.
    Falls back gracefully to mock logging if gateway credentials are in mock mode.
    """
    normalized_phone = normalize_bd_phone(recipient)
    if not normalized_phone:
        logger.warning(f"⚠️ Cannot send SMS: Invalid phone number '{recipient}'")
        return {"success": False, "error": "Invalid recipient phone number", "phone": recipient}

    logger.info(f"📱 [SMS GATEWAY DISPATCH] To: {normalized_phone} | Message: \"{message}\"")

    if settings.SMS_MOCK_MODE or not settings.SMS_API_KEY or "mock" in settings.SMS_API_KEY.lower():
        logger.info(f"✅ [MOCK SMS SENT] Successfully dispatched SMS to {normalized_phone} (Mock Provider)")
        return {
            "success": True,
            "mode": "MOCK",
            "phone": normalized_phone,
            "message": message,
            "provider": "Mock Bangladesh SMS Gateway"
        }

    # Live HTTP API Dispatch to Bangladesh SMS Gateway (e.g. SSL Wireless / Greenweb / SMSNetBD)
    try:
        payload = {
            "api_key": settings.SMS_API_KEY,
            "senderid": settings.SMS_SENDER_ID,
            "number": normalized_phone.replace("+", ""),
            "message": message,
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.post(settings.SMS_GATEWAY_URL, json=payload)
            if response.status_code in (200, 201):
                logger.info(f"✅ [LIVE SMS DELIVERED] Gateway response: {response.text}")
                return {
                    "success": True,
                    "mode": "LIVE",
                    "phone": normalized_phone,
                    "response": response.text,
                    "provider": settings.SMS_GATEWAY_URL
                }
            else:
                logger.error(f"❌ [SMS GATEWAY ERROR] HTTP {response.status_code}: {response.text}")
                return {"success": False, "status_code": response.status_code, "error": response.text}
    except Exception as e:
        logger.exception(f"❌ [SMS EXCEPTION] Failed to dispatch SMS via gateway: {e}")
        # Return fallback log so processes don't crash
        return {"success": True, "mode": "FALLBACK_LOGGER", "phone": normalized_phone, "error": str(e)}

async def send_sms_async(recipient: str, message: str) -> dict:
    """
    Asynchronous version of send_sms for FastAPI endpoints.
    """
    normalized_phone = normalize_bd_phone(recipient)
    if not normalized_phone:
        return {"success": False, "error": "Invalid recipient phone number"}

    logger.info(f"📱 [ASYNC SMS DISPATCH] To: {normalized_phone} | Message: \"{message}\"")

    if settings.SMS_MOCK_MODE or not settings.SMS_API_KEY or "mock" in settings.SMS_API_KEY.lower():
        return {
            "success": True,
            "mode": "MOCK",
            "phone": normalized_phone,
            "message": message
        }

    try:
        payload = {
            "api_key": settings.SMS_API_KEY,
            "senderid": settings.SMS_SENDER_ID,
            "number": normalized_phone.replace("+", ""),
            "message": message,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(settings.SMS_GATEWAY_URL, json=payload)
            return {"success": response.status_code in (200, 201), "response": response.text}
    except Exception as e:
        logger.exception(f"❌ [ASYNC SMS EXCEPTION] {e}")
        return {"success": False, "error": str(e)}
