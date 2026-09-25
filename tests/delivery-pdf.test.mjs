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

test('date, two-line item, and amounts follow the supplied form coordinates',()=>{
  assert.match(source,/const \[year,month,day\]=pageDate\(d\.date\)/);
  assert.match(source,/left\(ctx,year,155\.5,13\.5\+baseY,10\)/);
  assert.match(source,/left\(ctx,month,166\.5,13\.5\+baseY,6\)/);
  assert.match(source,/left\(ctx,day,174\.5,13\.5\+baseY,6\)/);
  assert.match(source,/left\(ctx,l\.code,18\.5,y\+0\.4,75\)/);
  assert.match(source,/left\(ctx,l\.name,18\.5,y\+4\.2,75\)/);
  assert.match(source,/left\(ctx,l\.unit,118,y\+2\.3,13\)/);
  assert.match(source,/left\(ctx,l\.note,178,y\+2\.3,27\)/);
  assert.match(source,/right\(ctx,plainMoney\(l\.price\),129,y\+2\.3,24\)/);
  assert.match(source,/right\(ctx,plainMoney\(d\.sub\),85,128\+baseY,30\)/);
  assert.match(source,/right\(ctx,plainMoney\(d\.tax\),115,128\+baseY,42\)/);
  assert.match(source,/right\(ctx,plainMoney\(d\.total\),157,128\+baseY,48\)/);
  assert.doesNotMatch(source,/right\(ctx,money\(d\.total\)/);
});

test('delivery lists expose the alignment PDF action',()=>{
  assert.match(app,/if\(d\.type==='納品書'\)return `<button onclick="printDeliveryTemplate/);
  assert.match(print,/window\.printDeliveryTemplate=function/);
  assert.match(print,/window\.printDeliveryTemplatePdf\(d,c,co\)/);
  assert.match(html,/delivery-pdf\.js\?v=20260925-9/);
});

test('normal delivery printing makes one A4 PDF per six populated rows',()=>{
  assert.match(print,/window\.printDeliveryPdf\(d,c,co\)/);
  assert.match(source,/window\.printDeliveryPdf=async function/);
  assert.match(source,/chunks\(printableLines\(d\.lines\),ROW_COUNT\)/);
  assert.match(source,/if\(i\)pdf\.addPage\('a4','portrait'\)/);
  assert.match(source,/if\(!template\)blankForm\(ctx,baseY\)/);
});

test('clean A4 title fits inside each header and date prints full Japanese units',()=>{
  assert.match(source,/font\(ctx,13,700\);ctx\.textAlign='center'/);
  assert.match(source,/\$\{year\}年 \$\{month\}月 \$\{day\}日/);
});

test('clean A4 form is centered and subtotal stays in its 85–115mm cell',()=>{
  assert.match(source,/if\(!template\)ctx\.translate\(px\(\(PAGE_W-186\.5\)\/2-18\.5\),0\)/);
  assert.match(source,/right\(ctx,plainMoney\(d\.sub\),85,128\+baseY,30\)/);
});
