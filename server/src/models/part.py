"""
Part model representing a part/stage of a synthesis.

Hierarchy: Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.synthesis import Synthesis
    from src.models.reaction import Reaction


class Part(Base):
    """
    ORM model for synthesis parts.
    
    A part represents a distinct stage or section of a synthesis,
    potentially containing multiple reactions.
    
    Attributes:
        id: Unique identifier (UUID)
        synthesis_id: Foreign key to parent synthesis
        name: Name or identifier of the part
        sequence_number: Order of this part in the synthesis
        description: Optional detailed description
        created_at: Timestamp when record was created
        synthesis: Parent synthesis relationship
        reactions: Child reactions in this part
    """
    
    __tablename__ = "parts"
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    synthesis_id: Mapped[UUID] = mapped_column(
        ForeignKey("syntheses.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    name: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        default=None,
    )
    
    sequence_number: Mapped[int] = mapped_column(
        Integer,
        default=0,
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
    synthesis: Mapped["Synthesis"] = relationship(
        "Synthesis",
        back_populates="parts",
        lazy="selectin",
        init=False,
    )
    
    reactions: Mapped[list["Reaction"]] = relationship(
        "Reaction",
        back_populates="part",
        lazy="selectin",
        cascade="all, delete-orphan",
        init=False,
        default_factory=list,
    )
    
    def __repr__(self) -> str:
        return f"<Part(id={self.id}, name='{self.name}', sequence={self.sequence_number})>"
