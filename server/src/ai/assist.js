// Voice assistant ("Bolo"): owner text + screen + context -> {say, actions, expect, options}. Uses the parse provider.
import { CLAUDE_PARSE_MODEL, PARSE_PROVIDER, SARVAM_PARSE_MODEL } from '../core/config.js';
import { askModel, codedError } from './chat.js';
import { extractJson } from './validate.js';

export const ASSIST_SAY_MAX_CHARS = 200;
export const ASSIST_ASK_AGAIN = { hi: 'Phir se bolenge?', en: 'Please say it again' };

const USE_CASES = `Use cases:
- "stock ginna hai", "naya log", "take stock" -> start_log; ask: new photo or choose a photo? (expect answer)
- "photo chuno", "pehli photo", "sample photo", "namuna" (any wording for picking a ready photo) -> use_sample {index: 0-based} then count_photo
- if one sentence asks for both ("stock ginna hai, sample photo se"), return start_log, use_sample, count_photo together in that order
- "bina photo ke", "khud ginunga" -> count_manual
- items with counts ("Maggi 8, Surf 5", "Parle do kam") -> set_counts with NEW absolute counts. Relative words ("do kam", "ek aur") apply to the draft count in context.draft. Never below 0. Only catalog ids. A bare number with no item, or one number for two items -> ask, no action.
- "save karo", "ho gaya" -> save_log with expect "confirm", say asks "Log save karun?"
- visit sheet open (context.visit) and owner says the distributor delivered -> visit {distributor_id, delivered: true} with expect "confirm"; "nahi aaya" -> delivered false
- "kya mangana hai", "order dikhao" -> navigate to orders; say what runs out first, from context.cards
- "<distributor> ka order pakka karo" -> confirm_order {distributor_id} with expect "confirm"
- "Maggi do box kar do" on orders -> set_qty {distributor_id, item_id, qty} (qty in units; "box" = pack size of the item; use the distributor that has the item in context.cards)
- "<distributor> ka order suna do" -> read_out {distributor_id}
- "<distributor> kab aayega" -> navigate to distributors; say the day and date from context.distributors
- "Surf kab khatm hoga" -> answer from context.cards (runs_out), no action
- "English mein bolo" / "हिंदी" / "speak Hindi" -> ALWAYS return the set_language action {lang}, and say the confirmation in the new language
- unclear or unknown item ("woh wala do") -> ask ONE short question, no action
- if the owner just says yes/no to your confirm question, return actions [] and expect "done" (the app runs the pending action itself).`;

const ACTIONS = `Actions (closed list, nothing else):
navigate {to: "home"|"orders"|"distributors"|"settings"}
start_log {}
use_sample {index}
count_photo {}
count_manual {}
set_counts {edits: [{item_id, count, confidence}]}
save_log {}            WRITE
visit {distributor_id, delivered: true|false}   WRITE
confirm_order {distributor_id}   WRITE
set_qty {distributor_id, item_id, qty}
read_out {distributor_id}
set_language {lang: "hi"|"en"}
Each action is an object {"type": "...", ...params}. A WRITE action must come with expect "confirm".`;

function catalogLines(catalog) {
  return catalog.map((it) => `${it.id} | ${it.name_en} | ${it.name_hi} | ${(it.aliases ?? []).join(', ')} | pack ${it.pack_size}`).join('\n');
}

export function buildAssistPrompt({ text, lang, screen, context, history, catalog }) {
  return [
    'You are "Bolo", a voice assistant for an Indian kirana (small grocery) shop owner who does not know where app buttons are.',
    'You talk, ask short questions, and perform actions on the app screen. Speak simply, like to a shopkeeper.',
    `Owner language: ${lang === 'en' ? 'English' : 'Hindi (Hinglish in Roman script is fine; match how the owner speaks)'}.`,
    `Current screen: ${screen}`,
    `Context JSON: ${JSON.stringify(context ?? {})}`,
    'Catalog (id | English | Hindi | aliases | pack):',
    catalogLines(catalog),
    'Recent talk:',
    history.map((h) => `${h.role}: ${h.text}`).join('\n') || '(none)',
    `Owner now says: "${text}"`,
    ACTIONS,
    USE_CASES,
    `Rules: NEVER say the words "sample", "namuna" or "नमूना" in "say" or "options". Call it just a photo: "photo", "फ़ोटो चुनें" (choose a photo), options like "नई फ़ोटो" / "फ़ोटो चुनें". "say" is one or two short sentences, at most ${ASSIST_SAY_MAX_CHARS} characters, in the owner's language. Use only ids from the catalog and the context. Never invent data.`,
    'expect: "answer" = you asked something and wait; "confirm" = a write action waits for Yes; "done" = nothing more to ask.',
    'Answer with ONLY JSON, no other text: {"say": "...", "actions": [], "expect": "answer", "options": ["optional", "short chips"]}',
  ].join('\n');
}

export function assistModel(provider = PARSE_PROVIDER) {
  return provider === 'claude' ? CLAUDE_PARSE_MODEL : SARVAM_PARSE_MODEL;
}

/** ai.assist: raw model answer, not validated (see validateAssist). */
export async function assist(input, { provider = PARSE_PROVIDER } = {}) {
  const answer = await askModel({ provider, model: assistModel(provider), prompt: buildAssistPrompt(input) });
  const json = extractJson(answer);
  if (!json || typeof json !== 'object' || Array.isArray(json) || typeof json.say !== 'string') {
    throw codedError('bad_json', 'assist answer was not the expected JSON');
  }
  return json;
}
