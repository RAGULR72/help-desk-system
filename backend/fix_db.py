from sqlalchemy import text, inspect
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_column_if_missing(inspector, table_name, col_name, col_type):
    try:
        if not inspector.has_table(table_name):
            logger.warning(f"Table {table_name} does not exist. Skipping column check.")
            return

        existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
        if col_name.lower() not in existing_columns:
            logger.info(f"Adding column {col_name} to {table_name} table...")
            with engine.begin() as conn:
                # Add basic column
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
            logger.info(f"Column {col_name} added successfully to {table_name}.")
        else:
            logger.debug(f"Column {col_name} already exists in {table_name}.")
    except Exception as e:
        logger.error(f"Error checking/adding column {col_name} for table {table_name}: {e}")

def fix_all_tables():
    inspector = inspect(engine)
    
    # Comprehensive Users table update
    user_cols = [
        # Basic Info
        ("full_name", "VARCHAR"),
        ("phone", "VARCHAR"),
        ("company", "VARCHAR"),
        ("location", "VARCHAR"),
        ("work_location", "VARCHAR"),
        ("address", "VARCHAR"),
        ("avatar_url", "VARCHAR"),
        ("team", "VARCHAR"),
        ("job_title", "VARCHAR"),
        ("department", "VARCHAR"),
        ("manager", "VARCHAR"),
        ("status", "VARCHAR DEFAULT 'Active'"),
        ("about_me", "TEXT"),
        
        # Professional/Travel
        ("tech_level", "VARCHAR DEFAULT 'L1'"),
        ("specialization", "VARCHAR"),
        ("travel_budget", "DOUBLE PRECISION DEFAULT 5000.0"),
        ("is_vip", "BOOLEAN DEFAULT FALSE"),
        
        # Security & Auth
        ("is_approved", "BOOLEAN DEFAULT FALSE"),
        ("is_2fa_enabled", "BOOLEAN DEFAULT FALSE"),
        ("is_2fa_setup", "BOOLEAN DEFAULT FALSE"),
        ("totp_secret", "VARCHAR"),
        ("must_change_password", "BOOLEAN DEFAULT FALSE"),
        ("password_last_changed", "TIMESTAMP"),
        ("failed_login_attempts", "INTEGER DEFAULT 0"),
        ("locked_until", "TIMESTAMP"),
        ("permissions", "TEXT"),
        ("has_security_keys", "BOOLEAN DEFAULT FALSE"),
        ("has_backup_codes", "BOOLEAN DEFAULT FALSE"),
        ("last_activity_at", "TIMESTAMP"),
        
        # OTP
        ("email_otp", "VARCHAR"),
        ("email_otp_expires_at", "TIMESTAMP"),
        
        # Preferences
        ("email_notifications_enabled", "BOOLEAN DEFAULT TRUE"),
        ("sms_notifications_enabled", "BOOLEAN DEFAULT FALSE"),
        ("notification_preference", "VARCHAR DEFAULT 'allow'"),
        ("language", "VARCHAR DEFAULT 'English (US)'"),
        ("timezone", "VARCHAR DEFAULT 'UTC+5:30'"),
        
        # Location
        ("latitude", "DOUBLE PRECISION"),
        ("longitude", "DOUBLE PRECISION"),
        ("last_location_update", "TIMESTAMP")
    ]
    
    for col, ctype in user_cols:
        add_column_if_missing(inspector, 'users', col, ctype)
        
    # Login Logs table
    login_log_cols = [
        ("ip_address", "VARCHAR"),
        ("device", "VARCHAR"),
        ("os", "VARCHAR"),
        ("browser", "VARCHAR"),
        ("location", "VARCHAR"),
        ("is_active", "BOOLEAN DEFAULT TRUE")
    ]
    for col, ctype in login_log_cols:
        add_column_if_missing(inspector, 'login_logs', col, ctype)
        
    # User Activity table
    user_activity_cols = [
        ("ip_address", "VARCHAR"),
        ("severity", "VARCHAR DEFAULT 'info'"),
        ("icon", "VARCHAR"),
        ("link", "VARCHAR")
    ]
    for col, ctype in user_activity_cols:
        add_column_if_missing(inspector, 'user_activity', col, ctype)

    # Notifications table
    notif_cols = [
        ("title", "VARCHAR"),
        ("message", "TEXT"),
        ("type", "VARCHAR"),
        ("link", "VARCHAR"),
        ("is_read", "BOOLEAN DEFAULT FALSE")
    ]
    for col, ctype in notif_cols:
        add_column_if_missing(inspector, 'notifications', col, ctype)

def fix_users_table():
    fix_all_tables()

if __name__ == "__main__":
    fix_all_tables()
