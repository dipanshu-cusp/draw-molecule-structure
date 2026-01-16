"""
Molecule model representing a chemical molecule.

Molecules are the leaf nodes in the synthesis hierarchy,
connected to reactions through reaction roles.

Hierarchy: Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import String, Text, Float, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.reaction_role import ReactionRole


class Molecule(Base):
    """
    ORM model for chemical molecules.
    
    Stores molecular information including SMILES notation,
    InChI identifiers, and computed properties.
    
    Attributes:
        id: Unique identifier (UUID)
        canonical_smiles: Canonical SMILES representation (unique)
        inchi: InChI identifier
        inchi_key: InChI key for fast lookups
        molecular_formula: Chemical formula (e.g., C6H12O6)
        molecular_weight: Molecular weight in g/mol
        name: Common or IUPAC name
        cas_number: CAS registry number
        created_at: Timestamp when record was created
        updated_at: Timestamp when record was last updated
        reaction_roles: Reactions involving this molecule
    """
    
    __tablename__ = "molecules"
    
    # Add indexes for common search patterns
    __table_args__ = (
        Index("ix_molecules_inchi_key", "inchi_key"),
        Index("ix_molecules_molecular_formula", "molecular_formula"),
    )
    
    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default_factory=uuid4,
        init=False,
    )
    
    # Canonical SMILES is the primary identifier for molecules
    # Must be unique and is heavily indexed for searches
    canonical_smiles: Mapped[str] = mapped_column(
        Text,
        unique=True,
        index=True,
        nullable=False,
    )
    
    # InChI and InChI Key for standardized identification
    inchi: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )
    
    inchi_key: Mapped[Optional[str]] = mapped_column(
        String(27),  # InChI keys are always 27 characters
        nullable=True,
        default=None,
    )
    
    # Molecular properties
    molecular_formula: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        default=None,
    )
    
    molecular_weight: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        default=None,
    )
    
    # Names and identifiers
    name: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
        default=None,
    )
    
    cas_number: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
        index=True,
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
    reaction_roles: Mapped[list["ReactionRole"]] = relationship(
        "ReactionRole",
        back_populates="molecule",
        lazy="selectin",
        cascade="all, delete-orphan",
        init=False,
        default_factory=list,
    )
    
    def __repr__(self) -> str:
        return f"<Molecule(id={self.id}, smiles='{self.canonical_smiles[:50]}...')>"
    
    @property
    def reactions(self) -> list:
        """Get all reactions involving this molecule."""
        return [role.reaction for role in self.reaction_roles if role.reaction]
