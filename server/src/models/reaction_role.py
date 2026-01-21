"""
ReactionRole model representing a molecule's role in a reaction.

This is a junction/association table linking molecules to reactions
with an additional role attribute.

Hierarchy: Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.reaction import Reaction
    from src.models.molecule import Molecule


class ReactionRole(Base):
    """
    ORM model for molecule roles in reactions.
    
    This junction table links molecules to reactions and specifies
    the role each molecule plays (reactant, product, catalyst, solvent, etc.).
    
    Attributes:
        id: Unique identifier (UUID)
        reaction_id: Foreign key to the reaction
        molecule_id: Foreign key to the molecule
        role: Role of the molecule in the reaction
        stoichiometry: Optional stoichiometric coefficient
        created_at: Timestamp when record was created
        reaction: Parent reaction relationship
        molecule: Related molecule
    """
    
    __tablename__ = "reaction_roles"
    
    # Add composite index for common query patterns
    __table_args__ = (
        Index("ix_reaction_roles_molecule_role", "molecule_id", "role"),
    )
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    reaction_id: Mapped[UUID] = mapped_column(
        ForeignKey("reactions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    molecule_id: Mapped[UUID] = mapped_column(
        ForeignKey("molecules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    
    # Role: reactant, product, catalyst, solvent, reagent, etc.
    role: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    
    # Optional stoichiometry (e.g., "2" for 2A + B -> C)
    stoichiometry: Mapped[Optional[str]] = mapped_column(
        String(32),
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
    reaction: Mapped["Reaction"] = relationship(
        "Reaction",
        back_populates="reaction_roles",
        lazy="selectin",
        init=False,
    )
    
    molecule: Mapped["Molecule"] = relationship(
        "Molecule",
        back_populates="reaction_roles",
        lazy="selectin",
        init=False,
    )
    
    def __repr__(self) -> str:
        return f"<ReactionRole(id={self.id}, role='{self.role}')>"
