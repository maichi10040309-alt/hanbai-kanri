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
  assert.match(source,/delivery-totals\{top:124\.88mm;left:14mm;width:182mm;border-collapse:separate;border-spacing:0;border:1px solid #111\}/);
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

test('GB1116 uses the formal BP0306/GB1116 positions', () => {
  assert.match(source, /gb-print-layer\{position:absolute;inset:0;transform:translate\(var\(--gb-x,0mm\),var\(--gb-y,0mm\)\)\}/);
  assert.match(source, /gb-customer\{top:25mm;left:20mm;width:85mm/);
  assert.match(source, /gb-issuer\{top:17\.5mm;left:135mm;right:auto;width:60mm/);
  assert.match(source, /company-stamp\{top:18mm;left:171mm;right:auto/);
  assert.match(source, /gb-bank\{position:absolute;top:60mm;left:70mm/);
  assert.match(source, /gb-summary\{position:absolute;top:76mm;left:15mm;width:180mm/);
  assert.match(source, /gb-detail\{position:absolute;top:104mm;left:15mm;width:180mm;height:158\.4mm/);
  assert.match(source, /grid-template-columns:19\.76mm 12\.68mm 47\.78mm 15\.14mm 9\.93mm 24\.97mm 24\.97mm 24\.77mm/);
});

test('GB1116 prints dates into the preprinted year month day fields', () => {
  assert.match(source, /function dateParts/);
  assert.match(source, /gb-date\{top:7\.5mm;left:128mm/);
  assert.match(source, /gb-no\{top:7\.5mm;left:172mm;right:auto;width:27mm/);
  assert.doesNotMatch(source, /gb-no\{[^}]*transform:/);
  assert.doesNotMatch(source, /gb-no\{[^}]*right:-/);
  assert.match(source, /gb-date span:nth-child\(2\)\{left:20mm\}/);
  assert.match(source, /gb-date span:nth-child\(3\)\{left:32mm\}/);
  assert.doesNotMatch(source, /\$\{safe\(d\.number\)\}　\$\{i\+1\}\/\$\{pages\.length\}/);
});

test('GB1116 prints exactly 22 fixed-pitch detail rows', () => {
  assert.match(source, /chunks\(d\.lines\|\|\[\],22\)/);
  assert.match(source, /Array\.from\(\{length:22\}/);
  assert.match(source, /gb-row\{box-sizing:border-box;flex:0 0 7\.2mm;height:7\.2mm/);
  assert.match(source, /gb-row span\{min-width:0;padding:0 1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/);
  assert.equal(104 + 7.2 * 22, 262.4);
});

test('delivery print position is shifted as one calibrated layer',()=>{
  assert.match(source,/delivery \.half\{padding-left:14mm;padding-right:14mm\}/);
  assert.match(source,/delivery \.lines\{left:14mm;width:182mm\}/);
  assert.match(source,/delivery \.delivery-totals\{top:124\.88mm;left:14mm;width:182mm/);
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
