import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../print-templates.js', import.meta.url), 'utf8');

test('delivery totals use a fixed table instead of a fragile grid', () => {
  assert.match(source, /<table class="delivery-totals">/);
  assert.match(source, /display:table;border-collapse:collapse;table-layout:fixed/);
  assert.doesNotMatch(source, /delivery-totals\{grid-template-columns/);
});

test('delivery totals stay within the 202 mm detail-table width', () => {
  const fixedWidths = [...source.matchAll(/<col style="width:(\d+(?:\.\d+)?)mm">/g)]
    .slice(0, 5)
    .map((match) => Number(match[1]));
  assert.deepEqual(fixedWidths, [66, 6, 43.333, 43.333, 43.334]);
  assert.equal(fixedWidths.reduce((sum, width) => sum + width, 0), 202);
  assert.match(source, /writing-mode:vertical-rl/);
});

test('delivery values only appear on the last page', () => {
  assert.match(source, /deliveryTotals\(d,i===pages-1\)/);
  assert.match(source, /lastPage\?money\(d\.sub\):''/);
  assert.match(source, /lastPage\?money\(d\.tax\):''/);
  assert.match(source, /lastPage\?money\(d\.total\):''/);
});

test('specialized print templates remain enabled', () => {
  assert.match(source, /\['納品書','見積書','合計請求書'\]/);
  assert.match(source, /A4CF2（二面）/);
  assert.match(source, /A4見積書\(A\)/);
  assert.match(source, /GB1116（印刷済み用紙）/);
});

test('GB1116 uses the Rakuda reference positions', () => {
  assert.match(source, /gb-customer\{top:24mm;left:22mm;width:82mm/);
  assert.match(source, /gb-issuer\{top:33\.5mm;right:15mm;width:62mm/);
  assert.match(source, /company-stamp\{top:31mm;right:3mm/);
  assert.match(source, /gb-summary\{position:absolute;top:85\.5mm;left:17\.8mm;width:182mm/);
  assert.match(source, /gb-detail\{top:97mm;left:17\.8mm;width:182\.6mm/);
  assert.match(source, /grid-template-columns:19\.8mm 12\.9mm 48\.3mm 15\.5mm 9\.9mm 25\.4mm 25\.4mm 25\.4mm/);
});

test('GB1116 prints dates into the preprinted year month day fields', () => {
  assert.match(source, /function dateParts/);
  assert.match(source, /gb-date span:nth-child\(2\)\{left:20mm\}/);
  assert.match(source, /gb-date span:nth-child\(3\)\{left:32mm\}/);
  assert.doesNotMatch(source, /\$\{safe\(d\.number\)\}　\$\{i\+1\}\/\$\{pages\.length\}/);
});
