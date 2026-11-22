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
