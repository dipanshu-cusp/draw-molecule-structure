"""
Reaction model representing a chemical reaction.

Hierarchy: Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.part import Part
    from src.models.reaction_role import ReactionRole


class Reaction(Base):
    """
    ORM model for chemical reactions.
    
    A reaction represents a single chemical transformation,
    with molecules playing different roles (reactant, product, catalyst, etc.).
    
    Attributes:
        id: Unique identifier (UUID)
        part_id: Foreign key to parent part
        name: Name or identifier of the reaction
        reaction_smiles: SMILES representation of the complete reaction
        description: Optional detailed description
        created_at: Timestamp when record was created
        part: Parent part relationship
        reaction_roles: Molecules and their roles in this reaction
    """
    
    __tablename__ = "reactions"
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    part_id: Mapped[UUID] = mapped_column(
        ForeignKey("parts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    name: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        default=None,
    )
    
    # Full reaction SMILES (e.g., "A.B>>C")
    reaction_smiles: Mapped[Optional[str]] = mapped_column(
        Text,
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
    part: Mapped["Part"] = relationship(
        "Part",
        back_populates="reactions",
        lazy="selectin",
        init=False,
    )
    
    reaction_roles: Mapped[list["ReactionRole"]] = relationship(
        "ReactionRole",
        back_populates="reaction",
        lazy="selectin",
        cascade="all, delete-orphan",
        init=False,
        default_factory=list,
    )
    
    def __repr__(self) -> str:
        return f"<Reaction(id={self.id}, name='{self.name}')>"
    
    @property
    def molecules(self) -> list:
        """Get all molecules participating in this reaction."""
        return [role.molecule for role in self.reaction_roles if role.molecule]
    
    @property
    def reactants(self) -> list:
        """Get molecules that are reactants in this reaction."""
        return [
            role.molecule 
            for role in self.reaction_roles 
            if role.role == "reactant" and role.molecule
        ]
    
    @property
    def products(self) -> list:
        """Get molecules that are products in this reaction."""
        return [
            role.molecule 
            for role in self.reaction_roles 
            if role.role == "product" and role.molecule
        ]
