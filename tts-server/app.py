"""
Local Text-to-Speech (TTS) Microservice for PocketChef.

Supports:
- English ('en'): Uses quantized Kokoro-82M ONNX (kokoro-v1.0.int8.onnx) with
  expressive character voice ('af_bella'), falling back to Neural edge-tts / macOS say.
- 11 Indian Languages ('hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'as'):
  Uses ai4bharat/IndicF5 locally when Hugging Face access is configured, and
  automatically falls back to fast Neural edge-tts voices.

Run:
  uvicorn app:app --host 0.0.0.0 --port 3002
"""

import io
import os
import subprocess
import tempfile
import threading
import traceback
from contextlib import asynccontextmanager
from typing import Optional

import edge_tts
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

INDIC_LANGUAGES = {"hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as"}
EDGE_VOICE_MAP = {
    "en": "en-IN-NeerjaExpressiveNeural",
    "hi": "hi-IN-SwaraNeural",
    "bn": "bn-IN-TanishaaNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "mr": "mr-IN-AarohiNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "pa": "pa-IN-OjasNeural",
    "or": "hi-IN-SwaraNeural",
    "as": "bn-IN-TanishaaNeural",
}

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")
KOKORO_MODEL_PATH = os.path.join(MODELS_DIR, "kokoro-v1.0.int8.onnx")
KOKORO_VOICES_PATH = os.path.join(MODELS_DIR, "voices-v1.0.bin")
KOKORO_DEFAULT_VOICE = os.environ.get("KOKORO_VOICE", "af_bella")

REF_DIR = os.path.join(BASE_DIR, "reference_audio")
DEFAULT_REF_WAV = os.path.join(REF_DIR, "default_ref.wav")
DEFAULT_REF_TEXT = "नमस्ते, आज हम स्वादिष्ट भारतीय खाना बनाएंगे।"

_kokoro_model = None
_kokoro_lock = threading.Lock()
_indicf5_model = None
_indicf5_loading = False
_indicf5_unavailable_reason = None
_indicf5_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    # Preload lightweight Kokoro int8 ONNX for English, and IndicF5 in background.
    threading.Thread(target=try_preload_kokoro, daemon=True).start()
    if os.environ.get("PRELOAD_INDICF5", "1") == "1":
        threading.Thread(target=try_preload_indicf5, daemon=True).start()
    yield


app = FastAPI(title="PocketChef Local TTS Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpeakRequest(BaseModel):
    text: str
    language: str = "en"
    voice: Optional[str] = None
    ref_audio_path: Optional[str] = None
    ref_text: Optional[str] = None


def try_preload_kokoro():
    try:
        get_kokoro_model()
    except Exception:
        pass


def get_kokoro_model():
    global _kokoro_model
    if _kokoro_model is not None:
        return _kokoro_model
    if not (os.path.exists(KOKORO_MODEL_PATH) and os.path.exists(KOKORO_VOICES_PATH)):
        return None
    with _kokoro_lock:
        if _kokoro_model is not None:
            return _kokoro_model
        try:
            from kokoro_onnx import Kokoro

            print("[TTS] Loading Kokoro int8 ONNX for expressive English speech...")
            _kokoro_model = Kokoro(KOKORO_MODEL_PATH, KOKORO_VOICES_PATH)
            print("[TTS] Kokoro int8 ONNX ready!")
            return _kokoro_model
        except Exception as err:
            print(f"[TTS] Kokoro ONNX unavailable ({err}), will use fallback.")
            return None


def synthesize_english_kokoro(text: str, voice: Optional[str] = None) -> bytes:
    kokoro = get_kokoro_model()
    if kokoro is None:
        raise RuntimeError("Kokoro ONNX model files not found")
    chosen_voice = voice or KOKORO_DEFAULT_VOICE
    samples, sample_rate = kokoro.create(
        text, voice=chosen_voice, speed=0.98, lang="en-us"
    )
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV")
    return buf.getvalue()


def ensure_default_reference_wav():
    """Creates a clean fallback reference wav via macOS 'say' if user hasn't added one yet."""
    if os.path.exists(DEFAULT_REF_WAV) and os.path.getsize(DEFAULT_REF_WAV) > 4500:
        return DEFAULT_REF_WAV
    os.makedirs(REF_DIR, exist_ok=True)
    for args in [
        ["say", "-v", "Lekha", "-o", DEFAULT_REF_WAV, "--file-format=WAVE", "--data-format=LEI16@24000", "Namaste, aaj hum swadisht khana banayenge."],
        ["say", "-v", "Samantha", "-o", DEFAULT_REF_WAV, "--file-format=WAVE", "--data-format=LEI16@24000", "Hello, today we will cook a delicious Indian meal."],
        ["say", "-o", DEFAULT_REF_WAV, "--file-format=WAVE", "--data-format=LEI16@24000", "Hello, today we will cook a delicious Indian meal."],
    ]:
        try:
            subprocess.run(args, check=True, capture_output=True)
            if os.path.exists(DEFAULT_REF_WAV) and os.path.getsize(DEFAULT_REF_WAV) > 4500:
                return DEFAULT_REF_WAV
        except Exception:
            continue
    return DEFAULT_REF_WAV


def try_preload_indicf5():
    try:
        get_indicf5_model()
    except Exception:
        pass


def get_indicf5_model():
    global _indicf5_model, _indicf5_loading, _indicf5_unavailable_reason
    if _indicf5_model is not None:
        return _indicf5_model
    if _indicf5_unavailable_reason is not None:
        return None
    with _indicf5_lock:
        if _indicf5_model is not None:
            return _indicf5_model
        if _indicf5_unavailable_reason is not None:
            return None
        _indicf5_loading = True
        try:
            from transformers import AutoModel

            print("Preloading ai4bharat/IndicF5 into memory...")
            ensure_default_reference_wav()
            _indicf5_model = AutoModel.from_pretrained(
                "ai4bharat/IndicF5", trust_remote_code=True
            )
            print("IndicF5 loaded and warm! Ready for instant TTS requests.")
            return _indicf5_model
        except Exception as err:
            msg = str(err)
            if "gated repo" in msg.lower() or "401" in msg or "restricted" in msg.lower():
                _indicf5_unavailable_reason = "gated_repo_no_hf_auth"
                print(
                    "[TTS] ai4bharat/IndicF5 requires Hugging Face login/access. "
                    "Using fast Neural edge-tts voices for Indian languages in the meantime."
                )
            else:
                _indicf5_unavailable_reason = msg
                print(f"[TTS] IndicF5 unavailable ({msg}). Using Neural edge-tts fallback.")
            return None
        finally:
            _indicf5_loading = False


def synthesize_english_macos(text: str) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        for voice_args in [["-v", "Samantha"], []]:
            try:
                subprocess.run(
                    ["say", *voice_args, "-o", tmp_path, "--file-format=WAVE", "--data-format=LEI16@22050", text],
                    check=True,
                    capture_output=True,
                )
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 4500:
                    with open(tmp_path, "rb") as f:
                        return f.read()
            except Exception:
                continue
        raise RuntimeError("macOS say produced empty audio")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


async def synthesize_with_edge_tts(text: str, lang: str) -> bytes:
    voice = EDGE_VOICE_MAP.get(lang, "en-IN-NeerjaNeural")
    try:
        communicate = edge_tts.Communicate(text, voice)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        audio_bytes = b"".join(chunks)
        if audio_bytes:
            return audio_bytes
    except Exception:
        if lang == "en":
            # Fallback to standard en-IN-NeerjaNeural if expressive voice fails
            communicate = edge_tts.Communicate(text, "en-IN-NeerjaNeural")
            chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
            audio_bytes = b"".join(chunks)
            if audio_bytes:
                return audio_bytes
        raise
    raise RuntimeError(f"edge-tts returned empty audio for voice {voice}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "kokoroLoaded": _kokoro_model is not None,
        "indicModelLoaded": _indicf5_model is not None,
        "indicModelLoading": _indicf5_loading,
        "supportedLanguages": ["en"] + sorted(INDIC_LANGUAGES),
    }


@app.post("/speak")
async def speak(req: SpeakRequest):
    text = (req.text or "").strip()
    lang = (req.language or "en").strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    # English: Expressive Kokoro-82M int8 ONNX first, then edge-tts, then macOS say
    if lang == "en":
        try:
            wav_bytes = synthesize_english_kokoro(text, voice=req.voice)
            return Response(content=wav_bytes, media_type="audio/wav")
        except Exception:
            try:
                mp3_bytes = await synthesize_with_edge_tts(text, "en")
                return Response(content=mp3_bytes, media_type="audio/mpeg")
            except Exception:
                try:
                    wav_bytes = synthesize_english_macos(text)
                    return Response(content=wav_bytes, media_type="audio/wav")
                except Exception as err:
                    traceback.print_exc()
                    raise HTTPException(status_code=500, detail=f"English TTS failed: {err}")

    if lang not in INDIC_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Supported: en, {', '.join(sorted(INDIC_LANGUAGES))}",
        )

    # Indian languages: IndicF5 if authenticated & loaded, otherwise Neural edge-tts
    model = get_indicf5_model()
    if model is not None:
        try:
            ref_wav = req.ref_audio_path or ensure_default_reference_wav()
            ref_txt = req.ref_text or DEFAULT_REF_TEXT

            audio = model(
                text,
                ref_audio_path=ref_wav,
                ref_text=ref_txt,
            )

            if hasattr(audio, "dtype") and audio.dtype == np.int16:
                audio = audio.astype(np.float32) / 32768.0

            buf = io.BytesIO()
            sf.write(buf, audio, samplerate=24000, format="WAV")
            return Response(content=buf.getvalue(), media_type="audio/wav")
        except Exception as err:
            print(f"[TTS] IndicF5 inference error ({err}), falling back to edge-tts...")

    try:
        mp3_bytes = await synthesize_with_edge_tts(text, lang)
        return Response(content=mp3_bytes, media_type="audio/mpeg")
    except Exception as err:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {err}")
