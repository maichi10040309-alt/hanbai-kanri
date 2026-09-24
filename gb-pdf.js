// Exact-size GB1116 PDF output. Text is rasterized at 300 DPI so Japanese glyphs
// come from the browser's local Japanese font without embedding a multi-megabyte font.
(function(){
  const DPI=300,MM_TO_PX=DPI/25.4,PAGE_W=210,PAGE_H=297;
  // Measured from the supplied A4 BP0306 scan (all values in millimetres).
  const columns=[20.4,12.8,48.3,15.4,10,25.5,25.5,25.4];
  const px=mm=>mm*MM_TO_PX;
  const text=x=>x==null?'':String(x);
  const money=x=>typeof yen==='function'?yen(x):`¥${Math.round(Number(x)||0).toLocaleString('ja-JP')}`;
  const dateParts=value=>{const m=text(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?{year:m[1],month:String(Number(m[2])),day:String(Number(m[3])),short:`${m[1].slice(2)}/${m[2].padStart(2,'0')}/${m[3].padStart(2,'0')}`}:{year:'',month:'',day:'',short:text(value)}};
  const chunks=(lines,size)=>{const out=[];for(let i=0;i<lines.length;i+=size)out.push(lines.slice(i,i+size));return out.length?out:[[]]};
  function font(ctx,pt,weight=400){ctx.font=`${weight} ${pt*DPI/72}px "Yu Gothic","Meiryo",sans-serif`;ctx.fillStyle='#000';ctx.textBaseline='top'}
  // Canvas maxWidth keeps the complete string and condenses it only when needed.
  // Never truncate invoice data or replace its tail with an ellipsis.
  function left(ctx,value,x,y,width){ctx.textAlign='left';ctx.fillText(text(value),px(x),px(y),px(width))}
  function center(ctx,value,x,y,width){ctx.textAlign='center';ctx.fillText(text(value),px(x+width/2),px(y),px(width))}
  function right(ctx,value,x,y,width,pad=1){ctx.textAlign='right';ctx.fillText(text(value),px(x+width-pad),px(y),px(width-pad*2))}
  function multiline(ctx,value,x,y,width,lineMm,maxLines){text(value).split(/\r?\n/).slice(0,maxLines).forEach((line,i)=>left(ctx,line,x,y+i*lineMm,width))}
  function imageFrom(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src})}
  async function renderPage(d,co,lines,pageIndex,pageCount,templateImage){
    const canvas=document.createElement('canvas');canvas.width=Math.round(px(PAGE_W));canvas.height=Math.round(px(PAGE_H));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;
    if(templateImage)ctx.drawImage(templateImage,0,0,canvas.width,canvas.height);
    const date=dateParts(d.date),label=typeof recipientLabel==='function'?recipientLabel(d):text(d.customerName),match=label.match(/^(.*?)(様|御中)$/),name=match?match[1].trim():label,suffix=match?match[2]:'';
    font(ctx,11);left(ctx,name,20,25,72);const nameEnd=20+ctx.measureText(name).width/MM_TO_PX;left(ctx,suffix,Math.min(nameEnd+2.5,100),25,10);
    font(ctx,9);left(ctx,date.year,115,18,14);center(ctx,date.month,130,18,8);center(ctx,date.day,142,18,9);left(ctx,d.number,184,18,24);
    font(ctx,8.5);multiline(ctx,[co.name,co.postal?`〒${co.postal}`:'',co.address,co.tel?`TEL. ${co.tel}${co.fax?`  FAX. ${co.fax}`:''}`:'',co.invoiceNo?`登録番号：${co.invoiceNo}`:''].filter(Boolean).join('\n'),135,31,58,3.9,5);
    if(co.stamp&&/^data:image\/(?:png|jpeg|webp);base64,/.test(co.stamp)){try{const img=await imageFrom(co.stamp);ctx.drawImage(img,px(171),px(31),px(22),px(22))}catch(_){}}
    font(ctx,8.5);multiline(ctx,co.bank||'',70,60,105,3.9,4);
    if(pageIndex===0){
      const summary=[d.previousBalance,d.receivedAmount,d.transferFee,d.carryForward,d.sub,d.tax],summaryX=[17.2,42.7,68.1,93.6,119.1,144.5];
      summary.forEach((value,i)=>{font(ctx,9);right(ctx,value==null||value===''?'':money(value),summaryX[i],80.2,25.4)});
      font(ctx,11,700);right(ctx,money(d.total),172.6,80.2,27.9);
    }
    const startX=17.1,startY=93.7,rowH=(284.4-93.7)/22;let edges=[startX];columns.forEach(w=>edges.push(edges[edges.length-1]+w));
    for(let i=0;i<22;i++){
      const l=lines[i];if(!l)continue;const y=startY+i*rowH+2.05;const firstDate=l.sourceDate||(!d.periodStart&&i===0?date.short:'');const firstNo=l.sourceNumber||(!d.periodStart&&i===0?d.number:'');
      font(ctx,9);left(ctx,firstDate,edges[0]+1,y,columns[0]-2);left(ctx,firstNo,edges[1]+1,y,columns[1]-2);
      font(ctx,7.5);left(ctx,l.code,edges[2]+1,startY+i*rowH+0.65,columns[2]-2);left(ctx,l.name,edges[2]+1,startY+i*rowH+3.55,columns[2]-2);
      font(ctx,9);right(ctx,l.qty,edges[3],y,columns[3]);left(ctx,l.unit,edges[4]+1,y,columns[4]-2);right(ctx,money(l.price),edges[5],y,columns[5]);right(ctx,money(l.amount??Number(l.qty)*Number(l.price)),edges[6],y,columns[6]);
    }
    return canvas.toDataURL('image/jpeg',0.96);
  }
  window.printGbPdf=async function(d,c,co,options={}){
    if(!window.jspdf?.jsPDF){alert('PDF生成機能を読み込めませんでした。ページを再読み込みしてください。');return}
    const preview=window.open('','_blank');if(!preview){alert('PDFを開けません。ポップアップを許可してください。');return}preview.document.write('<p style="font-family:sans-serif">実寸PDFを生成しています…</p>');
    try{await document.fonts.ready;const pages=chunks(d.lines||[],22),templateImage=options.showTemplate?await imageFrom('assets/bp0306-template.jpg?v=20260924-1'):null;const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
      for(let i=0;i<pages.length;i++){if(i)pdf.addPage('a4','portrait');const image=await renderPage(d,co||{},pages[i],i,pages.length,templateImage);pdf.addImage(image,'JPEG',0,0,PAGE_W,PAGE_H,undefined,'FAST')}
      const url=URL.createObjectURL(pdf.output('blob'));preview.location.replace(url);setTimeout(()=>URL.revokeObjectURL(url),300000);
    }catch(error){preview.close();console.error(error);alert('PDFの生成に失敗しました。')}
  };
})();
