from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Get database URL from environment variable
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set in .env file")

# Create engine with appropriate parameters based on database type
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Production Database (PostgreSQL/MySQL) with Connection Pooling
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=20,          # Maintain up to 20 permanent connections
        max_overflow=30,       # Allow up to 30 extra connections during spikes
        pool_recycle=3600,     # Refresh connections every hour
        pool_pre_ping=True,    # Check if connection is alive before using it
        pool_timeout=30,       # Time to wait for connection from pool
        echo=False,            # Set to True for SQL query logging (dev only)
        connect_args={"sslmode": "require"} if "postgresql" in SQLALCHEMY_DATABASE_URL else {}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()