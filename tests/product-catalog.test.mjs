import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function productKey(');
const end=app.indexOf('let showAllProducts=',start);
const code=app.slice(start,end);

test('catalog usage follows delivery notes only, matching code before normalized name',()=>{
  const products=[
    {id:'a',code:'A-01',name:'包帯'},
    {id:'b',code:'B-02',name:'包帯'},
    {id:'c',code:'C-03',name:'リハビリ用品'},
    {id:'d',code:'',name:'ﾊﾟﾝﾂ'},
    {id:'e',code:'E-05',name:'未使用'}
  ];
  const documents=[
    {type:'見積書',lines:[{code:'E-05',name:'未使用'}]},
    {type:'納品書',lines:[{code:'A-01',name:'包帯'},{code:'',name:'パンツ'},{code:'OLD',name:'リハビリ用品'}]}
  ];
  const context={kanaKey:value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60))};
  vm.createContext(context);vm.runInContext(code,context);
  assert.deepEqual([...context.usedProductIds(products,documents)].sort(),['a','c','d']);
  assert.deepEqual(JSON.parse(JSON.stringify(context.duplicateProducts(products).map(group=>group.map(p=>p.id)))),[['a','b']]);
  assert.deepEqual([...context.duplicateProductCodes([{code:'A',name:'一'}, {code:'a',name:'二'}])].map(group=>group.length),[2]);
});
