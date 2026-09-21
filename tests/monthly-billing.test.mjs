import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const print=readFileSync(new URL('../print-templates.js',import.meta.url),'utf8');

test('summary invoice list exposes monthly closing and manual creation',()=>{
  assert.match(app,/月締め請求書を作成/);
  assert.match(app,/手入力で作成/);
  assert.match(app,/monthlyInvoiceModal\(\)/);
});

test('only customers with unbilled deliveries in the selected period are offered',()=>{
  assert.match(app,/function monthlyEligibleCustomers/);
  assert.match(app,/d\.date>=start&&d\.date<=end&&!used\.has\(d\.id\)/);
  assert.match(app,/未集計の納品書がある得意先はいません/);
});

test('multiple customers can be selected and invoiced in one operation',()=>{
  assert.match(app,/class="monthly-customer-check"/);
  assert.match(app,/function selectedMonthlyCustomerIds/);
  assert.match(app,/async function createMonthlyInvoices/);
  assert.match(app,/for\(const customerId of customerIds\)/);
  assert.match(app,/db\.documents\.push\(doc\)/);
});

test('customer closing day determines the billing period',()=>{
  const source=app.match(/function closingPeriod\([^\n]+/)[0];
  const closingPeriod=Function(`${source};return closingPeriod`)();
  assert.deepEqual(closingPeriod({closing:'末日'},'2026-09-21'),{start:'2026-09-01',end:'2026-09-30'});
  assert.deepEqual(closingPeriod({closing:'20日'},'2026-09-21'),{start:'2026-08-21',end:'2026-09-20'});
  assert.deepEqual(closingPeriod({closing:'31日'},'2026-02-10'),{start:'2026-02-01',end:'2026-02-28'});
});

test('monthly billing filters deliveries and prevents duplicate aggregation',()=>{
  assert.match(app,/d\.type==='納品書'/);
  assert.match(app,/!used\.has\(d\.id\)/);
  assert.match(app,/sourceDeliveryIds:data\.deliveries\.map\(d=>d\.id\)/);
});

test('monthly billing includes payments, carry-forward, tax, and source totals',()=>{
  assert.match(app,/receivedAmount=payments\.reduce/);
  assert.match(app,/carry=data\.previousBalance-data\.receivedAmount-fee/);
  assert.match(app,/taxAmount:Number\(d\.tax\)/);
  assert.match(app,/total:carry\+sub\+tax/);
});

test('GB1116 detail rows print each source delivery date, number, and total',()=>{
  assert.match(print,/l\.sourceDate/);
  assert.match(print,/l\.sourceNumber/);
  assert.match(print,/l\.amount\?\?/);
});
