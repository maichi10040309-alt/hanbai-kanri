import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../gb-pdf.js',import.meta.url),'utf8');
const printSource=readFileSync(new URL('../print-templates.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('GB1116 uses an A4 PDF generated at fixed physical size',()=>{
  assert.match(source,/DPI=300,MM_TO_PX=DPI\/25\.4,PAGE_W=210,PAGE_H=297/);
  assert.match(source,/new jsPDF\(\{orientation:'portrait',unit:'mm',format:'a4'/);
  assert.match(source,/pdf\.addImage\(image,'JPEG',0,0,PAGE_W,PAGE_H/);
  assert.match(source,/URL\.createObjectURL\(pdf\.output\('blob'\)\)/);
});

test('GB1116 PDF preserves the formal eight-column 22-row geometry',()=>{
  assert.match(source,/columns=\[19\.76,12\.68,47\.78,15\.14,9\.93,24\.97,24\.97,24\.77\]/);
  assert.match(source,/const startX=15,startY=104,rowH=158\.4\/22/);
  assert.match(source,/for\(let i=0;i<22;i\+\+\)/);
  assert.equal([19.76,12.68,47.78,15.14,9.93,24.97,24.97,24.77].reduce((a,b)=>a+b,0),180);
});

test('Japanese text is rasterized by the browser instead of relying on PDF base fonts',()=>{
  assert.match(source,/"Yu Gothic","Meiryo",sans-serif/);
  assert.match(source,/canvas\.toDataURL\('image\/jpeg',0\.96\)/);
  assert.match(source,/await document\.fonts\.ready/);
});

test('summary invoices route to the PDF generator while other forms keep HTML print',()=>{
  assert.match(printSource,/d\.type==='合計請求書'&&typeof window\.printGbPdf==='function'/);
  assert.match(printSource,/window\.printGbPdf\(d,c,co\);return/);
  assert.match(html,/vendor\/jspdf\.umd\.min\.js\?v=2\.5\.2/);
  assert.match(html,/gb-pdf\.js\?v=20260922-1/);
});
