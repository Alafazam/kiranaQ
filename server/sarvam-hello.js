// One Sarvam chat call. Reads SARVAM_API_KEY from the environment (server/.env).
import 'dotenv/config';
import { SarvamAIClient } from 'sarvamai';

const apiKey = process.env.SARVAM_API_KEY;
if (!apiKey) {
  console.error('SARVAM_API_KEY is empty. Add it to server/.env');
  process.exit(1);
}

const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
const res = await client.chat.completions({
  model: 'sarvam-105b-conversations',
  messages: [{ role: 'user', content: 'Say hello in one short sentence.' }],
});
console.log(res.choices[0].message.content);
