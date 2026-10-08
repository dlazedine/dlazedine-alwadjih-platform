/* ============================================================
   documents-manager.js — إدارة الوثائق التربوية المشتركة
   الإصدار 1.0.0 — المقاطعة الثانية قسنطينة
   التبعيات: auth.js / portal-cloud.js / wj-shell.js
   ============================================================ */
(function () {
  'use strict';

  const LS_DOCS = 'portal_documents_v1';
  const LS_CATEGORIES = 'portal_doc_categories_v1';
  const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 ميغا
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'text/plain'
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'waqfah', name: 'وقفة تقويمية', icon: 'fa-stopwatch', color: '#c49b3f' },
    { id: 'ikhtibar', name: 'اختبار فصلي', icon: 'fa-file-pen', color: '#1f3864' },
    { id: 'wajib', name: 'واجب منزلي', icon: 'fa-house-chimney', color: '#7a9a4f' },
    { id: 'mashrou3', name: 'مشروع تربوي', icon: 'fa-diagram-project', color: '#16a085' },
    { id: 'mudhakira', name: 'مذكرة تحضير', icon: 'fa-book-open', color: '#8b6f3c' },
    { id: 'marji3', name: 'وثيقة مرجعية', icon: 'fa-gavel', color: '#a01c2c', inspectorOnly: true }
  ];

  const INITIAL_SAMPLE_DOCS = [
    {
      id: 'D1001',
      title: 'وقفة تقويمية تشخيصية — المقطع الأول (قضايا اجتماعية)',
      category: 'waqfah',
      subject: 'اللغة العربية',
      level: 'رابعة متوسط',
      period: 'الفصل الأول',
      description: 'وقفة تقويمية تهدف إلى قياس الكفاءات الختامية للمقطع الأول مع شبكة تصحيح مفصلة.',
      school: 'متوسطة علي غرباوي',
      author: 'أحمد بن علي',
      authorUsername: 'teacher',
      authorRole: 'teacher',
      status: 'approved',
      file: {
        name: 'وقفة_تقويمية_رابعة_متوسط_م1.pdf',
        size: 1420500,
        type: 'application/pdf',
        dataUrl: ''
      },
      uploadedAt: '2026-10-02T09:30:00.000Z',
      reviewedBy: 'مفتش التعليم المتوسط درويش الهلالي',
      reviewedAt: '2026-10-03T11:15:00.000Z',
      reviewNote: 'وثيقة ممتازة تراعي التدرج والصنافة، ومعتمدة للتداول بين أساتذة المقاطعة.',
      downloads: 48,
      views: 125
    },
    {
      id: 'D1002',
      title: 'الدليل المنهجي لهندسة الوضعيات الإدماجية والتقويم التكويني',
      category: 'marji3',
      subject: 'اللغة العربية',
      level: 'كل المستويات',
      period: 'سنوي',
      description: 'دليل تفتيشي مرجعي يؤطر بناء الوضعيات التقييمية وإعداد شبكات التصحيح المعيارية.',
      school: 'مفتشية التعليم المتوسط — المقاطعة الثانية',
      author: 'درويش الهلالي',
      authorUsername: 'inspector',
      authorRole: 'inspector',
      status: 'approved',
      file: {
        name: 'دليل_الوضعيات_الإدماجية_المقاطعة_الثانية.pdf',
        size: 3250000,
        type: 'application/pdf',
        dataUrl: ''
      },
      uploadedAt: '2026-09-25T08:00:00.000Z',
      reviewedBy: 'المفتشية العامة للبيداغوجيا',
      reviewedAt: '2026-09-25T08:00:00.000Z',
      reviewNote: 'وثيقة تفتيشية رسمية ملزمة ومعتمدة.',
      downloads: 142,
      views: 310
    },
    {
      id: 'D1003',
      title: 'مشروع بيداغوجي: إنشاء مجلة مدرسية رقمية لتعزيز التعبير الكتابي',
      category: 'mashrou3',
      subject: 'اللغة العربية',
      level: 'ثانية متوسط',
      period: 'الفصل الثاني',
      description: 'خطة عمل نموذجية للمشروع البيداغوجي الفصلي مع مراحل الإنجاز وتوزيع المهام بين الأفواج.',
      school: 'متوسطة الخنساء',
      author: 'فاطمة الزهراء قاسمي',
      authorUsername: 'teacher',
      authorRole: 'teacher',
      status: 'approved',
      file: {
        name: 'مشروع_المجلة_المدرسية_2م.pdf',
        size: 890000,
        type: 'application/pdf',
        dataUrl: ''
      },
      uploadedAt: '2026-10-04T14:20:00.000Z',
      reviewedBy: 'مفتش التعليم المتوسط درويش الهلالي',
      reviewedAt: '2026-10-05T10:00:00.000Z',
      reviewNote: 'فكرة رائدة تشجع المهارات اللغوية التشاركية.',
      downloads: 36,
      views: 89
    }
  ];

  let state = {
    documents: [],
    categories: [...DEFAULT_CATEGORIES],
    currentFilter: 'all',
    currentCategory: null,
    pendingFile: null
  };

  /* ---------- تخزين ---------- */
  function load() {
    try {
      const docs = localStorage.getItem(LS_DOCS);
      state.documents = docs ? JSON.parse(docs) : [...INITIAL_SAMPLE_DOCS];
      if (!Array.isArray(state.documents) || !state.documents.length) {
        state.documents = [...INITIAL_SAMPLE_DOCS];
        save();
      }
    } catch (e) {
      state.documents = [...INITIAL_SAMPLE_DOCS];
    }

    try {
      const cats = localStorage.getItem(LS_CATEGORIES);
      if (cats) {
        const parsed = JSON.parse(cats);
        if (Array.isArray(parsed) && parsed.length) state.categories = parsed;
      }
    } catch (e) {}

    // محاولة المزامنة مع Supabase إذا كان متوفراً
    if (window.WJ && window.WJ.c) {
      syncWithSupabase();
    }
  }

  function save() {
    try {
      localStorage.setItem(LS_DOCS, JSON.stringify(state.documents));
      localStorage.setItem(LS_CATEGORIES, JSON.stringify(state.categories));
    } catch (e) {
      console.warn('Storage save warning:', e);
    }
  }

  async function syncWithSupabase() {
    try {
      const C = window.WJ.c;
      if (!C) return;
      const { data, error } = await C.from('wajih_documents').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length) {
        // دمج الوثائق السحابية
        const cloudDocs = data.map(row => ({
          id: row.id,
          title: row.title,
          category: row.category,
          subject: row.subject,
          level: row.level,
          period: row.period,
          description: row.description,
          school: row.school,
          author: row.author,
          authorUsername: row.author_username,
          authorRole: row.author_role,
          status: row.status,
          file: row.file_data || { name: row.file_name, size: row.file_size, type: row.file_type, dataUrl: row.file_url },
          uploadedAt: row.created_at,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at,
          reviewNote: row.review_note,
          downloads: row.downloads || 0,
          views: row.views || 0
        }));
        state.documents = cloudDocs;
        save();
        renderDocuments();
        renderStats();
      }
    } catch (e) {
      // صامت في حال عدم اتصال السحابة
    }
  }

  /* ---------- أدوات مساعدة ---------- */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function getFileIcon(mime) {
    if (!mime) return 'fa-file';
    if (mime.includes('pdf')) return 'fa-file-pdf';
    if (mime.includes('word') || mime.includes('document')) return 'fa-file-word';
    if (mime.includes('excel') || mime.includes('sheet')) return 'fa-file-excel';
    if (mime.includes('powerpoint') || mime.includes('presentation')) return 'fa-file-powerpoint';
    if (mime.includes('image')) return 'fa-file-image';
    if (mime.includes('text')) return 'fa-file-lines';
    return 'fa-file';
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' ك.ب';
    return (bytes / (1024 * 1024)).toFixed(2) + ' م.ب';
  }

  function formatTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function getCategory(id) {
    return state.categories.find(c => c.id === id) || state.categories[0];
  }

  function getStatusBadge(status) {
    const map = {
      pending:  { label: 'قيد المراجعة', class: 'status-pending', icon: 'fa-hourglass-half' },
      approved: { label: 'معتمدة ✅',   class: 'status-approved', icon: 'fa-circle-check' },
      rejected: { label: 'مرفوضة ❌',   class: 'status-rejected', icon: 'fa-circle-xmark' },
      revision: { label: 'تحتاج تعديل ⚠️', class: 'status-revision', icon: 'fa-triangle-exclamation' }
    };
    return map[status] || map.pending;
  }

  function getUser() {
    if (window.PortalAuth && typeof window.PortalAuth.getCurrentUser === 'function') {
      const u = window.PortalAuth.getCurrentUser();
      if (u) return u;
    }
    if (window.WJ && window.WJ.me) return window.WJ.me;
    try {
      const s = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && parsed.user) return parsed.user;
      }
    } catch (e) {}
    return {
      username: 'teacher',
      fullName: 'أستاذ(ة) اللغة العربية',
      role: 'teacher',
      school: 'متوسطة قسنطينة'
    };
  }

  function isStaff() {
    const u = getUser();
    return u && (u.role === 'inspector' || u.role === 'supervisor' || u.role === 'admin');
  }

  /* ---------- رفع ملف ---------- */
  function triggerUpload() {
    document.getElementById('docFileInput')?.click();
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`حجم الملف كبير جداً (${formatSize(file.size)}). الحد الأقصى المسموح هو ${formatSize(MAX_FILE_SIZE)}.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      state.pendingFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: ev.target.result
      };
      renderPendingFile();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function renderPendingFile() {
    const el = document.getElementById('docFilePreview');
    if (!el) return;
    const f = state.pendingFile;
    if (!f) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;width:100%;background:#fcf9f2;padding:10px 14px;border:1.5px dashed var(--gold);border-radius:10px;">
        <i class="fas ${getFileIcon(f.type)}" style="font-size:22px;color:var(--gold);"></i>
        <div style="flex:1;min-width:0;text-align:right;">
          <div style="font-weight:700;color:var(--navy);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.name)}</div>
          <div style="color:#718096;font-size:11px;">${formatSize(f.size)}</div>
        </div>
        <button type="button" onclick="DocumentsManager.clearPendingFile()" style="background:rgba(185,28,28,0.1);color:#b91c1c;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-weight:700;font-size:11px;">
          <i class="fas fa-times"></i> إزالة
        </button>
      </div>
    `;
  }

  function clearPendingFile() {
    state.pendingFile = null;
    renderPendingFile();
  }

  /* ---------- حفظ وثيقة جديدة ---------- */
  async function submitDocument() {
    const user = getUser();
    if (!user) { alert('يجب تسجيل الدخول أولاً.'); return; }

    const title = document.getElementById('docTitle')?.value.trim();
    const categoryId = document.getElementById('docCategory')?.value;
    const subject = document.getElementById('docSubject')?.value;
    const level = document.getElementById('docLevel')?.value;
    const period = document.getElementById('docPeriod')?.value;
    const description = document.getElementById('docDescription')?.value.trim();
    const school = document.getElementById('docSchool')?.value.trim() || user.school || '';
    const file = state.pendingFile;

    if (!title) { alert('يرجى إدخال عنوان الوثيقة.'); return; }
    if (!categoryId) { alert('يرجى اختيار نوع الوثيقة.'); return; }
    if (!file) { alert('يرجى إرفاق ملف للوثيقة (PDF / صورة / مستند).'); return; }

    // قيد خاص: الوثائق المرجعية للمفتش والمشرف فقط
    const cat = getCategory(categoryId);
    if (cat.inspectorOnly && !isStaff()) {
      alert('رفع الوثائق المرجعية الرسمية مخصص للمفتش والمشرف فقط.');
      return;
    }

    const docId = 'D' + Date.now();
    const newDoc = {
      id: docId,
      title,
      category: categoryId,
      subject: subject || 'اللغة العربية',
      level: level || 'غير محدد',
      period: period || 'الفصل الأول',
      description,
      school,
      author: user.fullName || user.username || 'أستاذ',
      authorUsername: user.username || '',
      authorRole: user.role || 'teacher',
      status: isStaff() ? 'approved' : 'pending', // وثائق المفتش تعتمد فوراً
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: file.dataUrl
      },
      uploadedAt: new Date().toISOString(),
      reviewedBy: isStaff() ? user.fullName : null,
      reviewedAt: isStaff() ? new Date().toISOString() : null,
      reviewNote: isStaff() ? 'وثيقة مرجعية منشورة مباشرة من المفتشية' : '',
      downloads: 0,
      views: 0
    };

    state.documents.unshift(newDoc);
    save();

    // حفظ في Supabase إذا كان متوفراً
    if (window.WJ && window.WJ.c) {
      try {
        await window.WJ.c.from('wajih_documents').insert({
          id: docId.length === 36 ? docId : undefined,
          title: newDoc.title,
          category: newDoc.category,
          subject: newDoc.subject,
          level: newDoc.level,
          period: newDoc.period,
          description: newDoc.description,
          school: newDoc.school,
          author: newDoc.author,
          author_username: newDoc.authorUsername,
          author_role: newDoc.authorRole,
          status: newDoc.status,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_data: { name: file.name, size: file.size, type: file.type, dataUrl: file.dataUrl }
        });
      } catch (e) {
        console.warn('Supabase save doc error:', e);
      }
    }

    // تسجيل النشاط
    if (window.WJ && typeof window.WJ.act === 'function') {
      window.WJ.act('upload', 'document', { title, category: cat.name });
    }

    // إغلاق النافذة المنبثقة وتحديث العرض
    closeUploadModal();
    renderDocuments();
    renderStats();
    resetForm();

    const msg = isStaff()
      ? '✅ تم نشر الوثيقة واعتمادها بنجاح'
      : '✅ تم رفع الوثيقة بنجاح — أُحيلت للمراجعة والاعتماد التفتيشي';
    alert(msg);
  }

  function resetForm() {
    ['docTitle','docDescription','docSchool'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['docCategory','docSubject','docLevel','docPeriod'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName === 'SELECT') el.selectedIndex = 0;
    });
    clearPendingFile();
  }

  /* ---------- تصفية وعرض ---------- */
  function setFilter(filter) {
    state.currentFilter = filter;
    document.querySelectorAll('.doc-filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === filter));
    renderDocuments();
  }

  function setCategory(catId) {
    state.currentCategory = state.currentCategory === catId ? null : catId;
    document.querySelectorAll('.doc-cat-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === state.currentCategory));
    renderDocuments();
  }

  function getFilteredDocuments() {
    const user = getUser();
    const canManage = isStaff();
    let docs = [...state.documents];

    // الأساتذة يرون الوتائق المعتمدة + وثائقهم هم
    if (!canManage) {
      docs = docs.filter(d =>
        d.status === 'approved' || d.authorUsername === user?.username
      );
    }

    // تصفية حسب الفئة
    if (state.currentCategory) {
      docs = docs.filter(d => d.category === state.currentCategory);
    }

    // تصفية حسب الحالة
    if (state.currentFilter === 'mine') {
      docs = docs.filter(d => d.authorUsername === user?.username);
    } else if (state.currentFilter === 'approved') {
      docs = docs.filter(d => d.status === 'approved');
    } else if (state.currentFilter === 'pending') {
      docs = docs.filter(d => d.status === 'pending');
    } else if (state.currentFilter === 'downloaded') {
      docs = docs.filter(d => d.downloads > 0);
    }

    return docs.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  function renderDocuments() {
    const container = document.getElementById('documentsGrid');
    if (!container) return;

    const docs = getFilteredDocuments();
    const canManage = isStaff();
    const user = getUser();

    if (!docs.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; text-align:center; padding:50px 20px; background:#fff; border-radius:16px; border:1px solid #d9d2bd;">
          <i class="fas fa-folder-open" style="font-size:48px; color:var(--gold); opacity:0.6; display:block; margin-bottom:14px;"></i>
          <h3 style="font-size:16px; font-weight:700; color:var(--navy); margin-bottom:6px;">لا توجد وثائق مطابقة للتصفية الحالية</h3>
          <p style="font-size:12.5px; color:#6b7280;">يمكنك رفع وثيقة جديدة بالضغط على زر «رفع وثيقة تربوية» أعلاه.</p>
        </div>`;
      return;
    }

    container.innerHTML = docs.map(d => {
      const cat = getCategory(d.category);
      const badge = getStatusBadge(d.status);
      const isOwner = d.authorUsername === user?.username;
      const showReview = canManage && (d.status === 'pending' || d.status === 'revision');

      return `
        <div class="doc-card" data-id="${d.id}" style="background:#fff; border:1.5px solid #d9d2bd; border-radius:16px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease; box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative;">
          
          <div>
            <!-- شريط الرأس -->
            <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:12px;">
              <div style="width:44px; height:44px; border-radius:12px; background:${cat.color}15; color:${cat.color}; display:flex; align-items:center; justify-content:center; font-size:18px; shrink:0; border:1px solid ${cat.color}30;">
                <i class="fas ${cat.icon}"></i>
              </div>
              <div style="flex:1; min-width:0; text-align:right;">
                <div style="font-size:14px; font-weight:800; color:var(--navy); line-height:1.4; margin-bottom:4px;">
                  ${esc(d.title)}
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:10px; font-size:11.5px; color:#64748b;">
                  <span><i class="fas fa-user-pen" style="color:var(--gold);"></i> ${esc(d.author)}</span>
                  <span><i class="fas fa-school" style="color:var(--gold);"></i> ${esc(d.school || 'المقاطعة الثانية')}</span>
                </div>
              </div>
              <span class="status-badge ${badge.class}" style="padding:3px 10px; border-radius:12px; font-size:10.5px; font-weight:700; white-space:nowrap;">
                <i class="fas ${badge.icon}"></i> ${badge.label}
              </span>
            </div>

            <!-- وسوم التصنيف -->
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
              <span style="background:${cat.color}15; color:${cat.color}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px;">
                <i class="fas ${cat.icon}"></i> ${cat.name}
              </span>
              ${d.subject ? `<span style="background:#f1f5f9; color:#334155; font-size:11px; padding:2px 8px; border-radius:6px;"><i class="fas fa-book"></i> ${esc(d.subject)}</span>` : ''}
              ${d.level ? `<span style="background:#f1f5f9; color:#334155; font-size:11px; padding:2px 8px; border-radius:6px;"><i class="fas fa-graduation-cap"></i> ${esc(d.level)}</span>` : ''}
              ${d.period ? `<span style="background:#f1f5f9; color:#334155; font-size:11px; padding:2px 8px; border-radius:6px;"><i class="fas fa-calendar"></i> ${esc(d.period)}</span>` : ''}
            </div>

            <!-- الوصف -->
            ${d.description ? `<p style="font-size:12px; color:#475569; line-height:1.6; margin-bottom:12px; text-align:right;">${esc(d.description)}</p>` : ''}

            <!-- ملاحظة الاعتماد أو الرفض التفتيشي -->
            ${d.status === 'rejected' && d.reviewNote ? `
              <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 12px; margin-bottom:12px; font-size:11.5px; color:#991b1b; text-align:right;">
                <i class="fas fa-circle-exclamation"></i>
                <strong>ملاحظة المفتشية:</strong> ${esc(d.reviewNote)}
              </div>` : ''}

            ${d.status === 'approved' && d.reviewNote ? `
              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:10px 12px; margin-bottom:12px; font-size:11.5px; color:#166534; text-align:right;">
                <i class="fas fa-circle-check"></i>
                <strong>اعتماد المفتش:</strong> ${esc(d.reviewNote)}
              </div>` : ''}
          </div>

          <!-- شريط التذييل والإجراءات -->
          <div style="border-top:1px solid #e2e8f0; padding-top:12px; margin-top:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:12px; font-size:11px; color:#64748b;">
              <span title="عدد التحميلات"><i class="fas fa-download text-gold"></i> ${d.downloads || 0}</span>
              <span title="عدد المعاينات"><i class="fas fa-eye text-gold"></i> ${d.views || 0}</span>
              <span title="تاريخ الرفع"><i class="fas fa-clock text-gold"></i> ${formatTime(d.uploadedAt)}</span>
            </div>

            <div style="display:flex; align-items:center; gap:6px;">
              <button class="btn-doc-action" onclick="DocumentsManager.previewDoc('${d.id}')" title="معاينة الوثيقة" style="padding:6px 10px; background:#f1f5f9; hover:background:#e2e8f0; color:var(--navy); border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;">
                <i class="fas fa-eye"></i> معاينة
              </button>

              <button class="btn-doc-action" onclick="DocumentsManager.downloadDoc('${d.id}')" title="تحميل الملف" style="padding:6px 12px; background:var(--gold); color:var(--navy); border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:800;">
                <i class="fas fa-download"></i> تحميل
              </button>

              ${showReview ? `
                <button class="btn-doc-action" onclick="DocumentsManager.reviewDoc('${d.id}', 'approved')" title="اعتماد الوثيقة للمقاطعة" style="padding:6px 10px; background:#16a34a; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">
                  <i class="fas fa-check"></i> اعتماد
                </button>
                <button class="btn-doc-action" onclick="DocumentsManager.reviewDoc('${d.id}', 'rejected')" title="رفض الوثيقة" style="padding:6px 10px; background:#dc2626; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">
                  <i class="fas fa-times"></i> رفض
                </button>
              ` : ''}

              ${(isOwner || canManage) ? `
                <button class="btn-doc-action" onclick="DocumentsManager.deleteDoc('${d.id}')" title="حذف" style="padding:6px 8px; background:transparent; color:#94a3b8; hover:color:#dc2626; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  /* ---------- معاينة وثيقة ---------- */
  function previewDoc(id) {
    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    d.views = (d.views || 0) + 1;
    save();

    const modal = document.getElementById('docPreviewModal');
    const body = document.getElementById('docPreviewBody');
    const title = document.getElementById('docPreviewTitle');
    if (!modal || !body || !title) return;

    title.textContent = d.title;

    let fileContent = '';
    if (d.file?.dataUrl) {
      if (d.file.type.startsWith('image/')) {
        fileContent = `<img src="${d.file.dataUrl}" alt="${esc(d.title)}" style="max-width:100%; max-height:65vh; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.1); margin:0 auto; display:block;">`;
      } else if (d.file.type === 'application/pdf') {
        fileContent = `<iframe src="${d.file.dataUrl}" style="width:100%; height:68vh; border:none; border-radius:12px; box-shadow:0 4px 16px rgba(0,0,0,0.1);"></iframe>`;
      } else {
        fileContent = `
          <div style="text-align:center; padding:50px 20px; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
            <i class="fas ${getFileIcon(d.file.type)}" style="font-size:54px; color:var(--gold); opacity:0.6; display:block; margin-bottom:14px;"></i>
            <h4 style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:6px;">ملف بصيغة: ${esc(d.file.name)}</h4>
            <p style="font-size:12.5px; color:#64748b; margin-bottom:16px;">المعاينة المباشرة متاحة لملفات الـ PDF والصور. يمكنك تنزيل الملف لمعاينته على جهازك.</p>
            <button onclick="DocumentsManager.downloadDoc('${d.id}')" style="padding:8px 18px; background:var(--gold); color:var(--navy); font-weight:800; border:none; border-radius:10px; cursor:pointer;">
              <i class="fas fa-download"></i> تنزيل الملف الآن (${formatSize(d.file.size)})
            </button>
          </div>`;
      }
    } else {
      fileContent = `
        <div style="text-align:center; padding:40px 20px; background:#f8fafc; border-radius:12px;">
          <i class="fas fa-file-circle-exclamation" style="font-size:40px; color:var(--gold); margin-bottom:10px;"></i>
          <p style="font-size:13px; color:#64748b;">الملف متوفر كبيان مرجعي بالمنظومة.</p>
        </div>`;
    }

    const cat = getCategory(d.category);
    const badge = getStatusBadge(d.status);

    body.innerHTML = `
      <div style="background:#f8fafc; padding:14px 18px; border-radius:14px; margin-bottom:16px; border:1px solid #e2e8f0; font-size:12.5px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:10px; text-align:right;">
          <div><strong style="color:var(--navy);">الأستاذ(ة):</strong> ${esc(d.author)}</div>
          <div><strong style="color:var(--navy);">المتوسطة:</strong> ${esc(d.school || 'المقاطعة الثانية')}</div>
          <div><strong style="color:var(--navy);">المادة:</strong> ${esc(d.subject || '—')}</div>
          <div><strong style="color:var(--navy);">المستوى:</strong> ${esc(d.level || '—')}</div>
          <div><strong style="color:var(--navy);">الفترة:</strong> ${esc(d.period || '—')}</div>
          <div><strong style="color:var(--navy);">النوع:</strong> ${cat.name}</div>
        </div>
        <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <span class="status-badge ${badge.class}" style="padding:3px 10px; border-radius:12px; font-size:11px; font-weight:700;">
            <i class="fas ${badge.icon}"></i> ${badge.label}
          </span>
          <span style="font-size:11px; color:#64748b;">
            حجم الملف: <strong>${formatSize(d.file?.size || 0)}</strong>
          </span>
        </div>
      </div>
      ${fileContent}
    `;

    modal.style.display = 'flex';
  }

  function closePreview() {
    const modal = document.getElementById('docPreviewModal');
    if (modal) modal.style.display = 'none';
  }

  /* ---------- تحميل وثيقة ---------- */
  function downloadDoc(id) {
    const d = state.documents.find(x => x.id === id);
    if (!d || !d.file) { alert('الملف غير متاح حالياً.'); return; }

    d.downloads = (d.downloads || 0) + 1;
    save();

    if (d.file.dataUrl) {
      const a = document.createElement('a');
      a.href = d.file.dataUrl;
      a.download = d.file.name || (d.title + '.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // توليد ملف نصي نموذجي إذا كان نموذجاً مرجعياً
      const blob = new Blob([
        `الجمهورية الجزائرية الديمقراطية الشعبية\nوزارة التربية الوطنية — المقاطعة الثانية قسنطينة\nإشراف: المفتش درويش الهلالي\n\nالوثيقة: ${d.title}\nالأستاذ: ${d.author}\nالمتوسطة: ${d.school}\nالمستوى: ${d.level} — ${d.period}\n\nالوصف:\n${d.description || 'وثيقة رسمية معتمدة'}\n`
      ], { type: 'text/plain;charset=utf-8' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = (d.title || 'وثيقة') + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    }

    renderDocuments();
    renderStats();
  }

  /* ---------- مراجعة (اعتماد/رفض) ---------- */
  function reviewDoc(id, status) {
    if (!isStaff()) {
      alert('إجراءات الاعتماد والمراجعة مخصصة للمفتش والمشرف فقط.');
      return;
    }

    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    const user = getUser();
    const note = status === 'rejected'
      ? prompt('سبب عدم الاعتماد (سيظهر للأستاذ كتغذية راجعة):', 'الوثيقة تحتاج إلى ضبط الصياغة وتنسيق شبكة التقويم وفق دليل الاختبارات.')
      : prompt('ملاحظة أو توجيه تفتيشي (اختياري):', 'وثيقة تربوية ممتازة ومطابقة للمنهاج، معتمدة للتداول.');

    if (note === null) return; // تم الإلغاء

    d.status = status;
    d.reviewedBy = user.fullName || 'مفتش التعليم المتوسط درويش الهلالي';
    d.reviewedAt = new Date().toISOString();
    d.reviewNote = note || '';

    save();
    renderDocuments();
    renderStats();

    if (status === 'approved') {
      alert('✅ تم اعتماد الوثيقة بنجاح وأصبحت متاحة للتحميل لكافة أساتذة المقاطعة.');
    } else {
      alert('❌ تم تسجيل ملاحظة عدم الاعتماد وحفظ التغذية الراجعة للأستاذ.');
    }
  }

  /* ---------- حذف وثيقة ---------- */
  function deleteDoc(id) {
    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    const user = getUser();
    const canManage = isStaff();
    const isOwner = d.authorUsername === user?.username;

    if (!canManage && !isOwner) {
      alert('ليس لديك صلاحية حذف هذه الوثيقة.');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف وثيقة "${d.title}" نهائياً؟`)) return;

    state.documents = state.documents.filter(x => x.id !== id);
    save();
    renderDocuments();
    renderStats();
  }

  /* ---------- الإحصائيات ---------- */
  function renderStats() {
    const all = state.documents;
    const approved = all.filter(d => d.status === 'approved').length;
    const pending = all.filter(d => d.status === 'pending').length;
    const rejected = all.filter(d => d.status === 'rejected').length;
    const totalDownloads = all.reduce((s, d) => s + (d.downloads || 0), 0);

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('statTotalDocs', all.length);
    setText('statApprovedDocs', approved);
    setText('statPendingDocs', pending);
    setText('statRejectedDocs', rejected);
    setText('statTotalDownloads', totalDownloads);
  }

  /* ---------- فتح وإغلاق نافذة الرفع ---------- */
  function openUploadModal() {
    const m = document.getElementById('docUploadModal');
    if (m) m.style.display = 'flex';
  }

  function closeUploadModal() {
    const m = document.getElementById('docUploadModal');
    if (m) m.style.display = 'none';
  }

  /* ---------- التهيئة ---------- */
  function init() {
    load();
    const user = getUser();
    const canManage = isStaff();

    // تعبئة قائمة الفئات
    const catSelect = document.getElementById('docCategory');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">— اختر نوع الوثيقة —</option>';
      state.categories.forEach(c => {
        if (c.inspectorOnly && !canManage) return;
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }

    // تعبئة قائمة المتوسطات
    const schoolInput = document.getElementById('docSchool');
    if (schoolInput && user?.school && !schoolInput.value) {
      schoolInput.value = user.school;
    }

    // أزرار الفئات في الشريط
    const catsBar = document.getElementById('docCategoriesBar');
    if (catsBar) {
      catsBar.innerHTML = state.categories.map(c => `
        <button class="doc-cat-btn" data-cat="${c.id}" onclick="DocumentsManager.setCategory('${c.id}')">
          <i class="fas ${c.icon}" style="color:${c.color};"></i>
          <span>${c.name}</span>
        </button>
      `).join('');
    }

    renderDocuments();
    renderStats();

    // ربط الأحداث
    document.getElementById('docFileInput')?.addEventListener('change', handleFileSelect);
  }

  // التهيئة عند تحميل المستند
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.DocumentsManager = {
    init,
    triggerUpload,
    handleFileSelect,
    submitDocument,
    clearPendingFile,
    setFilter,
    setCategory,
    previewDoc,
    closePreview,
    downloadDoc,
    reviewDoc,
    deleteDoc,
    openUploadModal,
    closeUploadModal,
    renderDocuments,
    renderStats,
    state
  };
})();
