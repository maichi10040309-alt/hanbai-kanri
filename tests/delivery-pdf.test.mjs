import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const source=readFileSync(new URL('../delivery-pdf.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const print=readFileSync(new URL('../print-templates.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('delivery alignment PDF uses the supplied second-page A4 template',()=>{
  assert.match(source,/DPI=300,MM_TO_PX=DPI\/25\.4,PAGE_W=210,PAGE_H=297/);
  assert.match(source,/assets\/delivery-template\.jpg\?v=20260924-1/);
  assert.match(source,/ctx\.drawImage\(template,0,0,canvas\.width,canvas\.height\)/);
  assert.match(source,/new jsPDF\(\{orientation:'portrait',unit:'mm',format:'a4'/);
  assert.ok(statSync(new URL('../assets/delivery-template.jpg',import.meta.url)).size>100000);
});

test('alignment PDF repeats delivery data in the original and copy halves',()=>{
  assert.match(source,/for\(const baseY of \[0,148\.5\]\)/);
  assert.match(source,/const y0=76\+baseY,rowH=8/);
  assert.match(source,/for\(let i=0;i<ROW_COUNT;i\+\+\)/);
  assert.match(source,/if\(pageIndex===pageCount-1\)/);
});

test('delivery lists expose the alignment PDF action',()=>{
  assert.match(app,/if\(d\.type==='納品書'\)return `<button onclick="printDeliveryTemplate/);
  assert.match(print,/window\.printDeliveryTemplate=function/);
  assert.match(print,/window\.printDeliveryTemplatePdf\(d,c,co\)/);
  assert.match(html,/delivery-pdf\.js\?v=20260924-1/);
});
