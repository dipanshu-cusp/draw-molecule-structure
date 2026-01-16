"""
SQLAlchemy declarative base for all models.

This module provides the base class that all ORM models inherit from.
"""

from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass


class Base(DeclarativeBase, MappedAsDataclass):
    """
    Base class for all SQLAlchemy models.
    
    Inherits from:
    - DeclarativeBase: SQLAlchemy 2.0 declarative base
    - MappedAsDataclass: Enables dataclass-like behavior for models
    """
    pass
