// Fixed AI answers for tests and demo:check. No network.

export function createFakeAi(overrides = {}) {
  return {
    async countItems(images, catalog) {
      return { items: catalog.slice(0, 3).map((it, i) => ({ item_id: it.id, count: it.pack_size * (i + 1), confidence: 0.9 })) };
    },
    async stt() {
      return { transcript: 'Maggi 8 hai', languageCode: 'hi-IN' };
    },
    async tts() {
      return Buffer.from('RIFFfake');
    },
    async parseEdits(text, { catalog }) {
      const maggi = catalog.find((it) => it.sku_key.startsWith('maggi'));
      return maggi ? { edits: [{ item_id: maggi.id, count: 8, confidence: 0.95 }] } : { edits: [], ask: 'Please say it again' };
    },
    async assist(text, { lang = 'hi' } = {}) {
      const t = text.toLowerCase();
      if (/stock|गिन|gin/.test(t)) {
        return { say: lang === 'hi' ? 'Theek hai, stock log shuru karte hain.' : 'OK, starting a stock log.', actions: [{ type: 'start_log' }], expect: 'answer' };
      }
      if (/order|ऑर्डर/.test(t)) {
        return { say: lang === 'hi' ? 'Order dikha raha hoon.' : 'Showing the orders.', actions: [{ type: 'navigate', to: 'orders' }], expect: 'done' };
      }
      return { say: lang === 'hi' ? 'Kya karna hai? Stock ginna ya order dekhna?' : 'What do you want to do? Count stock or see orders?', actions: [], expect: 'answer', options: ['Stock', 'Order'] };
    },
    ...overrides,
  };
}
