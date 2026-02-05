from sqlalchemy import text, inspect
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_column_if_missing(inspector, table_name, col_name, col_type):
    try:
        # Check if table exists first
        if not inspector.has_table(table_name):
            logger.warning(f"Table {table_name} does not exist. Skipping column check.")
            return

        existing_columns = [c['name'].lower() for c in inspector.get_columns(table_name)]
        if col_name.lower() not in existing_columns:
            logger.info(f"Adding column {col_name} to {table_name} table...")
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
            logger.info(f"Column {col_name} added successfully to {table_name}.")
        else:
            logger.debug(f"Column {col_name} already exists in {table_name}.")
    except Exception as e:
        logger.error(f"Error checking/adding column {col_name} for table {table_name}: {e}")

def fix_all_tables():
    inspector = inspect(engine)
    
    # Users table fixes
    user_cols = [
        ("email_otp", "VARCHAR"),
        ("email_otp_expires_at", "TIMESTAMP"),
        ("latitude", "DOUBLE PRECISION"),
        ("longitude", "DOUBLE PRECISION"),
        ("last_location_update", "TIMESTAMP"),
        ("is_2fa_setup", "BOOLEAN DEFAULT FALSE"),
        ("has_security_keys", "BOOLEAN DEFAULT FALSE"),
        ("has_backup_codes", "BOOLEAN DEFAULT FALSE"),
        ("tech_level", "VARCHAR DEFAULT 'L1'"),
        ("specialization", "VARCHAR"),
        ("travel_budget", "DOUBLE PRECISION DEFAULT 5000.0"),
        ("must_change_password", "BOOLEAN DEFAULT FALSE"),
        ("password_last_changed", "TIMESTAMP"),
        ("failed_login_attempts", "INTEGER DEFAULT 0"),
        ("locked_until", "TIMESTAMP"),
        ("is_vip", "BOOLEAN DEFAULT FALSE"),
        ("permissions", "TEXT"),
        ("status", "VARCHAR DEFAULT 'Active'")
    ]
    for col, ctype in user_cols:
        add_column_if_missing(inspector, 'users', col, ctype)
        
    # Login Logs table fixes
    login_log_cols = [
        ("is_active", "BOOLEAN DEFAULT TRUE"),
        ("location", "VARCHAR")
    ]
    for col, ctype in login_log_cols:
        add_column_if_missing(inspector, 'login_logs', col, ctype)
        
    # User Activity table fixes
    user_activity_cols = [
        ("ip_address", "VARCHAR"),
        ("severity", "VARCHAR DEFAULT 'info'"),
        ("icon", "VARCHAR")
    ]
    for col, ctype in user_activity_cols:
        add_column_if_missing(inspector, 'user_activity', col, ctype)

    # Notifications table fixes
    notif_cols = [
        ("link", "VARCHAR"),
        ("type", "VARCHAR")
    ]
    for col, ctype in notif_cols:
        add_column_if_missing(inspector, 'notifications', col, ctype)

def fix_users_table():
    # Backward compatibility for main.py
    fix_all_tables()

if __name__ == "__main__":
    fix_all_tables()
