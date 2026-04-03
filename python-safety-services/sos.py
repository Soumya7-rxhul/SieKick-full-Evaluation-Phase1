import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def handle_sos(data: dict):
    user_name  = data.get('userName', 'SideKick User')
    user_phone = data.get('userPhone', 'Unknown')
    user_email = data.get('userEmail', '')
    location   = data.get('location', {})
    contacts   = data.get('safetyContacts', [])
    message    = data.get('message', 'I need help!')
    city       = location.get('city', 'Unknown location')
    lat        = location.get('lat', '')
    lng        = location.get('lng', '')

    if not contacts:
        return {
            "success": False,
            "message": "No safety contacts found. Please add contacts in your Safety Circle.",
            "alertsSent": 0,
            "failed": []
        }

    maps_link = f"https://maps.google.com/?q={lat},{lng}" if lat and lng else f"https://maps.google.com/?q={city}"
    timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")

    gmail_user = os.environ.get('GMAIL_USER')
    gmail_pass = os.environ.get('GMAIL_PASS')

    if not gmail_user or not gmail_pass:
        return {
            "success": False,
            "message": "Email service not configured. Contact admin.",
            "alertsSent": 0,
            "failed": []
        }

    alerts_sent = 0
    failed = []

    for contact in contacts:
        contact_name  = contact.get('name', 'Friend')
        contact_phone = contact.get('phone', '')
        # Use contact's own email if provided, otherwise fall back to user's own email
        contact_email = contact.get('email', '').strip() or user_email

        if not contact_email:
            failed.append(contact_name)
            continue

        html = f"""
        <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0F0B21;color:#F1F0F7;border-radius:16px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#F43F5E,#FB923C);padding:24px;text-align:center">
                <h1 style="margin:0;font-size:24px;font-weight:800;color:white">🚨 SOS ALERT</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px">Emergency alert from SideKick</p>
            </div>
            <div style="padding:28px">
                <p style="color:#A8A3C7;font-size:15px">Hi <b style="color:#F1F0F7">{contact_name}</b>,</p>
                <p style="color:#F87171;font-size:16px;font-weight:700">⚠️ {user_name} has triggered an SOS alert and may need your help!</p>
                <div style="background:#1A1535;border:1px solid rgba(244,63,94,0.3);border-radius:12px;padding:16px;margin:16px 0">
                    <p style="margin:4px 0;color:#A8A3C7">👤 <b style="color:#F1F0F7">Name:</b> {user_name}</p>
                    <p style="margin:4px 0;color:#A8A3C7">📱 <b style="color:#F1F0F7">Phone:</b> {user_phone}</p>
                    <p style="margin:4px 0;color:#A8A3C7">📍 <b style="color:#F1F0F7">Location:</b> {city}</p>
                    <p style="margin:4px 0;color:#A8A3C7">🕐 <b style="color:#F1F0F7">Time:</b> {timestamp}</p>
                    <p style="margin:4px 0;color:#A8A3C7">💬 <b style="color:#F1F0F7">Message:</b> {message}</p>
                    <p style="margin:4px 0;color:#A8A3C7">📞 <b style="color:#F1F0F7">Contact Phone:</b> {contact_phone}</p>
                </div>
                <a href="{maps_link}" style="display:inline-block;margin-top:8px;padding:12px 28px;background:linear-gradient(135deg,#F43F5E,#FB923C);color:white;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">📍 View Location on Map</a>
                <p style="color:#6E6893;font-size:12px;margin-top:20px">Please try to contact {user_name} immediately or call emergency services if needed.</p>
            </div>
        </div>
        """

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"🚨 SOS ALERT from {user_name} — SideKick Emergency"
            msg['From']    = f"SideKick Safety <{gmail_user}>"
            msg['To']      = contact_email
            msg.attach(MIMEText(html, 'html'))

            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(gmail_user, gmail_pass)
                server.sendmail(gmail_user, contact_email, msg.as_string())

            alerts_sent += 1
        except Exception as e:
            failed.append(contact_name)
            print(f"Failed to send SOS to {contact_email}: {e}")

    return {
        "success": alerts_sent > 0,
        "alertsSent": alerts_sent,
        "failed": failed,
        "message": f"SOS alert sent to {alerts_sent} contact(s)." if alerts_sent > 0 else "Failed to send alerts. Check email configuration.",
        "timestamp": timestamp
    }
