from sqlalchemy import text
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_users_table():
    columns_to_add = [
        ("email_otp", "VARCHAR"),
        ("email_otp_expires_at", "TIMESTAMP"),
        ("latitude", "DOUBLE PRECISION"),
        ("longitude", "DOUBLE PRECISION"),
        ("last_location_update", "TIMESTAMP")
    ]
    
    with engine.connect() as conn:
        for col_name, col_type in columns_to_add:
            try:
                # Check if column exists
                check_query = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='{col_name}'")
                result = conn.execute(check_query).fetchone()
                
                if not result:
                    logger.info(f"Adding column {col_name} to users table...")
                    alter_query = text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                    conn.execute(alter_query)
                    conn.commit()
                    logger.info(f"Column {col_name} added successfully.")
                else:
                    logger.info(f"Column {col_name} already exists.")
            except Exception as e:
                logger.error(f"Error adding column {col_name}: {e}")
                conn.rollback()

if __name__ == "__main__":
    fix_users_table()
