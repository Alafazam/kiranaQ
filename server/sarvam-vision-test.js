// Sends an image file to the vision model. Usage: node sarvam-vision-test.js <image.png|jpg>
import 'dotenv/config';
import fs from 'node:fs';
import { askAboutImage } from './src/ai/vision.js';

const file = process.argv[2];
if (!file) throw new Error('Usage: node sarvam-vision-test.js <image>');
const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
console.log(await askAboutImage(fs.readFileSync(file), 'List every item you see with its count. Reply as a short list.', { mimeType }));
