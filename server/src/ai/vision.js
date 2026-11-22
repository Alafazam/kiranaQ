// Count items in shelf photos. Default provider Sarvam gemma4, option Claude (VISION_PROVIDER).
import { CLAUDE_VISION_MODEL, SARVAM_VISION_MODEL, VISION_PROVIDER } from '../core/config.js';
import { askModel, codedError } from './chat.js';
import { extractJson } from './validate.js';

export function visionModel(provider = VISION_PROVIDER) {
  return provider === 'claude' ? CLAUDE_VISION_MODEL : SARVAM_VISION_MODEL;
}

export function catalogLines(catalog) {
  return catalog
    .filter((it) => it.active !== false)
    .map((it) => `${it.id} | ${it.name_en} | ${it.name_hi} | pack of ${it.pack_size} ${it.unit}`)
    .join('\n');
}

export function buildVisionPrompt(catalog, imageCount) {
  return [
    `You count stock on a kirana (Indian grocery) shelf. ${imageCount} photo(s) are attached; they show the same shop.`,
    'Catalog (id | English name | Hindi name | pack):',
    catalogLines(catalog),
    'Rules:',
    '- Report only catalog items you can really see. Never invent items. Use the catalog id exactly.',
    '- count = number of individual units (packets, bottles, boxes) visible, as a whole number. Be rough but honest.',
    '- Skip loose goods that are not in packs (for example grain in a bin).',
    '- confidence is 0 to 1: how sure you are the item and count are right.',
    'Answer with ONLY a JSON array, no other text: [{"item_id": 1, "count": 12, "confidence": 0.8}]',
    'If no catalog item is visible answer [].',
  ].join('\n');
}

/**
 * ai.countItems: raw model answer, not validated.
 * @param {Array<{buffer: Buffer, mimeType: string}>} images
 * @returns {Promise<{items: Array}>}
 */
export async function countItems(images, catalog, { provider = VISION_PROVIDER } = {}) {
  const text = await askModel({ provider, model: visionModel(provider), prompt: buildVisionPrompt(catalog, images.length), images });
  const json = extractJson(text);
  const rows = Array.isArray(json) ? json : json?.items;
  if (!Array.isArray(rows)) throw codedError('bad_json', 'vision answer was not a JSON list');
  return { items: rows };
}
