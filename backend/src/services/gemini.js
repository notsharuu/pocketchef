import { GoogleGenAI, Type } from '@google/genai';

const SYSTEM_PROMPT = `You are an expert kitchen vision assistant for PocketChef, specialized in Indian households, refrigerators, pantries, and grocery items.
Analyze the provided image and identify all visible food items, fresh produce, spices, dairy, condiments, packaging, and kitchen storage containers.

INDIAN INGREDIENTS & VEGETABLE KNOWLEDGE:
- Vegetables & Fresh Produce:
  - Gourds & Cucurbits: lauki (bottle gourd / doodhi), tori (ridge gourd / turai), karela (bitter gourd), tindora (ivy gourd / dondakaya), parwal (pointed gourd), kundru, chichinda (snake gourd), ash gourd (petha), kheera (cucumber).
  - Leafy Greens: methi (fenugreek leaves), palak (spinach), coriander (dhania / kothmir), curry leaves (kadi patta), mint (pudina), sarson (mustard greens), bathua.
  - Pods & Beans: bhindi (okra / ladyfinger), gavar (cluster beans), french bean, sem (broad beans), drumstick (moringa / sahjan), green pea (matar).
  - Roots & Tubers: potato (aloo), onion (pyaaz), ginger (adrak), garlic (lahsun), arbi (colocasia / taro), beetroot (chukandar), carrot (gajar), radish (mooli), sweet potato (shakarkand).
  - Nightshades & Everyday Staples: tomato (tamatar), green chilli (hari mirch), capsicum (shimla mirch), brinjal (baingan / eggplant), lemon (nimbu), raw mango (kacchi keri), cabbage (patta gobhi), cauliflower (phool gobhi), coconut (nariyal).
- Dairy & Pantry Staples:
  - paneer, curd (dahi), ghee, butter (makhan), malai, chaas (buttermilk), tofu.
  - Pouch & Packet Goods: milk pouch (e.g. Amul Taaza/Gold, Mother Dairy, Nandini), idli/dosa batter pouch (e.g. ID Fresh), curd pouch/tub, paneer block.
  - Condiments & Sauces: ginger-garlic paste, green chutney, tamarind paste (imli), pickle/achar jars, tomato ketchup.

PLASTIC WRAPPERS, BAGS & PACKAGING IN INDIAN FRIDGES:
- Produce is frequently stored in translucent plastic bags, knotted polythene covers, rubber-banded vegetable bags, or ziplocks:
  - If produce is identifiable through translucent/perforated plastic (e.g. leafy greens in perforated bag, green chillies or lemons in thin polybag), detect the item and mark status as "seen" (if clearly distinct) or "maybe" (if slightly obscured by glare/creases).
  - If a plastic bag or wrapper is opaque, heavily fogged with condensation, or tightly bundled such that the exact contents cannot be verified, DO NOT guess in "items". Instead, add a specific observation in "notes" (e.g., "Tied translucent bag in crisper drawer (appears to hold green chillies or herbs - needs verification)").

CLOSED STEEL & OPAQUE CONTAINERS IN INDIAN KITCHENS:
- Indian refrigerators frequently store food in traditional stainless steel containers:
  - Steel dabba / steel box (round or rectangular storage boxes with stainless steel lids).
  - Steel pateela / degchi / milk pot (often covered with a lid or small plate, typically holding boiled milk, boiled potatoes, or cooked rice/dal).
  - Steel katori / bowl covered with a small stainless steel plate or saucer (typically holding leftover dal, sabzi, chutney, or set curd/dahi).
  - Multi-tier stainless steel tiffin dabba.
- STRICT RULE FOR CLOSED CONTAINERS: Since the contents of closed/covered stainless steel containers cannot be seen directly, DO NOT guess their contents in the "items" array.
- INSTEAD, record detailed observations in the "notes" array specifying the container type, shelf position, and household context (e.g., "Closed round stainless steel dabba on top shelf (unverified contents; typically holds curd, kneaded atta dough, or leftover sabzi)", "Covered stainless steel pateela on middle shelf (likely boiled milk or cooked dish)", "Stainless steel bowl covered with plate in door/shelf").

WHAT CAN BE DONE WITH IT (CULINARY POTENTIAL IN NOTES):
- Include a high-level summary note assessing what dishes or meal combinations can be prepared from the detected ingredients (e.g. "Available ingredients (tomato, onion, paneer, green chilli) can make paneer bhurji, curry, or paratha stuffing").

NAMING & NORMALIZATION RULES:
1. Status Classification:
   - "seen": The food item or ingredient is clearly visible, identifiable, and unambiguous.
   - "maybe": The item is partially blocked, in shadow, inside a semi-transparent plastic bag, blurry, or uncertain.
2. Item Normalization:
   - Normalize ingredient names to clean, singular, lowercase strings.
   - Use standard Indian culinary names (e.g. "paneer" instead of "cottage cheese", "curd" instead of "yogurt", "coriander" instead of "cilantro", "bhindi" instead of "okra", "capsicum" instead of "bell pepper", "green chilli" instead of "chili pepper").
3. Weights, Freshness, and Safety:
   - Never estimate exact weights, freshness, shelf life, or food safety.
4. Schema:
   - Return valid JSON matching the exact schema with "items" array and "notes" array.`;

/**
 * Calls Gemini vision model to analyze fridge contents.
 * Supports a single image or an array of multiple shelf/fridge photos.
 *
 * @param {Object|Array} input
 * @param {string} [input.cleanBase64]
 * @param {string} [input.mimeType]
 * @param {Array<{ cleanBase64: string, mimeType: string }>} [input.images]
 * @returns {Promise<{ items: Array<{ name: string, status: 'seen' | 'maybe' }>, notes: string[] }>}
 */
export async function scanFridgeWithGemini(input) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    const error = new Error('GEMINI_API_KEY is not configured on the server. Please set it in your .env file.');
    error.status = 500;
    throw error;
  }

  const imageList = Array.isArray(input)
    ? input
    : Array.isArray(input?.images)
    ? input.images
    : input?.cleanBase64
    ? [input]
    : [];

  if (imageList.length === 0) {
    const error = new Error('No valid image data provided for scanning');
    error.status = 400;
    throw error;
  }

  const imageParts = imageList.map((img) => ({
    inlineData: {
      mimeType: img.mimeType || 'image/jpeg',
      data: img.cleanBase64,
    },
  }));

  const promptText =
    imageList.length > 1
      ? `${SYSTEM_PROMPT}\n\nIMPORTANT: You have been provided with ${imageList.length} photos covering different shelves, crisper drawers, or door racks of a refrigerator. Analyze all photos together as a single whole-fridge inventory, deduplicating identical ingredients visible across multiple shots.`
      : SYSTEM_PROMPT;

  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const candidateModels = Array.from(new Set([
    primaryModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ]));

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (initErr) {
    const error = new Error(`Failed to initialize Gemini client: ${initErr.message}`);
    error.status = 500;
    throw error;
  }

  let response = null;
  let lastError = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    let attempt = 0;
    const maxAttemptsForModel = 2; // Try current model up to 2 times before switching

    while (attempt < maxAttemptsForModel) {
      attempt++;
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            { text: promptText },
            ...imageParts,
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  description: 'List of detected food items and ingredients',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: {
                        type: Type.STRING,
                        description: 'Normalized ingredient name in clean, singular, lowercase format (e.g. potato, tomato)',
                      },
                      status: {
                        type: Type.STRING,
                        description: "'seen' if clearly visible; 'maybe' if partially blocked, blurry, or uncertain",
                        enum: ['seen', 'maybe'],
                      },
                    },
                    required: ['name', 'status'],
                  },
                },
                notes: {
                  type: Type.ARRAY,
                  description: 'Observations regarding closed containers, sealed boxes, or obscured areas',
                  items: {
                    type: Type.STRING,
                  },
                },
              },
              required: ['items', 'notes'],
            },
          },
        });

        if (response && response.text) {
          break; // Successfully got response
        }
      } catch (apiErr) {
        lastError = apiErr;
        const errMsg = apiErr.message || '';
        const isTransient =
          apiErr.status === 503 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand') ||
          errMsg.includes('UNAVAILABLE') ||
          apiErr.status === 429 ||
          errMsg.includes('429');

        if (isTransient) {
          if (attempt < maxAttemptsForModel) {
            // Wait 1.5s and retry same model
            console.warn(`[Gemini] Model ${model} is experiencing a transient demand spike (503). Retrying in 1.5s...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          } else if (i < candidateModels.length - 1) {
            // Fall back to next model
            console.warn(`[Gemini] Model ${model} busy. Seamlessly falling back to ${candidateModels[i + 1]}...`);
            await new Promise((r) => setTimeout(r, 800));
            break;
          }
        }

        // Non-transient error or exhausted all models
        break;
      }
    }

    if (response && response.text) {
      break;
    }
  }

  if (!response || !response.text) {
    const error = new Error(`Gemini API call failed: ${lastError?.message || 'Upstream service error'}`);
    error.status = 502;
    throw error;
  }

  const responseText = response?.text;
  if (!responseText || typeof responseText !== 'string' || responseText.trim() === '') {
    const error = new Error('Gemini vision model returned an empty response');
    error.status = 502;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch (parseErr) {
    const error = new Error(`Failed to parse vision model response as JSON: ${parseErr.message}`);
    error.status = 502;
    throw error;
  }

  if (!parsed || typeof parsed !== 'object') {
    const error = new Error('Vision model returned an invalid payload structure');
    error.status = 502;
    throw error;
  }

  return normalizeScanResult(parsed);
}

/**
 * Normalizes and validates the raw JSON result from the vision model.
 *
 * @param {Object} parsed
 * @returns {{ items: Array<{ name: string, status: 'seen' | 'maybe' }>, notes: string[] }}
 */
export function normalizeScanResult(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    const error = new Error('Vision model returned an invalid payload structure');
    error.status = 502;
    throw error;
  }

  // Defensively validate and normalize response to ensure contract compliance
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const normalizedItems = rawItems
    .filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '')
    .map((item) => ({
      name: item.name.trim().toLowerCase(),
      status: item.status === 'seen' ? 'seen' : 'maybe',
    }));

  const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
  const normalizedNotes = rawNotes
    .filter((note) => typeof note === 'string' && note.trim() !== '')
    .map((note) => note.trim());

  return {
    items: normalizedItems,
    notes: normalizedNotes,
  };
}
