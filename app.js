/* ============================================================
   بوابة الأدوات الرقمية — منطق التفاعلات المتكاملة
   ============================================================ */

/* ---------- بيانات المسار البيداغوجي ---------- */
const JOURNEY_DATA = {
    arabic: {
        icon: 'fa-book-open-reader',
        title: 'تعليمية اللغة العربية',
        subtitle: 'بناء المقاطع التعلمية وتصميم المذكرات البيداغوجية',
        desc: 'مرجعية ديداكتيكية متكاملة وفق مناهج الجيل الثاني: مستويات الفهم القرائي الخمسة، أنماط النصوص الستة، هندسة المقاطع التعلمية، وتصميم مذكرات الميادين الثلاثة لجميع سنوات التعليم المتوسط.',
        link: 'arabic.html',
        stats: [['5','مستويات فهم'], ['6','أنماط نصوص'], ['4','مستويات']],
        features: ['مستويات الفهم القرائي', 'أنماط النصوص الستة', 'هندسة المقاطع التعلمية', 'مصمم المذكرات']
    },
    moualaja: {
        icon: 'fa-stethoscope',
        title: 'المعالجة البيداغوجية',
        subtitle: 'التشخيص وبناء الخطط العلاجية',
        desc: 'منصة متكاملة لتخطيط وتتبع المعالجة البيداغوجية: تشخيص الصعوبات القرائية، بناء خطط علاجية فردية وجماعية، ومتابعة تقدم المتعلمين بمقاربة علمية منظمة.',
        link: 'moualaja.html',
        stats: [['4','أنماط معالجة'], ['3','مراحل'], ['∞','سجلات']],
        features: ['تشخيص الصعوبات', 'خطط علاجية', 'متابعة التقدم', 'تقارير تفصيلية']
    },
    amal: {
        icon: 'fa-chalkboard-teacher',
        title: 'الأعمال الموجهة',
        subtitle: 'التفويج وتسيير الأنشطة الفارقية',
        desc: 'لوحة قيادة شاملة، بنك الأنشطة الفارقية المشترك، محاكاة الأنشطة، وإحصائيات تفصيلية لمتابعة تنفيذ الحصص وتوزيع الفوجات.',
        link: 'amal.html',
        stats: [['4','نماذج جاهزة'], ['4','مواد'], ['∞','أنشطة']],
        features: ['لوحة قيادة', 'بنك الأنشطة الفارقية', 'محاكاة الأنشطة', 'إحصائيات']
    },
    niqash: {
        icon: 'fa-comments',
        title: 'ركن النقاش',
        subtitle: 'التواصل المهني والمحادثة التربوية',
        desc: 'محادثة جماعية حيّة، مناقشات تربوية، دفتر ملاحظات شخصي، وتبادل الملفات (Word، Excel، PPT، صور، PDF).',
        link: 'niqash.html',
        stats: [['∞','مواضيع'], ['∞','ملفات'], ['3','فضاءات']],
        features: ['محادثة جماعية', 'دفتر ملاحظات شخصي', 'تبادل الملفات', 'مناقشات تربوية']
    },
    taqyim: {
        icon: 'fa-award',
        title: 'بطاقة الأداء التكاملي',
        subtitle: 'تقييم المعلم والمتعلم وفق مهارات القرن 21',
        desc: 'بطاقة تقييم أداء شاملة تغطي خمسة محاور أساسية بثلاث لغات، مع 34 مؤشراً وإمكانية تصدير التقرير مباشرة.',
        link: 'taqyim.html',
        stats: [['5','محاور'], ['3','لغات'], ['34','مؤشر']],
        features: ['تقييم متعدد المحاور', 'ثلاث لغات', 'تصدير التقرير']
    }
};

/* ---------- بيانات معاينة الأدوات ---------- */
const PREVIEW_DATA = {
    arabic:  { title: 'تعليمية اللغة العربية', sub: 'بناء المقاطع وتصميم المذكرات',
               desc: 'مرجعية كاملة لمناهج الجيل الثاني: مستويات الفهم القرائي، أنماط النصوص، هندسة المقاطع، ومصمم مذكرات الميادين الثلاثة.',
               link: 'arabic.html',
               stats: [['5','مستويات فهم'], ['6','أنماط'], ['4','مستويات']],
               features: ['الفهم القرائي', 'هندسة المقاطع', 'مصمم المذكرات'] },
    moualaja:{ title: 'المعالجة البيداغوجية', sub: 'التشخيص والخطة العلاجية',
               desc: 'تخطيط وتتبع المعالجة، تشخيص الصعوبات، بناء خطط علاجية، ومتابعة تقدم المتعلمين بمقاربة علمية منظمة.',
               link: 'moualaja.html',
               stats: [['4','أنماط'], ['3','مراحل'], ['∞','سجلات']],
               features: ['تشخيص', 'خطط علاجية', 'متابعة'] },
    amal:    { title: 'الأعمال الموجهة', sub: 'التفويج والأنشطة الفارقية',
               desc: 'لوحة قيادة، بنك الأنشطة الفارقية المشترك، محاكاة الأنشطة، وإحصائيات تفصيلية.',
               link: 'amal.html',
               stats: [['4','نماذج'], ['4','مواد'], ['∞','أنشطة']],
               features: ['لوحة قيادة', 'بنك أنشطة', 'محاكاة'] },
    niqash:  { title: 'ركن النقاش', sub: 'التواصل والملاحظات',
               desc: 'محادثة جماعية حيّة، مناقشات تربوية، دفتر ملاحظات شخصي، وتبادل الملفات.',
               link: 'niqash.html',
               stats: [['∞','مواضيع'], ['∞','ملفات'], ['3','فضاءات']],
               features: ['محادثة جماعية', 'دفتر ملاحظات', 'تبادل ملفات'] },
    taqyim:  { title: 'بطاقة الأداء التكاملي', sub: 'تقييم المفتش', link: 'taqyim.html',
               desc: 'بطاقة تقييم أداء المعلم والمتعلم وفق مهارات القرن الحادي والعشرين، بثلاث لغات.',
               stats: [['5','محاور'], ['3','لغات'], ['34','مؤشر']],
               features: ['تقييم متعدد المحاور', 'تصدير التقرير', 'ثلاث لغات'] },
    dashboard:{ title: 'لوحة التحكم', sub: 'إدارة المنظومة', link: 'dashboard.html',
               desc: 'إدارة حسابات الأساتذة، مراقبة نشاطاتهم لحظياً، والاطلاع على سجلات المعالجة البيداغوجية.',
               stats: [['∞','مستخدم'], ['∞','عمليات'], ['3','تبويبات']],
               features: ['إدارة حسابات', 'مراقبة لحظية', 'سجلات المعالجة'] },
    cv:      { title: 'السيرة الذاتية للمفتش', sub: 'بطاقة تعريفية', link: 'cv.html',
               desc: 'السيرة الذاتية المهنية للمفتش درويش الهلالي: المسار الأكاديمي، المخطط الزمني للمهنة، ونِسب الخبرة.',
               stats: [['36','سنة خبرة'], ['5','شهادات'], ['3','لغات']],
               features: ['المسار الأكاديمي', 'المخطط الزمني', 'نسب الخبرة'] }
};

/* ============================================================
   تفاصيل المسار البيداغوجي
   ============================================================ */
function showJourneyDetail(key) {
    const d = JOURNEY_DATA[key];
    if (!d) return;

    const iconEl = document.getElementById('jdIcon');
    if (iconEl) iconEl.innerHTML = `<i class="fas ${d.icon}"></i>`;
    const titleEl = document.getElementById('jdTitle');
    if (titleEl) titleEl.textContent = d.title;
    const subEl = document.getElementById('jdSubtitle');
    if (subEl) subEl.textContent = d.subtitle;
    const descEl = document.getElementById('jdDescription');
    if (descEl) descEl.textContent = d.desc;

    const statsEl = document.getElementById('jdStats');
    if (statsEl) {
        statsEl.innerHTML = d.stats.map(([n,l]) =>
            `<div class="jd-stat"><span class="jd-num">${n}</span><span class="jd-lbl">${l}</span></div>`
        ).join('');
    }

    const featEl = document.getElementById('jdFeatures');
    if (featEl) {
        featEl.innerHTML = d.features.map(f =>
            `<li><i class="fas fa-check"></i> ${f}</li>`
        ).join('');
    }

    const btn = document.getElementById('jdEnterBtn');
    if (btn) {
        btn.href = d.link;
        btn.style.display = d.link === '#' ? 'none' : 'inline-flex';
    }

    document.querySelectorAll('.journey-step').forEach(el => {
        el.classList.toggle('active', el.dataset.step === key);
    });
}

/* ============================================================
   التنقل السلس
   ============================================================ */
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   نظام الدخول الموحّد المتوافق مع PortalAuth
   ============================================================ */
const USERS = {};

function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('open');
        const msg = document.getElementById('loginMsg');
        if (msg) msg.textContent = '';
        setTimeout(() => document.getElementById('loginUsername')?.focus(), 150);
    }
}
function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('open');
}

async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('loginUsername'), p = document.getElementById('loginPassword'), msg = document.getElementById('loginMsg');
    if (!u || !p) return false;
    if (msg) { msg.style.color = ''; msg.textContent = 'جارٍ التحقق...'; }
    try {
        const r = await PortalCloud.login(u.value, p.value);
        if (r.success) {
            applyUserState();
            if (msg) { msg.style.color = 'var(--teal)'; msg.textContent = '✔ تم الدخول بنجاح — مرحباً ' + r.user.fullName; }
            setTimeout(closeLoginModal, 700);
        } else if (msg) { msg.style.color = 'var(--maroon)'; msg.textContent = '✖ ' + r.error; }
    } catch (err) { if (msg) msg.textContent = '✖ تعذّر الاتصال بالخادم'; }
    return false;
}

function handleLogout() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    try { PortalCloud.signOut(); } catch (e) {}
    try {
        localStorage.removeItem('portalUser');
        sessionStorage.removeItem('pgb_session');
        localStorage.removeItem('pgb_session_persistent');
        sessionStorage.removeItem('portal_session_v2');
        localStorage.removeItem('portal_session_v2_persistent');
    } catch(e) {}
    applyUserState();
    document.dispatchEvent(new CustomEvent('portal:logout'));
}

function getActiveUser() {
    try {
        // فحص pgb_session أولاً
        const raw = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
        if (raw) {
            const s = JSON.parse(raw);
            if (s && s.user && Date.now() <= s.expiresAt) {
                return {
                    name: s.user.fullName || s.user.username,
                    username: s.user.username,
                    role: (s.user.role === 'inspector' || s.user.role === 'مفتش') ? 'مفتش' : (s.user.role === 'supervisor' || s.user.role === 'مشرف' ? 'مشرف' : 'أستاذ'),
                    internalRole: s.user.role
                };
            }
        }
        // فحص portalUser ثانياً
        const legacy = localStorage.getItem('portalUser');
        if (legacy) {
            const u = JSON.parse(legacy);
            return {
                name: u.name || u.fullName || u.username,
                username: u.username,
                role: u.role || 'أستاذ',
                internalRole: (u.role === 'مفتش' || u.role === 'inspector') ? 'inspector' : (u.role === 'مشرف' || u.role === 'supervisor' ? 'supervisor' : 'teacher')
            };
        }
    } catch(e) {}
    return null;
}

function applyUserState() {
    const user = getActiveUser();

    const greet = document.getElementById('userGreet');
    const loginBtn = document.getElementById('topLoginBtn');
    const logoutBtn = document.getElementById('topLogoutBtn');

    if (user) {
        if (greet) greet.style.display = 'inline-flex';
        const nameEl = document.getElementById('userGreetName');
        if (nameEl) nameEl.textContent = user.name;
        const roleEl = document.getElementById('userGreetRole');
        if (roleEl) roleEl.textContent = user.role;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';

        const canAccessInspectorTools = user.internalRole === 'inspector' || user.internalRole === 'supervisor' || user.role === 'مفتش' || user.role === 'مشرف';
        document.getElementById('taqyimCard')?.classList.toggle('locked', !canAccessInspectorTools);
        document.getElementById('dashboardCard')?.classList.toggle('locked', !canAccessInspectorTools);
    } else {
        if (greet) greet.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
        document.getElementById('taqyimCard')?.classList.add('locked');
        document.getElementById('dashboardCard')?.classList.add('locked');
    }
}

/* ============================================================
   معاينة الأدوات
   ============================================================ */
function openToolPreview(key) {
    const d = PREVIEW_DATA[key];
    if (!d) return;

    const titleEl = document.getElementById('previewTitle');
    if (titleEl) titleEl.textContent = d.title;
    const subEl = document.getElementById('previewSubtitle');
    if (subEl) subEl.textContent = d.sub;
    const descEl = document.getElementById('previewDesc');
    if (descEl) descEl.textContent = d.desc;

    const statsEl = document.getElementById('previewStats');
    if (statsEl) {
        statsEl.innerHTML = d.stats.map(([n,l]) =>
            `<div class="pv-stat"><span class="pv-num">${n}</span><span class="pv-lbl">${l}</span></div>`
        ).join('');
    }

    const featEl = document.getElementById('previewFeatures');
    if (featEl) {
        featEl.innerHTML = d.features.map(f =>
            `<li><i class="fas fa-check-circle"></i> ${f}</li>`
        ).join('');
    }

    const btn = document.getElementById('previewEnterBtn');
    if (btn) {
        btn.href = d.link;
        btn.style.display = d.link === '#' ? 'none' : 'inline-flex';
    }

    document.getElementById('previewModal')?.classList.add('open');
}
function closePreviewModal() {
    document.getElementById('previewModal')?.classList.remove('open');
}

/* ============================================================
   مقارنة الأدوات
   ============================================================ */
function openComparisonModal() {
    document.getElementById('comparisonModal')?.classList.add('open');
}
function closeComparisonModal() {
    document.getElementById('comparisonModal')?.classList.remove('open');
}

/* ============================================================
   إغلاق النوافذ
   ============================================================ */
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open')
            .forEach(m => m.classList.remove('open'));
    }
});

/* ============================================================
   إحصائيات ديناميكية (محاكاة)
   ============================================================ */
function fillDynamicStats() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('statMoualaja', '12');
    set('statAmal',      '28');
    set('statNiqash',    '7');
    set('statUsers',     '6');
    set('statActions',   '142');
}

/* ============================================================
   التهيئة
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    applyUserState();
    showJourneyDetail('arabic');
    fillDynamicStats();
});

document.addEventListener('portal:login', applyUserState);
document.addEventListener('portal:logout', applyUserState);
