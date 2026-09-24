// Extend the existing settings screen without replacing saved company data.
(function(){
  const baseSettings=window.settings;
  const baseSave=window.saveSettings;
  let pendingStamp=null;
  const stampPreview=()=>{
    const el=document.querySelector('#s-stamp-preview');
    if(el)el.innerHTML=pendingStamp?`<img src="${pendingStamp}" alt="登録する社印" style="max-width:110px;max-height:110px;object-fit:contain">`:'社印は登録されていません';
  };
  window.settings=function(){
    baseSettings();
    const company=db.company||{};
    pendingStamp=company.stamp||null;
    const bank=document.querySelector('#s-bank');
    if(bank){const area=document.createElement('textarea');area.id='s-bank';area.rows=3;area.value=company.bank||'';area.placeholder='銀行名・支店名・口座種別・口座番号・名義';bank.replaceWith(area)}
    const invoice=document.querySelector('#s-invoice')?.closest('.field');
    if(invoice){
      const fax=document.createElement('div');fax.className='field';fax.innerHTML='<label for="s-fax">FAX番号</label><input id="s-fax">';fax.querySelector('input').value=company.fax||'';invoice.after(fax);
      const contact=document.createElement('div');contact.className='field';contact.innerHTML='<label for="s-contact">担当者</label><input id="s-contact">';contact.querySelector('input').value=company.contactPerson||'';fax.after(contact);
    }
    const grid=document.querySelector('#s-note')?.closest('.form-grid');
    if(grid){const field=document.createElement('div');field.className='field full';field.innerHTML='<label for="s-stamp">社印画像（PNG・JPEG・WebP、500KB以下）</label><input id="s-stamp" type="file" accept="image/png,image/jpeg,image/webp"><div id="s-stamp-preview" style="margin:10px 0;min-height:40px"></div><button type="button" class="secondary" id="s-stamp-remove">社印を削除</button><p class="hint">透明背景のPNG画像がおすすめです。社印は納品書・見積書の印刷に表示されます。</p>';grid.append(field);stampPreview();field.querySelector('#s-stamp').addEventListener('change',async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>500*1024){alert('PNG・JPEG・WebP形式、500KB以下の画像を選択してください。');e.target.value='';return}
      try{const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});pendingStamp=image;stampPreview()}catch{alert('画像を読み込めませんでした')}
    });field.querySelector('#s-stamp-remove').addEventListener('click',()=>{pendingStamp=null;field.querySelector('#s-stamp').value='';stampPreview()})}
  };
  window.saveSettings=function(){const fax=document.querySelector('#s-fax')?.value||'',contactPerson=document.querySelector('#s-contact')?.value||'';const stamp=pendingStamp;baseSave();db.company.fax=fax;db.company.contactPerson=contactPerson;db.company.stamp=stamp;save();toast('会社情報・社印を保存しました')};
})();
