# KiranaQ: competitive brief

Date of research: 22 Nov 2026. Method: public web search and public pages only. No sign-ins. Two official pages (Vyapar pricing, Khatabook home) and the Play Store pages did not load in text, so some facts are "not confirmed". We never guess a number.

## One line per competitor

- **Vyapar**: GST billing, accounting and inventory app for small businesses. Stock goes up and down from your sales and purchase entries.
- **Khatabook**: Credit ledger ("khata") app for shop owners, with billing and stock tools added. Very large user base.
- **GoKirana**: **Not confirmed.** We found no app, site or news item with this name. We do not know which product is meant. The nearest real products are kirana billing/POS tools (for example GoFrugal kirana software, myBillBook, Billing Fast / Kirana Fast). All of them need billing data. We list no facts for "GoKirana". Ask the person who named it for a link before the pitch.

## What each product does (from sources)

| | Vyapar | Khatabook |
|---|---|---|
| Who it is for | Retail, FMCG distributors, pharmacies, grocery, restaurants, stationery. Page says it suits "businesses that generate frequent invoices" [1] | Shop owners who sell on credit. Own description: credit, debit and ledger accounts, payment links [4] |
| Core features | GST billing, accounting, inventory, 10-second invoicing; Windows, Mac, Android, iOS [1] | Credit ledger, GST and non-GST invoices, purchase invoices, stock tracking [4] |
| Stock and reorder | Minimum stock level per item, low-stock alert, restock reminders "based on low-stock alerts and past sales" [1] | Stock tracking, low-stock alerts, stock history (store listing text via search result) [4] |
| Needs bills/POS for stock? | Stock updates "after every sale, return, or purchase" [1]. So it needs entries. Not stated outright. | Stock comes from sale/purchase entries (inference; not stated outright) |
| Voice or photo | Not stated on the page we read [1] | Not confirmed |
| Languages | Capterra and GetApp list English only [5]. Not confirmed on the app. | Listing text: English, Hindi, 10+ regional languages [6]. Third-party text; not official. |
| Price | 7-day free trial [1]. Paid plans: sources conflict. Capterra: Desktop Gold 1 yr ₹3,399; 3 yr ₹8,848 [5]. A Nov 2026 note says plans are now "Basic" (1 yr) and "Saver" (3 yr) [7]. Not confirmed. | Consumer app listed as free [4]. Paid-plan prices: not confirmed. |
| Scale (source) | "1.5 Cr+ businesses" on Vyapar's own page [1] | About 88–90 M Play installs per third-party trackers [6]. Not an official figure. |

## Comparison with KiranaQ

| | Vyapar | Khatabook | GoKirana | KiranaQ |
|---|---|---|---|---|
| Input needed | Bills / sale entries | Ledger, bills / sale entries | Not confirmed | Shelf photo + short voice check |
| Learns demand without sales data | No. Uses past sales [1] | No (not confirmed) | Not confirmed | **Yes.** Rate = (stock before + delivered − stock now) / days |
| Per-distributor visit cycles and "call early" alerts | Not found. Alerts are per item minimum level [1] | Not found | Not confirmed | **Yes.** One card per distributor |
| Restock detection | Via purchase entry by hand | Via purchase entry by hand | Not confirmed | **Yes.** From a restock photo; asks "did Sharma deliver?" |
| Voice in Hindi/Hinglish | Not confirmed | Hindi UI listed [6]; voice not confirmed | Not confirmed | **Yes** (Sarvam STT/TTS) |
| Works with no POS or bills | No. Stock follows entries | Partly: ledger works alone; stock needs entries | Not confirmed | **Yes** |
| Price | Free trial, then paid (not confirmed) | Free app; paid plans not confirmed | Not confirmed | POC. No price yet |

"Not found" means we did not see the feature in public pages. It does not prove the feature is absent.

## How KiranaQ is different

- **No bills needed.** Vyapar and Khatabook track stock from sales and purchase entries. A kirana owner with no POS does not make those entries. KiranaQ asks for a photo and a voice check instead.
- **It learns the sales rate from stock logs.** Competitors raise an alert at a fixed minimum level the owner sets. KiranaQ works out each item's daily rate and days of cover by itself.
- **It thinks per distributor.** Each distributor has its own visit cycle. KiranaQ says what to order at the next visit and which items run out before that visit ("call early"). We found no such feature in the competitor pages we read.
- **It sees deliveries.** A restock photo shows which items went up, and the app asks which distributor delivered.
- **Where competitors are stronger:** GST invoicing, accounting, credit ledger (udhaar) for customers, multi-device apps, proven scale (1.5 Cr+ businesses, tens of millions of installs, by their own and third-party figures), and mature support. KiranaQ today is a POC: photo counts can be wrong, and rates need two or more logs. It does not bill, does not do GST, and does not track customer credit.

## On stage (say this)

1. "A kirana owner has no POS and no bills. Billing apps cannot help him, because they need the sale entries he never makes."
2. "KiranaQ: take one photo of the shelf, say 'Maggi 8 hai' in Hindi, done. From two photos it knows what sells."
3. "And it knows each distributor's visit day. It tells him what to order on Tuesday, and what will run out before Sharma comes back, so he calls early."

## Sources

Search result pages that I used as a lead are marked "search". All accessed 22 Nov 2026.

1. Vyapar, Low stock alerts. https://vyaparapp.in/use-cases/low-stock-alerts (page dateModified 2026-11-05; read in full)
2. Vyapar, pricing page. https://vyaparapp.in/pricing (did not load; prices not confirmed)
3. Vyapar, Play Store. https://play.google.com/store/apps/details?id=in.android.vyapar (did not load)
4. Khatabook descriptions via search: App Store https://apps.apple.com/us/app/id6633420817 ; Capterra https://www.capterra.com/p/197475/KhataBook/ ; Techjockey https://www.techjockey.com/detail/khatabook. Official site https://khatabook.com did not load.
5. Vyapar price and language listings (third party): https://www.capterra.com/p/180579/Vyapar/pricing/ ; https://www.getapp.com/accounting-software/a/vyapar (search)
6. Khatabook installs and languages (third party trackers, search): https://appgoblin.info/apps/com.vaibhavkalpe.android.khatabook ; https://apps.apple.com/in/app/id1488204139
7. Vyapar plan names (third party, search): https://startupstash.com/alternatives/vyapar/
8. GoKirana: searches for "GoKirana", "Go Kirana" and Play Store gave no match (22 Nov 2026). Nearest results: https://gofrugal.com/retail/supermarket-pos/kirana-store-software.html ; https://mybillbook.in/s/billing-software-for-grocery-store/ ; https://apps.apple.com/in/app/kirana-fast/id1567324958
