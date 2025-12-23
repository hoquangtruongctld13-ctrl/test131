"""
Ditch Speechify - Backend Server

A FastAPI backend that serves the TTS Reader application and handles
file extraction for PDFs and Word documents.

Why pay $139/year for Speechify when you can run this for free?

Features:
    - Serves static files (HTML, CSS, JS)
    - Extracts text from PDF files
    - Extracts text from Word documents (.docx)
    - CORS enabled for local development

Author: Nihal Veeramalla
License: MIT
"""

import io
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import PyPDF2
from docx import Document

# ============================================================================
# App Configuration
# ============================================================================

app = FastAPI(
    title="Ditch Speechify",
    description="Free, open-source TTS reader. Stop paying $139/year for Speechify.",
    version="1.0.0"
)

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory (where this file is located)
BASE_DIR = Path(__file__).resolve().parent

# ============================================================================
# Static File Routes
# ============================================================================

@app.get("/")
async def serve_index():
    """Serve the main application HTML."""
    return FileResponse(BASE_DIR / "index.html")


@app.get("/style.css")
async def serve_css():
    """Serve the stylesheet."""
    return FileResponse(BASE_DIR / "style.css", media_type="text/css")


@app.get("/script.js")
async def serve_js():
    """Serve the JavaScript application."""
    return FileResponse(BASE_DIR / "script.js", media_type="application/javascript")


# ============================================================================
# API Endpoints
# ============================================================================

@app.post("/api/extract-pdf")
async def extract_pdf_text(file: UploadFile = File(...)):
    """
    Extract text content from a PDF file.
    
    Args:
        file: Uploaded PDF file
        
    Returns:
        JSON with extracted text
        
    Raises:
        HTTPException: If file cannot be processed
    """
    try:
        contents = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
        
        # Extract text from all pages
        text_parts = []
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        
        extracted_text = "\n".join(text_parts).strip()
        
        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF. The file might be scanned or image-based."
            )
        
        return {"text": extracted_text}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )


@app.post("/api/extract-docx")
async def extract_docx_text(file: UploadFile = File(...)):
    """
    Extract text content from a Word document (.docx).
    
    Args:
        file: Uploaded Word document
        
    Returns:
        JSON with extracted text
        
    Raises:
        HTTPException: If file cannot be processed
    """
    try:
        contents = await file.read()
        doc = Document(io.BytesIO(contents))
        
        # Extract text from all paragraphs
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        extracted_text = "\n".join(text_parts).strip()
        
        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from document. The file might be empty."
            )
        
        return {"text": extracted_text}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Word document: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": "Ditch Speechify"}


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print()
    print("  🎙️  Ditch Speechify - Free TTS Reader")
    print("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print()
    print("  📍 Open in your browser:")
    print("     http://localhost:8888")
    print()
    print("  💡 Press Ctrl+C to stop the server")
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8888, log_level="info")
