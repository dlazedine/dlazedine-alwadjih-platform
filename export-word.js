/* تصدير التقرير كملف Word حقيقي (.docx) بقيمه المدخلة، دون أي مكتبة خارجية */
function wordNorm(root){
  const esc=t=>String(t==null?'':t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const fdv=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):v;
  const n=root.cloneNode(true),O=[...root.querySelectorAll('input,select,textarea')],C=[...n.querySelectorAll('input,select,textarea')];
  C.forEach((e,i)=>{const o=O[i],s=document.createElement('span');s.className='v';
    if(o.type==='radio')s.textContent=o.checked?'☒':'☐';
    else if(o.tagName==='TEXTAREA'){const t=o.value.trim();s.style.display='block';s.innerHTML=t?esc(t).replace(/\n/g,'<br>'):('…………………………………………………………………………………<br>').repeat(6)}
    else{const t=o.tagName==='SELECT'?(o.options[o.selectedIndex]||{}).text:fdv(o.value);s.innerHTML=esc(t)||'…………………'}
    e.replaceWith(s)});
  const T=[...root.querySelectorAll('.ttl')];
  n.querySelectorAll('.ttl').forEach((t,i)=>{const cs=getComputedStyle(T[i]);const w=Math.max(70,Math.round(T[i].getBoundingClientRect().width/root.getBoundingClientRect().width*100)||60);
    t.outerHTML=`<table align="center" width="${w}%" style="margin:6pt auto;border-collapse:collapse"><tr><td align="center" style="background:${cs.backgroundColor};color:${cs.color};border:1pt solid #888;padding:3pt 8pt;font-weight:bold;font-size:14pt">${esc(t.textContent.trim())}</td></tr></table>`});
  n.querySelectorAll('.bxs').forEach(b=>{b.outerHTML='<table align="center" width="80%" style="margin:6pt auto;border-collapse:collapse"><tr>'+[...b.children].map(l=>`<td align="center" style="border:1pt solid #000;padding:3pt;font-weight:bold">${esc(l.textContent.trim())}</td>`).join('')+'</tr></table>'});
  n.querySelectorAll('.row,.hd,.sig').forEach(r=>{const t=document.createElement('table'),tr=document.createElement('tr');t.setAttribute('width','100%');t.style.cssText='width:100%;border-collapse:collapse';
    [...r.children].forEach(ch=>{const td=document.createElement('td');td.innerHTML=ch.innerHTML;td.style.cssText='padding:1pt 4pt;vertical-align:top'+(ch.classList.contains('l')?';text-align:left':'')+(r.classList.contains('sig')?';text-align:center;font-weight:bold':'');tr.appendChild(td)});
    t.appendChild(tr);r.replaceWith(t)});
  n.querySelectorAll('.ln').forEach(l=>{l.innerHTML=[...l.children].map(c=>c.outerHTML).join('&emsp;&emsp;')});
  n.querySelectorAll('.q').forEach(q=>{const p=document.createElement('p');p.innerHTML=q.innerHTML;q.replaceWith(p)});
  n.querySelectorAll('table.ls,table.sc,table.cm').forEach(t=>{t.setAttribute('width','100%');t.style.borderCollapse='collapse';t.querySelectorAll('td,th').forEach(c=>{c.style.cssText+=';border:1pt solid #000;padding:2pt 5pt'+(t.classList.contains('cm')?';text-align:center;height:26pt':'')+(c.tagName==='TH'?';white-space:nowrap':'')})});
  n.querySelectorAll('table.ls').forEach(t=>{const r=t.querySelectorAll('tr');[...r[r.length-1].querySelectorAll('th')].forEach(h=>{h.setAttribute('nowrap','nowrap');h.style.width='11%'})});
  n.querySelectorAll('table.two').forEach(t=>{t.setAttribute('width','100%');t.style.cssText='width:100%;border-collapse:collapse;border-top:2pt solid #000;border-bottom:2pt solid #000';const d=t.querySelectorAll('td');d[0].style.cssText+=';width:50%;vertical-align:top;border-left:2pt solid #000;padding:3pt 6pt';d[1].style.cssText+=';width:50%;vertical-align:top;padding:3pt 6pt'});
  n.querySelectorAll('.pn').forEach(p=>p.style.cssText='text-align:center;border-top:1pt solid #000;font-weight:bold;margin-top:8pt');
  n.querySelectorAll('.code').forEach(p=>p.style.cssText='text-align:left;font-weight:bold');
  n.querySelectorAll('.pg').forEach((p,i)=>{if(i)p.insertAdjacentHTML('beforebegin','<br clear="all" style="page-break-before:always;mso-break-type:page-break">')});
  return n}

/* ===== تحويل الصفحة المنسّقة إلى ملف Word حقيقي (.docx) ===== */
const BL=new Set(['DIV','P','TABLE']),XE=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const hx=c=>{const m=/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c||'');if(m)return(m[4]!==undefined&&+m[4]===0)?null:[m[1],m[2],m[3]].map(v=>(+v).toString(16).padStart(2,'0')).join('').toUpperCase();return null};
const SZ=20;
function dRun(t,c){return t===''?'':`<w:r><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/>${c.b?'<w:b/><w:bCs/>':''}${c.col?`<w:color w:val="${c.col}"/>`:''}<w:sz w:val="${c.sz||SZ}"/><w:szCs w:val="${c.sz||SZ}"/>${c.u?'<w:u w:val="single"/>':''}<w:rtl/></w:rPr><w:t xml:space="preserve">${XE(t)}</w:t></w:r>`}
function dSty(el,c){const s=el.style,k=el.classList,o={...c};
  if(el.tagName==='B'||k.contains('b')||k.contains('v')||k.contains('sh')||/bold|[6-9]00/.test(s.fontWeight))o.b=1;
  if(k.contains('u')||k.contains('sh')||/underline/.test(s.textDecoration))o.u=1;
  if(/pt$/.test(s.fontSize))o.sz=Math.round(parseFloat(s.fontSize)*2);
  const col=hx(s.color);if(col&&col!=='000000')o.col=col;
  const a=k.contains('c')||s.textAlign==='center'||el.getAttribute('align')==='center'?'center':s.textAlign==='left'?'right':null;if(a)o.al=a;
  return o}
function dInl(n,c){if(n.nodeType===3)return dRun(n.nodeValue.replace(/\s+/g,' '),c);if(n.nodeType!==1)return'';
  if(n.tagName==='BR')return'<w:r><w:br/></w:r>';const c2=dSty(n,c);return[...n.childNodes].map(k=>dInl(k,c2)).join('')}
function dPara(runs,c,st){const pb=st.pb?(st.pb=0,'<w:pageBreakBefore/>'):'',bd=c.bd?'<w:pBdr><w:top w:val="single" w:sz="8" w:space="1" w:color="000000"/></w:pBdr>':'';
  return`<w:p><w:pPr>${pb}${bd}<w:bidi/><w:spacing w:before="${c.sb||0}" w:after="${c.sa==null?30:c.sa}" w:line="276" w:lineRule="auto"/>${c.al?`<w:jc w:val="${c.al}"/>`:''}</w:pPr>${runs}</w:p>`}
const SPC='<w:p><w:pPr><w:bidi/><w:spacing w:before="0" w:after="0" w:line="40" w:lineRule="exact"/></w:pPr></w:p>';
function dFlow(el,c,st){let out='',buf='';const fl=()=>{if(buf.replace(/<[^>]+>/g,'').trim()||/<w:br/.test(buf))out+=dPara(buf,c,st);buf=''};
  for(const k of el.childNodes){if(k.nodeType===1&&BL.has(k.tagName)){fl();out+=dBlk(k,c,st)}else buf+=dInl(k,c)}fl();return out}
function dBlk(el,c,st){let c2=dSty(el,c);const k=el.classList;
  if(k.contains('pg')&&st.n++>0)st.pb=1;
  if(k.contains('pn'))c2={...c2,bd:1,al:'center',b:1,sb:120};
  if(k.contains('sh'))c2.sb=100;
  if(el.tagName==='TABLE')return dTbl(el,c2,st)+SPC;
  return dFlow(el,c2,st)}
function dBd(s,sd){const w=parseFloat(s['border'+sd+'Width']),st=s['border'+sd+'Style'];if(!(w>0)||st!=='solid')return'';return`<w:${sd.toLowerCase()} w:val="single" w:sz="${Math.round(w*8)}" w:space="0" w:color="${hx(s['border'+sd+'Color'])||'000000'}"/>`}
function dTbl(t,c,st){const rows=[...t.rows],W=10206,k=t.classList;
  const cols=Math.max(...rows.map(r=>[...r.cells].reduce((a,x)=>a+x.colSpan,0)));
  const wa=t.getAttribute('width')||'100%',tw=/%$/.test(wa)?Math.round(W*parseFloat(wa)/100):W,cw=Math.floor(tw/cols);
  const two=k.contains('two');let bds='';
  if(two){const s=t.style;bds=`<w:tblBorders>${dBd(s,'Top')}${dBd(s,'Bottom')}<w:insideV w:val="single" w:sz="16" w:space="0" w:color="000000"/></w:tblBorders>`}
  let x=`<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="${tw}" w:type="dxa"/>${t.getAttribute('align')==='center'?'<w:jc w:val="center"/>':''}${bds}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array(cols).fill(`<w:gridCol w:w="${cw}"/>`).join('')}</w:tblGrid>`;
  rows.forEach(r=>{const h=parseFloat(r.cells[0]&&r.cells[0].style.height);x+=`<w:tr><w:trPr><w:cantSplit/>${h>0?`<w:trHeight w:val="${Math.round(h*20)}" w:hRule="atLeast"/>`:''}</w:trPr>`;
    [...r.cells].forEach(td=>{const s=td.style,sp=td.colSpan,cc=dSty(td,c);if(td.tagName==='TH'&&!k.contains('ls'))cc.b=1;
      const bd=two?'':['Top','Left','Bottom','Right'].map(d=>dBd(s,d)).join(''),bg=hx(s.backgroundColor);
      const inner=dFlow(td,{...cc,sa:0},st)||`<w:p><w:pPr><w:bidi/></w:pPr></w:p>`;
      x+=`<w:tc><w:tcPr><w:tcW w:w="${cw*sp}" w:type="dxa"/>${sp>1?`<w:gridSpan w:val="${sp}"/>`:''}${bd?`<w:tcBorders>${bd}</w:tcBorders>`:''}${bg?`<w:shd w:val="clear" w:color="auto" w:fill="${bg}"/>`:''}<w:vAlign w:val="${s.verticalAlign==='top'?'top':'center'}"/></w:tcPr>${inner}</w:tc>`});
    x+='</w:tr>'});return x+'</w:tbl>'}
function crc32(b){const t=crc32.t||(crc32.t=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0}));let r=-1;for(let i=0;i<b.length;i++)r=t[(r^b[i])&255]^(r>>>8);return(r^-1)>>>0}
function zipFiles(files){const E=new TextEncoder(),parts=[],cd=[],u16=v=>[v&255,v>>8&255],u32=v=>[v&255,v>>8&255,v>>16&255,v>>>24&255];let off=0;
  for(const[name,txt]of Object.entries(files)){const nb=E.encode(name),d=E.encode(txt),crc=crc32(d);
    const lh=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nb.length),...u16(0)]);
    parts.push(lh,nb,d);cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);off+=lh.length+nb.length+d.length}
  const cs=cd.reduce((a,x)=>a+x.length,0);
  return new Blob([...parts,...cd,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(cd.length/2),...u16(cd.length/2),...u32(cs),...u32(off),...u16(0)])],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})}
function buildDocx(root){const body=dFlow(wordNorm(root),{},{n:0,pb:0}),NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipFiles({'[Content_Types].xml':H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels':H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels':H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'word/styles.xml':H+`<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:sz w:val="${SZ}"/><w:szCs w:val="${SZ}"/><w:lang w:val="ar-DZ" w:bidi="ar-DZ"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    'word/document.xml':H+`<w:document ${NS}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="400" w:footer="400" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`})}
function exportWord(root,name){const a=document.createElement('a');a.href=URL.createObjectURL(buildDocx(root));a.download=name+'.docx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
