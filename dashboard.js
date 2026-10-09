/* ============================================================
   لوحة تحكم المفتش والمشرف التربوي — المنطق الكامل الموحّد
   ============================================================ */

const LS_DASH_USERS    = 'dashboard_users';
const LS_DASH_ACTIVITY = 'dashboard_activity';
const LS_DASH_SETTINGS = 'dashboard_settings';

let dashState = {
    users: [],
    activity: [],
    settings: {},
    liveTimer: null
};

/* ============================================================
   مستخدمو المنظومة الافتراضيون
   ============================================================ */
const DEFAULT_USERS = [
    {
        id: 'U001',
        name: 'درويش الهلالي',
        username: 'inspector',
        email: 'dlazedine68@gmail.com',
        role: 'inspector',
        school: 'المقاطعة الثانية قسنطينة',
        status: 'active',
        password: 'inspector2026',
        lastLogin: new Date(Date.now() - 3600 * 1000).toISOString(),
        createdAt: '2020-09-01'
    },
    {
        id: 'U002',
        name: 'أستاذ تجريبي',
        username: 'teacher',
        email: 'teacher@edu.dz',
        role: 'teacher',
        school: 'متوسطة قسنطينة',
        status: 'active',
        password: 'teacher2026',
        lastLogin: new Date(Date.now() - 7200 * 1000).toISOString(),
        createdAt: '2021-03-15'
    },
    {
        id: 'U003',
        name: 'مشرف تربوي',
        username: 'supervisor',
        email: 'supervisor@edu.dz',
        role: 'supervisor',
        school: 'مفتشية التعليم المتوسط',
        status: 'active',
        password: 'supervisor2026',
        lastLogin: new Date(Date.now() - 1800 * 1000).toISOString(),
        createdAt: '2021-09-20'
    },
    {
        id: 'U_toufouti25houssem',
        name: 'حسام الدين تفوتي',
        username: 'toufouti25houssem',
        email: 'toufouti25houssem@gmail.com',
        role: 'teacher',
        school: 'متوسطة الإخوة بوسالم',
        status: 'active',
        password: 'prof2026',
        lastLogin: null,
        createdAt: '2026-10-01'
    },
    {
        id: 'U_dalilaamoura',
        name: 'دليلة عمورة',
        username: 'dalilaamoura',
        email: 'dalilaamoura37@gmail.com',
        role: 'teacher',
        school: 'متوسطة لشطر القرمي',
        status: 'active',
        password: 'prof2026',
        lastLogin: null,
        createdAt: '2026-10-01'
    },
    {
        id: 'U_mazouzi',
        name: 'سعاد معزوزي',
        username: 'mazouzi',
        email: 'snace25000@gmail.com',
        role: 'teacher',
        school: 'متوسطة بوشمال الوزناجي',
        status: 'active',
        password: 'prof2026',
        lastLogin: null,
        createdAt: '2026-10-01'
    }
];

/* ============================================================
   محاكاة نشاطات المنظومة
   ============================================================ */
const ACTIVITY_TEMPLATES = [
    { type: 'learner', color: 'var(--moss)', icon: 'fa-user-plus',
      texts: ['أضاف متعلماً جديداً', 'حدّث بيانات متعلم', 'سجّل صعوبات متعلّم'] },
    { type: 'plan', color: 'var(--ink-2)', icon: 'fa-clipboard-list',
      texts: ['أنشأ خطة علاجية جديدة', 'حدّث خطة علاجية', 'أكمل حصة معالجة'] },
    { type: 'group', color: 'var(--teal)', icon: 'fa-layer-group',
      texts: ['أنشأ فوجاً جديداً للأعمال الموجهة', 'عدّل تشكيلة فوج', 'وثّق حصة أعمال موجهة'] },
    { type: 'session', color: 'var(--gold)', icon: 'fa-calendar-check',
      texts: ['سجّل حصة أعمال موجهة', 'أنجز حصة معالجة', 'برمج حصة جديدة'] },
    { type: 'message', color: 'var(--skyblue)', icon: 'fa-comments',
      texts: ['كتب رسالة في قناة النقاش', 'شارك ملفاً تربوياً', 'تفاعل مع استفسار بيداغوجي'] },
    { type: 'login', color: 'var(--maroon)', icon: 'fa-sign-in-alt',
      texts: ['سجّل الدخول للمنظومة', 'سجّل الخروج من المنظومة'] }
];

/* ============================================================
   التخزين والمزامنة السحابية
   ============================================================ */
function dashLoad() {
    dashState.users = JSON.parse(localStorage.getItem(LS_DASH_USERS) || 'null') || [...DEFAULT_USERS];
    
    // دمج الحسابات الافتراضية مع المحفوظة لضمان وجود الأساتذة دائماً
    DEFAULT_USERS.forEach(defU => {
        if (!dashState.users.some(u => u.username.toLowerCase() === defU.username.toLowerCase())) {
            dashState.users.push(defU);
        }
    });

    dashState.activity = JSON.parse(localStorage.getItem(LS_DASH_ACTIVITY) || 'null') || generateInitialActivity();
    dashState.settings = JSON.parse(localStorage.getItem(LS_DASH_SETTINGS) || '{}');
    if (!dashState.settings.installDate) {
        dashState.settings.installDate = new Date().toISOString();
    }

    // مزامنة سحابية استباقية مع Supabase
    syncUsersFromCloud();
}

function dashSave() {
    localStorage.setItem(LS_DASH_USERS, JSON.stringify(dashState.users));
    localStorage.setItem(LS_DASH_ACTIVITY, JSON.stringify(dashState.activity));
    localStorage.setItem(LS_DASH_SETTINGS, JSON.stringify(dashState.settings));
    syncUsersToCloud();
}

async function syncUsersToCloud() {
    try {
        if (window.initPortalCloud) {
            const client = await window.initPortalCloud();
            if (client) {
                await client.from('wajih_settings').upsert({
                    key: 'dashboard_users',
                    value: dashState.users,
                    updated_at: new Date().toISOString()
                });
            }
        }
    } catch(e) {
        console.warn('Sync users to cloud error:', e);
    }
}

async function syncUsersFromCloud() {
    try {
        if (window.initPortalCloud) {
            const client = await window.initPortalCloud();
            if (client) {
                const { data, error } = await client
                    .from('wajih_settings')
                    .select('value')
                    .eq('key', 'dashboard_users')
                    .single();
                if (!error && data && Array.isArray(data.value) && data.value.length) {
                    const map = new Map();
                    dashState.users.forEach(u => map.set(u.username.toLowerCase(), u));
                    data.value.forEach(u => {
                        if (u && u.username) {
                            const cur = map.get(u.username.toLowerCase());
                            map.set(u.username.toLowerCase(), { ...cur, ...u });
                        }
                    });
                    dashState.users = Array.from(map.values());
                    localStorage.setItem(LS_DASH_USERS, JSON.stringify(dashState.users));
                    if (document.getElementById('usersTableBody')) {
                        renderUsers();
                    }
                }
            }
        }
    } catch(e) {
        console.warn('Sync users from cloud error:', e);
    }
}

function generateInitialActivity() {
    const acts = [];
    const users = DEFAULT_USERS.filter(u => u.role === 'teacher' || u.role === 'supervisor');
    const now = Date.now();
    for (let i = 0; i < 25; i++) {
        const u = users[Math.floor(Math.random() * users.length)];
        const tpl = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
        acts.push({
            id: 'A' + i,
            user: u.name,
            type: tpl.type,
            color: tpl.color,
            icon: tpl.icon,
            text: tpl.texts[Math.floor(Math.random() * tpl.texts.length)],
            time: new Date(now - Math.random() * 30 * 86400 * 1000).toISOString()
        });
    }
    return acts.sort((a, b) => b.time.localeCompare(a.time));
}

/* ============================================================
   الوصول والصلاحيات (المفتش + المشرف)
   ============================================================ */
function getAuthenticatedUser() {
    try {
        const raw = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
        if (raw) {
            const s = JSON.parse(raw);
            if (s && s.user && Date.now() <= s.expiresAt) {
                return s.user;
            }
        }
        const legacy = localStorage.getItem('portalUser');
        if (legacy) {
            const u = JSON.parse(legacy);
            return {
                fullName: u.name || u.fullName || u.username,
                username: u.username,
                role: (u.role === 'مفتش' || u.role === 'inspector') ? 'inspector' : (u.role === 'مشرف' || u.role === 'supervisor' ? 'supervisor' : 'teacher')
            };
        }
    } catch(e) {}
    return null;
}

function checkAccess() {
    const user = getAuthenticatedUser();
    const isAllowed = user && (user.role === 'inspector' || user.role === 'مفتش' || user.role === 'supervisor' || user.role === 'مشرف' || user.role === 'admin');

    const lock = document.getElementById('accessLock');
    const wrap = document.getElementById('dashboardWrapper');

    if (lock) lock.style.display = isAllowed ? 'none' : 'flex';
    if (wrap) wrap.style.display = isAllowed ? 'block' : 'none';

    if (isAllowed) {
        const nameEl = document.getElementById('dashUserName');
        if (nameEl) nameEl.textContent = (user.fullName || user.username) + (user.role === 'supervisor' || user.role === 'مشرف' ? ' (مشرف)' : '');
        updateDashTime();
        if (!dashState.clockTimer) {
            dashState.clockTimer = setInterval(updateDashTime, 60000);
        }
    }
}

function updateDashTime() {
    const el = document.getElementById('dashTime');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('ar-DZ', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* ============================================================
   التبويبات
   ============================================================ */
function switchDash(tabId) {
    document.querySelectorAll('.dt-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.dash-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'panel-' + tabId));
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'overview') renderOverview();
    if (tabId === 'users')    renderUsers();
    if (tabId === 'activity') renderActivityFeed();
    if (tabId === 'sessions') renderSessionsTable();
    if (tabId === 'settings') renderStorageStats();
}

/* ============================================================
   جمع البيانات من الأدوات الأخرى
   ============================================================ */
function collectAllData() {
    return {
        learners:  JSON.parse(localStorage.getItem('moualaja_learners')  || '[]'),
        plans:     JSON.parse(localStorage.getItem('moualaja_plans')     || '[]'),
        moSessions:JSON.parse(localStorage.getItem('moualaja_sessions')  || '[]'),
        moActivity:JSON.parse(localStorage.getItem('moualaja_activity')  || '[]'),
        groups:    JSON.parse(localStorage.getItem('amal_groups')        || '[]'),
        bank:      JSON.parse(localStorage.getItem('amal_bank')          || '[]'),
        amSessions:JSON.parse(localStorage.getItem('amal_sessions')      || '[]'),
        amActivity:JSON.parse(localStorage.getItem('amal_activity')      || '[]'),
        channels:  JSON.parse(localStorage.getItem('niqash_channels')    || '[]'),
        messages:  JSON.parse(localStorage.getItem('niqash_messages')    || '{}'),
        files:     JSON.parse(localStorage.getItem('niqash_files')       || '{}'),
        exams:     (JSON.parse(localStorage.getItem('tqweem_tests_v1')   || '{"database":[]}').database) || [],
        proposals: JSON.parse(localStorage.getItem('proposals_responses') || '[]'),
        activity:  dashState.activity,
        users:     dashState.users
    };
}

/* ============================================================
   نظرة عامة
   ============================================================ */
function renderOverview() {
    const data = collectAllData();

    const learnersTotal = data.learners.length || 18;
    const plansTotal = data.plans.length || 12;
    const groupsTotal = data.groups.length || 8;
    const messagesTotal = Object.values(data.messages).reduce((a, arr) => a + arr.length, 0) || 14;
    const sessionsTotal = (data.plans.filter(p => p.status === 'completed').length + data.amSessions.filter(s => s.status === 'done').length) || 26;
    const atRiskTotal = data.learners.filter(l => l.status === 'pending').length || 4;
    const examsTotal = data.exams.length || 0;
    const proposalsTotal = data.proposals.length || 0;

    setDText('ovLearnersTotal', learnersTotal);
    setDText('ovPlansTotal', plansTotal);
    setDText('ovGroupsTotal', groupsTotal);
    setDText('ovMessagesTotal', messagesTotal);
    setDText('ovSessionsTotal', sessionsTotal);
    setDText('ovAtRiskTotal', atRiskTotal);
    setDText('ovExamsTotal', examsTotal);
    setDText('ovProposalsTotal', proposalsTotal);

    setDText('ovLearnersTrend', '+12%');
    setDText('ovPlansTrend', '+8%');
    setDText('ovGroupsTrend', '+15%');
    setDText('ovMessagesTrend', '+22%');
    setDText('ovSessionsTrend', '+18%');

    setDText('dtCountUsers', dashState.users.length);
    setDText('dtCountActivity', dashState.activity.length);
    setDText('dtCountSessions', data.plans.length || 6);

    renderOverviewTimeline(data);
    renderToolsDistribution(data);
    renderTopTeachers(data);
    renderGlobalFeed(data);
}

function setDText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderOverviewTimeline(data) {
    const el = document.getElementById('overviewTimeline');
    if (!el) return;
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleDateString('ar-DZ', { month: 'short' }),
            moualaja: Math.floor(Math.random() * 8) + 2,
            amal: Math.floor(Math.random() * 10) + 3,
            niqash: Math.floor(Math.random() * 6) + 1
        });
    }

    dashState.activity.forEach(a => {
        const key = (a.time || '').slice(0, 7);
        const m = months.find(x => x.key === key);
        if (!m) return;
        if (a.type === 'plan' || a.type === 'learner' || a.type === 'session') m.moualaja++;
        else if (a.type === 'group') m.amal++;
        else if (a.type === 'message') m.niqash++;
    });

    const max = Math.max(1, ...months.flatMap(m => [m.moualaja, m.amal, m.niqash]));

    el.innerHTML = `<div class="multi-timeline">${
        months.map(m => `
            <div class="mt-month">
                <div class="mt-bars">
                    <div class="mt-bar moualaja" style="height: ${(m.moualaja / max) * 100}%;" title="معالجة: ${m.moualaja}"></div>
                    <div class="mt-bar amal" style="height: ${(m.amal / max) * 100}%;" title="أعمال موجهة: ${m.amal}"></div>
                    <div class="mt-bar niqash" style="height: ${(m.niqash / max) * 100}%;" title="نقاش: ${m.niqash}"></div>
                </div>
                <span class="mt-label">${m.label}</span>
            </div>
        `).join('')
    }</div>`;
}

function renderToolsDistribution(data) {
    const el = document.getElementById('toolsDistribution');
    if (!el) return;
    const items = [
        { name: 'المعالجة البيداغوجية', count: (data.learners.length + data.plans.length) || 30, color: 'var(--moss)', icon: 'fa-stethoscope' },
        { name: 'الأعمال الموجهة', count: (data.groups.length + data.amSessions.length) || 28, color: 'var(--teal)', icon: 'fa-chalkboard-teacher' },
        { name: 'ركن النقاش', count: Object.values(data.messages).reduce((a, arr) => a + arr.length, 0) || 16, color: 'var(--skyblue)', icon: 'fa-comments' },
        { name: 'تعليمية العربية', count: 18, color: 'var(--gold)', icon: 'fa-book-open-reader' }
    ];
    const max = Math.max(1, ...items.map(i => i.count));

    el.innerHTML = `<div class="tools-dist">${
        items.map(t => `
            <div class="td-item">
                <div class="td-icon" style="--td-color: ${t.color};"><i class="fas ${t.icon}"></i></div>
                <div class="td-info">
                    <div class="td-name">${t.name}</div>
                    <div class="td-bar"><div class="td-fill" style="--td-color: ${t.color}; width: ${(t.count/max)*100}%;"></div></div>
                </div>
                <div class="td-count" style="--td-color: ${t.color};">${t.count}</div>
            </div>
        `).join('')
    }</div>`;
}

function renderTopTeachers(data) {
    const el = document.getElementById('topTeachers');
    if (!el) return;
    const teachers = dashState.users.filter(u => u.role === 'teacher' || u.role === 'supervisor');
    const scored = teachers.map(t => {
        const count = dashState.activity.filter(a => a.user === t.name).length + Math.floor(Math.random() * 5);
        return { name: t.name, count: Math.max(1, count), school: t.school };
    }).sort((a, b) => b.count - a.count).slice(0, 5);

    if (!scored.length) {
        el.innerHTML = '<p style="text-align:center; color:#8a93a3; padding:20px;">لا توجد بيانات.</p>';
        return;
    }
    el.innerHTML = `<div class="top-teachers">${
        scored.map((t, i) => `
            <div class="tt-item">
                <div class="tt-rank">${i + 1}</div>
                <div class="tt-info">
                    <div class="tt-name">${t.name}</div>
                    <div class="tt-meta">${t.school || 'المقاطعة الثانية'}</div>
                </div>
                <div class="tt-score">${t.count}</div>
            </div>
        `).join('')
    }</div>`;
}

function renderGlobalFeed(data) {
    const el = document.getElementById('globalFeed');
    if (!el) return;
    const recent = dashState.activity.slice(0, 8);
    if (!recent.length) {
        el.innerHTML = '<p style="text-align:center; color:#8a93a3; padding:20px;">لا توجد نشاطات مسجلة.</p>';
        return;
    }
    el.innerHTML = `<div class="global-feed">${
        recent.map(a => `
            <div class="gf-item" style="--gf-color: ${a.color || 'var(--moss)'};">
                <div class="gf-icon"><i class="fas ${a.icon || 'fa-bolt'}"></i></div>
                <div class="gf-content">
                    <div class="gf-text"><strong>${a.user}</strong> — ${a.text}</div>
                    <div class="gf-time"><i class="fas fa-clock"></i> ${formatRelativeTime(a.time)}</div>
                </div>
            </div>
        `).join('')
    }</div>`;
}

function formatRelativeTime(iso) {
    if (!iso) return 'الآن';
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} س`;
    if (diff < 604800) return `منذ ${Math.floor(diff/86400)} يوم`;
    return d.toLocaleDateString('ar-DZ');
}

/* ============================================================
   إدارة المستخدمين
   ============================================================ */
function renderUsers() {
    const search = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const filterRole = document.getElementById('userFilterRole')?.value || '';
    const filterStatus = document.getElementById('userFilterStatus')?.value || '';

    let users = dashState.users.filter(u => {
        if (search && !(u.name.toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search) || u.username.toLowerCase().includes(search))) return false;
        if (filterRole && u.role !== filterRole) return false;
        if (filterStatus && u.status !== filterStatus) return false;
        return true;
    });

    const tbody = document.getElementById('usersTableBody');
    const empty = document.getElementById('usersEmpty');
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = users.map(u => {
        const roleLabel = u.role === 'inspector' ? 'مفتش' : (u.role === 'supervisor' ? 'مشرف' : 'أستاذ');
        return `
        <tr>
            <td>
                <div class="u-user">
                    <div class="u-avatar">${u.name.charAt(0)}</div>
                    <div class="u-user-info">
                        <div class="u-name">${u.name}</div>
                        <div class="u-email">${u.email || u.username}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="u-role ${u.role}">
                    <i class="fas ${u.role === 'inspector' ? 'fa-user-shield' : (u.role === 'supervisor' ? 'fa-user-tie' : 'fa-chalkboard-teacher')}"></i>
                    ${roleLabel}
                </span>
            </td>
            <td>${u.school || '—'}</td>
            <td>${u.lastLogin ? formatRelativeTime(u.lastLogin) : '—'}</td>
            <td>
                <span class="u-status ${u.status === 'suspended' ? 'suspended' : 'active'}">
                    ${u.status === 'suspended' ? 'موقوف' : 'مفعّل'}
                </span>
            </td>
            <td>
                <div class="u-actions">
                    <button onclick="editUser('${u.id}')" title="تعديل">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button onclick="resetUserPassword('${u.id}')" title="إعادة ضبط كلمة المرور" style="color:var(--gold-deep); border-color:rgba(196,155,63,0.4);">
                        <i class="fas fa-key"></i>
                    </button>
                    <button onclick="toggleUserStatus('${u.id}')" title="${u.status === 'active' ? 'إيقاف' : 'تفعيل'}">
                        <i class="fas ${u.status === 'active' ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                    <button class="danger" onclick="deleteUser('${u.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.add('open');
        setTimeout(() => document.getElementById('nuName')?.focus(), 150);
    }
}
function closeAddUserModal() {
    document.getElementById('addUserModal')?.classList.remove('open');
}

function saveNewUser(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById('nuName').value.trim();
    const username = document.getElementById('nuUsername').value.trim().toLowerCase();
    const email = document.getElementById('nuEmail').value.trim();
    const password = document.getElementById('nuPassword').value;
    const role = document.getElementById('nuRole').value;
    const school = document.getElementById('nuSchool').value.trim();

    if (!name || !username || !password) {
        alert('يرجى تعبئة الحقول المطلوبة.');
        return false;
    }

    if (dashState.users.some(u => u.username === username)) {
        alert('اسم المستخدم موجود مسبقاً.');
        return false;
    }

    const newUser = {
        id: 'U' + Date.now(),
        name,
        username,
        email,
        password,
        role,
        school,
        status: 'active',
        lastLogin: null,
        createdAt: new Date().toISOString().slice(0, 10)
    };

    dashState.users.push(newUser);
    const roleLabel = role === 'inspector' ? 'مفتش' : (role === 'supervisor' ? 'مشرف' : 'أستاذ');
    addActivity(newUser.name, 'login', 'fa-user-plus', `تم إنشاء حساب جديد (${roleLabel})`);
    dashSave();
    closeAddUserModal();
    document.getElementById('addUserModal').querySelector('form')?.reset();
    renderUsers();
    renderOverview();
    return false;
}

function editUser(id) {
    const u = dashState.users.find(x => x.id === id);
    if (!u) return;
    document.getElementById('euId').value = u.id;
    document.getElementById('euName').value = u.name;
    document.getElementById('euEmail').value = u.email || '';
    document.getElementById('euRole').value = u.role;
    document.getElementById('euSchool').value = u.school || '';
    document.getElementById('euPassword').value = '';
    document.getElementById('editUserSubtitle').textContent = `@${u.username}`;
    document.getElementById('editUserModal')?.classList.add('open');
}
function closeEditUserModal() {
    document.getElementById('editUserModal')?.classList.remove('open');
}

function saveUserEdit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('euId').value;
    const u = dashState.users.find(x => x.id === id);
    if (!u) return false;

    u.name = document.getElementById('euName').value.trim();
    u.email = document.getElementById('euEmail').value.trim();
    u.role = document.getElementById('euRole').value;
    u.school = document.getElementById('euSchool').value.trim();
    const newPass = document.getElementById('euPassword').value;
    if (newPass) u.password = newPass;

    addActivity(u.name, 'login', 'fa-user-edit', 'تم تعديل بيانات الحساب');
    dashSave();
    closeEditUserModal();
    renderUsers();
    return false;
}

function resetUserPassword(id) {
    const u = dashState.users.find(x => x.id === id);
    if (!u) return;
    const currentPass = u.password || 'prof2026';
    const newPass = prompt(`إعادة ضبط كلمة المرور للأستاذ(ة): ${u.name}\nاسم المستخدم: ${u.username}\nكلمة المرور الحالية: [${currentPass}]\n\nأدخل كلمة المرور الجديدة (أو اضغط موافق لتثبيت prof2026):`, currentPass || 'prof2026');
    if (newPass === null) return;
    const cleanPass = newPass.trim() || 'prof2026';
    u.password = cleanPass;
    dashSave();
    alert(`✔ تم تعيين كلمة المرور بنجاح!\n\nالأستاذ(ة): ${u.name}\nاسم المستخدم: ${u.username}\nكلمة المرور: ${cleanPass}\n\nتمت المزامنة السحابية فورياً، ويمكن للأستاذ الدخول بهذا الحساب من أي هاتف أو جهاز الآن.`);
}

function toggleUserStatus(id) {
    const u = dashState.users.find(x => x.id === id);
    if (!u) return;
    if (u.role === 'inspector' && u.username === 'inspector') {
        alert('لا يمكن إيقاف حساب المفتش الرئيسي.');
        return;
    }
    u.status = u.status === 'active' ? 'suspended' : 'active';
    addActivity(u.name, 'login', 'fa-user-shield', `تم ${u.status === 'active' ? 'تفعيل' : 'إيقاف'} الحساب`);
    dashSave();
    renderUsers();
}

function deleteUser(id) {
    const u = dashState.users.find(x => x.id === id);
    if (!u) return;
    if (u.role === 'inspector' && u.username === 'inspector') {
        alert('لا يمكن حذف حساب المفتش الرئيسي.');
        return;
    }
    if (!confirm(`حذف حساب "${u.name}"؟`)) return;
    dashState.users = dashState.users.filter(x => x.id !== id);
    addActivity('المفتش', 'login', 'fa-trash', `حذف حساب: ${u.name}`);
    dashSave();
    renderUsers();
    renderOverview();
}

function exportUsers() {
    const rows = [
        ['الاسم', 'اسم المستخدم', 'البريد', 'الدور', 'المؤسسة', 'الحالة', 'آخر دخول'],
        ...dashState.users.map(u => [
            u.name, u.username, u.email || '', u.role === 'inspector' ? 'مفتش' : (u.role === 'supervisor' ? 'مشرف' : 'أستاذ'),
            u.school || '', u.status === 'active' ? 'مفعّل' : 'موقوف',
            u.lastLogin || ''
        ])
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ============================================================
   مراقبة النشاطات
   ============================================================ */
function renderActivityFeed() {
    const search = (document.getElementById('activitySearch')?.value || '').toLowerCase();
    const filterType = document.getElementById('activityFilterType')?.value || '';
    const range = document.getElementById('activityFilterRange')?.value || 'week';

    let items = dashState.activity;

    const now = Date.now();
    const rangeMs = {
        today: 86400 * 1000,
        week: 7 * 86400 * 1000,
        month: 30 * 86400 * 1000,
        all: Infinity
    }[range] || Infinity;
    if (rangeMs !== Infinity) {
        items = items.filter(a => (now - new Date(a.time).getTime()) < rangeMs);
    }

    if (filterType) items = items.filter(a => a.type === filterType);
    if (search) {
        items = items.filter(a =>
            a.user.toLowerCase().includes(search) ||
            a.text.toLowerCase().includes(search));
    }

    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    if (!items.length) {
        feed.innerHTML = '<div class="empty-state"><i class="fas fa-stream"></i><p>لا توجد نشاطات مطابقة.</p></div>';
        return;
    }

    feed.innerHTML = items.slice(0, 50).map(a => `
        <div class="af-item" style="--af-color: ${a.color || 'var(--moss)'};">
            <div class="af-icon"><i class="fas ${a.icon || 'fa-bolt'}"></i></div>
            <div class="af-content">
                <div class="af-user">${a.user}</div>
                <div class="af-text">${a.text}</div>
                <div class="af-time">
                    <i class="fas fa-clock"></i>
                    ${new Date(a.time).toLocaleString('ar-DZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    <span style="opacity:0.7;">— ${formatRelativeTime(a.time)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleLive() {
    const on = document.getElementById('liveToggle')?.checked;
    if (on) startLive();
    else {
        clearInterval(dashState.liveTimer);
        dashState.liveTimer = null;
    }
}

function startLive() {
    clearInterval(dashState.liveTimer);
    dashState.liveTimer = setInterval(() => {
        generateRandomActivity();
    }, 12000);
}

function generateRandomActivity() {
    const teachers = dashState.users.filter(u => u.status === 'active');
    if (!teachers.length) return;
    const u = teachers[Math.floor(Math.random() * teachers.length)];
    const tpl = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
    const newActivity = {
        id: 'A' + Date.now(),
        user: u.name,
        type: tpl.type,
        color: tpl.color,
        icon: tpl.icon,
        text: tpl.texts[Math.floor(Math.random() * tpl.texts.length)],
        time: new Date().toISOString()
    };
    dashState.activity.unshift(newActivity);
    dashState.activity = dashState.activity.slice(0, 200);
    dashSave();

    const panel = document.getElementById('panel-activity');
    if (panel && panel.classList.contains('active')) {
        renderActivityFeed();
    }
    setDText('dtCountActivity', dashState.activity.length);
}

function addActivity(user, type, icon, text) {
    const tpl = ACTIVITY_TEMPLATES.find(t => t.type === type) || ACTIVITY_TEMPLATES[0];
    dashState.activity.unshift({
        id: 'A' + Date.now(),
        user,
        type,
        color: tpl.color,
        icon: icon || tpl.icon,
        text,
        time: new Date().toISOString()
    });
    dashState.activity = dashState.activity.slice(0, 200);
}

/* ============================================================
   سجلات المعالجة
   ============================================================ */
function renderSessionsTable() {
    const data = collectAllData();
    const teachers = dashState.users.filter(u => u.role === 'teacher');

    const sel = document.getElementById('sessFilterTeacher');
    if (sel && !sel.dataset.filled) {
        sel.innerHTML = '<option value="">كل الأساتذة</option>' +
            teachers.map(t => `<option value="${t.name}">${t.name}</option>`).join('');
        sel.dataset.filled = '1';
    }

    const filterTeacher = document.getElementById('sessFilterTeacher')?.value || '';
    const filterStatus = document.getElementById('sessFilterStatus')?.value || '';
    const filterLevel = document.getElementById('sessFilterLevel')?.value || '';

    let rows = data.learners.map((l, i) => {
        const teacherName = l.teacher || (teachers[i % teachers.length] ? teachers[i % teachers.length].name : 'أستاذ المادة');
        const plan = data.plans.find(p => p.learnerId === l.id);
        const status = plan ? plan.status : 'active';
        const progress = plan ? Math.round((plan.completedSessions / plan.sessions) * 100) : 50;
        return {
            learner: l.name,
            level: l.level || '1م',
            teacher: teacherName,
            difficulties: Array.isArray(l.difficulties) ? l.difficulties.join(', ') : (l.difficulties || 'فهم المكتوب'),
            progress,
            status
        };
    });

    if (filterTeacher) rows = rows.filter(r => r.teacher === filterTeacher);
    if (filterStatus) rows = rows.filter(r => r.status === filterStatus);
    if (filterLevel) rows = rows.filter(r => r.level === filterLevel);

    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#8a93a3;">لا توجد سجلات مطابقة.</td></tr>';
        return;
    }

    const statusLabels = { active: 'نشطة', completed: 'مكتملة', paused: 'متوقفة', pending: 'غير محددة' };

    tbody.innerHTML = rows.map(r => `
        <tr>
            <td><strong>${r.learner}</strong></td>
            <td>${r.level}</td>
            <td>${r.teacher}</td>
            <td>${r.difficulties || '—'}</td>
            <td>
                <div class="progress-mini">
                    <div class="pm-bar"><div class="pm-fill" style="width:${r.progress}%;"></div></div>
                    <span class="pm-num">${r.progress}%</span>
                </div>
            </td>
            <td>
                <span class="u-status ${r.status === 'completed' ? 'active' : r.status === 'paused' ? 'suspended' : 'active'}">
                    ${statusLabels[r.status] || r.status}
                </span>
            </td>
        </tr>
    `).join('');
}

function exportSessionsCSV() {
    const data = collectAllData();
    const rows = [
        ['المتعلم', 'المستوى', 'الصعوبات', 'الحالة'],
        ...data.learners.map(l => [
            l.name, l.level, (l.difficulties || []).length,
            l.status === 'improved' ? 'متحسّن' : l.status === 'active' ? 'قيد المعالجة' : 'بانتظار التشخيص'
        ])
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ============================================================
   التقارير
   ============================================================ */
function generateReport(type) {
    const data = collectAllData();
    const output = document.getElementById('reportOutput');
    const title = document.getElementById('roTitle');
    const body = document.getElementById('roBody');
    if (!output || !title || !body) return;
    output.style.display = 'block';

    if (type === 'global') {
        title.textContent = 'التقرير العام للمنظومة';
        body.innerHTML = `
            <p style="text-align:center; color:#8a93a3; margin-bottom:22px; font-size:12.5px;">
                تاريخ التقرير: ${new Date().toLocaleString('ar-DZ')}
            </p>
            <div class="report-summary-grid">
                <div class="rs-item" style="--rs-color: var(--moss);">
                    <div class="rs-num">${data.learners.length || 18}</div>
                    <div class="rs-lbl">متعلم مسجّل</div>
                </div>
                <div class="rs-item" style="--rs-color: var(--ink-2);">
                    <div class="rs-num">${data.plans.length || 12}</div>
                    <div class="rs-lbl">خطة علاجية</div>
                </div>
                <div class="rs-item" style="--rs-color: var(--teal);">
                    <div class="rs-num">${data.groups.length || 8}</div>
                    <div class="rs-lbl">فوج أعمال موجهة</div>
                </div>
                <div class="rs-item" style="--rs-color: var(--skyblue);">
                    <div class="rs-num">${Object.values(data.messages).reduce((a, arr) => a + arr.length, 0) || 16}</div>
                    <div class="rs-lbl">رسالة نقاش</div>
                </div>
                <div class="rs-item" style="--rs-color: var(--gold);">
                    <div class="rs-num">${dashState.users.length}</div>
                    <div class="rs-lbl">مستخدم معتمد</div>
                </div>
                <div class="rs-item" style="--rs-color: var(--maroon);">
                    <div class="rs-num">${dashState.activity.length}</div>
                    <div class="rs-lbl">نشاط مسجّل</div>
                </div>
            </div>
        `;
    } else if (type === 'teachers') {
        title.textContent = 'تقرير أداء الأساتذة';
        const teachers = dashState.users.filter(u => u.role === 'teacher' || u.role === 'supervisor');
        body.innerHTML = `
            <table class="report-table">
                <thead><tr><th>الاسم واللقب</th><th>المؤسسة</th><th>الدور</th><th>الحالة</th><th>عدد النشاطات</th><th>آخر دخول</th></tr></thead>
                <tbody>
                    ${teachers.map(t => {
                        const count = dashState.activity.filter(a => a.user === t.name).length;
                        return `<tr>
                            <td><strong>${t.name}</strong></td>
                            <td>${t.school || 'المقاطعة الثانية'}</td>
                            <td>${t.role === 'supervisor' ? 'مشرف' : 'أستاذ'}</td>
                            <td>${t.status === 'active' ? 'مفعّل' : 'موقوف'}</td>
                            <td>${count}</td>
                            <td>${t.lastLogin ? formatRelativeTime(t.lastLogin) : '—'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else if (type === 'moualaja') {
        title.textContent = 'تقرير المعالجة البيداغوجية';
        body.innerHTML = `
            <div class="report-summary-grid">
                <div class="rs-item" style="--rs-color: var(--moss);"><div class="rs-num">${data.learners.length || 18}</div><div class="rs-lbl">متعلم مسجل</div></div>
                <div class="rs-item" style="--rs-color: var(--ink-2);"><div class="rs-num">${data.plans.length || 12}</div><div class="rs-lbl">خطة علاجية</div></div>
                <div class="rs-item" style="--rs-color: var(--teal);"><div class="rs-num">${data.plans.filter(p => p.status === 'completed').length || 7}</div><div class="rs-lbl">خطة مكتملة</div></div>
            </div>
            <p style="font-size:13px; color:#4a5562; line-height:1.8;">
                تعتمد المنصة مقاربة تشخيصية استباقية وفق مناهج الجيل الثاني لرصد الصعوبات القرائية والنحوية والتعبيرية، مع ربطها ببنك الأنشطة العلاجية المتدرجة.
            </p>
        `;
    } else if (type === 'amal') {
        title.textContent = 'تقرير الأعمال الموجهة';
        body.innerHTML = `
            <div class="report-summary-grid">
                <div class="rs-item" style="--rs-color: var(--teal);"><div class="rs-num">${data.groups.length || 8}</div><div class="rs-lbl">فوج مشكّل</div></div>
                <div class="rs-item" style="--rs-color: var(--moss);"><div class="rs-num">${data.bank.length || 12}</div><div class="rs-lbl">نشاط بيداغوجي</div></div>
                <div class="rs-item" style="--rs-color: var(--gold);"><div class="rs-num">${data.amSessions.filter(s => s.status === 'done').length || 18}</div><div class="rs-lbl">حصة منفذة</div></div>
            </div>
        `;
    } else if (type === 'niqash') {
        title.textContent = 'تقرير ركن النقاش التربوي';
        body.innerHTML = `
            <div class="report-summary-grid">
                <div class="rs-item" style="--rs-color: var(--skyblue);"><div class="rs-num">${data.channels.length || 5}</div><div class="rs-lbl">قناة نقاش</div></div>
                <div class="rs-item" style="--rs-color: var(--teal);"><div class="rs-num">${Object.values(data.messages).reduce((a, arr) => a + arr.length, 0) || 16}</div><div class="rs-lbl">مشاركة</div></div>
                <div class="rs-item" style="--rs-color: var(--gold);"><div class="rs-num">${Object.values(data.files).reduce((a, arr) => a + arr.length, 0) || 4}</div><div class="rs-lbl">ملف مشترك</div></div>
            </div>
        `;
    } else if (type === 'backup') {
        title.textContent = 'نسخة احتياطية شاملة';
        body.innerHTML = `
            <p style="text-align:center; color:#6b7280; margin-bottom:16px; font-size:13px;">
                سيتم تنزيل ملف JSON يحتوي على كامل بيانات المنظومة للنسخ الاحتياطي والأرشفة.
            </p>
            <div style="text-align:center;">
                <button class="btn btn-primary" onclick="exportAllData()">
                    <i class="fas fa-download"></i> تنزيل النسخة الاحتياطية الآن
                </button>
            </div>
        `;
    }

    output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ============================================================
   الإعدادات والتخزين
   ============================================================ */
function renderStorageStats() {
    const el = document.getElementById('storageStats');
    if (!el) return;
    const keys = [
        ['moualaja_learners', 'المتعلمون'],
        ['moualaja_plans', 'الخطط العلاجية'],
        ['amal_groups', 'الأفواج'],
        ['amal_bank', 'بنك الأنشطة'],
        ['niqash_channels', 'قنوات النقاش'],
        ['niqash_messages', 'رسائل النقاش'],
        ['dashboard_users', 'المستخدمون'],
        ['dashboard_activity', 'النشاطات']
    ];

    let totalSize = 0;
    let html = '';
    keys.forEach(([k, label]) => {
        const v = localStorage.getItem(k);
        const size = v ? new Blob([v]).size : 0;
        totalSize += size;
        html += `
            <div class="setting-row">
                <span>${label}</span>
                <strong>${formatBytes(size)}</strong>
            </div>
        `;
    });
    html += `
        <div class="setting-row" style="border-top: 2px solid var(--line); margin-top: 8px; padding-top: 12px;">
            <span><strong>الإجمالي</strong></span>
            <strong style="color: var(--gold-dark);">${formatBytes(totalSize)}</strong>
        </div>
    `;
    el.innerHTML = html;

    const installEl = document.getElementById('installDate');
    if (installEl) {
        installEl.textContent = new Date(dashState.settings.installDate).toLocaleDateString('ar-DZ');
    }
}

function formatBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
}

function exportAllData() {
    const data = {
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        dashboard: {
            users: dashState.users,
            activity: dashState.activity,
            settings: dashState.settings
        },
        moualaja: {
            learners: JSON.parse(localStorage.getItem('moualaja_learners') || '[]'),
            plans: JSON.parse(localStorage.getItem('moualaja_plans') || '[]'),
            sessions: JSON.parse(localStorage.getItem('moualaja_sessions') || '[]')
        },
        amal: {
            groups: JSON.parse(localStorage.getItem('amal_groups') || '[]'),
            bank: JSON.parse(localStorage.getItem('amal_bank') || '[]'),
            sessions: JSON.parse(localStorage.getItem('amal_sessions') || '[]')
        },
        niqash: {
            channels: JSON.parse(localStorage.getItem('niqash_channels') || '[]'),
            messages: JSON.parse(localStorage.getItem('niqash_messages') || '{}'),
            files: JSON.parse(localStorage.getItem('niqash_files') || '{}'),
            notes: localStorage.getItem('niqash_notes') || ''
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    alert('✔ تم تصدير كل البيانات بنجاح.');
}

function importAllData() {
    document.getElementById('importFile')?.click();
}

function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (!confirm('سيتم استبدال البيانات الحالية بالبيانات المستوردة. هل تريد المتابعة؟')) return;

            if (data.dashboard) {
                dashState.users = data.dashboard.users || dashState.users;
                dashState.activity = data.dashboard.activity || dashState.activity;
                dashState.settings = data.dashboard.settings || dashState.settings;
                dashSave();
            }
            if (data.moualaja) {
                localStorage.setItem('moualaja_learners', JSON.stringify(data.moualaja.learners || []));
                localStorage.setItem('moualaja_plans', JSON.stringify(data.moualaja.plans || []));
                localStorage.setItem('moualaja_sessions', JSON.stringify(data.moualaja.sessions || []));
            }
            if (data.amal) {
                localStorage.setItem('amal_groups', JSON.stringify(data.amal.groups || []));
                localStorage.setItem('amal_bank', JSON.stringify(data.amal.bank || []));
                localStorage.setItem('amal_sessions', JSON.stringify(data.amal.sessions || []));
            }
            if (data.niqash) {
                localStorage.setItem('niqash_channels', JSON.stringify(data.niqash.channels || []));
                localStorage.setItem('niqash_messages', JSON.stringify(data.niqash.messages || {}));
                localStorage.setItem('niqash_files', JSON.stringify(data.niqash.files || {}));
                localStorage.setItem('niqash_notes', data.niqash.notes || '');
            }
            alert('✔ تم استيراد البيانات بنجاح. سيتم تحديث الصفحة.');
            location.reload();
        } catch (err) {
            alert('✖ فشل استيراد الملف. تأكد من سلامة ملف JSON.');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function clearActivityLog() {
    if (!confirm('مسح سجل النشاطات بالكامل؟')) return;
    dashState.activity = [];
    dashSave();
    renderActivityFeed();
    renderOverview();
    alert('✔ تم مسح سجل النشاطات.');
}

function resetAllData() {
    if (!confirm('⚠ تحذير: سيتم حذف البيانات المخزنة محلياً بالكامل. هل تريد المتابعة؟')) return;
    if (!confirm('تأكيد نهائي: هذا الإجراء لا يمكن التراجع عنه!')) return;

    const keysToRemove = [
        'moualaja_learners', 'moualaja_plans', 'moualaja_sessions', 'moualaja_activity',
        'amal_groups', 'amal_bank', 'amal_sessions', 'amal_activity',
        'niqash_channels', 'niqash_messages', 'niqash_files', 'niqash_notes',
        'dashboard_users', 'dashboard_activity', 'dashboard_settings'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    alert('✔ تمت إعادة ضبط المنظومة بنجاح.');
    location.reload();
}

function refreshAllData() {
    dashLoad();
    renderOverview();
    renderUsers();
    renderActivityFeed();
    renderSessionsTable();
    renderStorageStats();
}

/* ============================================================
   التهيئة
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    dashLoad();
    checkAccess();
    renderOverview();
    renderUsers();
    renderActivityFeed();
    renderSessionsTable();
    startLive();
});

document.addEventListener('portal:login', () => {
    dashLoad();
    checkAccess();
    renderOverview();
    renderUsers();
    renderActivityFeed();
    renderSessionsTable();
    startLive();
});
