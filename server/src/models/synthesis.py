"""
Synthesis model representing a synthesis experiment within a notebook.

Hierarchy: Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.notebook import Notebook
    from src.models.part import Part


class Synthesis(Base):
    """
    ORM model for synthesis experiments.
    
    A synthesis represents a complete chemical synthesis process
    documented within a notebook. It may contain multiple parts
    representing different stages or variations.
    
    Attributes:
        id: Unique identifier (UUID)
        notebook_id: Foreign key to parent notebook
        name: Name or identifier of the synthesis
        description: Optional detailed description
        created_at: Timestamp when record was created
        notebook: Parent notebook relationship
        parts: Child parts of this synthesis
    """
    
    __tablename__ = "syntheses"
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    notebook_id: Mapped[UUID] = mapped_column(
        ForeignKey("notebooks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    name: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        default=None,
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        init=False,
    )
    
    # Relationships
    notebook: Mapped["Notebook"] = relationship(
        "Notebook",
        back_populates="syntheses",
        lazy="selectin",
        init=False,
    )
    
    parts: Mapped[list["Part"]] = relationship(
        "Part",
        back_populates="synthesis",
        lazy="selectin",
        cascade="all, delete-orphan",
        init=False,
        default_factory=list,
    )
    
    def __repr__(self) -> str:
        return f"<Synthesis(id={self.id}, name='{self.name}')>"
