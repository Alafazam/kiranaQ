// Speech routes: POST /api/tts (text -> WAV) and POST /api/stt (audio -> text).
import express from 'express';
import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../config.js';
import { speak, transcribe, TTS_MAX_CHARS } from '../ai/sarvam.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

// The model calls are injectable so tests do not call Sarvam.
export function speechRouter({ speakFn = speak, transcribeFn = transcribe } = {}) {
  const router = express.Router();

  router.post('/tts', async (req, res, next) => {
    try {
      const { text, language } = req.body ?? {};
      if (typeof text !== 'string' || !text.trim()) throw badRequest('text is required');
      if (text.length > TTS_MAX_CHARS) throw badRequest(`text is over ${TTS_MAX_CHARS} characters`);
      const audio = await speakFn(text, language ? { languageCode: language } : {});
      res.type('audio/wav').send(audio);
    } catch (err) {
      next(err);
    }
  });

  router.post('/stt', upload.single('audio'), async (req, res, next) => {
    try {
      if (!req.file) throw badRequest('audio file is required (form field "audio")');
      const out = await transcribeFn(req.file.buffer, {
        filename: req.file.originalname || 'audio',
        mimeType: req.file.mimetype,
        languageCode: req.body?.language || undefined,
      });
      res.json(out);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
