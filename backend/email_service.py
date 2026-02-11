import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
import logging

# Email configuration (can be moved to environment variables)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "your-email@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your-app-password")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@proserve.com")

def send_welcome_email(to_email: str, username: str, full_name: str = None):
    """Send welcome email to newly registered user"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Welcome to Proserve Help Desk"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        display_name = full_name if full_name else username
        
        # Create the email body
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to Proserve Help Desk</h1>
              </div>
              <div style="padding: 30px;">
                <h2 style="color: #333;">Hello {display_name}!</h2>
                <p style="color: #666; line-height: 1.6;">
                  Thank you for registering with Proserve Help Desk. We're excited to have you on board!
                </p>
                <p style="color: #666; line-height: 1.6;">
                  Your account is currently pending approval. Once approved by an administrator, you'll be able to access all features of our help desk system.
                </p>
                <p style="color: #666; line-height: 1.6;">
                  You'll receive another email notification once your account has been activated.
                </p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px;">
                    If you didn't create this account, please ignore this email.
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        text_content = f"""
        Welcome to Proserve Help Desk
        
        Hello {display_name}!
        
        Thank you for registering with Proserve Help Desk. We're excited to have you on board!
        
        Your account is currently pending approval. Once approved by an administrator, you'll be able to access all features of our help desk system.
        
        You'll receive another email notification once your account has been activated.
        
        If you didn't create this account, please ignore this email.
        """
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        logging.info(f"Welcome email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"SMTP ERROR (Welcome Email): {str(e)}")
        # Don't fail registration if email fails
        return False

def send_security_alert(to_email: str, username: str, login_data: dict):
    """Send security alert for a new login"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "New Login Detected - Proserve"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333;">New Login detected for {username}</h2>
              <p>A new login was recorded for your account with the following details:</p>
              <ul style="color: #555;">
                <li><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                <li><strong>Device:</strong> {login_data.get('device')}</li>
                <li><strong>Browser:</strong> {login_data.get('browser')}</li>
                <li><strong>Location:</strong> {login_data.get('location')}</li>
                <li><strong>IP Address:</strong> {login_data.get('ip_address')}</li>
              </ul>
              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If this wasn't you, please change your password immediately.
              </p>
            </div>
          </body>
        </html>
        """
        
        message.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (Security Alert): {str(e)}")
        return False

def send_ticket_update_email(to_email: str, username: str, ticket_id: int, status: str, subject: str):
    """Send email when a ticket is updated or created"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Ticket Update: #{ticket_id} - {status}"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333;">Ticket #{ticket_id} has been updated</h2>
              <p><strong>Subject:</strong> {subject}</p>
              <p><strong>New Status:</strong> <span style="color: #4f46e5; font-weight: bold;">{status}</span></p>
              <p style="margin-top: 20px;">
                You can view the full details of your ticket in the Proserve Help Desk portal.
              </p>
            </div>
          </body>
        </html>
        """
        
        message.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (Ticket Update): {str(e)}")
        return False

def send_travel_notification_email(to_email: str, username: str, message_text: str, status: str, claim_id: int):
    """Send email for travel claim updates (submission, approval, payment)"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Travel Claim Update: #{claim_id} - {status}"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
              <h2 style="color: #333;">Travel Claim Update</h2>
              <p>Hello {username},</p>
              <p>{message_text}</p>
              <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
                 <p style="margin: 0;"><strong>Claim ID:</strong> #{claim_id}</p>
                 <p style="margin: 5px 0 0 0;"><strong>Status:</strong> <span style="color: #4f46e5; font-weight: bold;">{status}</span></p>
              </div>
              <p style="margin-top: 20px;">
                Please log in to the Proserve Help Desk portal for more details.
              </p>
            </div>
          </body>
        </html>
        """
        
        message.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (Travel Notification): {str(e)}")
        return False

def send_travel_summary_email(to_email: str, period: str, summary_data: dict):
    """Send monthly travel spending summary to managers and admins"""
    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Monthly Travel Summary: {period}"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        tech_rows = ""
        for t in summary_data.get('technicians', []):
            tech_rows += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t['name']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{t['distance']} km</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">₹{t['amount']}</td>
            </tr>
            """

        mode_rows = ""
        for m in summary_data.get('modes', []):
            mode_rows += f"""
            <div style="display: inline-block; margin-right: 20px; margin-bottom: 10px; padding: 10px; background: #f1f5f9; border-radius: 8px;">
                <span style="font-size: 12px; color: #64748b; text-transform: uppercase;">{m['mode']}</span><br/>
                <span style="font-weight: bold; color: #1e293b;">₹{m['amount']}</span>
            </div>
            """
        
        html_content = f"""
        <html>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">Monthly Travel Summary</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Report for Period: {period}</p>
              </div>
              
              <div style="padding: 30px;">
                <div style="display: flex; justify-content: space-around; text-align: center; margin-bottom: 30px;">
                    <div style="flex: 1;">
                        <span style="font-size: 14px; color: #64748b;">Total Spend</span><br/>
                        <span style="font-size: 24px; font-weight: 800; color: #4f46e5;">₹{summary_data.get('total_amount', 0):,.2f}</span>
                    </div>
                    <div style="flex: 1; border-left: 1px solid #eee;">
                        <span style="font-size: 14px; color: #64748b;">Total Distance</span><br/>
                        <span style="font-size: 24px; font-weight: 800; color: #10b981;">{summary_data.get('total_distance', 0):,.1f} km</span>
                    </div>
                </div>

                <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 30px;">Spend by Mode</h3>
                <div style="margin: 20px 0;">
                    {mode_rows}
                </div>

                <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 30px;">Top Technicians</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="text-align: left; background-color: #f8fafc;">
                            <th style="padding: 10px;">Technician</th>
                            <th style="padding: 10px;">Distance</th>
                            <th style="padding: 10px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tech_rows}
                    </tbody>
                </table>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                    This is an automated monthly summary from Proserve Help Desk.
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        message.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (Monthly Summary): {str(e)}")
        return False

def send_sla_breach_email(to_email: str, username: str, ticket_data: dict, escalation_level: int, trigger_percent: int):
    """Send email alert for SLA breach"""
    try:
        message = MIMEMultipart("alternative")
        subject_prefix = "⚠️ URGENT:" if escalation_level >= 2 else "⚠️ SLA Alert:"
        message["Subject"] = f"{subject_prefix} Ticket #{ticket_data['id']} at {trigger_percent}% SLA - Level {escalation_level}"
        message["From"] = FROM_EMAIL
        message["To"] = to_email

        html_content = f"""
        <html>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 25px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em;">SLA BREACH ALERT</h1>
                <p style="margin: 5px 0 0 0; font-weight: 600; opacity: 0.9;">Level {escalation_level} Escalation ({trigger_percent}%)</p>
              </div>
              
              <div style="padding: 30px;">
                <p style="margin-top: 0;">Hello <strong>{username}</strong>,</p>
                <p>The following ticket requires immediate attention as it has consumed <strong>{trigger_percent}%</strong> of its allocated SLA time.</p>
                
                <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <div style="margin-bottom: 10px;">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700;">Ticket ID</span><br/>
                        <span style="font-size: 16px; font-weight: 700; color: #881337;">#{ticket_data['id']}</span>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700;">Subject</span><br/>
                        <span style="font-size: 15px; color: #1e293b;">{ticket_data['subject']}</span>
                    </div>
                    <div style="display: flex; gap: 20px;">
                        <div>
                            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700;">Priority</span><br/>
                            <span style="font-weight: 600; color: #881337;">{ticket_data['priority']}</span>
                        </div>
                        <div>
                            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239; font-weight: 700;">Category</span><br/>
                            <span style="font-weight: 600; color: #881337;">{ticket_data['category']}</span>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                    <a href="http://localhost:5173/dashboard/tickets/{ticket_data['id']}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block;">View Ticket Immediately</a>
                </div>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                    Use the Proserve Dashboard to take action.
                </div>
              </div>
            </div>
          </body>
        </html>
        """

        message.attach(MIMEText(html_content, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (SLA Alert): {str(e)}")
        return False

def send_analytics_report_email(to_email: str, subject: str, html_body: str, attachment_name: str = "report.html", attachment_content: str = None):
    """Send analytics report email"""
    try:
        message = MIMEMultipart("mixed")
        message["Subject"] = subject
        message["From"] = FROM_EMAIL
        message["To"] = to_email

        # Email body
        body_part = MIMEText(html_body, "html")
        message.attach(body_part)

        # Attachment (if provided)
        if attachment_content:
            attachment_part = MIMEText(attachment_content, "html")
            attachment_part.add_header('Content-Disposition', f'attachment; filename="{attachment_name}"')
            message.attach(attachment_part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        logging.info(f"Analytics report sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"SMTP ERROR (Analytics Report): {str(e)}")
        return False

def send_email(to_emails, subject, html_content):
    """Generic function to send email to multiple recipients"""
    if not isinstance(to_emails, list):
        to_emails = [to_emails]
        
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = FROM_EMAIL
        message["To"] = ", ".join(to_emails)
        
        # Attach HTML version
        part = MIMEText(html_content, "html")
        message.attach(part)
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        logging.info(f"Email sent successfully to {', '.join(to_emails)}")
        return True
        
    except Exception as e:
        logging.error(f"SMTP ERROR (send_email): {str(e)}")
        return False

def send_password_reset_email(to_email: str, username: str, reset_link: str):
    """Send a password reset link to the user"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Reset Your Password - Proserve Help Desk"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        # Create the email body
        html_content = f"""
        <html>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Password Reset</h1>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 700;">Hello {username},</h2>
                <p style="color: #64748b; line-height: 1.6; font-size: 15px;">
                  We received a request to reset the password for your Proserve Help Desk account. Click the button below to proceed.
                </p>
                <div style="padding: 20px 0; text-align: center;">
                  <a href="{reset_link}" style="background-color: #4f46e5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">RESET MY PASSWORD</a>
                </div>
                <p style="color: #94a3b8; line-height: 1.6; font-size: 13px; margin-top: 20px;">
                  This link will expire in 1 hour. If you did not request a password reset, please ignore this email or contact support if you have concerns.
                </p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                  <p style="color: #cbd5e1; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                    Proserve IT Solutions & Services
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        text_content = f"""
        Reset Your Password - Proserve Help Desk
        
        Hello {username},
        
        We received a request to reset the password for your Proserve Help Desk account. 
        Please use the following link to reset your password:
        
        {reset_link}
        
        This link will expire in 1 hour. If you did not request a password reset, please ignore this email.
        """
        
        # Attach versions
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        logging.info(f"Password reset email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"SMTP ERROR (Password Reset): {str(e)}")
        return False

def send_password_reset_otp_email(to_email: str, username: str, otp_code: str):
    """Send a password reset OTP code to the user"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Your Verification Code - Proserve Help Desk"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        # Create the email body
        html_content = f"""
        <html>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Reset Password</h1>
              </div>
              <div style="padding: 40px; text-align: center;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 700;">Verification Code</h2>
                <p style="color: #64748b; line-height: 1.6; font-size: 15px;">
                  Hello {username}, use the code below to reset your password.
                </p>
                <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 16px; border: 2px dashed #cbd5e1;">
                    <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #4f46e5; letter-spacing: 12px; margin-left: 12px;">{otp_code}</span>
                </div>
                <p style="color: #94a3b8; line-height: 1.6; font-size: 13px; margin-top: 20px;">
                  This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
                </p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                  <p style="color: #cbd5e1; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                    Proserve IT Solutions & Services
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        text_content = f"""
        Verification Code - Proserve Help Desk
        
        Hello {username},
        
        Your verification code for password reset is: {otp_code}
        
        This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
        """
        
        # Attach versions
        message.attach(MIMEText(text_content, "plain"))
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
        
    except Exception as e:
        print(f"SMTP ERROR (Password Reset OTP): {str(e)}")
        return False
def send_2fa_otp_email(to_email: str, username: str, otp_code: str):
    """Send a 2FA OTP code to the user's email"""
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Your Login Code: {otp_code} - Proserve Help Desk"
        message["From"] = FROM_EMAIL
        message["To"] = to_email
        
        # Create the email body
        html_content = f"""
        <html>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Secure Login</h1>
              </div>
              <div style="padding: 40px; text-align: center;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; font-weight: 700;">Verification Code</h2>
                <p style="color: #64748b; line-height: 1.6; font-size: 15px;">
                  Hello {username}, use the code below to complete your login.
                </p>
                <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 16px; border: 2px dashed #cbd5e1;">
                    <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #4f46e5; letter-spacing: 12px; margin-left: 12px;">{otp_code}</span>
                </div>
                <p style="color: #94a3b8; line-height: 1.6; font-size: 13px; margin-top: 20px;">
                  This code will expire in 5 minutes. If you did not attempt to log in, please secure your account immediately.
                </p>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
                  <p style="color: #cbd5e1; font-size: 11px; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                    Proserve IT Solutions & Services
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
        """
        
        # Attach versions
        message.attach(MIMEText(html_content, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
            
        return True
    except Exception as e:
        print(f"SMTP ERROR (2FA OTP): {str(e)}")
        return False

def send_no_punch_out_email(to_email: str, employee_name: str, date: str, check_in_time: str):
    """Send email notification for missing punch-out"""
    try:
        subject = f"⚠️ Missing Punch-Out Alert - {date}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 24px; }}
                .content {{ padding: 30px; }}
                .alert-box {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }}
                .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
                .label {{ color: #6b7280; font-weight: 500; }}
                .value {{ color: #111827; font-weight: 600; }}
                .action-btn {{ display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }}
                .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Missing Punch-Out</h1>
                </div>
                <div class="content">
                    <p>Dear <strong>{employee_name}</strong>,</p>
                    
                    <div class="alert-box">
                        <strong>You did not punch out on {date}</strong><br>
                        Our records show that you checked in but forgot to check out.
                    </div>
                    
                    <div class="info-row">
                        <span class="label">Date</span>
                        <span class="value">{date}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Check-In Time</span>
                        <span class="value">{check_in_time}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Check-Out Time</span>
                        <span class="value" style="color: #dc2626;">Not Recorded</span>
                    </div>
                    
                    <p style="margin-top: 20px;">
                        <strong>Action Required:</strong> Please log in to the system and provide a reason for the missing punch-out.
                    </p>
                    
                    <center>
                        <a href="https://www.proservehelpdesk.in/login" class="action-btn">Login to Submit Reason</a>
                    </center>
                </div>
                <div class="footer">
                    <p>This is an automated message from Proserve HR System</p>
                    <p>© {datetime.now().year} Proserve. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        
        part = MIMEText(html_content, "html")
        msg.attach(part)
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
            
        return True
    except Exception as e:
        print(f"SMTP ERROR (No Punch Out): {str(e)}")
        return False

