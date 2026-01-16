"""
FastAPI server for molecule search application.

This server acts as a middleware between the Next.js frontend and Vertex AI,
handling database filtering and query augmentation before calling Vertex AI.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import init_db, close_db
from src.routes.chat import router as chat_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for the application,
    including database connection management.
    """
    # Startup
    logger.info("Starting up Molecule Search API...")
    
    try:
        init_db()
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        if ENVIRONMENT == "production":
            raise
        logger.warning("Continuing without database connection (development mode)")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Molecule Search API...")
    close_db()
    logger.info("Database connection pool closed")


app = FastAPI(
    title="Molecule Search API",
    description="Backend API for molecule search with Vertex AI integration",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/chat", tags=["chat"])


@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "healthy"}