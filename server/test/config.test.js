import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cfg from '../src/core/config.js';

function codeOf(file) {
  return fs.readFileSync(new URL(`../src/core/${file}`, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');
}

test('rule.js has no numeric literals except 0 and 1', () => {
  const literals = codeOf('rule.js').match(/(?<![\w.])\d+(\.\d+)?(?![\w])/g) ?? [];
  assert.deepEqual(literals.filter((n) => n !== '0' && n !== '1'), []);
});

test('rule constants are positive numbers', () => {
  for (const k of ['SAFETY_MARGIN', 'STOCKOUT_STEP_UP', 'RATE_SMOOTHING', 'DEFAULT_CYCLE_DAYS', 'RESTOCK_MIN_PACKS']) {
    assert.equal(typeof cfg[k], 'number', k);
    assert.ok(cfg[k] > 0, k);
  }
  assert.ok(cfg.RATE_SMOOTHING <= 1);
});

test('MIN_CONFIDENCE is a share between 0 and 1', () => {
  assert.ok(cfg.MIN_CONFIDENCE > 0 && cfg.MIN_CONFIDENCE <= 1);
});
