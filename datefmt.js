/* التاريخ ميلادي بأرقام لاتينية (jj/mm/aaaa) والوقت بنظام 24 ساعة، بغضّ النظر عن لغة المتصفح */
window.DF={
  show:v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('/'):(v||''),
  mask(e){const d=e.value.replace(/\D/g,'').slice(0,8);let o=d.slice(0,2);if(d.length>2)o+='/'+d.slice(2,4);if(d.length>4)o+='/'+d.slice(4);e.value=o;return o},
  iso(e){const o=DF.mask(e);if(!o)return'';const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(o);if(!m)return undefined;
    const dt=new Date(+m[3],+m[2]-1,+m[1]);if(dt.getFullYear()!==+m[3]||dt.getMonth()!==+m[2]-1||dt.getDate()!==+m[1])return undefined;return`${m[3]}-${m[2]}-${m[1]}`},
  time(e){const d=e.value.replace(/\D/g,'').slice(0,4);let o=d.slice(0,2);if(d.length>2)o+=':'+d.slice(2);e.value=o;return o===''?'':(/^([01]\d|2[0-3]):[0-5]\d$/.test(o)?o:undefined)}
};
