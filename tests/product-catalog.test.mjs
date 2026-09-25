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
  const preferred=context.preferredProducts([
    {id:'low',code:'X',name:'ｼｬﾜｰﾍﾞﾝﾁ',price:30000},
    {id:'high',code:'Y',name:'シャワーベンチ',price:42000},
    {id:'collision',code:'Y',name:'血圧計',price:7900}
  ]);
  assert.deepEqual([...preferred].map(p=>p.id),['high','collision']);
});

test('large catalogs render only one page of preferred products',()=>{
  const products=Array.from({length:1600},(_,i)=>({id:String(i),code:`P${i}`,name:`商品${i}`,unit:'個',price:i,tax:10}));
  products.push({id:'duplicate',code:'OLD',name:'商品42',unit:'個',price:1,tax:10});
  const appNode={innerHTML:''},results={innerHTML:''};
  const context={db:{products,documents:[]},showAllProducts:true,productPage:0,productQuery:'',title(){},esc:String,yen:String,
    kanaKey:value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)),
    document:{querySelector:selector=>selector==='#app'?appNode:results}};
  vm.createContext(context);
  vm.runInContext(code+app.slice(app.indexOf('function products(){',end),app.indexOf('function masterModal(',end)).replace('function products(){','function products(){'),context);
  // The production paging limit is 80, including catalogs larger than the supplied CSV.
  context.products();
  assert.equal((results.innerHTML.match(/<tr>/g)||[]).length,81);
  assert.match(appNode.innerHTML,/重複で非表示 1件/);
  assert.doesNotMatch(results.innerHTML,/OLD/);
});
