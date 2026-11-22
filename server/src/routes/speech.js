// Model routes: POST /api/tts, /api/stt, /api/vision, /api/parse. All model calls go through the injected `ai`.
import express from 'express';
import multer from 'multer';
import { MAX_AUDIO_BYTES, MAX_COUNT, MAX_IMAGE_BYTES, MAX_IMAGES, MAX_MODEL_CALLS_PER_HOUR, MAX_STT_KEYTERMS, MAX_TTS_CHARS } from '../core/config.js';
import { logAiCall, countCallsSince } from '../repo/aiCalls.js';
import { listItems } from '../repo/items.js';
import { validateAssist, validateParse, validateVision } from '../ai/validate.js';
import { ASSIST_ASK_AGAIN } from '../ai/assist.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MS_PER_HOUR = 3600 * 1000;
const KEYTERM_MAX_CHARS = 64;
const ASK_AGAIN = 'Please say it again';
const MAX_TEXT_CHARS = 500;
const MAX_DRAFT_ROWS = 100;
const ASSIST_HISTORY_TURNS = 6;
const ASSIST_CONTEXT_MAX_CHARS = 8000;
const ASSIST_SCREENS = new Set(['/', '/log/new', '/log/new/check', '/log/:id/result', '/orders', '/distributors', '/settings']);
const ASSIST_LANGS = new Set(['hi', 'en']);

const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES } });
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_AUDIO_BYTES } });

function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

// Turn multer errors (too big, too many) into 400s with a code.
function runUpload(middleware) {
  return (req, res, next) =>
    middleware(req, res, (err) => {
      if (!err) return next();
      const code = err.code === 'LIMIT_FILE_SIZE' ? 'file_too_large' : 'bad_upload';
      next(httpError(400, code, err.message));
    });
}

/** Up to MAX_STT_KEYTERMS names and aliases from the catalog, to bias speech recognition. */
export function keytermsFromCatalog(catalog) {
  const terms = new Set();
  for (const it of catalog) {
    for (const t of [it.name_en, it.name_hi, ...it.aliases]) {
      if (typeof t === 'string' && t.trim() && t.length <= KEYTERM_MAX_CHARS) terms.add(t.trim());
    }
  }
  return [...terms].slice(0, MAX_STT_KEYTERMS);
}

// `speech` ({speakFn, transcribeFn}) lets a test replace the speech calls only.
export function speechRouter({ db, ai, clock, speakFn, transcribeFn, assistFn }) {
  const router = express.Router();
  const tts = speakFn ?? ((text, opts) => ai.tts(text, opts));
  const assist = assistFn ?? (typeof ai.assist === 'function' ? (input) => ai.assist(input) : null);
  const stt = transcribeFn ?? ((audio, opts) => ai.stt(audio, opts));

  function guardRate(req, _res, next) {
    const since = new Date(new Date(clock.now()).getTime() - MS_PER_HOUR).toISOString();
    if (countCallsSince(db, req.storeId, since) >= MAX_MODEL_CALLS_PER_HOUR) {
      return next(httpError(429, 'rate_limited', 'Too many requests, try again later'));
    }
    next();
  }

  // Runs one model call, writes one ai_call row (no content), and rethrows model errors.
  // `describeKey` picks provider and model; the row's kind must be one of the table's kinds.
  async function tracked(req, kind, fn, describeKey = kind) {
    const info = ai.describe?.(describeKey) ?? { provider: 'injected', model: describeKey };
    const started = Date.now();
    try {
      const out = await fn();
      logAiCall(db, req.storeId, { kind, ...info, ok: true, latency_ms: Date.now() - started }, clock.now());
      return out;
    } catch (err) {
      logAiCall(db, req.storeId, { kind, ...info, ok: false, latency_ms: Date.now() - started, error_code: err.code ?? 'model_error' }, clock.now());
      throw err;
    }
  }

  router.post('/tts', guardRate, async (req, res, next) => {
    try {
      const { text, language } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'bad_request', 'text is required');
      if (text.length > MAX_TTS_CHARS) throw httpError(400, 'text_too_long', `text is over ${MAX_TTS_CHARS} characters`);
      let audio;
      try {
        audio = await tracked(req, 'tts', () => tts(text, language ? { languageCode: language } : {}));
      } catch {
        throw httpError(502, 'tts_failed', 'Text to speech failed');
      }
      res.type('audio/wav').send(audio);
    } catch (err) {
      next(err);
    }
  });

  router.post('/stt', guardRate, runUpload(audioUpload.single('audio')), async (req, res, next) => {
    try {
      if (!req.file) throw httpError(400, 'bad_request', 'audio file is required (form field "audio")');
      const keyterms = keytermsFromCatalog(listItems(db, req.storeId));
      let out;
      try {
        out = await tracked(req, 'stt', () =>
          stt(req.file.buffer, {
            filename: req.file.originalname || 'audio',
            mimeType: req.file.mimetype,
            languageCode: req.body?.language || undefined,
            keyterms,
          }),
        );
      } catch {
        throw httpError(502, 'stt_failed', 'Speech to text failed');
      }
      res.json({ text: out.transcript, transcript: out.transcript, languageCode: out.languageCode });
    } catch (err) {
      next(err);
    }
  });

  router.post('/vision', guardRate, runUpload(imageUpload.array('images', MAX_IMAGES)), async (req, res, next) => {
    try {
      const files = req.files ?? [];
      if (files.length === 0) throw httpError(400, 'bad_request', 'at least one image is required (form field "images")');
      if (files.some((f) => !IMAGE_TYPES.has(f.mimetype))) throw httpError(400, 'bad_image_type', 'images must be jpeg, png or webp');
      const catalog = listItems(db, req.storeId).filter((it) => it.active);
      const images = files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype }));
      try {
        const raw = await tracked(req, 'vision', () => ai.countItems(images, catalog));
        res.json(validateVision(raw?.items, catalog));
      } catch (err) {
        res.json({ items: [], dropped: 0, error_code: err.code ?? 'model_error' });
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/parse', guardRate, async (req, res, next) => {
    try {
      const { text, lang, draft = [] } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_CHARS) throw httpError(400, 'bad_request', 'text is required');
      if (!Array.isArray(draft) || draft.length > MAX_DRAFT_ROWS) throw httpError(400, 'bad_request', 'draft must be a list');
      const draftOk = draft.every((d) => Number.isInteger(d?.item_id) && Number.isInteger(d?.count) && d.count >= 0 && d.count <= MAX_COUNT);
      if (!draftOk) throw httpError(400, 'bad_request', 'draft rows need item_id and count');
      const catalog = listItems(db, req.storeId).filter((it) => it.active);
      try {
        const raw = await tracked(req, 'parse', () => ai.parseEdits(text, { lang, draft, catalog }));
        res.json(validateParse(raw, catalog));
      } catch {
        res.json({ edits: [], unclear: true, ask: ASK_AGAIN });
      }
    } catch (err) {
      next(err);
    }
  });

  router.post('/assist', guardRate, async (req, res, next) => {
    try {
      const { text, lang, screen, context = {}, history = [] } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_CHARS) throw httpError(400, 'bad_request', 'text is required');
      if (!ASSIST_LANGS.has(lang)) throw httpError(400, 'bad_request', 'lang must be hi or en');
      if (!ASSIST_SCREENS.has(screen)) throw httpError(400, 'bad_request', 'unknown screen');
      if (typeof context !== 'object' || context === null || Array.isArray(context) || JSON.stringify(context).length > ASSIST_CONTEXT_MAX_CHARS) {
        throw httpError(400, 'bad_request', 'context is invalid or too large');
      }
      if (!Array.isArray(history)) throw httpError(400, 'bad_request', 'history must be a list');
      const turns = history
        .filter((h) => (h?.role === 'user' || h?.role === 'assistant') && typeof h.text === 'string')
        .slice(-ASSIST_HISTORY_TURNS)
        .map((h) => ({ role: h.role, text: h.text.slice(0, MAX_TEXT_CHARS) }));
      const catalog = listItems(db, req.storeId).filter((it) => it.active);
      const askAgain = ASSIST_ASK_AGAIN[lang];
      let out = null;
      try {
        if (!assist) throw Object.assign(new Error('no assist'), { code: 'not_implemented' });
        // Logged as kind "parse": the ai_call table has no "assist" kind.
        const raw = await tracked(req, 'parse', () => assist({ text, lang, screen, context, history: turns, catalog }), 'assist');
        out = validateAssist(raw, { catalog, context, askAgain });
      } catch {
        out = null;
      }
      res.json(out ?? { say: askAgain, actions: [], expect: 'answer' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
