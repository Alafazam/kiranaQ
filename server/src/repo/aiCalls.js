// One row per model call. Never store prompts, transcripts, images or keys.

export function logAiCall(db, storeId, { kind, provider, model, ok, latency_ms, error_code = null }, now = new Date().toISOString()) {
  db.prepare(
    `INSERT INTO ai_call (store_id, kind, provider, model, ok, latency_ms, error_code, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(storeId, kind, provider, model, ok ? 1 : 0, Math.round(latency_ms), error_code, now);
  console.log(`[kiranaq] ai_call ${kind} ${provider}/${model} ok=${ok} ${Math.round(latency_ms)}ms${error_code ? ` ${error_code}` : ''}`);
}

export function countCallsSince(db, storeId, sinceIso) {
  return db.prepare('SELECT COUNT(*) AS n FROM ai_call WHERE store_id = ? AND created_at >= ?').get(storeId, sinceIso).n;
}
