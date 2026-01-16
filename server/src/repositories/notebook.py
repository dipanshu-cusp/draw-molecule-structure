"""
Notebook repository for notebook-specific operations.
"""

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models import Notebook, Synthesis, Part, Reaction
from src.repositories.base import BaseRepository


class NotebookRepository(BaseRepository[Notebook]):
    """
    Repository for notebook operations.
    
    Provides methods for finding and managing notebooks.
    """
    
    def __init__(self, session: Session):
        """Initialize with Notebook model."""
        super().__init__(Notebook, session)
    
    def get_by_gcs_path(self, gcs_path: str) -> Notebook | None:
        """
        Find a notebook by its GCS path.
        
        Args:
            gcs_path: Full GCS path to the notebook
            
        Returns:
            Notebook if found, None otherwise
        """
        stmt = select(Notebook).where(Notebook.gcs_path == gcs_path)
        return self.session.scalar(stmt)
    
    def get_by_filename(self, filename: str) -> Notebook | None:
        """
        Find a notebook by filename (extracted from GCS path).
        
        Args:
            filename: Filename to search for
            
        Returns:
            Notebook if found, None otherwise
        """
        stmt = select(Notebook).where(Notebook.gcs_path.endswith(filename))
        return self.session.scalar(stmt)
    
    def get_with_full_hierarchy(self, notebook_id) -> Notebook | None:
        """
        Get a notebook with all related syntheses, parts, and reactions.
        
        Args:
            notebook_id: UUID of the notebook
            
        Returns:
            Notebook with loaded relationships or None
        """
        stmt = (
            select(Notebook)
            .where(Notebook.id == notebook_id)
            .options(
                selectinload(Notebook.syntheses)
                .selectinload(Synthesis.parts)
                .selectinload(Part.reactions)
                .selectinload(Reaction.reaction_roles)
            )
        )
        return self.session.scalar(stmt)
    
    def search_by_title(
        self,
        query: str,
        limit: int = 50
    ) -> Sequence[Notebook]:
        """
        Search notebooks by title (case-insensitive).
        
        Args:
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching notebooks
        """
        stmt = (
            select(Notebook)
            .where(Notebook.title.ilike(f"%{query}%"))
            .limit(limit)
        )
        return self.session.scalars(stmt).all()
    
    def get_notebooks_with_molecule(
        self,
        smiles: str,
    ) -> Sequence[Notebook]:
        """
        Get all notebooks containing a specific molecule.
        
        This traverses the full hierarchy:
        Notebook -> Synthesis -> Part -> Reaction -> ReactionRole -> Molecule
        
        Args:
            smiles: Canonical SMILES of the molecule
            
        Returns:
            List of notebooks containing the molecule
        """
        from src.models import ReactionRole, Molecule
        
        stmt = (
            select(Notebook)
            .distinct()
            .join(Synthesis, Notebook.id == Synthesis.notebook_id)
            .join(Part, Synthesis.id == Part.synthesis_id)
            .join(Reaction, Part.id == Reaction.part_id)
            .join(ReactionRole, Reaction.id == ReactionRole.reaction_id)
            .join(Molecule, ReactionRole.molecule_id == Molecule.id)
            .where(Molecule.canonical_smiles == smiles)
        )
        
        return self.session.scalars(stmt).all()
