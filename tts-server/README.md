# Ayamaa Local TTS Server (`ai4bharat/IndicF5`)

Runs locally on your Mac (port `3002`) to provide natural Indian-language speech synthesis for recipe step-by-step dictation.

## Setup (One-Time)

```bash
cd tts-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> **Note:** On the first Indian-language request, `ai4bharat/IndicF5` will download its weights from Hugging Face (`huggingface-cli login` may be required if the repo asks for gated access).

## Custom Voice Cloning (Optional)

Drop a 3–10 second clear `.wav` recording of your preferred voice at:
`tts-server/reference_audio/default_ref.wav`

If none is provided, the server automatically generates a fallback reference clip using macOS `say`.

## Run

```bash
cd tts-server
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 3002
```

Your Node.js backend (`http://192.168.1.3:3001`) automatically connects to `http://127.0.0.1:3002` when this server is running, and falls back to on-device iPhone speech (`expo-speech`) if it is offline.
