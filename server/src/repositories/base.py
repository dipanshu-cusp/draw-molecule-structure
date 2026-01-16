"""
Base repository providing common database operations.

Repositories implement the Repository Pattern to abstract database
access and provide a clean interface for domain logic.
"""

from typing import Generic, TypeVar, Type, Sequence
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from src.models.base import Base

# Type variable for generic repository
ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with common CRUD operations.
    
    Provides a consistent interface for database operations across
    all models. Subclass this for model-specific queries.
    
    Attributes:
        model: The SQLAlchemy model class
        session: The database session
    """
    
    def __init__(self, model: Type[ModelType], session: Session):
        """
        Initialize the repository.
        
        Args:
            model: The SQLAlchemy model class
            session: Active database session
        """
        self.model = model
        self.session = session
    
    def get_by_id(self, id: UUID) -> ModelType | None:
        """
        Get a single record by ID.
        
        Args:
            id: UUID of the record
            
        Returns:
            The model instance or None if not found
        """
        return self.session.get(self.model, id)
    
    def get_all(
        self,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> Sequence[ModelType]:
        """
        Get all records with pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of model instances
        """
        stmt = select(self.model).offset(skip).limit(limit)
        return self.session.scalars(stmt).all()
    
    def count(self) -> int:
        """
        Get the total count of records.
        
        Returns:
            Total number of records
        """
        stmt = select(func.count()).select_from(self.model)
        return self.session.scalar(stmt) or 0
    
    def create(self, obj: ModelType) -> ModelType:
        """
        Create a new record.
        
        Args:
            obj: The model instance to create
            
        Returns:
            The created model instance with generated ID
        """
        self.session.add(obj)
        self.session.flush()
        return obj
    
    def create_many(self, objects: list[ModelType]) -> list[ModelType]:
        """
        Create multiple records in bulk.
        
        Args:
            objects: List of model instances to create
            
        Returns:
            List of created model instances
        """
        self.session.add_all(objects)
        self.session.flush()
        return objects
    
    def update(self, obj: ModelType) -> ModelType:
        """
        Update an existing record.
        
        Args:
            obj: The model instance to update
            
        Returns:
            The updated model instance
        """
        self.session.add(obj)
        self.session.flush()
        return obj
    
    def delete(self, obj: ModelType) -> None:
        """
        Delete a record.
        
        Args:
            obj: The model instance to delete
        """
        self.session.delete(obj)
        self.session.flush()
    
    def delete_by_id(self, id: UUID) -> bool:
        """
        Delete a record by ID.
        
        Args:
            id: UUID of the record to delete
            
        Returns:
            True if deleted, False if not found
        """
        obj = self.get_by_id(id)
        if obj:
            self.delete(obj)
            return True
        return False
