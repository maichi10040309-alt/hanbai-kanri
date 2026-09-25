// A4CF2 delivery-note alignment PDF. The supplied second PDF page is used only
// as an on-screen calibration background; normal delivery printing stays clean.
(function(){
  const DPI=300,MM_TO_PX=DPI/25.4,PAGE_W=210,PAGE_H=297,ROW_COUNT=6;
  const px=mm=>mm*MM_TO_PX,text=x=>x==null?'':String(x);
  const chunks=(lines,size)=>{const out=[];for(let i=0;i<lines.length;i+=size)out.push(lines.slice(i,i+size));return out.length?out:[[]]};
  const imageFrom=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
  function font(ctx,pt,weight=400,color='#d00000'){ctx.font=`${weight} ${pt*DPI/72}px "MS Mincho","ＭＳ 明朝","Yu Mincho",serif`;ctx.fillStyle=color;ctx.textBaseline='top'}
  function left(ctx,value,x,y,width){ctx.textAlign='left';ctx.fillText(text(value),px(x),px(y),px(width))}
  function right(ctx,value,x,y,width,pad=1){ctx.textAlign='right';ctx.fillText(text(value),px(x+width-pad),px(y),px(width-pad*2))}
  function pageDate(value){const m=text(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?[m[1],String(Number(m[2])),String(Number(m[3]))]:[text(value),'','']}
  function plainMoney(value){return Math.round(Number(value)||0).toLocaleString('ja-JP')}
  async function renderPage(d,c,co,lines,pageIndex,pageCount,template){
    const canvas=document.createElement('canvas');canvas.width=Math.round(px(PAGE_W));canvas.height=Math.round(px(PAGE_H));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(template,0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;
    const recipient=typeof recipientLabel==='function'?recipientLabel(d):text(d.customerName);
    for(const baseY of [0,148.5]){
      // The preprinted date has three separate boxes. Do not print 年/月/日 again.
      const [year,month,day]=pageDate(d.date);
      font(ctx,9);left(ctx,year,155.5,13.5+baseY,10);left(ctx,month,166.5,13.5+baseY,6);left(ctx,day,174.5,13.5+baseY,6);left(ctx,d.number,186,13.5+baseY,20);
      font(ctx,11);left(ctx,recipient,20,31.5+baseY,84);
      font(ctx,9);left(ctx,c?.code||'',20,43+baseY,30);
      font(ctx,9.5);left(ctx,co.name,125,24+baseY,65);
      font(ctx,8.5);left(ctx,co.postal?`〒${co.postal}`:'',125,30+baseY,65);left(ctx,co.address,125,34+baseY,65);left(ctx,co.tel||co.fax?`TEL. ${co.tel||''}${co.fax?`  FAX. ${co.fax}`:''}`:'',125,38+baseY,65);left(ctx,co.invoiceNo?`登録番号：${co.invoiceNo}`:'',125,42+baseY,65);left(ctx,co.contactPerson?`担当：${co.contactPerson}`:'',139,46+baseY,40);
      if(co.stamp&&/^data:image\/(?:png|jpeg|webp);base64,/.test(co.stamp)){try{const stamp=await imageFrom(co.stamp);ctx.drawImage(stamp,px(169),px(25+baseY),px(22),px(22))}catch(_){}}
      const y0=76+baseY,rowH=8;
      for(let i=0;i<ROW_COUNT;i++){const l=lines[i];if(!l)continue;const y=y0+i*rowH;font(ctx,9);left(ctx,l.code,18.5,y+0.4,75);font(ctx,9.5);left(ctx,l.name,18.5,y+4.2,75);font(ctx,9);right(ctx,l.qty,95,y+2.3,20);left(ctx,l.unit,116,y+2.3,13);right(ctx,plainMoney(l.price),129,y+2.3,24);right(ctx,plainMoney(l.amount??Number(l.qty)*Number(l.price)),153,y+2.3,24.5)}
      if(pageIndex===pageCount-1){font(ctx,9);right(ctx,plainMoney(d.sub),87,128+baseY,35);right(ctx,plainMoney(d.tax),122,128+baseY,35);font(ctx,10,700);right(ctx,plainMoney(d.total),157,128+baseY,44)}
    }
    return canvas.toDataURL('image/jpeg',0.96);
  }
  window.printDeliveryTemplatePdf=async function(d,c,co){
    if(!window.jspdf?.jsPDF){alert('PDF生成機能を読み込めませんでした。ページを再読み込みしてください。');return}
    const preview=window.open('','_blank');if(!preview){alert('PDFを開けません。ポップアップを許可してください。');return}preview.document.write('<p style="font-family:serif">納品書の位置合わせPDFを生成しています…</p>');
    try{await document.fonts.ready;const template=await imageFrom('assets/delivery-template.jpg?v=20260924-1'),pages=chunks(d.lines||[],ROW_COUNT),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});for(let i=0;i<pages.length;i++){if(i)pdf.addPage('a4','portrait');const image=await renderPage(d,c||{},co||{},pages[i],i,pages.length,template);pdf.addImage(image,'JPEG',0,0,PAGE_W,PAGE_H,undefined,'FAST')}const url=URL.createObjectURL(pdf.output('blob'));preview.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(error){preview.close();console.error(error);alert('納品書の位置合わせPDF生成に失敗しました。')}
  };
})();
