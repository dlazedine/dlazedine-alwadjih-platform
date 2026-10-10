/* ============================================================
   documents-manager.js — إدارة الوثائق التربوية المشتركة
   الإصدار 2.0.0 — المقاطعة الثانية قسنطينة
   تكامل حي مع:
   - بنك الأساتذة (data prof / wajih_prof)
   - متوسطات المقاطعة الـ 21 وفحص الاختبارات (fahs-ikhtibar / wajih_reports)
   - قاعدة بيانات ومخزن Supabase (wajih_documents)
   ============================================================ */
(function () {
  'use strict';

  const LS_DOCS = 'portal_documents_v1';
  const LS_CATEGORIES = 'portal_doc_categories_v1';
  const LS_PROFS_CACHE = 'wajih_profs_cache_v1';
  const MAX_MB = (window.PORTAL_CFG && window.PORTAL_CFG.MAX_FILE_MB) || 50;
  const MAX_FILE_SIZE = MAX_MB * 1024 * 1024;
  const BUCKET = (window.PORTAL_CFG && window.PORTAL_CFG.FILES_BUCKET) || 'portal-files';

  /* عميل Supabase المصادَق (أو null إن لم توجد جلسة) — لا ننتظر WJ.ready لأنه لا يكتمل دون جلسة */
  async function cloud() {
    try {
      if (!window.PortalCloud) return null;
      const c = await window.PortalCloud.ready;
      const { data } = await c.auth.getSession();
      return data && data.session ? c : null;
    } catch (e) { return null; }
  }
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); });
  const fileExt = n => ((String(n || '').split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin').slice(0, 8);

  /* رابط الملف: مسار تخزين (رابط موقّع) أو dataUrl قديم */
  async function docFileUrl(d, forDownload) {
    const f = d && d.file; if (!f) return '';
    if (f.path) {
      const c = await cloud(); if (!c) return '';
      const { data, error } = await c.storage.from(f.bucket || BUCKET).createSignedUrl(f.path, 3600, forDownload ? { download: f.name || true } : undefined);
      return error || !data ? '' : data.signedUrl;
    }
    if (f.dataUrl && /^(data:|https?:)/.test(f.dataUrl)) return f.dataUrl;
    return '';
  }
  /* بصمة لكشف الوثيقة المكررة */
  const fp = d => [d.title, d.author, d.file && d.file.name, d.file && d.file.size].map(x => String(x || '').trim()).join('|');
  function dedupeDocs(list) {
    const byId = new Map(), out = [];
    list.forEach(d => { if (d && d.id && !byId.has(d.id)) { byId.set(d.id, 1); out.push(d); } });
    const best = new Map();
    out.forEach(d => {
      if (d.isExamAudit || String(d.id).indexOf('sample') >= 0 || !(d.file && d.file.name)) return;
      const k = fp(d), cur = best.get(k);
      const score = x => (x.file && x.file.path ? 4 : 0) + (/^[0-9a-f]{8}-/.test(x.id) ? 2 : 0) + (x.status === 'approved' ? 1 : 0);
      if (!cur || score(d) > score(cur)) best.set(k, d);
    });
    return out.filter(d => d.isExamAudit || String(d.id).indexOf('sample') >= 0 || !(d.file && d.file.name) || best.get(fp(d)) === d);
  }


  const DEFAULT_CATEGORIES = [
    { id: 'waqfah', name: 'وقفة تقويمية', icon: 'fa-stopwatch', color: '#c49b3f' },
    { id: 'ikhtibar', name: 'اختبار فصلي', icon: 'fa-file-pen', color: '#1f3864' },
    { id: 'wajib', name: 'واجب منزلي', icon: 'fa-house-chimney', color: '#7a9a4f' },
    { id: 'mashrou3', name: 'مشروع تربوي', icon: 'fa-diagram-project', color: '#16a085' },
    { id: 'mudhakira', name: 'مذكرة تحضير', icon: 'fa-book-open', color: '#8b6f3c' },
    { id: 'marji3', name: 'وثيقة مرجعية', icon: 'fa-gavel', color: '#a01c2c', inspectorOnly: true }
  ];

  // أساتذة المقاطعة الافتراضيون (مطابقون لبيانات wajih_prof في supabase.sql)
  const DEFAULT_PROFS = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'أحمد بن علي', inst: 'متوسطة علي غرباوي', subject: 'اللغة العربية', phone: '0661000001' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'فاطمة الزهراء قاسمي', inst: 'متوسطة الخنساء', subject: 'اللغة العربية', phone: '0661000002' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'محمد الهادي بومعزة', inst: 'متوسطة مصطفى عبد النوري', subject: 'اللغة العربية', phone: '0661000003' },
    { id: '44444444-4444-4444-4444-444444444444', name: 'سعاد بوحفص', inst: 'متوسطة قريوعة عبد الحميد', subject: 'اللغة العربية', phone: '0661000004' },
    { id: '55555555-5555-5555-5555-555555555555', name: 'رشيد بلحرش', inst: 'متوسطة بلحرش عمار', subject: 'اللغة العربية', phone: '0661000005' },
    { id: 'insp-001', name: 'درويش الهلالي', inst: 'مفتشية التعليم المتوسط — المقاطعة الثانية', subject: 'مفتش التعليم المتوسط', phone: '0659681227', isInspector: true }
  ];

  // متوسطات المقاطعة الـ 21 الرسمية (مطابقة لمنصة فحص الاختبارات)
  const DEFAULT_SCHOOLS = [
    'متوسطة قريبة رابح',
    'متوسطة زويني الطاهر',
    'متوسطة لشطر القرمي',
    'متوسطة لعطيوي بلقاسم',
    'متوسطة خميسي الجندلي',
    'متوسطة طافر عمّار',
    'متوسطة مراشدي معمر',
    'متوسطة بن باديس',
    'متوسطة علي غرباوي',
    'متوسطة مصطفى عبد النوري',
    'متوسطة رابح بوباكور',
    'متوسطة قريوعة عبد الحميد',
    'متوسطة الخنساء',
    'متوسطة بلحرش عمار',
    'متوسطة هواري بومدين',
    'متوسطة يحياوي صالح',
    'متوسطة بومعزة رشيد',
    'متوسطة بوقفة مسعود',
    'متوسطة نور الملاك الخاصة',
    'متوسطة الشيماء الخاصة',
    'متوسطة نوبا العالمية الخاصة'
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
    schools: [...DEFAULT_SCHOOLS],
    profs: [...DEFAULT_PROFS],
    examAudits: [],
    currentFilter: 'all',
    currentCategory: null,
    searchQuery: '',
    selectedSchool: '',
    selectedLevel: '',
    selectedTeacher: '',
    pendingFile: null,
    syncStatus: 'ready' // ready, syncing, synced, offline
  };

  /* ---------- التحميل والتخزين الآمن دون المساس بأي بيانات سابقة ---------- */
  function load() {
    try {
      const docs = localStorage.getItem(LS_DOCS);
      if (docs) {
        const parsed = JSON.parse(docs);
        if (Array.isArray(parsed) && parsed.length) {
          state.documents = parsed;
        } else {
          state.documents = [...INITIAL_SAMPLE_DOCS];
        }
      } else {
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

    // استرجاع كاش الأساتذة
    try {
      const cachedProfs = localStorage.getItem(LS_PROFS_CACHE);
      if (cachedProfs) {
        const p = JSON.parse(cachedProfs);
        if (Array.isArray(p) && p.length) {
          state.profs = mergeProfs(DEFAULT_PROFS, p);
        }
      }
    } catch (e) {}

    // استرجاع كاش المتوسطات
    try {
      const cachedSchools = localStorage.getItem('wajih_schools');
      if (cachedSchools) {
        const s = JSON.parse(cachedSchools);
        if (Array.isArray(s) && s.length) {
          state.schools = s;
        }
      }
    } catch (e) {}

    // استرجاع اختبارات فحص الاختبارات المحلية إن وجدت
    loadLocalExamAudits();
  }

  function save() {
    try {
      localStorage.setItem(LS_DOCS, JSON.stringify(state.documents));
      localStorage.setItem(LS_CATEGORIES, JSON.stringify(state.categories));
    } catch (e) {
      console.warn('Storage save warning:', e);
    }
  }

  function mergeProfs(base, incoming) {
    const map = new Map();
    (base || []).forEach(p => { if (p && p.name) map.set(p.name.trim(), p); });
    (incoming || []).forEach(p => { if (p && p.name) map.set(p.name.trim(), { ...(map.get(p.name.trim()) || {}), ...p }); });
    return Array.from(map.values()).sort((a,b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }

  /* استرجاع الاختبارات المفحوصة من التخزين المحلي لمنصة fahs-ikhtibar */
  function loadLocalExamAudits() {
    try {
      const raw = localStorage.getItem('tqweem_tests_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = parsed.database || [];
        if (Array.isArray(list) && list.length) {
          ingestExamReports(list);
        }
      }
    } catch (e) {}
  }

  /* ---------- استيعاب تقارير فحص الاختبارات المعتمدة وتحويلها إلى وثائق بنكية ---------- */
  function ingestExamReports(examReports) {
    if (!Array.isArray(examReports) || !examReports.length) return;

    let addedCount = 0;
    examReports.forEach(r => {
      if (!r) return;
      const docId = 'EXAM_' + (r.id || (r.school + '_' + r.date));
      // تجنب التكرار مع الحفاظ التام على البيانات
      const exists = state.documents.some(d => d.id === docId || d.examReportId === r.id);
      if (!exists) {
        const scoreTotal = r.total != null ? r.total : (Number(r.resSum || 0) + Number(r.compSum || 0));
        const qual = r.qual || (scoreTotal >= 19 ? 'نموذجي' : (scoreTotal >= 15 ? 'جيد جداً' : 'مطابق'));

        const examDoc = {
          id: docId,
          examReportId: r.id || docId,
          title: `اختبار فصلي مفحوص تفتيشياً — ${r.school || 'متوسطة بالمقاطعة'} (${r.level || 'رابعة متوسط'})`,
          category: 'ikhtibar',
          subject: r.subject || 'اللغة العربية',
          level: r.level || 'رابعة متوسط',
          period: r.period || 'الفصل الأول',
          description: `اختبار فصلي خضع للفحص والتقويم التفتيشي الشامل وفق معايير دليل الاختبارات الرسمية. حاز على علامة ${scoreTotal}/20 بتقدير [${qual}]. يشمل تقويم الموارد والوضعية الإدماجية.`,
          school: r.school || 'المقاطعة الثانية',
          author: r.teacher || 'أستاذ بالمقاطعة',
          authorUsername: 'teacher',
          authorRole: 'teacher',
          status: 'approved', // معتمد تفتيشياً بحكم مروره عبر منصة الفحص
          isExamAudit: true,
          auditScore: `${scoreTotal} / 20`,
          auditQual: qual,
          file: {
            name: (r.file && r.file.name) || r.fileName || `اختبار_${(r.school||'').replace(/\s+/g,'_')}_${(r.level||'').replace(/\s+/g,'_')}.pdf`,
            size: r.fileSize || 1850000,
            type: (r.file && r.file.type) || r.fileType || 'application/pdf',
            dataUrl: r.fileUrl || '',
            ...(r.file && r.file.path ? { path: r.file.path, bucket: 'exams' } : {})
          },
          uploadedAt: r.savedAt || r.date || new Date().toISOString(),
          reviewedBy: 'مفتش التعليم المتوسط درويش الهلالي',
          reviewedAt: r.savedAt || r.date || new Date().toISOString(),
          reviewNote: `تم فحص هذا الاختبار واعتماده في منصة «فحص ومطابقة الاختبارات» بعلامة (${scoreTotal}/20) وتقدير (${qual}) — معتمد كمرجع نموذجي للأساتذة.`,
          downloads: 24,
          views: 65
        };

        state.documents.push(examDoc);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      save();
      renderDocuments();
      renderStats();
    }
  }

  /* نقل وثائق قديمة مخزّنة كـ base64 محلياً إلى التخزين السحابي مرة واحدة (حتى لا تضيع) */
  async function migrateLocalDocs(C, cloudIds) {
    const todo = state.documents.filter(d => !cloudIds.has(d.id) && !d.isExamAudit && d.file && d.file.dataUrl && /^data:/.test(d.file.dataUrl));
    for (const d of todo) {
      try {
        const blob = await (await fetch(d.file.dataUrl)).blob();
        const oldId = d.id, id = /^[0-9a-f]{8}-/.test(oldId) ? oldId : uuid();
        const path = 'documents/' + id + '/' + Date.now() + '.' + fileExt(d.file.name);
        const up = await C.storage.from(BUCKET).upload(path, blob, { contentType: d.file.type || 'application/octet-stream' });
        if (up.error) continue;
        const file = { name: d.file.name, size: d.file.size, type: d.file.type, path };
        const ins = await C.from('wajih_documents').insert(rowFor({ ...d, id, file }));
        if (ins.error) { C.storage.from(BUCKET).remove([path]); continue; }
        d.id = id; d.file = file;
      } catch (e) { console.warn('migrate doc', e); }
    }
    if (todo.length) { state.documents = dedupeDocs(state.documents); save(); }
  }
  function rowFor(d) {
    return {
      id: d.id, title: d.title, category: d.category, subject: d.subject, level: d.level, period: d.period,
      description: d.description, school: d.school, author: d.author, author_username: d.authorUsername, author_role: d.authorRole,
      status: d.status, file_name: d.file.name, file_size: d.file.size, file_type: d.file.type, file_url: '',
      file_data: { name: d.file.name, size: d.file.size, type: d.file.type, path: d.file.path }
    };
  }

  /* ---------- المزامنة السحابية الكاملة مع Supabase ---------- */
  async function syncWithSupabase(interactive = false) {
    updateSyncBadge('syncing', 'جاري المزامنة مع Supabase...');

    const C = await cloud();
    if (!C) {
      updateSyncBadge('offline', 'وضع غير متصل — البيانات محفوظة محلياً');
      if (interactive) {
        alert('ℹ️ التطبيق يعمل في الوضع المحلي. البيانات محفوظة ومؤمنة في المتصفح.');
      }
      return;
    }

    try {
      // 1. مزامنة قائمة المتوسطات الـ 21 من wajih_settings
      try {
        const { data: schoolsData } = await C.from('wajih_settings').select('value').eq('key', 'schools').single();
        if (schoolsData && Array.isArray(schoolsData.value) && schoolsData.value.length) {
          state.schools = schoolsData.value;
          localStorage.setItem('wajih_schools', JSON.stringify(schoolsData.value));
          populateSchoolsUI();
        }
      } catch (e) {
        console.warn('Sync schools warning:', e);
      }

      // 2. مزامنة بنك بيانات الأساتذة من wajih_prof
      try {
        const { data: profsData } = await C.from('wajih_prof').select('id,user_id,data');
        if (profsData && Array.isArray(profsData)) {
          const cloudProfs = profsData
            .filter(p => p && p.data && p.data.name)
            .map(p => ({
              id: p.id,
              name: p.data.name.trim(),
              inst: p.data.inst || '',
              subject: p.data.subject || 'اللغة العربية',
              phone: p.data.phone || ''
            }));
          if (cloudProfs.length) {
            state.profs = mergeProfs(state.profs, cloudProfs);
            localStorage.setItem(LS_PROFS_CACHE, JSON.stringify(state.profs));
            populateTeachersUI();
          }
        }
      } catch (e) {
        console.warn('Sync profs warning:', e);
      }

      // 3. مزامنة الاختبارات المفحوصة من wajih_reports (fahs-ikhtibar)
      try {
        const { data: reportsData } = await C.from('wajih_reports')
          .select('id,prof_id,data,published,created_at,created_by_name')
          .eq('kind', 'exam')
          .order('created_at', { ascending: false });

        if (reportsData && Array.isArray(reportsData)) {
          const exams = reportsData.map(r => ({
            id: r.id,
            prof_id: r.prof_id,
            published: r.published,
            by: r.created_by_name,
            savedAt: r.created_at,
            ...(r.data || {})
          }));
          ingestExamReports(exams);
        }
      } catch (e) {
        console.warn('Sync exam reports warning:', e);
      }

      // 4. مزامنة الوثائق المشتركة من جدول wajih_documents (دون حذف أي وثيقة محلية)
      try {
        const { data: docsData, error: docsErr } = await C.from('wajih_documents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!docsErr && Array.isArray(docsData)) {
          const cloudDocs = docsData.map(row => ({
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
            file: row.file_data || {
              name: row.file_name,
              size: row.file_size,
              type: row.file_type,
              dataUrl: row.file_url
            },
            uploadedAt: row.created_at,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            reviewNote: row.review_note,
            downloads: row.downloads || 0,
            views: row.views || 0
          }));

          // السحابة هي المرجع: نحذف المحلي الذي حُذف سحابياً (باستثناء الاختبارات المستخرجة والعيّنات والوثائق غير المنقولة بعد)
          const cloudIds = new Set(cloudDocs.map(x => x.id));
          const keepLocal = state.documents.filter(x => cloudIds.has(x.id) || x.isExamAudit || String(x.id).indexOf('sample') >= 0 || (x.file && x.file.dataUrl && /^data:/.test(x.file.dataUrl)));
          const merged = [...keepLocal];
          cloudDocs.forEach(cd => {
            const idx = merged.findIndex(x => x.id === cd.id);
            if (idx >= 0) merged[idx] = { ...merged[idx], ...cd };
            else merged.push(cd);
          });
          state.documents = dedupeDocs(merged);
          save();
          await migrateLocalDocs(C, cloudIds);
        }
      } catch (e) {
        console.warn('Sync documents warning:', e);
      }

      updateSyncBadge('synced', `🟢 متصل بـ Supabase — متزامن مع بنك الأساتذة (${state.profs.length}) ومتوسطات المقاطعة (${state.schools.length})`);
      renderDocuments();
      renderStats();

      if (interactive) {
        alert(`✅ تمت المزامنة السحابية بنجاح!\n• بنك الأساتذة: ${state.profs.length} أستاذ(ة)\n• متوسطات المقاطعة: ${state.schools.length} متوسطة\n• إجمالي الوثائق بالبنك: ${state.documents.length}`);
      }
    } catch (e) {
      console.error('Fatal syncWithSupabase error:', e);
      updateSyncBadge('offline', 'تعذر الاتصال بالسحابة — العمل بالوضع المحلي');
    }
  }

  function updateSyncBadge(status, text) {
    state.syncStatus = status;
    const badge = document.getElementById('supabaseSyncBadge');
    if (!badge) return;

    badge.className = 'sync-status-badge ' + status;
    badge.innerHTML = `
      <span class="sync-dot"></span>
      <span class="sync-text">${esc(text)}</span>
      <button class="btn-resync" onclick="DocumentsManager.syncWithSupabase(true)" title="تحديث المزامنة الآن">
        <i class="fas fa-arrows-rotate"></i>
      </button>
    `;
  }

  /* ---------- واجهة المستخدم والمساعدات ---------- */
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
    if (window.PortalAuth && typeof window.PortalAuth.getUser === 'function') {
      const u = window.PortalAuth.getUser();
      if (u) return u;
    }
    if (window.WJ && window.WJ.me) return window.WJ.me;
    try {
      const s = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && parsed.user) return parsed.user;
      }
      const pu = localStorage.getItem('portalUser');
      if (pu) return JSON.parse(pu);
    } catch (e) {}
    return { id: 'prof-guest', fullName: 'أستاذ المقاطعة', username: 'teacher', role: 'teacher', school: 'متوسطة علي غرباوي' };
  }

  function isStaff() {
    const u = getUser();
    if (!u) return false;
    const r = (u.role || '').toLowerCase();
    return r === 'inspector' || r === 'supervisor' || r === 'admin' || r === 'مفتش' || r === 'مشرف';
  }

  /* تعبئة قائمة المتوسطات الـ 21 في الفلتر والنموذج */
  function populateSchoolsUI() {
    const schoolFilter = document.getElementById('docSchoolFilter');
    if (schoolFilter) {
      const currentVal = schoolFilter.value;
      schoolFilter.innerHTML = `<option value="">— كل متوسطات المقاطعة (${state.schools.length}) —</option>` +
        state.schools.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
      if (currentVal) schoolFilter.value = currentVal;
    }

    const schoolSelect = document.getElementById('docSchool');
    if (schoolSelect && schoolSelect.tagName === 'SELECT') {
      const currentVal = schoolSelect.value;
      schoolSelect.innerHTML = `<option value="">— اختر المتوسطة من المقاطعة (${state.schools.length}) —</option>` +
        state.schools.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
      if (currentVal) schoolSelect.value = currentVal;
    }
  }

  /* تعبئة قائمة الأساتذة من wajih_prof في الفلتر والنموذج */
  function populateTeachersUI() {
    const teacherFilter = document.getElementById('docTeacherFilter');
    if (teacherFilter) {
      const currentVal = teacherFilter.value;
      teacherFilter.innerHTML = `<option value="">— كل الأساتذة (data prof: ${state.profs.length}) —</option>` +
        state.profs.map(p => `<option value="${esc(p.name)}">${esc(p.name)}${p.inst ? ' — ' + esc(p.inst) : ''}</option>`).join('');
      if (currentVal) teacherFilter.value = currentVal;
    }

    const authorSelect = document.getElementById('docAuthorSelect');
    if (authorSelect) {
      const currentVal = authorSelect.value;
      authorSelect.innerHTML = `<option value="">— اختر الأستاذ(ة) من بنك الأساتذة (data prof) —</option>` +
        state.profs.map(p => `<option value="${esc(p.name)}" data-inst="${esc(p.inst || '')}" data-sub="${esc(p.subject || '')}">${esc(p.name)}${p.inst ? ' (' + esc(p.inst) + ')' : ''}</option>`).join('') +
        `<option value="__custom__">➕ أستاذ جديد غير مسجل في القائمة</option>`;
      if (currentVal) authorSelect.value = currentVal;
    }
  }

  /* ---------- التعامل مع الملفات ---------- */
  function triggerUpload() {
    const input = document.getElementById('docFileInput');
    if (input) input.click();
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`حجم الملف كبير جداً (${formatSize(file.size)}). الحد الأقصى المسموح به هو ${MAX_MB} ميغابايت.`);
      e.target.value = '';
      return;
    }

    state.pendingFile = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      rawFile: file
    };
    renderPendingFile();
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

  /* عند تغيير الأستاذ في نموذج الرفع، يتم الملء التلقائي للمتوسطة والمادة */
  function handleAuthorSelectChange() {
    const sel = document.getElementById('docAuthorSelect');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    const customWrap = document.getElementById('customAuthorWrap');

    if (sel.value === '__custom__') {
      if (customWrap) customWrap.style.display = 'block';
      return;
    }

    if (customWrap) customWrap.style.display = 'none';

    if (opt && opt.dataset) {
      const inst = opt.dataset.inst;
      const sub = opt.dataset.sub;

      const schoolField = document.getElementById('docSchool');
      if (schoolField && inst) {
        schoolField.value = inst;
      }

      const subjectField = document.getElementById('docSubject');
      if (subjectField && sub) {
        subjectField.value = sub;
      }
    }
  }

  /* ---------- حفظ وثيقة جديدة ---------- */
  async function submitDocument() {
    if (state.submitting) return;           // يمنع الرفع المزدوج بالضغط المتكرر
    state.submitting = true;
    const sb = document.querySelector('#docUploadModal button[type="submit"], form[onsubmit*="submitDocument"] button[type="submit"]');
    if (sb) sb.disabled = true;
    try { await _submitDocument(); } finally { state.submitting = false; if (sb) sb.disabled = false; }
  }

  async function _submitDocument() {
    const user = getUser();
    if (!user) { alert('يجب تسجيل الدخول أولاً.'); return; }

    const title = document.getElementById('docTitle')?.value.trim();
    const categoryId = document.getElementById('docCategory')?.value;
    const subject = document.getElementById('docSubject')?.value;
    const level = document.getElementById('docLevel')?.value;
    const period = document.getElementById('docPeriod')?.value;
    const description = document.getElementById('docDescription')?.value.trim();
    
    // الأستاذ والمؤسسة
    const authorSelect = document.getElementById('docAuthorSelect');
    let authorName = '';
    if (authorSelect && authorSelect.value && authorSelect.value !== '__custom__') {
      authorName = authorSelect.value;
    } else {
      const customInput = document.getElementById('docCustomAuthor');
      authorName = customInput?.value.trim() || user.fullName || user.username || 'أستاذ المقاطعة';
    }

    const schoolField = document.getElementById('docSchool');
    const school = schoolField?.value.trim() || user.school || 'المقاطعة الثانية';
    const file = state.pendingFile;

    if (!title) { alert('يرجى إدخال عنوان الوثيقة.'); return; }
    if (!categoryId) { alert('يرجى اختيار نوع الوثيقة.'); return; }
    if (!file) { alert('يرجى إرفاق ملف للوثيقة (PDF / صورة / مستند).'); return; }

    const cat = getCategory(categoryId);
    if (cat.inspectorOnly && !isStaff()) {
      alert('رفع الوثائق المرجعية الرسمية مخصص للمفتش والمشرف فقط.');
      return;
    }

    const C = await cloud();
    if (!C) { alert('لا توجد جلسة متصلة بالسحابة: سجّل الدخول من جديد ثم أعد رفع الوثيقة، حتى لا يضيع الملف.'); return; }

    const docId = uuid();
    const path = 'documents/' + docId + '/' + Date.now() + '.' + fileExt(file.name);
    const up = await C.storage.from(BUCKET).upload(path, file.rawFile, { contentType: file.type, upsert: false });
    if (up.error) { alert('تعذّر رفع الملف: ' + up.error.message); return; }

    const newDoc = {
      id: docId,
      title,
      category: categoryId,
      subject: subject || 'اللغة العربية',
      level: level || 'غير محدد',
      period: period || 'الفصل الأول',
      description,
      school,
      author: authorName,
      authorUsername: user.username || 'teacher',
      authorRole: user.role || 'teacher',
      status: isStaff() ? 'approved' : 'pending',
      file: { name: file.name, size: file.size, type: file.type, path },
      uploadedAt: new Date().toISOString(),
      reviewedBy: isStaff() ? (user.fullName || user.full_name || 'درويش الهلالي') : null,
      reviewedAt: isStaff() ? new Date().toISOString() : null,
      reviewNote: isStaff() ? 'وثيقة مرجعية معتمدة مباشرة من المفتشية' : '',
      downloads: 0,
      views: 0
    };

    const ins = await C.from('wajih_documents').insert(rowFor(newDoc));
    if (ins.error) {
      C.storage.from(BUCKET).remove([path]);
      alert('تعذّر حفظ الوثيقة في قاعدة البيانات: ' + ins.error.message);
      return;
    }
    if (window.PortalCloud && PortalCloud.log) PortalCloud.log('create', 'documents');

    state.documents = dedupeDocs([newDoc, ...state.documents.filter(x => x.id !== docId)]);
    save();

    closeUploadModal();
    renderDocuments();
    renderStats();
    resetForm();

    const msg = isStaff()
      ? '✅ تم نشر الوثيقة واعتمادها بنجاح ومزامنتها مع المنظومة'
      : '✅ تم رفع الوثيقة بنجاح وأحيلت للمراجعة والاعتماد التفتيشي';
    alert(msg);
  }

  function resetForm() {
    ['docTitle','docDescription','docCustomAuthor'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['docCategory','docSubject','docLevel','docPeriod','docSchool','docAuthorSelect'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName === 'SELECT') el.selectedIndex = 0;
    });
    const customWrap = document.getElementById('customAuthorWrap');
    if (customWrap) customWrap.style.display = 'none';
    clearPendingFile();
  }

  /* ---------- تصفية وعرض متقدم ---------- */
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

  function handleSearch(term) {
    state.searchQuery = (term || '').trim().toLowerCase();
    renderDocuments();
  }

  function handleLevelFilter(level) {
    state.selectedLevel = level || '';
    renderDocuments();
  }

  function handleSchoolFilter(school) {
    state.selectedSchool = school || '';
    renderDocuments();
  }

  function handleTeacherFilter(teacher) {
    state.selectedTeacher = teacher || '';
    renderDocuments();
  }

  function getFilteredDocuments() {
    const user = getUser();
    const canManage = isStaff();
    let docs = [...state.documents];

    // الأساتذة يرون الوثائق المعتمدة + وثائقهم
    if (!canManage) {
      docs = docs.filter(d =>
        d.status === 'approved' || d.authorUsername === user?.username
      );
    }

    // تصفية حسب الفئة
    if (state.currentCategory) {
      docs = docs.filter(d => d.category === state.currentCategory);
    }

    // تصفية حسب المستوى
    if (state.selectedLevel) {
      docs = docs.filter(d => (d.level || '').includes(state.selectedLevel));
    }

    // تصفية حسب المتوسطة
    if (state.selectedSchool) {
      docs = docs.filter(d => (d.school || '').includes(state.selectedSchool));
    }

    // تصفية حسب الأستاذ (data prof)
    if (state.selectedTeacher) {
      docs = docs.filter(d => (d.author || '').includes(state.selectedTeacher));
    }

    // تصفية بنص البحث
    if (state.searchQuery) {
      const q = state.searchQuery;
      docs = docs.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.author || '').toLowerCase().includes(q) ||
        (d.school || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.subject || '').toLowerCase().includes(q)
      );
    }

    // تصفية حسب الحالة والنوع
    if (state.currentFilter === 'mine') {
      docs = docs.filter(d => d.authorUsername === user?.username);
    } else if (state.currentFilter === 'approved') {
      docs = docs.filter(d => d.status === 'approved');
    } else if (state.currentFilter === 'pending') {
      docs = docs.filter(d => d.status === 'pending');
    } else if (state.currentFilter === 'downloaded') {
      docs = docs.filter(d => (d.downloads || 0) > 0);
    } else if (state.currentFilter === 'audited') {
      // الاختبارات المفحوصة في منصة fahs-ikhtibar
      docs = docs.filter(d => d.isExamAudit);
    }

    return docs.sort((a, b) =>
      new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()
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
          <p style="font-size:12.5px; color:#6b7280; margin-bottom:14px;">يمكنك استيراد الاختبارات المفحوصة من منصة الفحص، أو رفع وثيقة جديدة.</p>
          <div style="display:flex; justify-content:center; gap:8px;">
            <button class="btn-primary" onclick="DocumentsManager.syncWithSupabase(true)">
              <i class="fas fa-arrows-rotate"></i> مزامنة سحابية واستيراد
            </button>
            <button class="btn-secondary" onclick="DocumentsManager.openUploadModal()">
              <i class="fas fa-cloud-arrow-up"></i> رفع وثيقة جديدة
            </button>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = docs.map(d => {
      const cat = getCategory(d.category);
      const badge = getStatusBadge(d.status);
      const isOwner = d.authorUsername === user?.username;
      const showReview = canManage && (d.status === 'pending' || d.status === 'revision');

      return `
        <div class="doc-card" data-id="${d.id}" style="background:#fff; border:1.5px solid ${d.isExamAudit ? 'var(--gold)' : '#d9d2bd'}; border-radius:16px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.25s ease; box-shadow:0 2px 8px rgba(0,0,0,0.04); position:relative;">
          
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

            <!-- وسوم التصنيف وشارة فحص الاختبارات إن وجدت -->
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
              <span style="background:${cat.color}15; color:${cat.color}; font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px;">
                <i class="fas ${cat.icon}"></i> ${cat.name}
              </span>
              ${d.isExamAudit ? `
                <span style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px;">
                  <i class="fas fa-award"></i> مفحوص تفتيشياً (${d.auditScore || ''})
                </span>` : ''}
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
              <button class="btn-doc-action" onclick="DocumentsManager.previewDoc('${d.id}')" title="معاينة الوثيقة" style="padding:6px 10px; background:#f1f5f9; color:var(--navy); border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700;">
                <i class="fas fa-eye"></i> معاينة
              </button>

              <button class="btn-doc-action" onclick="DocumentsManager.downloadDoc('${d.id}')" title="تحميل الملف بختم الاعتماد" style="padding:6px 12px; background:var(--gold); color:var(--navy); border:none; border-radius:8px; cursor:pointer; font-size:12px; font-weight:800;">
                <i class="fas fa-download"></i> تحميل
              </button>

              ${d.isExamAudit ? `
                <a href="fahs-ikhtibar.html" target="_blank" title="فتح بطاقة الفحص الكاملة في منصة فحص الاختبارات" style="padding:6px 10px; background:#0e2744; color:#fff; text-decoration:none; border-radius:8px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                  <i class="fas fa-chart-simple"></i> بطاقة الفحص
                </a>
              ` : ''}

              ${showReview ? `
                <button class="btn-doc-action" onclick="DocumentsManager.reviewDoc('${d.id}', 'approved')" title="اعتماد الوثيقة للمقاطعة" style="padding:6px 10px; background:#16a34a; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">
                  <i class="fas fa-check"></i> اعتماد
                </button>
                <button class="btn-doc-action" onclick="DocumentsManager.reviewDoc('${d.id}', 'rejected')" title="رفض الوثيقة" style="padding:6px 10px; background:#dc2626; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:11px; font-weight:700;">
                  <i class="fas fa-times"></i> رفض
                </button>
              ` : ''}

              ${(isOwner || canManage) ? `
                <button class="btn-doc-action" onclick="DocumentsManager.deleteDoc('${d.id}')" title="حذف" style="padding:6px 8px; background:transparent; color:#94a3b8; border:none; border-radius:6px; cursor:pointer; font-size:12px;">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  /* ---------- معاينة الوثيقة ---------- */
  async function previewDoc(id) {
    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    d.views = (d.views || 0) + 1;
    save();

    const titleEl = document.getElementById('docPreviewTitle');
    const bodyEl = document.getElementById('docPreviewBody');
    const modal = document.getElementById('docPreviewModal');

    if (titleEl) titleEl.textContent = d.title;
    if (bodyEl) {
      const cat = getCategory(d.category);
      const badge = getStatusBadge(d.status);

      let filePreviewHtml = '';
      const fUrl = await docFileUrl(d, false);
      const fType = (d.file?.type || '').toLowerCase(), fExt = (d.file?.name || '').split('.').pop().toLowerCase();
      if (fUrl) {
        if (fType.startsWith('image/') || /^(jpe?g|png|webp|gif)$/.test(fExt)) {
          filePreviewHtml = `<div style="text-align:center; margin:16px 0;"><img src="${fUrl}" style="max-width:100%; max-height:480px; border-radius:10px; border:1px solid #e2e8f0;"></div>`;
        } else if (fType === 'application/pdf' || fExt === 'pdf') {
          filePreviewHtml = `<div style="margin:16px 0; height:450px;"><iframe src="${fUrl}" style="width:100%; height:100%; border:none; border-radius:10px;"></iframe></div>`;
        } else {
          filePreviewHtml = `<div style="margin:16px 0; padding:14px; background:#f8fafc; border-radius:10px; text-align:center; font-size:12.5px; color:#475569;">لا تتوفر معاينة لهذا النوع من الملفات في المتصفح، استعمل زر التحميل.</div>`;
        }
      }

      bodyEl.innerHTML = `
        <div style="text-align:right;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:14px;">
            <div>
              <span class="status-badge ${badge.class}" style="padding:4px 12px; border-radius:14px; font-weight:700;">
                <i class="fas ${badge.icon}"></i> ${badge.label}
              </span>
              ${d.isExamAudit ? `<span style="margin-right:8px; background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:14px; font-weight:700; font-size:12px;"><i class="fas fa-award"></i> نتيجة الفحص: ${d.auditScore} (${d.auditQual})</span>` : ''}
            </div>
            <div style="font-size:12px; color:#64748b;">
              <i class="fas fa-calendar"></i> تاريخ الرفع: ${formatTime(d.uploadedAt)}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; background:#f8fafc; padding:14px; border-radius:12px; margin-bottom:16px; font-size:12.5px;">
            <div><strong>الأستاذ(ة):</strong> ${esc(d.author)}</div>
            <div><strong>المتوسطة:</strong> ${esc(d.school)}</div>
            <div><strong>المادة:</strong> ${esc(d.subject)}</div>
            <div><strong>المستوى:</strong> ${esc(d.level)}</div>
            <div><strong>الفترة:</strong> ${esc(d.period)}</div>
            <div><strong>نوع الوثيقة:</strong> ${esc(cat.name)}</div>
          </div>

          ${d.description ? `
            <div style="margin-bottom:16px;">
              <h4 style="font-size:13px; font-weight:700; color:var(--navy); margin-bottom:6px;">الوصف والمؤشرات البيداغوجية:</h4>
              <p style="font-size:12.5px; color:#334155; line-height:1.7; background:#fff; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">${esc(d.description)}</p>
            </div>
          ` : ''}

          ${d.reviewNote ? `
            <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:14px; margin-bottom:16px;">
              <div style="font-weight:800; color:#166534; font-size:13px; margin-bottom:4px;">
                <i class="fas fa-stamp text-gold"></i> تأشيرة واعتماد المفتشية:
              </div>
              <p style="font-size:12.5px; color:#14532d; line-height:1.6; margin:0;">${esc(d.reviewNote)}</p>
              <div style="font-size:11px; color:#15803d; margin-top:6px;">
                المفتش: ${esc(d.reviewedBy || 'درويش الهلالي')} — التاريخ: ${formatTime(d.reviewedAt)}
              </div>
            </div>
          ` : ''}

          ${filePreviewHtml}

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:14px; margin-top:16px;">
            <div style="font-size:12px; color:#64748b;">
              <i class="fas fa-file"></i> ${esc(d.file?.name || 'ملف')} (${formatSize(d.file?.size)})
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary" onclick="DocumentsManager.closePreview()">إغلاق</button>
              <button class="btn-primary" onclick="DocumentsManager.downloadDoc('${d.id}')">
                <i class="fas fa-download"></i> تحميل الوثيقة المعتمدة
              </button>
            </div>
          </div>
        </div>
      `;
    }

    if (modal) modal.style.display = 'flex';
  }

  function closePreview() {
    const modal = document.getElementById('docPreviewModal');
    if (modal) modal.style.display = 'none';
  }

  /* ---------- تحميل الوثيقة ---------- */
  async function downloadDoc(id) {
    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    d.downloads = (d.downloads || 0) + 1;
    save();

    // تحديث العداد في Supabase إذا كان متوفراً
    cloud().then(C => { if (C) C.from('wajih_documents').update({ downloads: d.downloads }).eq('id', d.id).then(() => {}, () => {}); });

    const dUrl = await docFileUrl(d, true);
    if (d.file && (d.file.path || d.file.dataUrl) && !dUrl) { alert('تعذّر الوصول إلى الملف. تأكد من الاتصال وتسجيل الدخول ثم أعد المحاولة.'); return; }
    if (dUrl) {
      const a = document.createElement('a');
      a.href = dUrl;
      a.download = d.file.name || `وثيقة_${d.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // توليد ملف نصي ترحيبي معتمد
      const textContent = `
============================================================
الجمهورية الجزائرية الديمقراطية الشعبية
وزارة التربية الوطنية — المفتشية العامة للبيداغوجيا
مديرية التربية لولاية قسنطينة — مفتشية التعليم المتوسط (المقاطعة الثانية)
============================================================
وثيقة تربوية معتمدة للتداول البيداغوجي

العنوان: ${d.title}
نوع الوثيقة: ${getCategory(d.category).name}
المستوى: ${d.level} | المادة: ${d.subject} | الفترة: ${d.period}
الأستاذ(ة) المعد(ة): ${d.author} (${d.school})
تأشيرة الاعتماد: ${d.status === 'approved' ? 'معتمدة رسمياً' : 'قيد المراجعة'}
توجيهات المفتشية: ${d.reviewNote || 'مطابقة للمنهاج الرسمي'}
المفتش المؤطر: ${d.reviewedBy || 'مفتش التعليم المتوسط درويش الهلالي'}
============================================================
الفضاء التشاركي لبنك الوثائق والتقويمات © 2026
`;
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `اعتماد_${(d.title || 'وثيقة').replace(/\s+/g,'_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(u);
    }

    renderDocuments();
    renderStats();
  }

  /* ---------- مراجعة واعتماد تفتيشي ---------- */
  async function reviewDoc(id, status) {
    if (!isStaff()) {
      alert('إجراءات الاعتماد والمراجعة مخصصة للمفتش والمشرف فقط.');
      return;
    }

    const d = state.documents.find(x => x.id === id);
    if (!d) return;

    const user = getUser();
    const note = status === 'rejected'
      ? prompt('سبب عدم الاعتماد (سيظهر للأستاذ كتغذية راجعة):', 'الوثيقة تحتاج إلى ضبط الصياغة وتنسيق شبكة التقويم وفق دليل الاختبارات.')
      : prompt('ملاحظة أو توجيه تفتيشي (اختياري):', 'وثيقة تربوية ممتازة ومطابقة للمنهاج، معتمدة للتداول بين أساتذة المقاطعة.');

    if (note === null) return;

    d.status = status;
    d.reviewedBy = user.fullName || 'مفتش التعليم المتوسط درويش الهلالي';
    d.reviewedAt = new Date().toISOString();
    d.reviewNote = note || '';

    save();

    // تحديث Supabase
    const C = await cloud();
    if (C) {
      try {
        await C.from('wajih_documents').update({
          status: d.status,
          reviewed_by: d.reviewedBy,
          reviewed_at: d.reviewedAt,
          review_note: d.reviewNote
        }).eq('id', d.id);
      } catch (e) {
        console.warn('Review Supabase update warning:', e);
      }
    }

    renderDocuments();
    renderStats();

    if (status === 'approved') {
      alert('✅ تم اعتماد الوثيقة بنجاح وأصبحت متاحة للتحميل لكافة أساتذة المقاطعة.');
    } else {
      alert('❌ تم تسجيل ملاحظة عدم الاعتماد وحفظ التغذية الراجعة للأستاذ.');
    }
  }

  /* ---------- حذف وثيقة ---------- */
  async function deleteDoc(id) {
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

    const C = await cloud();
    if (C) {
      try {
        const r = await C.from('wajih_documents').delete().eq('id', id);
        if (r.error) alert('تعذّر الحذف من السحابة: ' + r.error.message);
        else if (d.file && d.file.path && !d.file.bucket) C.storage.from(BUCKET).remove([d.file.path]);
        if (window.PortalCloud && PortalCloud.log) PortalCloud.log('delete', 'documents');
      } catch (e) {}
    }

    renderDocuments();
    renderStats();
  }

  /* ---------- الإحصائيات الحية ---------- */
  function renderStats() {
    const all = state.documents;
    const approved = all.filter(d => d.status === 'approved').length;
    const pending = all.filter(d => d.status === 'pending').length;
    const rejected = all.filter(d => d.status === 'rejected').length;
    const totalDownloads = all.reduce((s, d) => s + (d.downloads || 0), 0);
    const auditedExams = all.filter(d => d.isExamAudit).length;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('statTotalDocs', all.length);
    setText('statApprovedDocs', approved);
    setText('statPendingDocs', pending);
    setText('statRejectedDocs', rejected);
    setText('statTotalDownloads', totalDownloads);
    setText('statAuditedExams', auditedExams);
    setText('statSchoolsCount', state.schools.length);
    setText('statProfsCount', state.profs.length);
  }

  function openUploadModal() {
    const m = document.getElementById('docUploadModal');
    if (m) m.style.display = 'flex';
  }

  function closeUploadModal() {
    const m = document.getElementById('docUploadModal');
    if (m) m.style.display = 'none';
  }

  /* ---------- التهيئة الشاملة ---------- */
  async function init() {
    load();
    const user = getUser();
    const canManage = isStaff();

    // فئات الوثائق
    const catSelect = document.getElementById('docCategory');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">— اختر نوع الوثيقة —</option>';
      state.categories.forEach(c => {
        if (c.inspectorOnly && !canManage) return;
        catSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    }

    // تعبئة المتوسطات والأساتذة
    populateSchoolsUI();
    populateTeachersUI();

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

    // ربط مستمعي الأحداث
    { const fi = document.getElementById('docFileInput'); if (fi && !fi.dataset.bound) { fi.dataset.bound = '1'; fi.addEventListener('change', handleFileSelect); } }
    document.getElementById('docAuthorSelect')?.addEventListener('change', handleAuthorSelectChange);

    // بدء المزامنة السحابية الخلفية
    syncWithSupabase(false);
  }

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
    handleSearch,
    handleLevelFilter,
    handleSchoolFilter,
    handleTeacherFilter,
    previewDoc,
    closePreview,
    downloadDoc,
    reviewDoc,
    deleteDoc,
    openUploadModal,
    closeUploadModal,
    syncWithSupabase,
    renderDocuments,
    renderStats,
    state
  };
})();
