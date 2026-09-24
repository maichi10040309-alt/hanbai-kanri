import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const source=readFileSync(new URL('../gb-pdf.js',import.meta.url),'utf8');
const printSource=readFileSync(new URL('../print-templates.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const settingsSource=readFileSync(new URL('../company-settings.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('GB1116 uses an A4 PDF generated at fixed physical size',()=>{
  assert.match(source,/DPI=300,MM_TO_PX=DPI\/25\.4,PAGE_W=210,PAGE_H=297/);
  assert.match(source,/new jsPDF\(\{orientation:'portrait',unit:'mm',format:'a4'/);
  assert.match(source,/pdf\.addImage\(image,'JPEG',0,0,PAGE_W,PAGE_H/);
  assert.match(source,/URL\.createObjectURL\(pdf\.output\('blob'\)\)/);
});

test('GB1116 PDF preserves the formal eight-column 22-row geometry',()=>{
  assert.match(source,/columns=\[20\.4,12\.8,48\.3,15\.4,10,25\.5,25\.5,25\.4\]/);
  assert.match(source,/const startX=17\.1,startY=93\.7,rowH=\(284\.4-93\.7\)\/22/);
  assert.match(source,/for\(let i=0;i<22;i\+\+\)/);
  assert.ok(Math.abs([20.4,12.8,48.3,15.4,10,25.5,25.5,25.4].reduce((a,b)=>a+b,0)-183.3)<1e-9);
});

test('Japanese text is rasterized by the browser instead of relying on PDF base fonts',()=>{
  assert.match(source,/"MS Mincho","ＭＳ 明朝","Yu Mincho",serif/);
  assert.match(source,/canvas\.toDataURL\('image\/jpeg',0\.96\)/);
  assert.match(source,/await document\.fonts\.ready/);
});

test('PDF never truncates values and prints item code and name on separate lines',()=>{
  assert.doesNotMatch(source,/function fit\(|`\$\{s\}…`/);
  assert.match(source,/fillText\(text\(value\),px\(x\),px\(y\),px\(width\)\)/);
  assert.match(source,/font\(ctx,7\.5\);left\(ctx,l\.code/);
  assert.match(source,/left\(ctx,l\.name,edges\[2\]\+1,startY\+i\*rowH\+3\.55/);
});

test('summary invoices route to the PDF generator while other forms keep HTML print',()=>{
  assert.match(printSource,/d\.type==='合計請求書'&&typeof window\.printGbPdf==='function'/);
  assert.match(printSource,/window\.printGbPdf\(d,c,co\);return/);
  assert.match(html,/vendor\/jspdf\.umd\.min\.js\?v=2\.5\.2/);
  assert.match(html,/gb-pdf\.js\?v=20260924-12/);
});

test('customer code prints at the requested 40mm by 57mm position',()=>{
  assert.match(source,/async function renderPage\(d,c,co,lines,pageIndex,pageCount,templateImage\)/);
  assert.match(source,/font\(ctx,9\);left\(ctx,c\?\.code\|\|'',40,57,30\)/);
  assert.match(source,/renderPage\(d,c\|\|\{\},co\|\|\{\},pages\[i\]/);
});

test('source voucher date begins 21mm from the left edge',()=>{
  assert.match(source,/left\(ctx,firstDate,21,y,columns\[0\]-\(21-startX\)-1\)/);
});

test('print views request Rakuda-style Mincho typography and show driver settings',()=>{
  assert.match(printSource,/font-family:'MS Mincho','ＭＳ 明朝','Yu Mincho',serif/);
  assert.match(printSource,/カラー・手差し給紙・倍率100%/);
  assert.match(source,/カラー」「手差し給紙」「実際のサイズ（100%）/);
});

test('company and bank information use the requested coordinates and typography',()=>{
  assert.match(source,/font\(ctx,9\.5\);left\(ctx,co\.name,125,34,70\)/);
  assert.match(source,/multiline\(ctx,\[co\.postal[\s\S]*\.join\('\\n'\),125,39,70,3\.9,5\)/);
  assert.match(source,/contact\?`担当：\$\{contact\}`:''/);
  assert.match(source,/font\(ctx,9\.5\);multiline\(ctx,co\.bank\|\|'',71,60,105,4\.2,4\)/);
  assert.match(settingsSource,/id="s-contact"/);
  assert.match(settingsSource,/db\.company\.contactPerson=contactPerson/);
  assert.match(html,/company-settings\.js\?v=20260924-2/);
});

test('date and invoice number use their requested physical anchors and honorific follows the customer name',()=>{
  assert.match(source,/const nameEnd=20\+ctx\.measureText\(name\)\.width\/MM_TO_PX,suffixX=Math\.min\(nameEnd\+2\.5,100\)/);
  assert.match(source,/const recipientEnd=suffix\?suffixX\+ctx\.measureText\(suffix\)\.width\/MM_TO_PX:nameEnd/);
  assert.match(source,/ctx\.moveTo\(px\(20\),px\(30\)\);ctx\.lineTo\(px\(recipientEnd\),px\(30\)\)/);
  assert.match(source,/left\(ctx,date\.year,115,18,14\)/);
  assert.match(source,/center\(ctx,date\.month,130,18,8\)/);
  assert.match(source,/center\(ctx,date\.day,142,18,9\)/);
  assert.match(source,/left\(ctx,d\.number,184,18,24\)/);
});

test('billing summary and current invoice amount print on the first PDF page only',()=>{
  assert.match(source,/if\(pageIndex===0\)/);
  assert.match(source,/const summary=\[d\.previousBalance,d\.receivedAmount,d\.transferFee,d\.carryForward,d\.sub,d\.tax\]/);
  assert.match(source,/right\(ctx,money\(d\.total\),172\.6,80\.2,27\.9\)/);
});

test('alignment PDF overlays the scanned BP0306 template without affecting normal print',()=>{
  assert.match(source,/options\.showTemplate/);
  assert.match(source,/assets\/bp0306-template\.jpg\?v=20260924-1/);
  assert.match(source,/if\(templateImage\)ctx\.drawImage\(templateImage,0,0,canvas\.width,canvas\.height\)/);
  assert.match(printSource,/window\.printGbTemplate/);
  assert.match(printSource,/\{showTemplate:true\}/);
  assert.match(appSource,/位置合わせPDF/);
  assert.ok(statSync(new URL('../assets/bp0306-template.jpg',import.meta.url)).size>100000);
});
