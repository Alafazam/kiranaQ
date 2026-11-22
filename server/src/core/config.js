// Every tunable number for the rule, the models and the limits (spec R10).
// Logic files import names from here; they hold no numeric literals except 0 and 1.

// Rule (spec "The rule")
export const SAFETY_MARGIN = 1.15;          // multiply need by this
export const STOCKOUT_STEP_UP = 0.25;       // raise observed rate by 25% when count is 0
export const RATE_SMOOTHING = 0.5;          // weight of the new observed rate
export const DEFAULT_CYCLE_DAYS = 7;        // for items with no distributor
export const RESTOCK_MIN_PACKS = 1;         // a rise of at least this many packs means "risen"

// Validation of model output
export const MIN_CONFIDENCE = 0.6;          // parse edits below this make the reply "unclear"
export const MAX_COUNT = 999;               // highest count accepted from vision or voice
export const MAX_STORED_COUNT = 9999;       // DB check limit

// Request limits
export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const MAX_RECORD_SECONDS = 25;       // the web mic stops here; Sarvam REST STT limit is 30 s
export const MAX_TTS_CHARS = 500;           // our cap; Sarvam REST limit is 2,500
export const MODEL_TIMEOUT_MS = 20000;
export const MAX_MODEL_CALLS_PER_HOUR = 200; // public URL cost guard (429 rate_limited)

// Providers and models (env overrides the provider)
export const VISION_PROVIDER = process.env.VISION_PROVIDER ?? 'sarvam';   // sarvam | claude
export const PARSE_PROVIDER = process.env.PARSE_PROVIDER ?? 'sarvam';     // sarvam | claude
export const SARVAM_VISION_MODEL = 'gemma4';
export const SARVAM_PARSE_MODEL = 'sarvam-105b';
export const SARVAM_STT_MODEL = 'saaras:v4';
export const SARVAM_TTS_MODEL = 'bulbul:v3';
export const CLAUDE_VISION_MODEL = 'claude-sonnet-5-5';
export const CLAUDE_PARSE_MODEL = 'claude-haiku-5-5';
export const MAX_STT_KEYTERMS = 50;

// Business clock
export const STORE_TIMEZONE = 'Asia/Kolkata';
export const DEMO_STORE_ID = 1;
