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

test('delivery totals stay exactly within the detail-table width', () => {
  const markup = source.match(/function deliveryTotals[\s\S]*?<\/colgroup>/)[0];
  const widths = [...markup.matchAll(/<col style="width:(\d+(?:\.\d+)?)%">/g)]
    .map((match) => Number(match[1]));
  assert.deepEqual(widths, [32.6733, 2.9703, 21.4521, 21.4521, 21.4522]);
  assert.equal(widths.reduce((sum, width) => sum + width, 0), 100);
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
  assert.match(source, /gb-print-layer\{position:absolute;inset:0;transform:translate\(var\(--gb-x,0mm\),var\(--gb-y,0mm\)\)\}/);
  assert.match(source, /gb-customer\{top:20\.7mm;left:18\.1mm;width:75\.5mm/);
  assert.match(source, /gb-issuer\{top:29\.2mm;left:124\.7mm;right:auto;width:62mm/);
  assert.match(source, /company-stamp\{top:26\.2mm;left:167\.2mm;right:auto/);
  assert.match(source, /gb-bank\{position:absolute;top:57\.7mm;left:70\.4mm/);
  assert.match(source, /gb-summary\{position:absolute;top:73\.8mm;left:17\.4mm;width:183\.1mm/);
  assert.match(source, /gb-detail\{top:87\.9mm;left:17\.4mm;width:183\.1mm/);
  assert.match(source, /grid-template-columns:20\.1mm 12\.9mm 48\.6mm 15\.4mm 10\.1mm 25\.4mm 25\.4mm 25\.2mm/);
});

test('GB1116 prints dates into the preprinted year month day fields', () => {
  assert.match(source, /function dateParts/);
  assert.match(source, /gb-date\{top:7\.2mm;left:114\.8mm/);
  assert.match(source, /gb-no\{top:7\.5mm;left:171\.6mm;right:auto;width:27mm/);
  assert.doesNotMatch(source, /gb-no\{[^}]*transform:/);
  assert.doesNotMatch(source, /gb-no\{[^}]*right:-/);
  assert.match(source, /gb-date span:nth-child\(2\)\{left:20mm\}/);
  assert.match(source, /gb-date span:nth-child\(3\)\{left:32mm\}/);
  assert.doesNotMatch(source, /\$\{safe\(d\.number\)\}　\$\{i\+1\}\/\$\{pages\.length\}/);
});

test('delivery print position is shifted as one calibrated layer',()=>{
  assert.match(source,/defaultX=isDelivery\?10\.5:0/);
  assert.match(source,/\.delivery \.half>\*\{transform:translate\(var\(--delivery-x,0mm\),var\(--delivery-y,0mm\)\)\}/);
  assert.match(source,/localStorage\.setItem\('\$\{xKey\}',this\.value\)/);
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
