Status: approved (Alaf, 22 Nov 2026: "1. in order section give me a drop down to select the distributor. 2. पहले फ़ोन करें। show a call phone icon there, save distributor's mobile number so call can take me to call action on phone. 3. in distributor tab show me past orders and their dates. allow me to add items they give. 4. allow me to add a distributor on that page.")

# Distributor actions: filter, call, past orders, items, add

## Why
The owner works one distributor at a time. When an item runs out before the visit, the app says "पहले फ़ोन करें" (call early), but he must find the number himself. He also cannot see what he ordered from a distributor before, cannot tell the app which items a distributor brings, and cannot add a new distributor.

## Requirements
- R1. **Distributor filter on Orders.** A dropdown at the top of the Orders and Result screens: "सभी डिस्ट्रीब्यूटर" (All, default) and one entry per distributor. Choosing one shows only that distributor's card. The choice is kept in the URL (`?d=<id>`).
- R2. **Call button.** Each distributor has an optional mobile number. Next to every "पहले फ़ोन करें" line, and on the distributor card header, a phone icon button opens `tel:<number>` (the phone's dialer). With no number, the button opens a small form to add it.
- R3. **Past orders.** On the Distributors tab, each distributor's detail shows its past confirmed orders, newest first: date, and each item with its quantity (in packs and units).
- R4. **Items they give.** On the same detail, a list of the distributor's items with "+ आइटम जोड़ें": pick any active item from the catalog to assign it to this distributor (moves it from its old distributor). Each item can be removed (sets it to no distributor).
- R5. **Add distributor.** A "+ डिस्ट्रीब्यूटर जोड़ें" button on the Distributors tab opens a form: name (required), mobile number (optional), visit every N days (required, 1–60, default 7), last visit date (optional). Save adds it to the list.
- R6. Phone numbers: digits, spaces, `+` and `-` only, 10–15 digits after cleaning. Stored as entered (trimmed); `tel:` uses digits and `+` only. Seed data uses clearly fake numbers (`+91 90000 0000N`). Phone numbers are never logged.

## API (Lane B)
- Migration 2 (lead): `ALTER TABLE distributor ADD COLUMN phone TEXT`.
- `GET /api/distributors`, `POST /api/distributors`, `PUT /api/distributors/:id`: accept and return `phone` (null when not set). 400 `bad_phone` when it fails R6.
- Card shape: `card.distributor.phone` (null when not set).
- New `GET /api/distributors/:id/orders` → `[{log_id, log_date, confirmed_at, lines: [{item_id, sku_key, name_en, name_hi, pack_size, unit, final_qty}]}]`, newest first, only lines with `final_qty > 0` from logs where that distributor's order was confirmed. 404 for an unknown distributor.
- `PUT /api/items/:id {distributor_id}` already exists (assign or `null` to remove); use it for R4.
- Seed: give the 3 demo distributors fake numbers (`+91 90000 00001` … `00003`).

## Web (Lane D)
- Orders/Result: distributor dropdown (R1), phone icon buttons (R2) using lucide `Phone`, `<a href="tel:…">`.
- Distributors tab: tap a distributor → detail view (route `/distributors/:id`): header with name, next visit, cycle, phone (call button + edit), "पिछले ऑर्डर" list (R3), "ये आइटम देते हैं" list with add/remove (R4). "+ डिस्ट्रीब्यूटर जोड़ें" on the list (R5).
- Bolo: no change required.

## Checks
- `pnpm --dir server test`: new tests for phone validation, `/distributors/:id/orders` (confirmed only, newest first, 404), seed phones.
- Browser at 390 px: filter one distributor; call icon has a `tel:` link; add a distributor; assign an item and see it move; past orders list shows the order confirmed in the demo.

## Security
Phone numbers are personal data of distributors: stored only in the store's own SQLite, never sent to model calls or logs. The demo seed uses fake numbers only.
