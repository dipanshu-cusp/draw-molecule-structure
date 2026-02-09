"""
Notebook API routes for browsing and filtering research notebooks.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, distinct, extract
from sqlalchemy.orm import Session

from src.database import get_db
from src.models import Notebook

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("")
async def list_notebooks(
    author: Optional[str] = Query(None, description="Filter by author name"),
    date_from: Optional[str] = Query(None, description="Filter notebooks created after this date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter notebooks created before this date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    List notebooks with optional filters.
    
    Returns notebooks matching the provided filter criteria.
    """
    stmt = select(Notebook)

    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            Notebook.title.ilike(search_pattern)
            | Notebook.description.ilike(search_pattern)
        )

    # NOTE: The current Notebook model doesn't have an author column.
    # When the model is extended with author metadata, uncomment:
    # if author:
    #     stmt = stmt.where(Notebook.author.ilike(f"%{author}%"))

    if date_from:
        stmt = stmt.where(Notebook.created_at >= date_from)

    if date_to:
        stmt = stmt.where(Notebook.created_at <= date_to)

    stmt = stmt.order_by(Notebook.created_at.desc()).limit(limit)

    notebooks = db.scalars(stmt).all()

    return {
        "notebooks": [
            {
                "id": str(nb.id),
                "title": nb.title or nb.filename,
                "gcsPath": nb.gcs_path,
                "description": nb.description,
                "date": nb.created_at.isoformat() if nb.created_at else None,
                # author and tags will come when the model is extended
                "author": None,
                "tags": [],
            }
            for nb in notebooks
        ]
    }


@router.get("/authors")
async def list_authors(
    db: Session = Depends(get_db),
):
    """
    Return distinct author names for the filter dropdown.
    
    NOTE: Currently returns an empty list because the Notebook model
    does not have an author column. Extend the model and update this
    query when author metadata is available.
    """
    # When author column exists on Notebook:
    # stmt = select(distinct(Notebook.author)).where(Notebook.author.isnot(None))
    # authors = db.scalars(stmt).all()
    # return {"authors": sorted(authors)}
    
    return {"authors": []}
