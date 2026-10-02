/* تصدير التقرير كملف Word (.doc): يحوّل الصفحة الحالية بقيمها المدخلة إلى مستند يفتحه Word */
function wordHTML(root,name){
  const esc=t=>String(t==null?'':t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const fdv=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):v;
  const n=root.cloneNode(true),O=[...root.querySelectorAll('input,select,textarea')],C=[...n.querySelectorAll('input,select,textarea')];
  C.forEach((e,i)=>{const o=O[i],s=document.createElement('span');s.className='v';
    if(o.type==='radio')s.textContent=o.checked?'☒':'☐';
    else if(o.tagName==='TEXTAREA'){const t=o.value.trim();s.style.display='block';s.innerHTML=t?esc(t).replace(/\n/g,'<br>'):('…………………………………………………………………………………<br>').repeat(6)}
    else{const t=o.tagName==='SELECT'?(o.options[o.selectedIndex]||{}).text:fdv(o.value);s.innerHTML=esc(t)||'…………………'}
    e.replaceWith(s)});
  const T=[...root.querySelectorAll('.ttl')];
  n.querySelectorAll('.ttl').forEach((t,i)=>{const cs=getComputedStyle(T[i]);const w=Math.round(T[i].getBoundingClientRect().width/root.getBoundingClientRect().width*100)||60;
    t.outerHTML=`<table align="center" width="${w}%" style="margin:6pt auto;border-collapse:collapse"><tr><td align="center" style="background:${cs.backgroundColor};color:${cs.color};border:1pt solid #888;padding:3pt 8pt;font-weight:bold;font-size:17pt">${esc(t.textContent.trim())}</td></tr></table>`});
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
  return`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(name)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>@page Section1{size:21.0cm 29.7cm;margin:1.2cm 1.5cm;mso-page-orientation:portrait}div.Section1{page:Section1}body,p,div,td,th,span,b{font-family:Tahoma,Arial;mso-bidi-font-family:Tahoma;font-size:12pt;mso-bidi-font-size:12pt;direction:rtl}p,div{margin:0 0 2pt}.b{font-weight:bold}.c{text-align:center}.u{text-decoration:underline}.sh{font-weight:bold;text-decoration:underline;margin-top:5pt}.v{font-weight:bold}</style></head><body dir="rtl"><div class="Section1" dir="rtl">${n.innerHTML}</div></body></html>`}
function exportWord(root,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+wordHTML(root,name)],{type:'application/msword'}));a.download=name+'.doc';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

/* الطباعة: إخفاء حقول التاريخ والوقت الفارغة بدل ظهور «-- : --» */
addEventListener('beforeprint',()=>document.querySelectorAll('input[type=date],input[type=time]').forEach(i=>{if(!i.value)i.classList.add('blank')}));
addEventListener('afterprint',()=>document.querySelectorAll('input.blank').forEach(i=>i.classList.remove('blank')));
