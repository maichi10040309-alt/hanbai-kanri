// A4CF2 delivery-note alignment PDF. The supplied second PDF page is used only
// as an on-screen calibration background; normal delivery printing stays clean.
(function(){
  const DPI=300,MM_TO_PX=DPI/25.4,PAGE_W=210,PAGE_H=297,ROW_COUNT=6;
  const px=mm=>mm*MM_TO_PX,text=x=>x==null?'':String(x);
  const chunks=(lines,size)=>{const out=[];for(let i=0;i<lines.length;i+=size)out.push(lines.slice(i,i+size));return out.length?out:[[]]};
  const printableLines=lines=>{const copy=[...(lines||[])];while(copy.length){const l=copy[copy.length-1];if(text(l.code).trim()||text(l.name).trim()||text(l.note).trim()||Number(l.price)||Number(l.qty)!==1)break;copy.pop()}return copy};
  const imageFrom=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
  let ink='#d00000';
  function font(ctx,pt,weight=400,color=ink){ctx.font=`${weight} ${(pt+(ink==='#000'?1:0))*DPI/72}px "MS Mincho","ＭＳ 明朝","Yu Mincho",serif`;ctx.fillStyle=color;ctx.textBaseline='top'}
  function left(ctx,value,x,y,width){ctx.textAlign='left';ctx.fillText(text(value),px(x),px(y),px(width))}
  function right(ctx,value,x,y,width,pad=1){ctx.textAlign='right';ctx.fillText(text(value),px(x+width-pad),px(y),px(width-pad*2))}
  function pageDate(value){const m=text(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?[m[1],String(Number(m[2])),String(Number(m[3]))]:[text(value),'','']}
  function plainMoney(value){return Math.round(Number(value)||0).toLocaleString('ja-JP')}
  function blankForm(ctx,baseY){
    ctx.strokeStyle='#000';ctx.lineWidth=px(0.18);
    const box=(x,y,w,h)=>ctx.strokeRect(px(x),px(y+baseY),px(w),px(h));
    const line=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(px(x1),px(y1+baseY));ctx.lineTo(px(x2),px(y2+baseY));ctx.stroke()};
    box(99,7,40,12);font(ctx,15,700);ctx.textAlign='center';ctx.fillText(baseY?'納品書（控）':'納品書',px(119),px(9+baseY),px(36));
    ctx.lineWidth=px(0.35);box(151,7,54,12);ctx.lineWidth=px(0.18);line(151,12,205,12);line(181,7,181,19);font(ctx,7);left(ctx,'発行日',158,8,16);left(ctx,'No.',188,8,12);
    line(20,40,90,40);box(159,53,46,13);line(163,53,163,66);line(177,53,177,66);line(191,53,191,66);font(ctx,7);left(ctx,'検',159.5,54,3);left(ctx,'印',159.5,57.3,3);
    font(ctx,8);left(ctx,'毎度ありがとうございます。下記の通り納品致しましたのでご査収下さい。',19,68,185);
    ctx.lineWidth=px(0.35);box(18.5,72,186.5,63);ctx.lineWidth=px(0.18);for(const y of [76,84,92,100,108,116,124])line(18.5,y,205,y);
    for(const x of [95,115,129,153,178])line(x,72,x,124);
    ctx.lineWidth=px(0.18);
    font(ctx,8);left(ctx,'品番・品名',45,72.5,45);left(ctx,'数量',99,72.5,16);left(ctx,'単位',118,72.5,10);left(ctx,'単価',136,72.5,16);left(ctx,'金額',159,72.5,18);left(ctx,'備考',186,72.5,18);
    line(85,124,85,135);line(115,124,115,135);line(157,124,157,135);
    font(ctx,7);left(ctx,'税抜合計',86,124.5,28);left(ctx,'消費税額',116,124.5,39);left(ctx,'合計金額',158,124.5,45);
  }
  async function renderPage(d,c,co,lines,pageIndex,pageCount,template){
    const canvas=document.createElement('canvas');canvas.width=Math.round(px(PAGE_W));canvas.height=Math.round(px(PAGE_H));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);if(template)ctx.drawImage(template,0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ink=template?'#d00000':'#000';
    ctx.translate(px(-2),0);
    const recipient=typeof recipientLabel==='function'?recipientLabel(d):text(d.customerName);
    const match=recipient.match(/^(.*?)(様|御中)$/),recipientName=match?match[1].trim():recipient,salutation=match?match[2]:'';
    for(const baseY of [0,148.5]){
      if(!template)blankForm(ctx,baseY);
      const [year,month,day]=pageDate(d.date);
      font(ctx,9);if(template){
        // The supplied form already has 年/月/日 labels.
        left(ctx,year,155.5,13.5+baseY,10);left(ctx,month,166.5,13.5+baseY,6);left(ctx,day,174.5,13.5+baseY,6);
      }else{
        left(ctx,`${year}年 ${month}月 ${day}日`,153,13+baseY,27);
      }left(ctx,d.number,186,13.5+baseY,18);
      font(ctx,11);left(ctx,recipientName,20,31.5+baseY,72);if(salutation)left(ctx,salutation,95,38+baseY,10);
      font(ctx,9);const customerLabel='お客様番号';left(ctx,customerLabel,21,42+baseY,35);left(ctx,c?.code||'',21+ctx.measureText(customerLabel).width/MM_TO_PX+3,42+baseY,42);
      font(ctx,9.5);left(ctx,co.name,125,24+baseY,65);
      font(ctx,8.5);left(ctx,co.postal?`〒${co.postal}`:'',125,30+baseY,65);left(ctx,co.address,125,34+baseY,65);left(ctx,co.tel||co.fax?`TEL. ${co.tel||''}${co.fax?`  FAX. ${co.fax}`:''}`:'',125,38+baseY,65);left(ctx,co.invoiceNo?`登録番号：${co.invoiceNo}`:'',125,42+baseY,65);const contact=d.contactPerson??co.contactPerson;left(ctx,contact?`担当：${contact}`:'',139,46+baseY,40);
      if(co.stamp&&/^data:image\/(?:png|jpeg|webp);base64,/.test(co.stamp)){try{const stamp=await imageFrom(co.stamp);ctx.drawImage(stamp,px(185),px(25+baseY),px(20),px(20))}catch(_){}}
      const y0=76+baseY,rowH=8;
      for(let i=0;i<ROW_COUNT;i++){const l=lines[i];if(!l)continue;const y=y0+i*rowH;font(ctx,9);left(ctx,l.code,19.5,y+0.4,74);font(ctx,9.5);left(ctx,l.name,19.5,y+4.2,74);font(ctx,9);right(ctx,l.qty,95,y+2.3,20);left(ctx,l.unit,118,y+2.3,13);right(ctx,plainMoney(l.price),129,y+2.3,24);right(ctx,plainMoney(l.amount??Number(l.qty)*Number(l.price)),153,y+2.3,24.5);font(ctx,8);left(ctx,l.note,178,y+2.3,27)}
      if(pageIndex===pageCount-1){font(ctx,9);right(ctx,plainMoney(d.sub),85,128+baseY,30);right(ctx,plainMoney(d.tax),115,128+baseY,42);font(ctx,10,700);right(ctx,plainMoney(d.total),157,128+baseY,48)}
    }
    return canvas.toDataURL('image/jpeg',0.96);
  }
  window.printDeliveryTemplatePdf=async function(d,c,co){
    if(!window.jspdf?.jsPDF){alert('PDF生成機能を読み込めませんでした。ページを再読み込みしてください。');return}
    const preview=window.open('','_blank');if(!preview){alert('PDFを開けません。ポップアップを許可してください。');return}preview.document.write('<p style="font-family:serif">納品書の位置合わせPDFを生成しています…</p>');
    try{await document.fonts.ready;const template=await imageFrom('assets/delivery-template.jpg?v=20260924-1'),pages=chunks(printableLines(d.lines),ROW_COUNT),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});for(let i=0;i<pages.length;i++){if(i)pdf.addPage('a4','portrait');const image=await renderPage(d,c||{},co||{},pages[i],i,pages.length,template);pdf.addImage(image,'JPEG',0,0,PAGE_W,PAGE_H,undefined,'FAST')}const url=URL.createObjectURL(pdf.output('blob'));preview.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(error){preview.close();console.error(error);alert('納品書の位置合わせPDF生成に失敗しました。')}
  };
  window.printDeliveryPdf=async function(d,c,co){
    if(!window.jspdf?.jsPDF){alert('PDF生成機能を読み込めませんでした。ページを再読み込みしてください。');return}
    const preview=window.open('','_blank');if(!preview){alert('PDFを開けません。ポップアップを許可してください。');return}preview.document.write('<p style="font-family:serif">納品書PDFを生成しています…</p>');
    try{await document.fonts.ready;const pages=chunks(printableLines(d.lines),ROW_COUNT),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});for(let i=0;i<pages.length;i++){if(i)pdf.addPage('a4','portrait');const image=await renderPage(d,c||{},co||{},pages[i],i,pages.length,null);pdf.addImage(image,'JPEG',0,0,PAGE_W,PAGE_H,undefined,'FAST')}const url=URL.createObjectURL(pdf.output('blob'));preview.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),300000)}catch(error){preview.close();console.error(error);alert('納品書PDF生成に失敗しました。')}
  };
})();
