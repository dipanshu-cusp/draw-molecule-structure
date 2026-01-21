"""
Molecule repository with advanced search capabilities.

This repository implements the reversed search pattern:
SMILES -> Molecules -> Reactions -> Notebooks (in a single query)
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from src.models import Molecule, Reaction, ReactionRole, Notebook, Part, Synthesis
from src.repositories.base import BaseRepository

logger = logging.getLogger(__name__)


class SearchType(str, Enum):
    """Types of molecule search."""
    EXACT = "exact"
    SUBSTRUCTURE = "substructure"
    SIMILARITY = "similarity"


@dataclass
class NotebookSearchResult:
    """
    Search result containing notebook with related molecules and reactions.
    """
    notebook: Notebook
    matched_smiles: list[str] = field(default_factory=list)
    reaction_ids: list[UUID] = field(default_factory=list)
    molecule_roles: list[tuple[str, str]] = field(default_factory=list)  # (smiles, role)


class MoleculeRepository(BaseRepository[Molecule]):
    """
    Repository for molecule operations with advanced search.
    """
    
    def __init__(self, session: Session):
        """Initialize with Molecule model."""
        super().__init__(Molecule, session)
    
    def get_by_smiles(self, smiles: str) -> Molecule | None:
        """Find a molecule by exact SMILES match."""
        stmt = select(Molecule).where(Molecule.canonical_smiles == smiles)
        return self.session.scalar(stmt)
    
    def search_notebooks_by_smiles(
        self,
        query_smiles: str,
        search_type: SearchType = SearchType.EXACT,
        limit: int = 100,
    ) -> list[NotebookSearchResult]:
        """
        Find notebooks containing matching molecules in a single query.
        
        Performs the complete reversed search:
        SMILES -> Molecules -> ReactionRoles -> Reactions -> Parts -> Syntheses -> Notebooks
        
        Args:
            query_smiles: SMILES string to search for
            search_type: Type of molecule matching (exact/substructure/similarity)
            limit: Maximum number of notebooks to return
            
        Returns:
            List of notebooks with matched molecules and reaction info
        """
        logger.info(f"Searching notebooks for SMILES: {query_smiles[:50]}...")
        
        if search_type == SearchType.EXACT:
            return self._search_exact(query_smiles, limit)
        elif search_type == SearchType.SUBSTRUCTURE:
            return self._search_substructure(query_smiles, limit)
        else:
            return self._search_similarity(query_smiles, limit)
    
    def _search_exact(
        self,
        query_smiles: str,
        limit: int,
    ) -> list[NotebookSearchResult]:
        """
        Single query for exact SMILES match -> notebooks.
        
        Uses SQLAlchemy ORM joins to traverse:
        Molecule -> ReactionRole -> Reaction -> Part -> Synthesis -> Notebook
        """
        stmt = (
            select(
                Notebook,
                Molecule.canonical_smiles,
                Reaction.id.label("reaction_id"),
                ReactionRole.role,
            )
            .select_from(Molecule)
            .join(ReactionRole, ReactionRole.molecule_id == Molecule.id)
            .join(Reaction, Reaction.id == ReactionRole.reaction_id)
            .join(Part, Part.id == Reaction.part_id)
            .join(Synthesis, Synthesis.id == Part.synthesis_id)
            .join(Notebook, Notebook.id == Synthesis.notebook_id)
            .where(Molecule.canonical_smiles == query_smiles)
            .limit(limit)
        )
        
        return self._build_results(stmt)
    
    def _search_substructure(
        self,
        query_smiles: str,
        limit: int,
    ) -> list[NotebookSearchResult]:
        """
        Single query for substructure match -> notebooks.
        
        Requires RDKit PostgreSQL extension. Falls back to exact match if unavailable.
        """
        try:
            # RDKit substructure search with full join to notebooks
            stmt = text("""
                SELECT DISTINCT
                    n.id as notebook_id,
                    n.gcs_path,
                    n.title,
                    n.description,
                    n.created_at,
                    n.updated_at,
                    m.canonical_smiles,
                    r.id as reaction_id,
                    rr.role
                FROM molecules m
                JOIN reaction_roles rr ON rr.molecule_id = m.id
                JOIN reactions r ON r.id = rr.reaction_id
                JOIN parts p ON p.id = r.part_id
                JOIN syntheses s ON s.id = p.synthesis_id
                JOIN notebooks n ON n.id = s.notebook_id
                WHERE mol_from_smiles(m.canonical_smiles::cstring) @> mol_from_smiles(:query::cstring)
                LIMIT :limit
            """)
            
            result = self.session.execute(stmt, {"query": query_smiles, "limit": limit})
            return self._build_results_from_raw(result)
            
        except Exception as e:
            logger.warning(f"RDKit substructure search failed, using exact match: {e}")
            return self._search_exact(query_smiles, limit)
    
    def _search_similarity(
        self,
        query_smiles: str,
        limit: int,
        threshold: float = 0.7,
    ) -> list[NotebookSearchResult]:
        """
        Single query for similarity search -> notebooks.
        
        Requires RDKit PostgreSQL extension.
        """
        try:
            stmt = text("""
                SELECT DISTINCT
                    n.id as notebook_id,
                    n.gcs_path,
                    n.title,
                    n.description,
                    n.created_at,
                    n.updated_at,
                    m.canonical_smiles,
                    r.id as reaction_id,
                    rr.role,
                    tanimoto_sml(
                        morganbv_fp(mol_from_smiles(m.canonical_smiles::cstring)),
                        morganbv_fp(mol_from_smiles(:query::cstring))
                    ) as similarity
                FROM molecules m
                JOIN reaction_roles rr ON rr.molecule_id = m.id
                JOIN reactions r ON r.id = rr.reaction_id
                JOIN parts p ON p.id = r.part_id
                JOIN syntheses s ON s.id = p.synthesis_id
                JOIN notebooks n ON n.id = s.notebook_id
                WHERE tanimoto_sml(
                    morganbv_fp(mol_from_smiles(m.canonical_smiles::cstring)),
                    morganbv_fp(mol_from_smiles(:query::cstring))
                ) >= :threshold
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            
            result = self.session.execute(
                stmt, 
                {"query": query_smiles, "threshold": threshold, "limit": limit}
            )
            return self._build_results_from_raw(result)
            
        except Exception as e:
            logger.warning(f"RDKit similarity search failed: {e}")
            return []
    
    def _build_results(self, stmt) -> list[NotebookSearchResult]:
        """Build NotebookSearchResult list from ORM query."""
        rows = self.session.execute(stmt).all()
        
        # Group by notebook
        notebooks_map: dict[UUID, NotebookSearchResult] = {}
        
        for row in rows:
            notebook = row[0]
            smiles = row[1]
            reaction_id = row[2]
            role = row[3]
            
            if notebook.id not in notebooks_map:
                notebooks_map[notebook.id] = NotebookSearchResult(
                    notebook=notebook,
                    matched_smiles=[],
                    reaction_ids=[],
                    molecule_roles=[],
                )
            
            result = notebooks_map[notebook.id]
            
            if smiles not in result.matched_smiles:
                result.matched_smiles.append(smiles)
            if reaction_id not in result.reaction_ids:
                result.reaction_ids.append(reaction_id)
            result.molecule_roles.append((smiles, role))
        
        logger.info(f"Found {len(notebooks_map)} notebooks")
        return list(notebooks_map.values())
    
    def _build_results_from_raw(self, result) -> list[NotebookSearchResult]:
        """Build NotebookSearchResult list from raw SQL result."""
        notebooks_map: dict[UUID, NotebookSearchResult] = {}
        
        for row in result:
            notebook_id = row.notebook_id
            
            if notebook_id not in notebooks_map:
                # Fetch the full notebook object
                notebook = self.session.get(Notebook, notebook_id)
                if not notebook:
                    continue
                    
                notebooks_map[notebook_id] = NotebookSearchResult(
                    notebook=notebook,
                    matched_smiles=[],
                    reaction_ids=[],
                    molecule_roles=[],
                )
            
            result_obj = notebooks_map[notebook_id]
            
            if row.canonical_smiles not in result_obj.matched_smiles:
                result_obj.matched_smiles.append(row.canonical_smiles)
            if row.reaction_id not in result_obj.reaction_ids:
                result_obj.reaction_ids.append(row.reaction_id)
            result_obj.molecule_roles.append((row.canonical_smiles, row.role))
        
        logger.info(f"Found {len(notebooks_map)} notebooks")
        return list(notebooks_map.values())
    
    def search_notebooks_by_multiple_smiles(
        self,
        smiles_list: list[str],
        search_type: SearchType = SearchType.EXACT,
        require_all: bool = False,
        limit: int = 100,
    ) -> list[NotebookSearchResult]:
        """
        Find notebooks containing any/all of the specified molecules.
        
        Uses a single query with IN clause for efficiency.
        
        Args:
            smiles_list: List of SMILES strings to search for
            search_type: Type of molecule matching
            require_all: If True, only return notebooks containing ALL molecules
            limit: Maximum notebooks to return
            
        Returns:
            List of matching notebooks
        """
        if not smiles_list:
            return []
        
        # Single query for multiple SMILES
        stmt = (
            select(
                Notebook,
                Molecule.canonical_smiles,
                Reaction.id.label("reaction_id"),
                ReactionRole.role,
            )
            .select_from(Molecule)
            .join(ReactionRole, ReactionRole.molecule_id == Molecule.id)
            .join(Reaction, Reaction.id == ReactionRole.reaction_id)
            .join(Part, Part.id == Reaction.part_id)
            .join(Synthesis, Synthesis.id == Part.synthesis_id)
            .join(Notebook, Notebook.id == Synthesis.notebook_id)
            .where(Molecule.canonical_smiles.in_(smiles_list))
            .limit(limit)
        )
        
        results = self._build_results(stmt)
        
        if require_all:
            # Filter to notebooks that contain ALL SMILES
            smiles_set = set(smiles_list)
            return [
                r for r in results
                if smiles_set.issubset(set(r.matched_smiles))
            ]
        
        return results
