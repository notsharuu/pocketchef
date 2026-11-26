#!/usr/bin/env node
/**
 * Builds a single unified Vector Database from backend/data/recipes_catalog.json
 * using local neural embeddings (@huggingface/transformers, Xenova/all-MiniLM-L6-v2, 384-dim).
 *
 * 100% local & offline after initial model download — zero API quota used!
 *
 * Outputs:
 * - backend/data/recipes_vectors.bin (L2-normalized Float32Array, N x 384)
 * - backend/data/recipes_meta.json (Metadata + recipe details for all 7,413 dishes)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');

const CATALOG_PATH = path.join(BACKEND_DIR, 'data', 'recipes_catalog.json');
const VECTORS_BIN_PATH = path.join(BACKEND_DIR, 'data', 'recipes_vectors.bin');
const META_JSON_PATH = path.join(BACKEND_DIR, 'data', 'recipes_meta.json');

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
const DIMENSIONS = 384;
const BATCH_SIZE = 64;

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Error: Catalog not found at ${CATALOG_PATH}. Run ingest_datasets.py first.`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`Loaded ${catalog.length} recipes from catalog.`);
  console.log(`Loading local embedding model (${EMBED_MODEL})...`);

  const extractor = await pipeline('feature-extraction', EMBED_MODEL, {
    dtype: 'fp32',
  });

  const flatVectors = new Float32Array(catalog.length * DIMENSIONS);
  const metaItems = [];
  const totalBatches = Math.ceil(catalog.length / BATCH_SIZE);
  const startTime = Date.now();

  for (let b = 0; b < totalBatches; b++) {
    const startIdx = b * BATCH_SIZE;
    const slice = catalog.slice(startIdx, startIdx + BATCH_SIZE);
    const texts = slice.map((item) => item.searchText || item.title);

    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const data = output.data;

    for (let i = 0; i < slice.length; i++) {
      const vecOffset = i * DIMENSIONS;
      const targetOffset = (startIdx + i) * DIMENSIONS;
      flatVectors.set(data.subarray(vecOffset, vecOffset + DIMENSIONS), targetOffset);

      const { searchText, ...meta } = slice[i];
      metaItems.push(meta);
    }

    if ((b + 1) % 10 === 0 || b + 1 === totalBatches) {
      const done = Math.min(catalog.length, (b + 1) * BATCH_SIZE);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Progress: ${done}/${catalog.length} (${Math.round((done / catalog.length) * 100)}%) - ${elapsedSec}s`);
    }
  }

  fs.writeFileSync(VECTORS_BIN_PATH, Buffer.from(flatVectors.buffer));
  fs.writeFileSync(
    META_JSON_PATH,
    JSON.stringify({
      model: EMBED_MODEL,
      dimensions: DIMENSIONS,
      count: metaItems.length,
      createdAt: new Date().toISOString(),
      items: metaItems,
    })
  );

  const binSizeMb = (fs.statSync(VECTORS_BIN_PATH).size / (1024 * 1024)).toFixed(2);
  const metaSizeMb = (fs.statSync(META_JSON_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`\nVector DB build complete!`);
  console.log(`- Vectors binary: ${VECTORS_BIN_PATH} (${binSizeMb} MB)`);
  console.log(`- Metadata index: ${META_JSON_PATH} (${metaSizeMb} MB)`);
}

main().catch((err) => {
  console.error('Vector DB build failed:', err);
  process.exit(1);
});
