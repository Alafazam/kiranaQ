// Item queries. Every query takes storeId (tenant rule). Lane B may add functions here.

export function listItems(db, storeId) {
  return db
    .prepare(
      `SELECT id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size, active, distributor_id
         FROM item WHERE store_id = ? ORDER BY item_group, name_en`,
    )
    .all(storeId)
    .map((r) => ({ ...r, aliases: JSON.parse(r.aliases), active: r.active === 1 }));
}

export function getItem(db, storeId, id) {
  const r = db
    .prepare(
      `SELECT id, sku_key, name_en, name_hi, aliases, item_group, unit, pack_size, active, distributor_id
         FROM item WHERE store_id = ? AND id = ?`,
    )
    .get(storeId, id);
  return r ? { ...r, aliases: JSON.parse(r.aliases), active: r.active === 1 } : null;
}

/** fields: any of {distributor_id, active}, already validated. */
export function updateItem(db, storeId, id, fields) {
  if ('distributor_id' in fields) {
    db.prepare('UPDATE item SET distributor_id = ? WHERE store_id = ? AND id = ?').run(fields.distributor_id, storeId, id);
  }
  if ('active' in fields) {
    db.prepare('UPDATE item SET active = ? WHERE store_id = ? AND id = ?').run(fields.active ? 1 : 0, storeId, id);
  }
  return getItem(db, storeId, id);
}

/** Map item_id -> item row (raw fields the rule needs) for the given ids of this store. */
export function itemsById(db, storeId) {
  const rows = db
    .prepare('SELECT id, name_en, name_hi, unit, pack_size, active, distributor_id FROM item WHERE store_id = ?')
    .all(storeId);
  return new Map(rows.map((r) => [r.id, r]));
}

export function countActiveItems(db, storeId) {
  return db.prepare('SELECT COUNT(*) AS n FROM item WHERE store_id = ? AND active = 1').get(storeId).n;
}
