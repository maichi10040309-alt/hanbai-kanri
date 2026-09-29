import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

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
  assert.match(source,/left\(ctx,l\.code,19\.5,y\+0\.4,74\)/);
  assert.match(source,/left\(ctx,l\.name,19\.5,y\+4\.2,74\)/);
  assert.match(source,/left\(ctx,l\.unit,118,y\+2\.3,13\)/);
  assert.match(source,/wrapDeliveryNote\(l\.note,ctx,px\(25\)\)\.slice\(0,3\)/);
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
  assert.match(html,/delivery-pdf\.js\?v=20260929-2/);
});

test('normal delivery printing makes one A4 PDF per six populated rows',()=>{
  assert.match(print,/window\.printDeliveryPdf\(d,c,co\)/);
  assert.match(source,/window\.printDeliveryPdf=async function/);
  assert.match(source,/chunks\(printableLines\(d\.lines\),ROW_COUNT\)/);
  assert.match(source,/if\(i\)pdf\.addPage\('a4','portrait'\)/);
  assert.match(source,/if\(!template\)blankForm\(ctx,baseY\)/);
});

test('clean A4 title fits inside each header and date prints full Japanese units',()=>{
  assert.match(source,/font\(ctx,15,700\);ctx\.textAlign='center'/);
  assert.match(source,/\$\{year\}年 \$\{month\}月 \$\{day\}日/);
});

test('clean A4 form leaves the two-hole binding margin and subtotal stays in its cell',()=>{
  assert.match(source,/ctx\.translate\(px\(-2\),0\)/);
  assert.match(source,/right\(ctx,plainMoney\(d\.sub\),85,128\+baseY,30\)/);
});

test('delivery header and customer positions follow the requested millimetres',()=>{
  assert.match(source,/left\(ctx,salutation,95,38\+baseY,10\)/);
  assert.match(source,/left\(ctx,customerLabel,21,42\+baseY,35\)/);
  assert.match(source,/ctx\.measureText\(customerLabel\)\.width\/MM_TO_PX\+3/);
  assert.match(source,/label\('検',159\.5,54,3\);label\('印',159\.5,57\.3,3\)/);
  assert.match(source,/ctx\.lineWidth=px\(0\.35\);box\(151,7,54,12\);ctx\.lineWidth=px\(0\.18\)/);
  assert.match(source,/ctx\.lineWidth=px\(0\.35\);box\(18\.5,72,186\.5,63\);ctx\.lineWidth=px\(0\.18\)/);
});

test('stamp keeps its 20mm square and fits inside the printable A4 edge',()=>{
  assert.match(source,/ctx\.drawImage\(stamp,px\(185\),px\(25\+baseY\),px\(20\),px\(20\)\)/);
  assert.ok(185+20<210);
});

test('normal print uses stronger black type and lossless PNG',()=>{
  assert.match(source,/ink==='#000'&&weight===400\?600:weight/);
  assert.match(source,/template\?canvas\.toDataURL\('image\/jpeg',0\.96\):canvas\.toDataURL\('image\/png'\)/);
  assert.match(source,/pdf\.addImage\(image,'PNG',0,0,PAGE_W,PAGE_H/);
});

test('original and copy draw every form label at corresponding positions',()=>{
  const sandbox={window:{}};
  runInNewContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.blankFormForTest=blankForm;})();'),sandbox);
  function labels(baseY){
    const drawn=[];
    const ctx={strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(value,x,y){drawn.push({value,x,y})}};
    sandbox.blankFormForTest(ctx,baseY);
    return drawn;
  }
  const original=labels(0),copy=labels(148.5);
  assert.deepEqual(copy.map(x=>x.value),original.map(x=>x.value).map(x=>x==='納品書'?'納品書（控）':x));
  for(let i=0;i<original.length;i++){
    assert.equal(copy[i].x,original[i].x);
    assert.ok(Math.abs(copy[i].y-original[i].y-148.5*300/25.4)<0.001,original[i].value);
  }
  for(const value of ['検','印','品番・品名','数量','単位','単価','金額','備考'])assert.ok(copy.some(x=>x.value===value),value);
});

test('remarks wrap after available width and preserve manual newlines',()=>{
  const sandbox={window:{}};
  runInNewContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.wrapForTest=wrapDeliveryNote;})();'),sandbox);
  const ctx={measureText:value=>({width:[...value].length*10})};
  assert.deepEqual(Array.from(sandbox.wrapForTest('あいうえお',ctx,20)),['あい','うえ','お']);
  assert.deepEqual(Array.from(sandbox.wrapForTest('AB\nCD',ctx,20)),['AB','CD']);
});
