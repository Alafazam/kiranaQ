// Image reading through Sarvam chat (gemma4). All vision model calls live here.
import { SarvamAIClient } from 'sarvamai';

export const VISION_MODEL = 'gemma4';
export const VISION_MAX_TOKENS = 2048;

let client;
function getClient() {
  if (!client) {
    if (!process.env.SARVAM_API_KEY) throw new Error('SARVAM_API_KEY is not set');
    client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });
  }
  return client;
}

// Ask a question about one image (Buffer). The model only accepts base64 data URLs.
export async function askAboutImage(image, prompt, { mimeType = 'image/jpeg' } = {}) {
  const res = await getClient().chat.completionsV2({
    model: VISION_MODEL,
    max_tokens: VISION_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image.toString('base64')}` } },
        ],
      },
    ],
  });
  return res.choices[0].message.content;
}
