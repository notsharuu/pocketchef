# Agent State

## 1. Active Slice & Status
- **Active Slice**: Slice 6 — PocketChef Rebrand + Estimated Calories & Macro Nutrition + TTS Hardening
- **Status**: COMPLETE (Rebranded UI/API to PocketChef without renaming files, added IFCT-inspired per-serving calorie/protein/carbs/fat estimation, fixed IndicF5 gated fallback + iOS audio playback)

## 2. Files Created or Modified
- `backend/src/services/nutrition.js` (IFCT-inspired Indian ingredient nutrition estimator returning per-serving `calories`, `proteinGrams`, `carbsGrams`, `fatGrams`)
- `backend/src/services/vectorDb.js` (Attached `nutrition` object to every Vector DB recipe result)
- `backend/src/services/recipe.js` (Rebranded prompt to PocketChef + attached `nutrition` to Gemini fallback recipes)
- `backend/src/services/gemini.js`, `backend/src/index.js`, `backend/package.json` (Rebranded to PocketChef)
- `backend/src/services/tts.js`, `backend/src/routes/tts.js` (Forwarded `Content-Type` and added HTTP `Range` support for iOS `AVPlayer`)
- `backend/tests/recipe.test.js` (Added assertions for `nutrition` fields)
- `tts-server/app.py`, `tts-server/requirements.txt` (Added `edge-tts` neural fallback for all 11 Indian languages + English, clean gated-repo handling, PocketChef title)
- `frontend/app.json` (Updated app name/slug and iOS permissions to PocketChef)
- `frontend/App.js` (Rebranded to PocketChef, polished prototype labels, added per-serving nutrition summary & macro box on recipe cards, enabled `playsInSilentMode` + `useAudioPlayerStatus` for iPhone TTS playback)
- `AGENT_STATE.md` (Updated)

## 3. Verification Status
- `npm test --prefix /Users/notsharuu/coding/Ayamaa/backend`: 37/37 tests passing across 7 suites.
- `node --check /Users/notsharuu/coding/Ayamaa/frontend/App.js`: Passed.
- `python3 -m py_compile /Users/notsharuu/coding/Ayamaa/tts-server/app.py`: Passed.

## 4. Planned Next Steps
1. User to start all 3 servers (`tts-server`, `backend`, `frontend`) and test TTS + PocketChef UI end-to-end on iPhone.
