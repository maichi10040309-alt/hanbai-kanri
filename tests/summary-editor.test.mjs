import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../voucher-editor.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('summary invoice switches to the document-shaped editor',()=>{
  assert.match(app,/if\(type==='合計請求書'\)reshapeSummarySheet\(sheet,d,company\)/);
  assert.match(app,/sheet\.className='ve-sheet ve-summary gb-editor'/);
  assert.match(app,/<h2>請　求　書<\/h2>/);
});

test('summary editor keeps every persisted field attached',()=>{
  for(const field of ['customer','customerList','date','subject','due','note','lineTable'])assert.match(app,new RegExp(`\\b${field}\\b`));
  for(const extra of ['previousBalance','receivedAmount','transferFee','carryForward','closingDate'])assert.match(app,new RegExp(extra));
  assert.match(app,/gb-edit-hidden[^`]*append\(subject,due,note,extra\.closingDate/s);
});

test('summary totals and lines use the blue seven-column form',()=>{
  assert.match(app,/data-ve-total="sub"/);
  assert.match(app,/data-ve-total="tax"/);
  assert.match(app,/data-ve-total="total"/);
  assert.match(css,/\.gb-edit-summary\{display:grid;grid-template-columns:repeat\(6,1fr\) 1\.08fr/);
  assert.match(css,/\.gb-edit-lines \.line-table\{min-width:0!important;table-layout:fixed\}/);
});

test('editor assets are cache-busted',()=>{
  assert.match(html,/voucher-editor\.css\?v=20260921-7/);
  assert.match(html,/app\.js\?v=20260921-14/);
});

test('summary honorific controls sit directly below the customer name',()=>{
  assert.match(app,/wrapper\.matches\('\.gb-customer-entry,\.delivery-customer-entry'\)\?wrapper\.append\(label\):wrapper\.after\(label\)/);
  assert.match(css,/\.gb-customer-entry>\.honorific-choice\{position:absolute;top:82px/);
});
