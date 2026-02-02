import os

# Twilio or other SMS provider configuration would go here
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "your_sid")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "your_token")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "your_number")

def send_critical_alert(to_phone: str, message_body: str):
    """
    Send critical SMS alert.
    This is a simulation. In a real app, you'd use Twilio, Nexmo, etc.
    """
    try:
        # If Twilio was installed:
        # from twilio.rest import Client
        # client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        # message = client.messages.create(body=message_body, from_=TWILIO_PHONE_NUMBER, to=to_phone)
        
        print(f"SMS SENT to {to_phone}: {message_body}")
        
        # Log to a file to simulate sending
        with open("sms_log.txt", "a") as f:
            f.write(f"TO: {to_phone} | MSG: {message_body}\n")
            
        return True
    except Exception as e:
        print(f"Failed to send SMS: {str(e)}")
        return False

def send_otp(to_phone: str, otp_code: str):
    """Send OTP for password reset"""
    message = f"Your Proserve verification code is: {otp_code}. Do not share this with anyone."
    return send_critical_alert(to_phone, message)

def send_sms(to_phones, message_body):
    """Generic function to send SMS to multiple recipients"""
    if not isinstance(to_phones, list):
        to_phones = [to_phones]
    
    success_count = 0
    for phone in to_phones:
        if send_critical_alert(phone, message_body):
            success_count += 1
            
    return success_count > 0
