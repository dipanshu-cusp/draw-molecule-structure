"""
Notebook model representing research notebooks stored in GCS.

A notebook is the top-level entity in the synthesis hierarchy:
Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.synthesis import Synthesis


class Notebook(Base):
    """
    ORM model for research notebooks.
    
    Notebooks are the primary documents containing synthesis experiments.
    They are indexed in GCS and linked to the Discovery Engine.
    
    Attributes:
        id: Unique identifier (UUID)
        gcs_path: Full Google Cloud Storage path to the notebook
        title: Human-readable title of the notebook
        description: Optional detailed description
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
        syntheses: Related synthesis experiments
    """
    
    __tablename__ = "notebooks"
    
    # Primary key - use default_factory for dataclass compatibility
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    # GCS path is unique and indexed for efficient lookups
    gcs_path: Mapped[str] = mapped_column(
        String(1024),
        unique=True,
        index=True,
        nullable=False,
    )
    
    # Metadata fields
    title: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        default=None,
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    
    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        init=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        init=False,
    )
    
    # Relationships
    syntheses: Mapped[list["Synthesis"]] = relationship(
        "Synthesis",
        back_populates="notebook",
        lazy="selectin",
        init=False,
        default_factory=list,
    )
    
    def __repr__(self) -> str:
        return f"<Notebook(id={self.id}, gcs_path='{self.gcs_path}')>"
    
    @property
    def filename(self) -> str:
        """Extract filename from GCS path."""
        return self.gcs_path.split("/")[-1] if self.gcs_path else ""
