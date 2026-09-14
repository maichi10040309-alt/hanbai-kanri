// Editable document-shaped forms. Existing document persistence and tax rules stay in app.js.
(function(){
  const originalEditor=window.editor, originalDraw=window.drawLines, originalCalc=window.calc, originalSave=window.saveDoc;
  const kinds=['見積書','納品書','合計請求書','請求書','領収書'];
  const rows={見積書:17,納品書:6,合計請求書:16,請求書:12,領収書:1};
  const h=x=>esc(x??'');
  const input=(key,label,value='',kind='text')=>`<label class="ve-field"><span>${label}</span><input data-extra="${key}" type="${kind}" value="${h(value)}"></label>`;
  function keepFields(){if(!editing)return;for(const [key,id] of [['type','d-type'],['date','d-date'],['due','d-due'],['customerName','d-customer'],['subject','d-subject'],['note','d-note']]){const el=document.getElementById(id);if(el)editing[key]=el.value}document.querySelectorAll('[data-extra]').forEach(el=>{editing[el.dataset.extra]=el.value})}
  function extras(d){
    if(d.type==='見積書')return `<div class="ve-extra ve-estimate">${input('deliveryPlace','受渡場所',d.deliveryPlace)}${input('transactionMethod','取引方法',d.transactionMethod)}${input('validUntil','有効期限',d.validUntil,'date')}${input('contactPerson','担当者',d.contactPerson)}</div>`;
    if(d.type==='合計請求書')return `<div class="ve-extra ve-summary">${input('previousBalance','前回御請求額',d.previousBalance,'number')}${input('receivedAmount','御入金額',d.receivedAmount,'number')}${input('transferFee','振込手数料',d.transferFee,'number')}${input('carryForward','繰越金額',d.carryForward,'number')}<label class="ve-field"><span>締切日</span><input data-extra="closingDate" type="date" value="${h(d.closingDate)}"></label></div>`;
    if(d.type==='領収書')return `<div class="ve-extra ve-receipt">${input('cashAmount','現金',d.cashAmount,'number')}${input('checkAmount','小切手',d.checkAmount,'number')}${input('billAmount','手形',d.billAmount,'number')}${input('offsetAmount','相殺',d.offsetAmount,'number')}${input('feeAmount','振込手数料',d.feeAmount,'number')}${input('otherAmount','その他',d.otherAmount,'number')}${input('deliveryDestination','納品先',d.deliveryDestination)}</div>`;
    return '';
  }
  function decorateLines(){
    const body=document.getElementById('lines');if(!body||!editing)return;
    const capacity=rows[editing.type]||12,used=editing.lines.length,pageCount=Math.max(1,Math.ceil(used/capacity));
    body.querySelectorAll('.ve-page-break,.ve-blank').forEach(el=>el.remove());
    const real=[...body.querySelectorAll('tr[data-line]')];
    for(let p=0;p<pageCount;p++){
      if(p){const marker=document.createElement('tr');marker.className='ve-page-break';marker.innerHTML=`<td colspan="8">${p+1}ページ目の明細</td>`;real[p*capacity]?.before(marker)}
      const last=Math.min(used,(p+1)*capacity),empty=capacity-(last-p*capacity);
      const target=real[last-1]||body.lastElementChild;
      for(let n=0;n<empty;n++){const tr=document.createElement('tr');tr.className='ve-blank';tr.innerHTML='<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>';if(target)target.after(tr);else body.append(tr)}
    }
    const pager=document.querySelector('#ve-pages');if(pager)pager.textContent=`Page. 1 / ${pageCount}　（1ページ ${capacity}行）`;
  }
  window.drawLines=function(){originalDraw();decorateLines()};
  window.calc=function(){originalCalc();const t=totals();for(const [key,value] of Object.entries({sub:t.sub,tax:t.tax,total:t.total})){const node=document.querySelector(`[data-ve-total="${key}"]`);if(node)node.textContent=yen(value)}};
  window.editor=function(){
    originalEditor();const d=editing,type=d.type,company=db.company||{},root=document.querySelector('#app'),card=root.querySelector('.card');
    card.classList.add('ve-card');const oldHeading=card.querySelector(':scope > h2');
    const form=card.querySelector('.form-grid'),lineTable=card.querySelector('.line-table'),lineButton=lineTable?.nextElementSibling,total=card.querySelector('#totals'),note=card.querySelector('#d-note')?.closest('.field'),actions=card.querySelector('.toolbar.no-print');
    const toolbar=document.createElement('div');toolbar.className='ve-toolbar';toolbar.innerHTML='<label>伝票種類</label><span class="ve-type-slot"></span><span class="ve-hint">伝票の枠内に入力してください。明細は固定行数を超えると次ページに続きます。</span>';
    card.prepend(toolbar);toolbar.querySelector('.ve-type-slot').append(form.querySelector('#d-type'));
    const sheet=document.createElement('div');sheet.className=`ve-sheet ve-${{見積書:'estimate',納品書:'delivery',合計請求書:'summary',請求書:'invoice',領収書:'receipt'}[type]}`;
    sheet.innerHTML=`<div class="ve-header"><div class="ve-recipient"><label class="ve-field"><span>得意先</span><span class="ve-customer-slot"></span></label><small>ここをクリックして得意先を入力します</small></div><div class="ve-heading"><h2>${type==='見積書'?'御見積書':type}</h2><div class="ve-number">No. ${h(d.number||'保存時に発番')}</div><div id="ve-pages">Page. 1 / 1</div><span class="ve-date-slot"></span><div class="ve-company">${h(company.name)}<br>〒${h(company.postal)}　${h(company.address)}<br>TEL ${h(company.tel)}${company.fax?`　FAX ${h(company.fax)}`:''}${company.invoiceNo?`<br>登録番号：${h(company.invoiceNo)}`:''}${/^data:image\/(png|jpeg|webp);base64,/.test(company.stamp||'')?`<img src="${company.stamp}" alt="社印">`:''}</div></div></div><div class="ve-details">${type==='見積書'?'<div>下記の通り御見積り申し上げます。</div>':type==='納品書'?'<div>毎度ありがとうございます。下記の通り納品致しましたのでご査収下さい。</div>':type==='領収書'?'<div>上記の通り正に領収致しました。</div>':''}<div class="ve-amount"><strong>${type==='見積書'?'合計金額':type==='請求書'?'今回御請求額':type==='領収書'?'合計金額':'合計金額'}　<span data-ve-total="total"></span></strong><small>税抜合計 <span data-ve-total="sub"></span>　消費税額 <span data-ve-total="tax"></span></small></div><div class="ve-subject-slot"></div><div class="ve-due-slot"></div>${extras(d)}</div><div class="ve-lines"><h3>${type==='領収書'?'領収内訳・明細':'品番・品名　／　数量・単位・単価・税率・金額'}</h3></div><div class="ve-note"></div>`;
    toolbar.after(sheet);
    sheet.querySelector('.ve-customer-slot').append(form.querySelector('#d-customer'));sheet.querySelector('.ve-customer-slot').append(form.querySelector('#customer-list'));
    sheet.querySelector('.ve-date-slot').append(form.querySelector('#d-date'));
    sheet.querySelector('.ve-subject-slot').innerHTML='<label class="ve-field"><span>件名・摘要</span></label>';sheet.querySelector('.ve-subject-slot label').append(form.querySelector('#d-subject'));
    sheet.querySelector('.ve-due-slot').innerHTML='<label class="ve-field"><span>支払期限・納入期日</span></label>';sheet.querySelector('.ve-due-slot label').append(form.querySelector('#d-due'));
    sheet.querySelector('.ve-lines').append(lineTable,lineButton);
    sheet.querySelector('.ve-note').innerHTML='<label class="ve-field"><span>備考</span></label>';sheet.querySelector('.ve-note label').append(note.querySelector('#d-note'));
    form.remove();note.remove();oldHeading?.remove();total.hidden=true;card.append(actions);
    sheet.querySelector('#d-date').addEventListener('change',keepFields);
    toolbar.querySelector('#d-type').addEventListener('change',()=>{keepFields();window.editor()});
    sheet.querySelectorAll('[data-extra]').forEach(el=>el.addEventListener('change',keepFields));
    decorateLines();window.calc();
  };
  window.saveDoc=function(){keepFields();originalSave()};
})();
