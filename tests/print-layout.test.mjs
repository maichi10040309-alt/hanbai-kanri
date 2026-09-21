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
  const fixedWidths = [...source.matchAll(/<col style="width:(\d+)mm">/g)]
    .slice(0, 4)
    .map((match) => Number(match[1]));
  assert.deepEqual(fixedWidths, [66, 6, 39, 37]);
  assert.ok(fixedWidths.reduce((sum, width) => sum + width, 0) < 202);
  assert.match(source, /<col><\/colgroup>/);
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
