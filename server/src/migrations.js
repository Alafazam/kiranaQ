// Ordered schema migrations. Each runs once, in a transaction.
// PRAGMA user_version stores the last version applied.
// Never edit a migration that has shipped; add a new one.

export const MIGRATIONS = [];

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
