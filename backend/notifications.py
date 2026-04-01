"""
CraftBolt Notification Service
Handles SMS (Twilio) and Email (SMTP) notifications
"""

import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from typing import Optional, List
from datetime import datetime, timezone
from dotenv import load_dotenv

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
        text_content: Optional[str] = None
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
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text and HTML parts
            if text_content:
                message.attach(MIMEText(text_content, "plain", "utf-8"))
            message.attach(MIMEText(html_content, "html", "utf-8"))
            
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.user,
                password=self.password,
                start_tls=True
            )
            
            logger.info(f"Email sent to {to_email}: {subject} (daily count: {_daily_email_count + 1})")
            _daily_email_count += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

# ============ SMS SERVICE ============

class SMSService:
    def __init__(self):
        self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID', '')
        self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
        self.phone_number = os.environ.get('TWILIO_PHONE_NUMBER', '')
        self.client = None
        
        if self.account_sid and self.auth_token:
            try:
                self.client = TwilioClient(self.account_sid, self.auth_token)
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {str(e)}")
    
    def send_sms(self, to_phone: str, message: str) -> bool:
        """Send an SMS using Twilio"""
        if not self.client:
            logger.warning("Twilio client not initialized")
            return False
            
        if not self.phone_number:
            logger.warning("Twilio phone number not configured - SMS disabled")
            return False
        
        # Format phone number for Czech Republic
        if to_phone and not to_phone.startswith('+'):
            if to_phone.startswith('00'):
                to_phone = '+' + to_phone[2:]
            else:
                to_phone = '+420' + to_phone.lstrip('0')
        
        try:
            msg = self.client.messages.create(
                body=message,
                from_=self.phone_number,
                to=to_phone
            )
            logger.info(f"SMS sent to {to_phone}: {msg.sid}")
            return True
            
        except TwilioRestException as e:
            logger.error(f"Failed to send SMS to {to_phone}: {str(e)}")
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
    def new_offer_email(supplier_name: str, demand_title: str) -> tuple:
        """Email template for new offer notification to customer"""
        content = f"""
            <h2 style="color: #1a1a1a; margin: 0 0 16px 0;">Nová nabídka na vaši poptávku!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dobrý den,
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                Dodavatel <strong>{supplier_name}</strong> reagoval na vaši poptávku 
                „<strong>{demand_title}</strong>".
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                Přihlaste se a prohlédněte si jeho profil a nabídku.
            </p>
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Zobrazit nabídku
            </a>
        """
        subject = f"Nová nabídka od {supplier_name}"
        return subject, NotificationTemplates.email_base(content, subject)
    
    @staticmethod
    def new_offer_sms(supplier_name: str) -> str:
        """SMS template for new offer"""
        return f"CraftBolt: {supplier_name} reagoval na vaši poptávku. Přihlaste se pro více info."
    
    # ============ NEW MESSAGE ============
    
    @staticmethod
    def new_message_email(sender_name: str, demand_title: str, message_preview: str) -> tuple:
        """Email template for new chat message"""
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
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Odpovědět
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
    def soft_accept_email(supplier_name: str, demand_title: str, reason: str) -> tuple:
        """Email template for supplier's conditional acceptance"""
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
                Doporučujeme kontaktovat dodavatele přes chat v aplikaci.
            </p>
            <a href="https://craftbolt.cz/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Zobrazit poptávku
            </a>
        """
        subject = f"Zájem o poptávku: {demand_title}"
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
    
    async def notify_new_demand(self, suppliers: List[dict], demand_title: str, demand_category: str, demand_address: str, customer_name: str = ""):
        """Notify suppliers about new demand in their category (max 20 suppliers)"""
        subject, html = self.templates.new_demand_email(demand_title, demand_category, demand_address, customer_name)
        sms_text = self.templates.new_demand_sms(demand_title, demand_category)
        
        # Limit to max 20 suppliers to avoid exceeding email limits
        limited_suppliers = suppliers[:20]
        if len(suppliers) > 20:
            logger.info(f"Limiting new demand notifications from {len(suppliers)} to 20 suppliers")
        
        for supplier in limited_suppliers:
            await self.email_service.send_email(supplier["email"], subject, html)
            if supplier.get("phone"):
                self.sms_service.send_sms(supplier["phone"], sms_text)
    
    async def notify_new_offer(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str):
        """Notify customer about new offer"""
        subject, html = self.templates.new_offer_email(supplier_name, demand_title)
        await self.email_service.send_email(customer_email, subject, html)
        
        if customer_phone:
            sms_text = self.templates.new_offer_sms(supplier_name)
            self.sms_service.send_sms(customer_phone, sms_text)
    
    async def notify_new_message(self, recipient_email: str, recipient_phone: Optional[str], sender_name: str, demand_title: str, message: str):
        """Notify about new chat message (rate limited: max 1 per 15 min per conversation)"""
        cache_key = f"{recipient_email}:{demand_title}"
        now = datetime.now(timezone.utc).timestamp()
        last_sent = _chat_notification_cache.get(cache_key, 0)
        
        if now - last_sent < CHAT_NOTIFY_COOLDOWN_SECONDS:
            logger.info(f"Chat notification throttled for {recipient_email} on '{demand_title}' (cooldown active)")
            return
        
        _chat_notification_cache[cache_key] = now
        subject, html = self.templates.new_message_email(sender_name, demand_title, message)
        await self.email_service.send_email(recipient_email, subject, html)
        
        if recipient_phone:
            sms_text = self.templates.new_message_sms(sender_name)
            self.sms_service.send_sms(recipient_phone, sms_text)
    
    async def notify_status_change(self, user_email: str, user_phone: Optional[str], demand_title: str, old_status: str, new_status: str):
        """Notify about demand status change"""
        subject, html = self.templates.status_change_email(demand_title, old_status, new_status)
        await self.email_service.send_email(user_email, subject, html)
        
        if user_phone:
            sms_text = self.templates.status_change_sms(demand_title, new_status)
            self.sms_service.send_sms(user_phone, sms_text)
    
    async def notify_payment_success(self, user_email: str, plan_name: str, amount: float):
        """Notify about successful payment"""
        subject, html = self.templates.payment_success_email(plan_name, amount)
        await self.email_service.send_email(user_email, subject, html)

    async def notify_soft_accept(self, customer_email: str, customer_phone: Optional[str], supplier_name: str, demand_title: str, reason: str):
        """Notify customer about supplier's conditional acceptance"""
        subject, html = self.templates.soft_accept_email(supplier_name, demand_title, reason)
        await self.email_service.send_email(customer_email, subject, html)
        
        if customer_phone:
            sms_text = self.templates.soft_accept_sms(supplier_name, demand_title)
            self.sms_service.send_sms(customer_phone, sms_text)


# Global notification service instance
notification_service = NotificationService()
