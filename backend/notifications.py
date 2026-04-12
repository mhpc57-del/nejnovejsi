"""
CraftBolt Notification Service
Handles SMS (BulkGate), Email (SMTP), and Push notifications
"""

import os
import logging
import aiosmtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from datetime import datetime, timezone
from dotenv import load_dotenv
from push_notifications import send_expo_push
from database import db

load_dotenv()

logger = logging.getLogger(__name__)

# Rate limiting for chat notifications (max 1 email per 15 min per conversation)
_chat_notification_cache = {}
CHAT_NOTIFY_COOLDOWN_SECONDS = 900  # 15 minutes

# Daily email counter
_daily_email_count = 0
_daily_email_date = None
DAILY_EMAIL_LIMIT = 400  # Safety margin below Wedos 500 limit

# ============ EMAIL SERVICE ============

class EmailService:
    def __init__(self):
        self.host = os.environ.get('SMTP_HOST', 'smtp.wedos.cz')
        self.port = int(os.environ.get('SMTP_PORT', 587))
        self.user = os.environ.get('SMTP_USER', '')
        self.password = os.environ.get('SMTP_PASSWORD', '')
        self.from_email = os.environ.get('SMTP_FROM_EMAIL', 'info@craftbolt.cz')
        self.from_name = os.environ.get('SMTP_FROM_NAME', 'CraftBolt')
        
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[list] = None
    ) -> bool:
        """Send an email using SMTP with daily limit protection"""
        global _daily_email_count, _daily_email_date
        
        if not self.user or not self.password:
            logger.warning("SMTP credentials not configured")
            return False
        
        # Daily limit check
        today = datetime.now(timezone.utc).date()
        if _daily_email_date != today:
            _daily_email_count = 0
            _daily_email_date = today
        
        if _daily_email_count >= DAILY_EMAIL_LIMIT:
            logger.warning(f"Daily email limit ({DAILY_EMAIL_LIMIT}) reached, skipping email to {to_email}: {subject}")
            return False
            
        try:
            message = MIMEMultipart("mixed")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add HTML/text body
            body_part = MIMEMultipart("alternative")
            if text_content:
                body_part.attach(MIMEText(text_content, "plain", "utf-8"))
            body_part.attach(MIMEText(html_content, "html", "utf-8"))
            message.attach(body_part)
            
            # Add attachments
            if attachments:
                from email.mime.application import MIMEApplication
                for att in attachments:
                    part = MIMEApplication(att['data'], Name=att['filename'])
                    part['Content-Disposition'] = f'attachment; filename="{att["filename"]}"'
                    message.attach(part)
            
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                start_tls=True,
                timeout=30
            )
            
            logger.info(f"Email sent to {to_email}: {subject} (daily count: {_daily_email_count + 1})")
            _daily_email_count += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

# ============ SMS SERVICE (BulkGate) ============

class SMSService:
    BULKGATE_URL = "https://portal.bulkgate.com/api/1.0/simple/transactional"
    
    def __init__(self):
        self.app_id = os.environ.get('BULKGATE_APP_ID') or '37417'
        self.app_token = os.environ.get('BULKGATE_APP_TOKEN') or 'XW12fNMBMO4XafB5Up411xtAcKvrRyWvN0pVxFulmTkASmp6IS'
        self.sender_id = os.environ.get('BULKGATE_SENDER_ID') or 'gText'
        self.sender_id_value = os.environ.get('BULKGATE_SENDER_ID_VALUE') or 'CraftBolt'
        
        if self.app_id and self.app_token:
            logger.info(f"BulkGate SMS initialized (App ID: {self.app_id})")
        else:
            logger.warning("BulkGate credentials not configured - SMS will be skipped")
    
    def send_sms(self, to_phone: str, message: str) -> bool:
        """Send an SMS using BulkGate API via curl (WEDOS WAF blocks Python requests)"""
        if not self.app_id or not self.app_token:
            logger.warning("BulkGate not configured - SMS skipped")
            return False
        
        if not to_phone:
            logger.warning("No phone number provided - SMS skipped")
            return False
        
        original_phone = to_phone
        
        # Normalize phone number - remove spaces, dashes, parentheses, +
        to_phone = ''.join(c for c in to_phone if c.isdigit())
        
        # Format for BulkGate: international format without + or 00
        # Czech numbers: ensure they start with 420
        if to_phone.startswith('00'):
            to_phone = to_phone[2:]
        elif len(to_phone) == 9:
            # Czech local number (9 digits) -> prepend 420
            to_phone = '420' + to_phone
        elif to_phone.startswith('420'):
            pass  # already correct
        
        logger.info(f"SMS: sending to {to_phone} (original: {original_phone})")
        
        try:
            import subprocess, json
            payload = json.dumps({
                "application_id": self.app_id,
                "application_token": self.app_token,
                "number": to_phone,
                "text": message,
                "sender_id": self.sender_id,
                "sender_id_value": self.sender_id_value,
            })
            
            logger.info(f"SMS: BulkGate request to {to_phone}, app_id={self.app_id}, sender={self.sender_id}/{self.sender_id_value}")
            
            result = subprocess.run(
                ["curl", "-s", "-X", "POST", self.BULKGATE_URL,
                 "-H", "Content-Type: application/json",
                 "-d", payload],
                capture_output=True, text=True, timeout=15
            )
            
            response_text = result.stdout.strip()
            logger.info(f"SMS: BulkGate response: {response_text[:200]}")
            
            try:
                data = json.loads(response_text)
            except Exception:
                logger.error(f"SMS FAILED to {to_phone}: Non-JSON response: {response_text[:100]}")
                return False
            
            if data.get("data", {}).get("status") == "accepted" or data.get("data"):
                msg_id = data.get("data", {}).get("sms_id", "unknown")
                logger.info(f"SMS sent to {to_phone}: ID={msg_id} Status=accepted")
                return True
            elif data.get("error"):
                logger.error(f"SMS FAILED to {to_phone}: {data.get('error')}")
                return False
            else:
                logger.error(f"SMS FAILED to {to_phone}: {response_text[:200]}")
                return False
                
        except Exception as e:
            logger.error(f"SMS FAILED to {to_phone}: {str(e)}")
            return False

# ============ NOTIFICATION TEMPLATES ============

class NotificationTemplates:
    
    @staticmethod
    def email_base(content: str, title: str = "CraftBolt") -> str:
        """Base HTML email template"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #1a1a1a; padding: 24px; text-align: center;">
                            <span style="font-size: 28px; font-weight: bold; color: #ffffff;">Craft</span>
                            <span style="font-size: 28px; font-weight: bold; color: #f97316;">Bolt</span>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                © 2026 CraftBolt | Provozovatel: AC/DC MONT s.r.o.
                            </p>
                            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                                Sportovní 7, 789 63 Ruda nad Moravou
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    # ============ REGISTRATION ============
    
    @staticmethod
    def registration_success_email(user_name: str, user_role: str) -> tuple:
        """Email template for successful registration"""
        role_text = "zákazníka" if user_role == "customer" else "dodavatele"
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Vítejte v CraftBolt!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Vaše registrace jako <strong>{role_text}</strong> byla úspěšně dokončena. 
                Nyní máte přístup ke všem funkcím platformy CraftBolt.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Máte <strong>14 dní zdarma</strong> na vyzkoušení všech funkcí!
            </p>
            <a href="https://craftbolt.cz/prihlaseni" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Přihlásit se
            </a>
        """
        subject = "Vítejte v CraftBolt!"
        return subject, NotificationTemplates.email_base(content, subject)

    @staticmethod
    def verification_email(user_name: str, verification_url: str) -> tuple:
        """Email template for email verification"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Ověřte svůj email</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den {user_name},
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Děkujeme za registraci na CraftBolt! Pro dokončení registrace prosím ověřte svůj email kliknutím na tlačítko níže.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{verification_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Ověřit email
                </a>
            </div>
            <p style="color: #9ca3af; line-height: 1.6; margin: 0 0 8px 0; font-size: 13px;">
                Pokud tlačítko nefunguje, zkopírujte tento odkaz do prohlížeče:
            </p>
            <p style="color: #6b7280; line-height: 1.6; margin: 0 0 16px 0; font-size: 12px; word-break: break-all;">
                {verification_url}
            </p>
            <p style="color: #9ca3af; line-height: 1.6; margin: 0; font-size: 12px;">
                Pokud jste se neregistrovali na CraftBolt, tento email ignorujte.
            </p>
        """
        subject = "CraftBolt — Ověřte svůj email"
        return subject, NotificationTemplates.email_base(content, subject)
    
    # ============ NEW DEMAND ============
    
    @staticmethod
    def new_demand_email(demand_title: str, demand_category: str, demand_address: str, customer_name: str = "") -> tuple:
        """Email template for new demand notification to suppliers"""
        customer_line = f'<p style="margin: 0 0 8px 0;"><strong>Zákazník:</strong> {customer_name}</p>' if customer_name else ""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Nová poptávka ve vaší kategorii!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Byla zadána nová poptávka, která odpovídá vašim kategoriím.
            </p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Název:</strong> {demand_title}</p>
                <p style="margin: 0 0 8px 0;"><strong>Kategorie:</strong> {demand_category}</p>
                <p style="margin: 0 0 8px 0;"><strong>Lokalita:</strong> {demand_address}</p>
                {customer_line}
            </div>
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Zobrazit poptávku
            </a>
        """
        subject = f"Nová poptávka: {demand_title}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def new_demand_sms(demand_title: str, demand_category: str) -> str:
        """SMS template for new demand"""
        return f"CraftBolt: Nová poptávka '{demand_title[:30]}' v kategorii {demand_category[:20]}. Přihlaste se pro více info."
    
    # ============ NEW OFFER ============
    
    @staticmethod
    def new_offer_email(supplier_name: str, demand_title: str, demand_id: str = "") -> tuple:
        """Email template for new offer notification to customer"""
        demand_url = f"https://craftbolt.cz/zakazka/{demand_id}" if demand_id else "https://craftbolt.cz/zakaznik"
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel závazně přijal vaši poptávku!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> závazně přijal vaši poptávku 
                „<strong>{demand_title}</strong>".
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Klikněte na tlačítko níže pro zobrazení detailu a zahájení komunikace s dodavatelem.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{demand_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Zobrazit detail zakázky
                </a>
            </div>
        """
        subject = f"Závazné přijetí od {supplier_name} — {demand_title}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def new_offer_sms(supplier_name: str) -> str:
        """SMS template for new offer"""
        return f"CraftBolt: {supplier_name} reagoval na vaši poptávku. Přihlaste se pro více info."
    
    # ============ NEW MESSAGE ============
    
    @staticmethod
    def new_message_email(sender_name: str, demand_title: str, message_preview: str, demand_id: str = "", recipient_role: str = "customer") -> tuple:
        """Email template for new chat message"""
        dashboard_url = "https://craftbolt.cz/zakaznik" if recipient_role == "customer" else "https://craftbolt.cz/dodavatel"
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Nová zpráva</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                <strong>{sender_name}</strong> vám poslal zprávu k zakázce „{demand_title}":
            </p>
            <div style="background-color: #f9fafb; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0; color: #4b5563; font-style: italic;">
                    "{message_preview[:200]}{'...' if len(message_preview) > 200 else ''}"
                </p>
            </div>
            <a href="{dashboard_url}?open_demand={demand_id}&chat=1" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Odpovědět v chatu
            </a>
        """
        subject = f"Nová zpráva od {sender_name}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def new_message_sms(sender_name: str) -> str:
        """SMS template for new message"""
        return f"CraftBolt: Nová zpráva od {sender_name}. Přihlaste se pro odpověď."
    
    # ============ STATUS CHANGE ============
    
    @staticmethod
    def status_change_email(demand_title: str, old_status: str, new_status: str) -> tuple:
        """Email template for demand status change"""
        status_texts = {
            "open": "Otevřená",
            "in_progress": "V realizaci",
            "completed": "Dokončena",
            "cancelled": "Zrušena"
        }
        new_status_text = status_texts.get(new_status, new_status)
        
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Změna stavu zakázky</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Stav vaší zakázky „<strong>{demand_title}</strong>" byl změněn na:
            </p>
            <div style="background-color: #f97316; color: #ffffff; display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 0 0 24px 0;">
                {new_status_text}
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
            </p>
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Zobrazit detail
            </a>
        """
        subject = f"Zakázka {demand_title}: {new_status_text}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def status_change_sms(demand_title: str, new_status: str) -> str:
        """SMS template for status change"""
        status_texts = {
            "open": "Otevřená",
            "in_progress": "V realizaci",
            "completed": "Dokončena",
            "cancelled": "Zrušena"
        }
        return f"CraftBolt: Zakázka '{demand_title[:25]}' - nový stav: {status_texts.get(new_status, new_status)}"
    
    # ============ PAYMENT ============
    
    @staticmethod
    def soft_accept_email(supplier_name: str, demand_title: str, reason: str, demand_id: str = "") -> tuple:
        """Email template for supplier's conditional acceptance"""
        demand_url = f"https://craftbolt.cz/zakazka/{demand_id}" if demand_id else "https://craftbolt.cz/zakaznik"
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel projevil zájem o vaši poptávku</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> nezávazně reagoval na vaši poptávku 
                „<strong>{demand_title}</strong>" s následující podmínkou:
            </p>
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #1a1a1a; font-size: 15px;">
                    {reason}
                </p>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Klikněte na tlačítko níže pro zobrazení detailu a zahájení komunikace s dodavatelem.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{demand_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Zobrazit detail poptávky
                </a>
            </div>
        """
        subject = f"Nezávazný zájem o poptávku: {demand_title}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def soft_accept_sms(supplier_name: str, demand_title: str) -> str:
        """SMS template for soft accept"""
        return f"CraftBolt: {supplier_name} projevil zájem o '{demand_title[:25]}' s podmínkou. Zkontrolujte detail poptávky."

    @staticmethod
    def payment_success_email(plan_name: str, amount: float) -> tuple:
        """Email template for successful payment"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Platba úspěšná!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Vaše platba za tarif <strong>{plan_name}</strong> byla úspěšně zpracována.
            </p>
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Tarif:</strong> {plan_name}</p>
                <p style="margin: 0 0 8px 0;"><strong>Částka:</strong> {amount} Kč bez DPH</p>
                <p style="margin: 0;"><strong>Období:</strong> Měsíční předplatné</p>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Děkujeme za vaši důvěru!
            </p>
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Přejít do aplikace
            </a>
        """
        subject = "Platba úspěšně přijata"
        return subject, NotificationTemplates.email_base(content, subject)

    @staticmethod
    def request_verification_email(supplier_name: str, demand_title: str, verification_url: str) -> tuple:
        """Email template when supplier requests demand verification from customer"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel vyžaduje ověření poptávky</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> projevil o Vaši poptávku zájem, ale vyžaduje ověření poptávky.
            </p>
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0; padding: 16px; margin: 0 0 24px 0;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #1a1a1a;">Poptávka:</p>
                <p style="margin: 0; color: #4b5563;">{demand_title}</p>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Ověřením poptávky za <strong>49 Kč</strong> dáváte dodavatelům najevo, že poptávku myslíte vážně.
                Po ověření bude dodavatel moci zobrazit kompletní detail a přijmout zakázku.
            </p>
            <a href="{verification_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
                Ověřit poptávku za 49 Kč
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">
                Platba proběhne přes zabezpečenou platební bránu Stripe.
            </p>
        """
        subject = f"Dodavatel {supplier_name} vyžaduje ověření Vaší poptávky"
        return subject, NotificationTemplates.email_base(content, subject)

    @staticmethod
    def request_verification_sms(supplier_name: str) -> str:
        """SMS template when supplier requests demand verification"""
        return f"CraftBolt: Dodavatel {supplier_name} projevil o Vasi poptavku zajem, ale vyzaduje overeni. Overeni provedte v aplikaci."


# ============ NOTIFICATION SERVICE ============

class NotificationService:
    def __init__(self):
        self.email_service = EmailService()
        self.sms_service = SMSService()
        self.templates = NotificationTemplates()
    
    async def notify_registration(self, user_email: str, user_name: str, user_role: str, user_phone: Optional[str] = None):
        """Send registration success notification"""
        subject, html = self.templates.registration_success_email(user_name, user_role)
        await self.email_service.send_email(user_email, subject, html)
    
    async def notify_registration_verification(self, user_email: str, user_name: str, user_role: str, user_phone: Optional[str] = None, verification_token: str = "", origin_url: str = ""):
        """Send email verification link after registration"""
        import os
        frontend_url = origin_url or os.environ.get("FRONTEND_URL", "https://craftbolt.cz")
        verification_url = f"{frontend_url}/overit-email/{verification_token}"
        subject, html = self.templates.verification_email(user_name, verification_url)
        await self.email_service.send_email(user_email, subject, html)
        
        # Send SMS notification about registration
        if user_phone:
            sms_text = "Registrace na CraftBolt proběhla úspěšně. Nyní ověř svůj registrační email, který ti byl zaslán. Děkuji. CraftBolt."
            self.sms_service.send_sms(user_phone, sms_text)
    
    async def notify_new_demand(self, suppliers: List[dict], demand_title: str, demand_category: str, demand_address: str, customer_name: str = ""):
        """Notify suppliers about new demand in their category (max 20 suppliers)"""
        logger.info(f"notify_new_demand: title='{demand_title}', category='{demand_category}', total_suppliers={len(suppliers)}")
        subject, html = self.templates.new_demand_email(demand_title, demand_category, demand_address, customer_name)
        sms_text = self.templates.new_demand_sms(demand_title, demand_category)
        
        # Limit to max 20 suppliers to avoid exceeding email limits
        limited_suppliers = suppliers[:20]
        if len(suppliers) > 20:
            logger.info(f"Limiting new demand notifications from {len(suppliers)} to 20 suppliers")
        
        push_tokens = []
        for supplier in limited_suppliers:
            logger.info(f"Notifying supplier: email={supplier.get('email')}, phone='{supplier.get('phone', 'NONE')}', sms_opt={supplier.get('sms_notifications', False)}, categories={supplier.get('categories', [])}")
            await self.email_service.send_email(supplier["email"], subject, html)
            if supplier.get("phone") and supplier.get("sms_notifications"):
                logger.info(f"Sending demand SMS to {supplier['phone']}")
                result = self.sms_service.send_sms(supplier["phone"], sms_text)
                logger.info(f"Demand SMS to {supplier['phone']}: result={result}")
            elif supplier.get("phone") and not supplier.get("sms_notifications"):
                logger.info(f"Supplier {supplier.get('email')} has SMS disabled — skipping SMS")
            else:
                logger.warning(f"Supplier {supplier.get('email')} has no phone number — skipping SMS")
            if supplier.get("push_token"):
                push_tokens.append(supplier["push_token"])
        
        if push_tokens:
            await send_expo_push(push_tokens, f"Nová poptávka: {demand_category}", f"{demand_title} — {demand_address}", {"type": "new_demand"})
    
    async def _should_send_sms(self, email: str, phone: Optional[str]) -> bool:
        """Check if user has SMS notifications enabled"""
        if not phone:
            return False
        user = await db.users.find_one({"email": email}, {"_id": 0, "sms_notifications": 1})
        return bool(user and user.get("sms_notifications"))

    async def notify_new_offer(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str, demand_id: str = ""):
        """Notify customer about new offer - always send SMS if phone exists"""
        subject, html = self.templates.new_offer_email(supplier_name, demand_title, demand_id)
        await self.email_service.send_email(customer_email, subject, html)
        
        # Customer always gets SMS when their demand is accepted (if they have a phone)
        if customer_phone:
            sms_text = self.templates.new_offer_sms(supplier_name)
            logger.info(f"Sending SMS to customer {customer_email} at {customer_phone} about offer from {supplier_name}")
            self.sms_service.send_sms(customer_phone, sms_text)
        else:
            logger.info(f"No phone number for customer {customer_email} - SMS skipped")
        
        # Push to customer
        user = await db.users.find_one({"email": customer_email}, {"_id": 0, "push_token": 1})
        if user and user.get("push_token"):
            await send_expo_push([user["push_token"]], "Nová nabídka", f"{supplier_name} nabízí služby na '{demand_title}'", {"type": "new_offer"})
    
    async def notify_new_message(self, recipient_email: str, recipient_phone: Optional[str], sender_name: str, demand_title: str, message: str, demand_id: str = "", recipient_role: str = "customer"):
        """Notify about new chat message (rate limited: max 1 per 15 min per conversation)"""
        cache_key = f"{recipient_email}:{demand_title}"
        now = datetime.now(timezone.utc).timestamp()
        last_sent = _chat_notification_cache.get(cache_key, 0)
        
        logger.info(f"notify_new_message: to={recipient_email}, phone={recipient_phone}, sender={sender_name}, demand={demand_title}")
        
        if now - last_sent < CHAT_NOTIFY_COOLDOWN_SECONDS:
            logger.info(f"Chat notification throttled for {recipient_email} on '{demand_title}' (cooldown {int(CHAT_NOTIFY_COOLDOWN_SECONDS - (now - last_sent))}s remaining)")
            # Still send push even when email is throttled
            user = await db.users.find_one({"email": recipient_email}, {"_id": 0, "push_token": 1})
            if user and user.get("push_token"):
                await send_expo_push([user["push_token"]], f"Zpráva od {sender_name}", message[:100], {"type": "message", "demand_title": demand_title})
            return
        
        _chat_notification_cache[cache_key] = now
        subject, html = self.templates.new_message_email(sender_name, demand_title, message, demand_id, recipient_role)
        await self.email_service.send_email(recipient_email, subject, html)
        logger.info(f"Chat email sent to {recipient_email}")
        
        if recipient_phone:
            # Check if recipient has SMS enabled
            recipient_user = await db.users.find_one({"email": recipient_email}, {"_id": 0, "sms_notifications": 1})
            if recipient_user and recipient_user.get("sms_notifications"):
                sms_text = self.templates.new_message_sms(sender_name)
                logger.info(f"Sending chat SMS to {recipient_phone}")
                result = self.sms_service.send_sms(recipient_phone, sms_text)
                logger.info(f"Chat SMS to {recipient_phone}: result={result}")
            else:
                logger.info(f"SMS disabled for {recipient_email} — skipping chat SMS")
        else:
            logger.warning(f"No phone number for chat notification to {recipient_email}")
        
        # Push notification
        user = await db.users.find_one({"email": recipient_email}, {"_id": 0, "push_token": 1})
        if user and user.get("push_token"):
            await send_expo_push([user["push_token"]], f"Zpráva od {sender_name}", message[:100], {"type": "message", "demand_title": demand_title})
    
    async def notify_status_change(self, user_email: str, user_phone: Optional[str], demand_title: str, old_status: str, new_status: str):
        """Notify about demand status change"""
        subject, html = self.templates.status_change_email(demand_title, old_status, new_status)
        await self.email_service.send_email(user_email, subject, html)
        
        if await self._should_send_sms(user_email, user_phone):
            sms_text = self.templates.status_change_sms(demand_title, new_status)
            self.sms_service.send_sms(user_phone, sms_text)
        
        # Push notification
        status_labels = {"in_progress": "přijata", "completed": "dokončena", "cancelled": "zrušena"}
        label = status_labels.get(new_status, new_status)
        user = await db.users.find_one({"email": user_email}, {"_id": 0, "push_token": 1})
        if user and user.get("push_token"):
            await send_expo_push([user["push_token"]], f"Zakázka {label}", demand_title, {"type": "status_change", "new_status": new_status})
    
    async def notify_payment_success(self, user_email: str, plan_name: str, amount: float):
        """Notify about successful payment"""
        subject, html = self.templates.payment_success_email(plan_name, amount)
        await self.email_service.send_email(user_email, subject, html)

    async def notify_category_suggestion(self, admin_email: str, category_name: str, suggested_by_name: str):
        """Notify admin about a new category suggestion"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Nový návrh kategorie</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{suggested_by_name}</strong> navrhl novou kategorii služeb:
            </p>
            <div style="background-color: #fef3e6; border-left: 4px solid #f97316; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">
                    {category_name}
                </p>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Přihlaste se do administrace a rozhodněte, zda kategorii schválíte nebo zamítnete.
            </p>
        """
        subject = f"CraftBolt — Nový návrh kategorie: {category_name}"
        html = self.templates.email_base(content, subject)
        await self.email_service.send_email(admin_email, subject, html)

    async def notify_soft_accept(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str, reason: str, demand_id: str = ""):
        """Notify customer about supplier's conditional acceptance"""
        subject, html = self.templates.soft_accept_email(supplier_name, demand_title, reason, demand_id)
        await self.email_service.send_email(customer_email, subject, html)
        if await self._should_send_sms(customer_email, customer_phone):
            self.sms_service.send_sms(customer_phone, f"CraftBolt: Dodavatel {supplier_name} projevil zajem o vasi poptavku '{demand_title}' s podminkou. Prihlas se pro detaily.")

    async def notify_cannot_complete(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str, reason: str, demand_id: str = ""):
        """Notify customer that supplier cannot complete the demand"""
        demand_url = f"https://craftbolt.cz/zakazka/{demand_id}" if demand_id else "https://craftbolt.cz/zakaznik"
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel nemůže provést vaši zakázku</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> bohužel nemůže provést vaši zakázku
                „<strong>{demand_title}</strong>". Důvod:
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 24px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #1a1a1a; font-size: 15px;">
                    {reason}
                </p>
            </div>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Vaše poptávka byla znovu zveřejněna a je k dispozici dalším dodavatelům.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{demand_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Zobrazit poptávku
                </a>
            </div>
        """
        subject = f"Dodavatel nemůže provést zakázku: {demand_title}"
        _, html = subject, self.templates.email_base(content, subject)
        await self.email_service.send_email(customer_email, subject, html)
        if await self._should_send_sms(customer_email, customer_phone):
            self.sms_service.send_sms(customer_phone, f"CraftBolt: Dodavatel {supplier_name} nemuze provest zakazku '{demand_title}'. Duvod: {reason[:80]}. Poptavka znovu zverejnena.")

    async def notify_quick_demand_confirmation(self, email: str, phone: str, name: str):
        """Send confirmation to quick demand customer"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Vaše poptávka byla přijata!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den {name},</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Vaše rychlá poptávka na CraftBolt byla úspěšně přijata. Jakmile některý z dodavatelů zareaguje, budeme vás okamžitě informovat emailem a SMS.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Pro plný přístup doporučujeme <strong>dokončit registraci</strong> — je to zdarma na 14 dní.
            </p>
            <a href="https://craftbolt.cz/registrace" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Dokončit registraci
            </a>
        """
        subject = "CraftBolt — Vaše poptávka byla přijata"
        html = self.templates.email_base(content, subject)
        await self.email_service.send_email(email, subject, html)
        if phone:
            self.sms_service.send_sms(phone, "CraftBolt: Vaše rychlá poptávka byla přijata. Ozveme se, jakmile dodavatel zareaguje. Děkujeme. CraftBolt.")

    async def notify_quick_demand_supplier_reply(self, email: str, phone: str, customer_name: str, supplier_name: str, demand_title: str, demand_id: str):
        """Notify quick demand customer when a supplier replies — urge them to register"""
        import os
        frontend_url = os.environ.get("FRONTEND_URL", "https://craftbolt.cz")
        register_url = f"{frontend_url}/registrace?claim_demand={demand_id}&email={email}"
        
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Dodavatel reagoval na vaši poptávku!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">Dobrý den {customer_name},</p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> reagoval na vaši poptávku „<strong>{demand_title}</strong>".
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Pro zobrazení zprávy a komunikaci s dodavatelem je nutné <strong>dokončit registraci</strong>. Je to zdarma na 14 dní a zabere to méně než minutu.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{register_url}" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Dokončit registraci a zobrazit zprávu
                </a>
            </div>
            <p style="color: #9ca3af; line-height: 1.6; margin: 0; font-size: 13px;">
                Po registraci bude vaše poptávka automaticky propojena s vaším novým účtem.
            </p>
        """
        subject = f"CraftBolt — {supplier_name} reagoval na vaši poptávku"
        html = self.templates.email_base(content, subject)
        await self.email_service.send_email(email, subject, html)
        if phone:
            self.sms_service.send_sms(phone, f"CraftBolt: Dodavatel {supplier_name} reagoval na vaši poptávku. Zaregistrujte se na craftbolt.cz pro zobrazeni detailu.")

    async def notify_request_verification(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str, demand_id: str, verification_url: str):
        """Notify customer that a supplier wants them to verify their demand"""
        subject, html = self.templates.request_verification_email(supplier_name, demand_title, verification_url)
        await self.email_service.send_email(customer_email, subject, html)
        
        # Always send SMS for verification requests (important monetization trigger)
        if customer_phone:
            sms_text = self.templates.request_verification_sms(supplier_name)
            logger.info(f"Sending verification request SMS to {customer_email} at {customer_phone}")
            self.sms_service.send_sms(customer_phone, sms_text)
        
        # Push notification
        user = await db.users.find_one({"email": customer_email}, {"_id": 0, "push_token": 1})
        if user and user.get("push_token"):
            await send_expo_push([user["push_token"]], "Ověřte poptávku", f"{supplier_name} vyžaduje ověření vaší poptávky '{demand_title}'", {"type": "request_verification", "demand_id": demand_id})


# Global notification service instance
notification_service = NotificationService()
