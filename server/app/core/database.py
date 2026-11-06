import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from server.app.core.config import settings

# If in test mode, default to in-memory sqlite
if os.environ.get("TESTING"):
    db_url = "sqlite:///:memory:"
else:
    db_url = settings.DATABASE_URL
    # Normalize postgresql URL to use psycopg2 if specified as postgresql://
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Configure connect_args for SQLite if sqlite is used
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

