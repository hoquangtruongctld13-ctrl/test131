"""
Ditch Speechify - Backend Server

A FastAPI backend that serves the TTS Reader application and handles
file extraction for PDFs and Word documents.

Why pay $139/year for Speechify when you can run this for free?

Features:
    - Serves static files (HTML, CSS, JS)
    - Extracts text from PDF files
    - Extracts text from Word documents (.docx)
    - Piper TTS integration with voice synthesis and training
    - CORS enabled for local development

Author: Nihal Veeramalla
License: MIT
"""

import io
import os
import json
import wave
import shutil
import subprocess
import tempfile
import threading
import time
import re
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.request import urlopen

from fastapi import FastAPI, File, HTTPException, UploadFile, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import PyPDF2
from docx import Document

# Piper TTS imports (optional - will be available when installed)
try:
    from piper import PiperVoice
    from piper.download_voices import VOICES_JSON, URL_FORMAT, VOICE_PATTERN
    PIPER_AVAILABLE = True
except ImportError:
    PIPER_AVAILABLE = False
    PiperVoice = None

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

# Piper TTS directories
PIPER_VOICES_DIR = BASE_DIR / "piper_voices"
PIPER_TRAINING_DIR = BASE_DIR / "piper_training"
PIPER_OUTPUT_DIR = BASE_DIR / "piper_output"

# Create directories if they don't exist
PIPER_VOICES_DIR.mkdir(exist_ok=True)
PIPER_TRAINING_DIR.mkdir(exist_ok=True)
PIPER_OUTPUT_DIR.mkdir(exist_ok=True)

# Voice cache
_loaded_voices: Dict[str, Any] = {}
_training_status_lock = threading.Lock()
_training_status: Dict[str, Any] = {
    "active": False,
    "progress": 0,
    "status": "idle",
    "log": []
}

# ============================================================================
# Utility functions for security
# ============================================================================

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal attacks."""
    # Remove any path separators and parent directory references
    filename = os.path.basename(filename)
    # Remove any null bytes
    filename = filename.replace('\x00', '')
    # Only allow safe characters
    safe_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-')
    filename = ''.join(c if c in safe_chars else '_' for c in filename)
    return filename

def is_valid_url(url: str) -> bool:
    """Validate URL for checkpoint downloads."""
    # Only allow URLs from trusted sources
    allowed_hosts = [
        'huggingface.co',
        'hf.co',
        'github.com',
        'raw.githubusercontent.com'
    ]
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.scheme in ('http', 'https') and any(
            parsed.netloc.endswith(host) for host in allowed_hosts
        )
    except Exception:
        return False

# ============================================================================
# Pydantic Models for Piper TTS
# ============================================================================

class TTSRequest(BaseModel):
    text: str
    voice: str = "en_US-lessac-medium"
    speaker_id: Optional[int] = None
    length_scale: Optional[float] = 1.0
    noise_scale: Optional[float] = 0.667
    noise_w_scale: Optional[float] = 0.8

class TrainingConfig(BaseModel):
    voice_name: str
    language: str = "en-us"
    sample_rate: int = 22050
    batch_size: int = 32

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


# ============================================================================
# Piper TTS API Endpoints
# ============================================================================

@app.get("/api/piper/status")
async def piper_status():
    """Check if Piper TTS is available."""
    return {
        "available": PIPER_AVAILABLE,
        "voices_dir": str(PIPER_VOICES_DIR),
        "training_dir": str(PIPER_TRAINING_DIR)
    }


@app.get("/api/piper/voices")
async def list_piper_voices():
    """List available Piper voices (both downloaded and available for download)."""
    local_voices = []
    
    # Find locally downloaded voices
    for onnx_file in PIPER_VOICES_DIR.glob("*.onnx"):
        if not onnx_file.name.endswith(".onnx.json"):
            config_file = onnx_file.with_suffix(".onnx.json")
            voice_name = onnx_file.stem
            local_voices.append({
                "name": voice_name,
                "downloaded": True,
                "model_path": str(onnx_file),
                "config_path": str(config_file) if config_file.exists() else None
            })
    
    # Fetch available voices from HuggingFace
    available_voices = []
    try:
        with urlopen(VOICES_JSON) as response:
            voices_dict = json.load(response)
            for voice_key in sorted(voices_dict.keys()):
                voice_info = voices_dict[voice_key]
                is_downloaded = any(v["name"] == voice_key for v in local_voices)
                available_voices.append({
                    "name": voice_key,
                    "downloaded": is_downloaded,
                    "language": voice_info.get("language", {}).get("name_english", "Unknown"),
                    "quality": voice_info.get("quality", "unknown"),
                    "num_speakers": voice_info.get("num_speakers", 1)
                })
    except Exception as e:
        # If we can't fetch remote voices, just return local ones
        pass
    
    return {
        "local_voices": local_voices,
        "available_voices": available_voices
    }


@app.post("/api/piper/download-voice")
async def download_piper_voice(voice_name: str = Form(...)):
    """Download a Piper voice from HuggingFace."""
    voice_match = VOICE_PATTERN.match(voice_name)
    if not voice_match:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice name format. Expected: <language>-<name>-<quality> (e.g., en_US-lessac-medium)"
        )
    
    try:
        lang_family = voice_match.group("lang_family")
        lang_code = lang_family + "_" + voice_match.group("lang_region")
        voice_name_part = voice_match.group("voice_name")
        voice_quality = voice_match.group("voice_quality")
        
        voice_code = f"{lang_code}-{voice_name_part}-{voice_quality}"
        format_args = {
            "lang_family": lang_family,
            "lang_code": lang_code,
            "voice_name": voice_name_part,
            "voice_quality": voice_quality,
        }
        
        # Download model
        model_path = PIPER_VOICES_DIR / f"{voice_code}.onnx"
        model_url = URL_FORMAT.format(extension=".onnx", **format_args)
        with urlopen(model_url) as response:
            with open(model_path, "wb") as model_file:
                shutil.copyfileobj(response, model_file)
        
        # Download config
        config_path = PIPER_VOICES_DIR / f"{voice_code}.onnx.json"
        config_url = URL_FORMAT.format(extension=".onnx.json", **format_args)
        with urlopen(config_url) as response:
            with open(config_path, "wb") as config_file:
                shutil.copyfileobj(response, config_file)
        
        return {"success": True, "voice": voice_code, "path": str(model_path)}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download voice: {str(e)}"
        )


@app.post("/api/piper/synthesize")
async def synthesize_speech(request: TTSRequest):
    """Synthesize speech using Piper TTS."""
    if not PIPER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Piper TTS is not installed. Please install with: pip install piper-tts"
        )
    
    voice_name = request.voice
    model_path = PIPER_VOICES_DIR / f"{voice_name}.onnx"
    
    if not model_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Voice '{voice_name}' not found. Please download it first."
        )
    
    try:
        # Load voice (cache it for performance)
        if voice_name not in _loaded_voices:
            _loaded_voices[voice_name] = PiperVoice.load(str(model_path))
        
        voice = _loaded_voices[voice_name]
        
        # Create synthesis config
        from piper.config import SynthesisConfig
        syn_config = SynthesisConfig(
            speaker_id=request.speaker_id,
            length_scale=request.length_scale,
            noise_scale=request.noise_scale,
            noise_w_scale=request.noise_w_scale
        )
        
        # Synthesize to WAV in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            voice.synthesize_wav(request.text, wav_file, syn_config=syn_config)
        
        wav_buffer.seek(0)
        
        return StreamingResponse(
            wav_buffer,
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=piper_output.wav"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Synthesis failed: {str(e)}"
        )


@app.delete("/api/piper/voice/{voice_name}")
async def delete_piper_voice(voice_name: str):
    """Delete a downloaded voice."""
    model_path = PIPER_VOICES_DIR / f"{voice_name}.onnx"
    config_path = PIPER_VOICES_DIR / f"{voice_name}.onnx.json"
    
    deleted = False
    if model_path.exists():
        model_path.unlink()
        deleted = True
    if config_path.exists():
        config_path.unlink()
        deleted = True
    
    # Remove from cache
    if voice_name in _loaded_voices:
        del _loaded_voices[voice_name]
    
    if deleted:
        return {"success": True, "message": f"Voice '{voice_name}' deleted"}
    else:
        raise HTTPException(status_code=404, detail=f"Voice '{voice_name}' not found")


# ============================================================================
# Piper Training API Endpoints
# ============================================================================

@app.post("/api/piper/training/upload-audio")
async def upload_training_audio(
    files: List[UploadFile] = File(...),
    transcripts: str = Form(...)
):
    """
    Upload audio files for training with their transcripts.
    Expects MP3/WAV files and a JSON string with filename -> transcript mapping.
    """
    try:
        transcript_map = json.loads(transcripts)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid transcript JSON format")
    
    # Create a new training session directory with timestamp
    session_id = f"session_{int(time.time() * 1000)}"
    session_dir = PIPER_TRAINING_DIR / session_id
    audio_dir = session_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    saved_files = []
    csv_entries = []
    
    for file in files:
        original_filename = file.filename
        if not original_filename:
            continue
        
        # Sanitize filename to prevent path traversal
        filename = sanitize_filename(original_filename)
        if not filename:
            continue
        
        # Validate file extension
        if not filename.lower().endswith(('.mp3', '.wav')):
            continue
            
        # Save the file
        file_path = audio_dir / filename
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Convert MP3 to WAV if needed
        wav_path = file_path
        if filename.lower().endswith(".mp3"):
            wav_filename = filename.rsplit(".", 1)[0] + ".wav"
            wav_path = audio_dir / wav_filename
            try:
                from pydub import AudioSegment
                audio = AudioSegment.from_mp3(str(file_path))
                audio = audio.set_frame_rate(22050).set_channels(1)
                audio.export(str(wav_path), format="wav")
                file_path.unlink()  # Remove original MP3
            except Exception:
                # If conversion fails, keep the original
                wav_path = file_path
        
        saved_files.append(str(wav_path.name))
        
        # Add to CSV entries if transcript exists (check both original and sanitized names)
        base_name = filename.rsplit(".", 1)[0]
        original_base = original_filename.rsplit(".", 1)[0] if original_filename else ""
        
        if base_name in transcript_map:
            csv_entries.append(f"{wav_path.name}|{transcript_map[base_name]}")
        elif original_base in transcript_map:
            csv_entries.append(f"{wav_path.name}|{transcript_map[original_base]}")
        elif original_filename in transcript_map:
            csv_entries.append(f"{wav_path.name}|{transcript_map[original_filename]}")
    
    # Write metadata CSV
    csv_path = session_dir / "metadata.csv"
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("\n".join(csv_entries))
    
    return {
        "success": True,
        "session_id": session_id,
        "files_saved": saved_files,
        "csv_entries": len(csv_entries),
        "session_path": str(session_dir)
    }


@app.post("/api/piper/training/start")
async def start_training(
    background_tasks: BackgroundTasks,
    session_id: str = Form(...),
    voice_name: str = Form(...),
    language: str = Form("en-us"),
    sample_rate: int = Form(22050),
    batch_size: int = Form(32),
    checkpoint_url: Optional[str] = Form(None)
):
    """Start voice training in the background."""
    global _training_status
    
    with _training_status_lock:
        if _training_status["active"]:
            raise HTTPException(status_code=409, detail="Training is already in progress")
    
    # Sanitize session_id to prevent path traversal
    safe_session_id = sanitize_filename(session_id)
    session_dir = PIPER_TRAINING_DIR / safe_session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail=f"Session '{safe_session_id}' not found")
    
    csv_path = session_dir / "metadata.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=400, detail="No metadata.csv found in session")
    
    # Validate checkpoint URL if provided
    validated_checkpoint = None
    if checkpoint_url and checkpoint_url.strip():
        if not is_valid_url(checkpoint_url.strip()):
            raise HTTPException(
                status_code=400, 
                detail="Invalid checkpoint URL. Only URLs from huggingface.co and github.com are allowed."
            )
        validated_checkpoint = checkpoint_url.strip()
    
    # Sanitize voice name
    safe_voice_name = sanitize_filename(voice_name) if voice_name else "custom_voice"
    
    audio_dir = session_dir / "audio"
    cache_dir = session_dir / "cache"
    config_path = session_dir / "config.json"
    
    cache_dir.mkdir(exist_ok=True)
    
    with _training_status_lock:
        _training_status = {
            "active": True,
            "progress": 0,
            "status": "initializing",
            "session_id": safe_session_id,
            "voice_name": safe_voice_name,
            "log": ["Training started..."]
        }
    
    # Start training in background
    background_tasks.add_task(
        run_training,
        session_dir=session_dir,
        voice_name=safe_voice_name,
        csv_path=csv_path,
        audio_dir=audio_dir,
        cache_dir=cache_dir,
        config_path=config_path,
        language=language,
        sample_rate=sample_rate,
        batch_size=batch_size,
        checkpoint_url=validated_checkpoint
    )
    
    return {"success": True, "message": "Training started", "session_id": safe_session_id}


def run_training(
    session_dir: Path,
    voice_name: str,
    csv_path: Path,
    audio_dir: Path,
    cache_dir: Path,
    config_path: Path,
    language: str,
    sample_rate: int,
    batch_size: int,
    checkpoint_url: Optional[str]
):
    """Run the actual training process (background task)."""
    global _training_status
    
    try:
        with _training_status_lock:
            _training_status["status"] = "preparing"
            _training_status["log"].append("Preparing training data...")
        
        # Build training command with validated/sanitized inputs
        cmd = [
            "python3", "-m", "piper.train", "fit",
            "--data.voice_name", voice_name,
            "--data.csv_path", str(csv_path),
            "--data.audio_dir", str(audio_dir),
            "--model.sample_rate", str(sample_rate),
            "--data.espeak_voice", language,
            "--data.cache_dir", str(cache_dir),
            "--data.config_path", str(config_path),
            "--data.batch_size", str(batch_size),
            "--trainer.max_epochs", "100",
            "--trainer.default_root_dir", str(session_dir / "checkpoints")
        ]
        
        # Only add checkpoint if it was validated
        if checkpoint_url:
            cmd.extend(["--ckpt_path", checkpoint_url])
        
        with _training_status_lock:
            _training_status["status"] = "training"
            _training_status["log"].append(f"Running: {' '.join(cmd)}")
        
        # Run training with shell=False for security
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=False
        )
        
        while True:
            if process.stdout:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    with _training_status_lock:
                        _training_status["log"].append(line.strip())
                        # Try to parse progress from output
                        if "Epoch" in line:
                            try:
                                epoch_match = re.search(r"Epoch (\d+)", line)
                                if epoch_match:
                                    epoch = int(epoch_match.group(1))
                                    _training_status["progress"] = min(epoch, 100)
                            except Exception:
                                pass
        
        return_code = process.poll()
        
        with _training_status_lock:
            if return_code == 0:
                _training_status["status"] = "completed"
                _training_status["progress"] = 100
                _training_status["log"].append("Training completed successfully!")
            else:
                _training_status["status"] = "failed"
                _training_status["log"].append(f"Training failed with code {return_code}")
            
    except Exception as e:
        with _training_status_lock:
            _training_status["status"] = "error"
            _training_status["log"].append(f"Error: {str(e)}")
    finally:
        with _training_status_lock:
            _training_status["active"] = False


@app.get("/api/piper/training/status")
async def get_training_status():
    """Get current training status."""
    with _training_status_lock:
        return _training_status.copy()


@app.post("/api/piper/training/stop")
async def stop_training():
    """Stop the current training (if running)."""
    global _training_status
    
    with _training_status_lock:
        if not _training_status["active"]:
            return {"success": False, "message": "No training in progress"}
    
    with _training_status_lock:
        _training_status["status"] = "stopping"
        _training_status["log"].append("Training stop requested...")
    # Note: Actual process termination would require storing the process handle
    
    return {"success": True, "message": "Training stop requested"}


@app.get("/api/piper/training/sessions")
async def list_training_sessions():
    """List all training sessions."""
    sessions = []
    for session_dir in PIPER_TRAINING_DIR.iterdir():
        if session_dir.is_dir() and session_dir.name.startswith("session_"):
            csv_path = session_dir / "metadata.csv"
            config_path = session_dir / "config.json"
            checkpoints_dir = session_dir / "checkpoints"
            
            session_info = {
                "session_id": session_dir.name,
                "has_data": csv_path.exists(),
                "has_config": config_path.exists(),
                "has_checkpoints": checkpoints_dir.exists() and any(checkpoints_dir.iterdir()) if checkpoints_dir.exists() else False
            }
            sessions.append(session_info)
    
    return {"sessions": sessions}


@app.post("/api/piper/training/export")
async def export_trained_model(
    session_id: str = Form(...),
    output_name: str = Form(...)
):
    """Export a trained model to ONNX format."""
    session_dir = PIPER_TRAINING_DIR / session_id
    checkpoints_dir = session_dir / "checkpoints"
    
    if not checkpoints_dir.exists():
        raise HTTPException(status_code=404, detail="No checkpoints found for this session")
    
    # Find the latest checkpoint
    checkpoint_files = list(checkpoints_dir.glob("**/*.ckpt"))
    if not checkpoint_files:
        raise HTTPException(status_code=404, detail="No checkpoint files found")
    
    latest_checkpoint = max(checkpoint_files, key=lambda p: p.stat().st_mtime)
    
    # Export to ONNX
    output_path = PIPER_OUTPUT_DIR / f"{output_name}.onnx"
    
    try:
        cmd = [
            "python3", "-m", "piper.train.export_onnx",
            "--checkpoint", str(latest_checkpoint),
            "--output-file", str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Export failed: {result.stderr}"
            )
        
        # Copy config file
        config_path = session_dir / "config.json"
        if config_path.exists():
            output_config = PIPER_OUTPUT_DIR / f"{output_name}.onnx.json"
            shutil.copy(config_path, output_config)
        
        return {
            "success": True,
            "output_path": str(output_path),
            "message": f"Model exported to {output_path}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": "Ditch Speechify", "piper_available": PIPER_AVAILABLE}


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
