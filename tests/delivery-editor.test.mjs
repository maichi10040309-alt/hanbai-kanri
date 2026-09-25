import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../voucher-editor.css',import.meta.url),'utf8');

test('delivery documents switch to the print-shaped editor',()=>{
  assert.match(app,/else if\(type==='納品書'\)reshapeDeliverySheet\(sheet,d,company\)/);
  assert.match(app,/sheet\.className='ve-sheet ve-delivery delivery-editor'/);
  assert.match(app,/<h2>納品書<\/h2>/);
});

test('delivery editor keeps customer, date, lines and hidden persistence fields',()=>{
  assert.match(app,/delivery-customer-control[^`]*delivery-date-slot[^`]*delivery-edit-lines/s);
  assert.match(app,/delivery-edit-hidden[^`]*append\(subject,due,note\)/s);
  assert.match(app,/data-ve-total="sub"/);
  assert.match(app,/data-ve-total="tax"/);
  assert.match(app,/data-ve-total="total"/);
});

test('delivery lines match the six printed columns',()=>{
  assert.match(app,/function shapeDeliveryLines/);
  assert.match(app,/const columns=editing\.type==='納品書'\?6:8/);
  assert.match(app,/heads\[1\]\.textContent='品 番 ・ 品 名'/);
  assert.match(css,/\.delivery-edit-lines \.line-table th:nth-child\(1\)\{width:42%\}/);
  assert.match(css,/\.delivery-item-inputs\{display:grid;grid-template-columns:1fr;grid-template-rows:1fr 1fr/);
  assert.match(css,/\.delivery-item-inputs input:first-child\{border-bottom:1px solid #777!important\}/);
  assert.doesNotMatch(css,/delivery-item-inputs input:first-child\{border-right/);
});

test('delivery editor mirrors printed header and totals layout',()=>{
  for(const selector of ['delivery-edit-title','delivery-edit-meta','delivery-edit-company','delivery-edit-approval','delivery-edit-intro','delivery-edit-totals'])assert.match(css,new RegExp(`\\.${selector}`));
  assert.match(css,/\.delivery-editor\{position:relative;min-height:760px/);
});

test('delivery borders remain continuous around lines and totals',()=>{
  assert.match(app,/class="delivery-edit-controls"/);
  assert.match(app,/delivery-edit-lines'\)\.append\(lineTable\)/);
  assert.match(css,/\.delivery-item-inputs\{display:grid/);
  assert.doesNotMatch(css,/\.delivery-item-cell\{display:grid/);
  assert.match(css,/\.delivery-edit-totals\{height:50px;border:1px solid #111;border-top:0/);
  assert.match(css,/border-collapse:separate!important;border-spacing:0!important;border:1px solid #111!important/);
  assert.match(css,/tr>\*:last-child\{border-right:0!important\}/);
  assert.match(css,/tbody tr:last-child>td\{border-bottom:0!important\}/);
});

test('delivery editor text remains readable against the ruled form',()=>{
  assert.match(css,/delivery-edit-intro[^}]*font-size:13px;font-weight:600/);
  assert.match(css,/line-table th\{[^}]*font-size:13px;font-weight:700/);
  assert.match(css,/line-table input,[^}]*font-size:13px;font-weight:600;color:#000/);
  assert.match(css,/delivery-edit-totals strong[^}]*font-size:15px;font-weight:700/);
});

test('product code candidates filter the code field and fill the selected product',()=>{
  assert.match(app,/data-field="code" list="product-code-list"[^`]*onchange="pickProductCode/);
  assert.match(app,/function productCodeOptions\(\)/);
  const fields=Object.fromEntries(['code','name','unit','price','tax'].map(key=>[key,{value:''}]));
  const row={querySelector(selector){return fields[selector.match(/data-field="([^"]+)"/)?.[1]]||{textContent:''}}};
  const context={
    db:{products:[{code:'A0724',name:'いちばんパンツ',unit:'袋',price:1550,tax:10},{code:'B008',name:'包帯',unit:'個',price:300,tax:8}]},
    editing:{lines:[{code:'',name:'',qty:1,unit:'個',price:0,tax:10}],type:'納品書'},
    document:{querySelector(selector){return selector==='#totals'?{set innerHTML(value){}}:row}},
    esc:String,yen:String,calc(){}
  };
  const start=app.indexOf('function kanaKey('),end=app.indexOf('function taxByRate(',start);
  vm.runInNewContext(app.slice(start,end),context);
  assert.match(vm.runInNewContext('productCodeOptions()',context),/value="A0724">いちばんパンツ/);
  vm.runInNewContext("pickProductCode(0,'A0724')",context);
  assert.equal(context.editing.lines[0].code,'A0724');
  assert.equal(context.editing.lines[0].name,'いちばんパンツ');
  assert.equal(fields.code.value,'A0724');
  assert.equal(fields.name.value,'いちばんパンツ');
  assert.equal(context.editing.lines[0].price,1550);
  vm.runInNewContext("pickProductCode(0,'B008')",context);
  assert.equal(context.editing.lines[0].tax,8);
  vm.runInNewContext("pickProductCode(0,'自由入力')",context);
  assert.equal(context.editing.lines[0].code,'自由入力');
});
