import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../print-templates.js', import.meta.url), 'utf8');

test('delivery totals use a fixed table instead of a fragile grid', () => {
  assert.match(source, /<table class="delivery-totals">/);
  assert.match(source, /display:table;border-collapse:collapse;table-layout:fixed/);
  assert.doesNotMatch(source, /delivery-totals\{grid-template-columns/);
});

test('delivery detail and totals borders overlap without a gap',()=>{
  assert.match(source,/const deliveryLineFix=/);
  assert.match(source,/delivery-totals\{top:124\.88mm/);
  assert.match(source,/delivery-totals\{top:124\.88mm;border-collapse:separate;border-spacing:0;border:1px solid #111\}/);
  assert.match(source,/\$\{deliveryLineFix\}/);
  assert.match(source,/delivery \.lines\{border-collapse:separate;border-spacing:0;border:1px solid #111\}/);
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
  assert.match(source, /gb-customer\{top:26\.5mm;left:20\.8mm;width:83\.5mm/);
  assert.match(source, /gb-issuer\{top:34\.3mm;right:9\.2mm;width:62mm/);
  assert.match(source, /company-stamp\{top:31\.5mm;right:2\.2mm/);
  assert.match(source, /gb-bank\{position:absolute;top:66\.3mm;left:78\.8mm/);
  assert.match(source, /gb-summary\{position:absolute;top:86\.1mm;left:17\.8mm;width:182mm/);
  assert.match(source, /gb-detail\{top:101\.7mm;left:17\.8mm;width:182\.6mm/);
  assert.match(source, /grid-template-columns:19\.8mm 12\.9mm 48\.3mm 15\.5mm 9\.9mm 25\.4mm 25\.4mm 25\.4mm/);
});

test('GB1116 prints dates into the preprinted year month day fields', () => {
  assert.match(source, /function dateParts/);
  assert.match(source, /gb-date\{top:10\.1mm;left:128\.2mm/);
  assert.match(source, /gb-no\{top:10\.4mm;left:185mm;right:auto;width:23mm[^}]*transform:translate\(0,var\(--gb-y,0mm\)\)/);
  assert.doesNotMatch(source, /gb-no\{[^}]*right:-/);
  assert.match(source, /gb-date span:nth-child\(2\)\{left:20mm\}/);
  assert.match(source, /gb-date span:nth-child\(3\)\{left:32mm\}/);
  assert.doesNotMatch(source, /\$\{safe\(d\.number\)\}　\$\{i\+1\}\/\$\{pages\.length\}/);
});

test('GB1116 right-aligns amounts and includes item codes', () => {
  assert.match(source, /gb-summary span\{[^}]*width:100%[^}]*justify-content:flex-end/);
  assert.match(source, /gb-row \.num\{display:flex;width:100%;justify-self:stretch[^}]*justify-content:flex-end/);
  assert.match(source, /l\.code\?`\$\{safe\(l\.code\)\}<br>`/);
});

test('GB1116 separates recipient name and honorific', () => {
  assert.match(source, /function recipientParts/);
  assert.match(source, /class="gb-customer-name"/);
  assert.match(source, /class="gb-customer-suffix"/);
  assert.match(source, /gb-customer-suffix\{position:absolute;right:2mm;bottom:2\.4mm/);
});
