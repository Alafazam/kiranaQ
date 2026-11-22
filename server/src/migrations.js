// Ordered schema migrations. Each runs once, in a transaction.
// PRAGMA user_version stores the last version applied.
// Never edit a migration that has shipped; add a new one.

const SCHEMA_V1 = `
CREATE TABLE store (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,               -- synthetic, e.g. "Demo Kirana"
  language      TEXT NOT NULL DEFAULT 'hi' CHECK (language IN ('hi','en')),
  created_at    TEXT NOT NULL
);

CREATE TABLE distributor (
  id              INTEGER PRIMARY KEY,
  store_id        INTEGER NOT NULL REFERENCES store(id),
  name            TEXT NOT NULL,             -- "Sharma Traders"
  note            TEXT,                      -- "HUL items"
  cycle_days      INTEGER NOT NULL CHECK (cycle_days BETWEEN 1 AND 60),
  last_visit_date TEXT,                      -- YYYY-MM-DD, null = unknown
  created_at      TEXT NOT NULL,
  UNIQUE (store_id, name)
);

CREATE TABLE item (
  id             INTEGER PRIMARY KEY,
  store_id       INTEGER NOT NULL REFERENCES store(id),
  distributor_id INTEGER REFERENCES distributor(id),   -- null = "no distributor set"
  sku_key        TEXT NOT NULL,              -- stable key from data/catalog.json, e.g. "maggi_70g"
  name_en        TEXT NOT NULL,
  name_hi        TEXT NOT NULL,
  aliases        TEXT NOT NULL DEFAULT '[]', -- JSON array of spoken names: ["maggi","noodles","मैगी"]
  item_group     TEXT NOT NULL,              -- staples | snacks | biscuits | drinks | personal_care | home_care
  unit           TEXT NOT NULL,              -- pcs | kg | packet | bottle
  pack_size      INTEGER NOT NULL CHECK (pack_size >= 1),  -- units per distributor pack/case
  active         INTEGER NOT NULL DEFAULT 1,
  UNIQUE (store_id, sku_key)
);

CREATE TABLE stock_log (
  id           INTEGER PRIMARY KEY,
  store_id     INTEGER NOT NULL REFERENCES store(id),
  log_date     TEXT NOT NULL,               -- YYYY-MM-DD (business date)
  created_at   TEXT NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('photo','manual')),
  photo_count  INTEGER NOT NULL DEFAULT 0,  -- how many photos were sent (photos are not kept)
  has_restock  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_stock_log_store_date ON stock_log(store_id, log_date DESC);

CREATE TABLE stock_count (
  log_id            INTEGER NOT NULL REFERENCES stock_log(id) ON DELETE CASCADE,
  item_id           INTEGER NOT NULL REFERENCES item(id),
  store_id          INTEGER NOT NULL REFERENCES store(id),
  count             INTEGER NOT NULL CHECK (count BETWEEN 0 AND 9999),  -- in units, not packs
  source            TEXT NOT NULL CHECK (source IN ('vision','voice','tap')),  -- who set the final value
  vision_count      INTEGER,                -- what the model said, for later accuracy checks
  vision_confidence REAL,
  PRIMARY KEY (log_id, item_id)
);

CREATE TABLE item_result (                  -- rule output per item per log (what the Result screen shows)
  log_id           INTEGER NOT NULL REFERENCES stock_log(id) ON DELETE CASCADE,
  item_id          INTEGER NOT NULL REFERENCES item(id),
  store_id         INTEGER NOT NULL REFERENCES store(id),
  distributor_id   INTEGER REFERENCES distributor(id),
  rate_per_day     REAL,                    -- null on first log
  days_of_cover    REAL,                    -- null when rate is 0 or unknown
  next_visit_date  TEXT,
  status           TEXT NOT NULL CHECK (status IN ('runs_out','order','ok','no_history')),
  suggested_qty    INTEGER NOT NULL DEFAULT 0,   -- in units, a multiple of pack_size
  final_qty        INTEGER,                 -- what the owner confirmed; null = not confirmed
  reason_key       TEXT NOT NULL,           -- template id, e.g. "runs_out_before_visit"
  reason_args      TEXT NOT NULL,           -- JSON args for the template; text is built in the UI language
  PRIMARY KEY (log_id, item_id)
);

CREATE TABLE visit (
  id             INTEGER PRIMARY KEY,
  store_id       INTEGER NOT NULL REFERENCES store(id),
  distributor_id INTEGER NOT NULL REFERENCES distributor(id),
  log_id         INTEGER NOT NULL REFERENCES stock_log(id) ON DELETE CASCADE,
  visited_on     TEXT NOT NULL,             -- = the log date
  created_at     TEXT NOT NULL,
  UNIQUE (distributor_id, log_id)           -- confirming twice is safe (idempotent)
);

CREATE TABLE receipt (
  visit_id     INTEGER NOT NULL REFERENCES visit(id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL REFERENCES item(id),
  store_id     INTEGER NOT NULL REFERENCES store(id),
  received_qty INTEGER NOT NULL CHECK (received_qty >= 0),
  PRIMARY KEY (visit_id, item_id)
);

CREATE TABLE item_state (                   -- the learned rate, updated after each log
  store_id     INTEGER NOT NULL REFERENCES store(id),
  item_id      INTEGER NOT NULL REFERENCES item(id),
  rate_per_day REAL,
  last_log_id  INTEGER REFERENCES stock_log(id),
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (store_id, item_id)
);

CREATE TABLE ai_call (                      -- one row per model call, no content
  id          INTEGER PRIMARY KEY,
  store_id    INTEGER NOT NULL REFERENCES store(id),
  kind        TEXT NOT NULL CHECK (kind IN ('vision','stt','tts','parse')),
  provider    TEXT NOT NULL,                -- anthropic | sarvam
  model       TEXT NOT NULL,
  ok          INTEGER NOT NULL,
  latency_ms  INTEGER NOT NULL,
  error_code  TEXT,                         -- short code only, no response body
  created_at  TEXT NOT NULL
);
`;

export const MIGRATIONS = [
  { version: 1, name: 'stock log schema', up: (db) => db.exec(SCHEMA_V1) },
];

export function currentVersion(db) {
  return db.pragma('user_version', { simple: true });
}

export function migrate(db) {
  const applied = currentVersion(db);
  for (const m of MIGRATIONS.filter((x) => x.version > applied).sort((a, b) => a.version - b.version)) {
    db.transaction(() => {
      m.up(db);
      db.pragma(`user_version = ${m.version}`);
    })();
    console.log(`[kiranaq] migration ${m.version} applied: ${m.name}`);
  }
}
