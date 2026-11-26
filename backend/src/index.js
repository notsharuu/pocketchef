import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { warmupVectorDb } from './services/vectorDb.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`[PocketChef Backend] Server running on http://localhost:${PORT}`);
  console.log(`[PocketChef Backend] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[PocketChef Backend] Gemini model: ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}`);
  console.log(`[PocketChef Backend] Gemini API Key configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
  warmupVectorDb();
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[PocketChef Backend] Received ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
  });
}
