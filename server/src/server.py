"""
FastAPI server for molecule search application.

This server acts as a middleware between the Next.js frontend and Vertex AI,
handling database filtering and query augmentation before calling Vertex AI.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routes.chat import router as chat_router

app = FastAPI(
    title="Molecule Search API",
    description="Backend API for molecule search with Vertex AI integration",
    version="0.1.0"
)

# Configure CORS for the Next.js frontend
# In production, replace with specific origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

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