/* export-xlsx.js — تنسيق ملفات Excel المُصدَّرة (يتطلب xlsx-js-style، وهو بديل مباشر لـ SheetJS)
   حدود وخطوط وألوان وعرض أعمدة واتجاه الورقة من اليمين لليسار. إن لم تدعم المكتبة الأنماط يُكمل التصدير دون تنسيق. */
(function () {
  'use strict';
  const NAVY = '1F3864', GOLD = 'C49B3F', LIGHT = 'F3EBD3';
  const thin = { style: 'thin', color: { rgb: '9AA3B2' } };
  const BORDER = { top: thin, bottom: thin, left: thin, right: thin };

  function polish(ws, o) {
    o = o || {};
    if (!ws || !ws['!ref'] || typeof XLSX === 'undefined') return ws;
    const rg = XLSX.utils.decode_range(ws['!ref']);
    const head = new Set(o.headerRows || []), title = new Set(o.titleRows || []), from = o.tableFrom == null ? 0 : o.tableFrom;
    for (let R = rg.s.r; R <= rg.e.r; R++) {
      for (let C = rg.s.c; C <= rg.e.c; C++) {
        const a = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = ws[a];
        const inTable = R >= from && !title.has(R);
        if (!cell) { if (!inTable) continue; cell = ws[a] = { t: 's', v: '' }; }
        const isHead = head.has(R), isTitle = title.has(R);
        const st = {
          alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 },
          font: { name: 'Arial', sz: isTitle ? 13 : 11, bold: isHead || isTitle, color: { rgb: isHead ? 'FFFFFF' : '000000' } }
        };
        if (isTitle) st.alignment.horizontal = 'right';
        if (isHead) st.fill = { patternType: 'solid', fgColor: { rgb: NAVY } };
        if (inTable) st.border = BORDER;
        if (o.zebra && inTable && !isHead && (R - from) % 2 === 0) st.fill = { patternType: 'solid', fgColor: { rgb: LIGHT } };
        if (cell.t === 'n' && !cell.z) cell.z = Number.isInteger(cell.v) ? '0' : '0.00';
        cell.s = st;
      }
    }
    if (o.rowHeights) ws['!rows'] = o.rowHeights;
    return ws;
  }

  /* عرض الأعمدة تلقائياً حسب أطول محتوى */
  function autoWidth(ws, min, max) {
    if (!ws || !ws['!ref']) return ws;
    const rg = XLSX.utils.decode_range(ws['!ref']), w = [];
    for (let C = rg.s.c; C <= rg.e.c; C++) {
      let m = min || 8;
      for (let R = rg.s.r; R <= rg.e.r; R++) {
        const c = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (c && c.v != null) m = Math.max(m, String(c.v).length + 3);
      }
      w.push({ wch: Math.min(m, max || 50) });
    }
    ws['!cols'] = w;
    return ws;
  }

  /* حفظ الملف مع اتجاه الورقة من اليمين لليسار */
  function write(wb, name) {
    wb.Workbook = wb.Workbook || {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.writeFile(wb, name);
  }

  window.XLSXFmt = { polish, autoWidth, write };
})();
