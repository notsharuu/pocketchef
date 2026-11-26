import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import scanRouter from './routes/scan.js';
import recipeRouter from './routes/recipe.js';
import ttsRouter from './routes/tts.js';

const app = express();
app.disable('x-powered-by');

// Middlewares
app.use(cors());

// Configure JSON parser with 25MB limit to support base64 images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount health and API routes
app.use(healthRouter);
app.use('/api', scanRouter);
app.use('/api', recipeRouter);
app.use('/api', ttsRouter);

// 404 Not Found Handler
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  // Handle payload too large error from express.json
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image payload too large. Maximum supported size is 25MB.' });
  }

  // Handle invalid JSON syntax in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload in request body' });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  return res.status(statusCode).json({ error: message });
});

export default app;
