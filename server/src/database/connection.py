"""
Database connection and session management.

This module provides SQLAlchemy engine configuration, session factory,
and dependency injection for FastAPI routes.
"""

import logging
import os
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

# Database configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/molecule_db")
DATABASE_POOL_SIZE = int(os.getenv("DATABASE_POOL_SIZE", "5"))
DATABASE_MAX_OVERFLOW = int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
DATABASE_POOL_TIMEOUT = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
DATABASE_POOL_RECYCLE = int(os.getenv("DATABASE_POOL_RECYCLE", "1800"))
DATABASE_ECHO = os.getenv("DATABASE_ECHO", "false").lower() == "true"

# Global engine instance - initialized lazily
_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """
    Get or create the SQLAlchemy engine.
    
    Uses a connection pool for efficient connection reuse.
    The engine is created lazily on first access.
    
    Returns:
        SQLAlchemy Engine instance
    """
    global _engine
    
    if _engine is None:
        _engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=DATABASE_POOL_SIZE,
            max_overflow=DATABASE_MAX_OVERFLOW,
            pool_timeout=DATABASE_POOL_TIMEOUT,
            pool_recycle=DATABASE_POOL_RECYCLE,
            pool_pre_ping=True,
            echo=DATABASE_ECHO,
        )
        
        logger.info(
            f"Database engine created with pool_size={DATABASE_POOL_SIZE}, "
            f"max_overflow={DATABASE_MAX_OVERFLOW}"
        )
    
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    """
    Get or create the session factory.
    
    Returns:
        SQLAlchemy sessionmaker instance
    """
    global _session_factory
    
    if _session_factory is None:
        engine = get_engine()
        _session_factory = sessionmaker(
            bind=engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )
        logger.info("Session factory created")
    
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.
    
    Provides a database session that is automatically closed
    after the request completes. Use with FastAPI's Depends().
    
    Yields:
        SQLAlchemy Session instance
        
    Example:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    session_factory = get_session_factory()
    session = session_factory()
    
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database sessions outside of FastAPI routes.
    
    Use this for background tasks, CLI commands, or testing.
    
    Yields:
        SQLAlchemy Session instance
        
    Example:
        with get_db_context() as db:
            molecules = db.query(Molecule).all()
    """
    session_factory = get_session_factory()
    session = session_factory()
    
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """
    Initialize the database connection.
    
    Call this during application startup to eagerly create
    the connection pool and verify database connectivity.
    """
    engine = get_engine()
    
    # Verify connectivity
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        logger.info("Database connection verified successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def close_db() -> None:
    """
    Close the database connection pool.
    
    Call this during application shutdown for graceful cleanup.
    """
    global _engine, _session_factory
    
    if _engine is not None:
        _engine.dispose()
        logger.info("Database connection pool closed")
        _engine = None
        _session_factory = None
