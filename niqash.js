/* ============================================================
   ركن النقاش والمحادثة التربوية — المنطق التفاعلي الموحّد
   ============================================================ */

const LS_NQ_CHANNELS = 'niqash_channels';
const LS_NQ_MESSAGES = 'niqash_messages';
const LS_NQ_FILES    = 'niqash_files';
const LS_NQ_NOTES    = 'niqash_notes';

let nqState = {
    channels: [],
    messages: {},   // channelId -> [messages]
    files: {},      // channelId -> [files]
    notes: '',
    currentChannel: null,
    pendingFile: null
};

/* ---------- القنوات الافتراضية ---------- */
const DEFAULT_CHANNELS = [
    { id: 'general', name: 'النقاش العام والتوجيه البيداغوجي', desc: 'تبادل مهني عام واستفسارات صفية', icon: 'fa-comments', createdAt: new Date().toISOString() },
    { id: 'evaluation', name: 'تقييم المكتسبات والامتحانات', desc: 'نقاش حول بناء شبكات التقويم واختبارات الفصل', icon: 'fa-star', createdAt: new Date().toISOString() },
    { id: 'arabic', name: 'تعليمية اللغة العربية وبناء المقاطع', desc: 'ديداكتيك العربية ومستويات الفهم ونصوص القراءة', icon: 'fa-book', createdAt: new Date().toISOString() },
    { id: 'remedial', name: 'المعالجة البيداغوجية والتشخيص', desc: 'تبادل خطط معالجة التعثرات وبنك الأنشطة', icon: 'fa-stethoscope', createdAt: new Date().toISOString() },
    { id: 'directed', name: 'الأعمال الموجهة وتقنيات التفويج', desc: 'تسيير الأنشطة الفارقية وتنظيم الأفواج', icon: 'fa-chalkboard-teacher', createdAt: new Date().toISOString() }
];

/* ---------- أيقونات الملفات ---------- */
const FILE_ICONS = {
    'pdf': 'fa-file-pdf',
    'doc': 'fa-file-word', 'docx': 'fa-file-word',
    'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
    'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
    'jpg': 'fa-file-image', 'jpeg': 'fa-file-image',
    'png': 'fa-file-image', 'gif': 'fa-file-image',
    'txt': 'fa-file-alt'
};

const AVATAR_COLORS = [
    ['#7a9a4f', '#5f7a3a'],
    ['#1f3864', '#152238'],
    ['#16a085', '#107a63'],
    ['#2980b9', '#1f618d'],
    ['#a01c2c', '#7d1522'],
    ['#8b6f3c', '#6b5430'],
    ['#c49b3f', '#9e7a26']
];

/* ============================================================
   التخزين
   ============================================================ */
function nqLoad() {
    nqState.channels = JSON.parse(localStorage.getItem(LS_NQ_CHANNELS) || 'null') || [...DEFAULT_CHANNELS];
    nqState.messages = JSON.parse(localStorage.getItem(LS_NQ_MESSAGES) || '{}');
    nqState.files    = JSON.parse(localStorage.getItem(LS_NQ_FILES)    || '{}');
    nqState.notes    = localStorage.getItem(LS_NQ_NOTES) || '';
    // إزالة التكرار (نفس المعرّف / نفس المسار)
    Object.keys(nqState.messages).forEach(k => {
        const ids = new Set();
        nqState.messages[k] = (nqState.messages[k] || []).filter(m => { if (!m || !m.id) return true; if (ids.has(m.id)) return false; ids.add(m.id); return true; });
    });
    Object.keys(nqState.files).forEach(k => {
        const ps = new Set();
        nqState.files[k] = (nqState.files[k] || []).filter(f => { const key = f.path || f.mid || (f.name + '|' + f.time); if (ps.has(key)) return false; ps.add(key); return true; });
    });
}

function nqSave() {
    localStorage.setItem(LS_NQ_CHANNELS, JSON.stringify(nqState.channels));
    localStorage.setItem(LS_NQ_MESSAGES, JSON.stringify(nqState.messages));
    localStorage.setItem(LS_NQ_FILES,    JSON.stringify(nqState.files));
    localStorage.setItem(LS_NQ_NOTES,    nqState.notes);
}

/* ============================================================
   المستخدم الحالي المعتمد من الجلسة الموحدة
   ============================================================ */
function getCurrentUser() {
    try {
        const raw = sessionStorage.getItem('pgb_session') || localStorage.getItem('pgb_session_persistent');
        if (raw) {
            const s = JSON.parse(raw);
            if (s && s.user && Date.now() <= s.expiresAt) {
                return {
                    name: s.user.fullName || s.user.username,
                    role: s.user.role === 'inspector' ? 'مفتش' : (s.user.role === 'supervisor' ? 'مشرف' : 'أستاذ(ة)')
                };
            }
        }
        const legacy = localStorage.getItem('portalUser');
        if (legacy) {
            const u = JSON.parse(legacy);
            return {
                name: u.name || u.fullName || u.username,
                role: u.role || 'أستاذ'
            };
        }
    } catch(e) {}
    return { name: 'زائر', role: 'أستاذ' };
}

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name) {
    if (!name) return '؟';
    return name.trim().charAt(0);
}

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return 'اليوم';
    return d.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' });
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/* ============================================================
   عرض القنوات
   ============================================================ */
function renderChannels() {
    const list = document.getElementById('channelsList');
    if (!list) return;
    const search = (document.getElementById('channelSearch')?.value || '').toLowerCase();

    let channels = nqState.channels;
    if (search) channels = channels.filter(c =>
        c.name.toLowerCase().includes(search) || (c.desc || '').toLowerCase().includes(search));

    if (!channels.length) {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#8a93a3; font-size:12px;">لا توجد قنوات مطابقة.</p>';
        return;
    }

    list.innerHTML = channels.map(c => {
        const count = (nqState.messages[c.id] || []).length;
        const active = c.id === nqState.currentChannel ? 'active' : '';
        return `
            <div class="channel-item ${active}" onclick="selectChannel('${c.id}')">
                <div class="ci-icon"><i class="fas ${c.icon || 'fa-hashtag'}"></i></div>
                <div class="ci-info">
                    <div class="ci-name">${c.name}</div>
                    ${c.desc ? `<div class="ci-desc">${c.desc}</div>` : ''}
                </div>
                ${count ? `<div class="ci-count">${count}</div>` : ''}
            </div>
        `;
    }).join('');
}

function selectChannel(id) {
    nqState.currentChannel = id;
    renderChannels();
    renderCurrentChannel();
}

function renderCurrentChannel() {
    const id = nqState.currentChannel;
    const channel = nqState.channels.find(c => c.id === id);

    if (!channel) {
        const titleEl = document.getElementById('chTitle');
        if (titleEl) titleEl.textContent = 'اختر قناة';
        const subEl = document.getElementById('chSub');
        if (subEl) subEl.textContent = '—';
        const iconEl = document.getElementById('chIcon');
        if (iconEl) iconEl.innerHTML = '<i class="fas fa-hashtag"></i>';
        const area = document.getElementById('messagesArea');
        if (area) {
            area.innerHTML = `
                <div class="messages-empty">
                    <div class="me-icon"><i class="fas fa-comments"></i></div>
                    <h3>مرحباً بك في ركن النقاش</h3>
                    <p>اختر قناة من القائمة الجانبية لبدء المحادثة، أو أنشئ قناة جديدة.</p>
                </div>
            `;
        }
        return;
    }

    const iconEl = document.getElementById('chIcon');
    if (iconEl) iconEl.innerHTML = `<i class="fas ${channel.icon || 'fa-hashtag'}"></i>`;
    const titleEl = document.getElementById('chTitle');
    if (titleEl) titleEl.textContent = channel.name;
    const subEl = document.getElementById('chSub');
    if (subEl) subEl.textContent = channel.desc || '—';

    renderMessages();
    renderFilesPanel();
    updateFilesBadge();
}

/* ============================================================
   عرض الرسائل
   ============================================================ */
function renderMessages() {
    const area = document.getElementById('messagesArea');
    if (!area) return;
    const id = nqState.currentChannel;
    const messages = nqState.messages[id] || [];

    if (!messages.length) {
        area.innerHTML = `
            <div class="messages-empty">
                <div class="me-icon"><i class="fas fa-comments"></i></div>
                <h3>لا توجد رسائل بعد</h3>
                <p>كن أول من يبدأ النقاش المهني في هذه القناة.</p>
            </div>
        `;
        return;
    }

    const me = getCurrentUser();
    let lastDate = '';

    area.innerHTML = messages.map(m => {
        let dateSeparator = '';
        const d = formatDate(m.time);
        if (d !== lastDate) {
            lastDate = d;
            dateSeparator = `<div style="text-align:center; margin: 10px 0; font-size:11px; color:#8a93a3; position:relative;">
                <span style="background:#fff; padding: 4px 14px; border-radius: 999px; border:1px solid var(--line); position:relative; z-index:1;">${d}</span>
            </div>`;
        }

        const isMine = m.author === me.name;
        const [c1, c2] = getAvatarColor(m.author || '');
        const avatarStyle = isMine
            ? 'background: linear-gradient(135deg, var(--gold), var(--gold-dark));'
            : `background: linear-gradient(135deg, ${c1}, ${c2});`;

        let body = '';
        if (m.type === 'file' && m.file) {
            const ext = (m.file.name.split('.').pop() || '').toLowerCase();
            const icon = FILE_ICONS[ext] || 'fa-file';
            body = `
                ${m.text ? `<div class="msg-bubble">${escapeHtml(m.text)}</div>` : ''}
                <div class="msg-file">
                    <div class="mf-icon"><i class="fas ${icon}"></i></div>
                    <div class="mf-info">
                        <div class="mf-name">${escapeHtml(m.file.name)}</div>
                        <div class="mf-meta">${formatFileSize(m.file.size)}</div>
                    </div>
                    <button class="mf-action" onclick="previewFile('${m.id}')" title="معاينة"><i class="fas fa-eye"></i></button>
                    <button class="mf-action" onclick="downloadFile('${m.id}')" title="تنزيل">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            `;
        } else {
            body = `<div class="msg-bubble">${escapeHtml(m.text)}</div>`;
        }

        return `
            ${dateSeparator}
            <div class="message ${isMine ? 'mine' : ''}">
                <div class="msg-avatar" style="${avatarStyle}">${getInitial(m.author)}</div>
                <div class="msg-content">
                    <div class="msg-header">
                        <span class="msg-author">${escapeHtml(m.author)}</span>
                        <span class="msg-time">${formatTime(m.time)}</span>
                    </div>
                    ${body}
                </div>
            </div>
        `;
    }).join('');

    area.scrollTop = area.scrollHeight;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ============================================================
   إرسال الرسائل
   ============================================================ */
async function sendMessage() {
    if (nqState.sending) return;                       // يمنع التكرار عند الضغط المتتالي
    if (!nqState.currentChannel) {
        alert('اختر قناة أولاً.');
        return;
    }
    const input = document.getElementById('messageInput');
    if (!input) return;
    const text = input.value.trim();
    const file = nqState.pendingFile;

    if (!text && !file) return;

    const channelId = nqState.currentChannel;
    const me = getCurrentUser();
    const msg = {
        id: 'M' + Date.now() + Math.random().toString(36).slice(2, 6),
        author: me.name,
        role: me.role,
        text,
        time: new Date().toISOString(),
        type: file ? 'file' : 'text'
    };

    if (file) {
        nqState.sending = true;
        const sendBtn = document.querySelector('[onclick*="sendMessage"]');
        if (sendBtn) sendBtn.disabled = true;
        try {
            const c = await PortalCloud.ready;
            const ext = ((file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin').slice(0, 8);
            const path = 'niqash/' + channelId.replace(/[^A-Za-z0-9_-]/g, '_') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
            const up = await c.storage.from(NQ_BUCKET()).upload(path, file.blob, { contentType: file.type, upsert: false });
            if (up.error) throw up.error;
            msg.file = { name: file.name, size: file.size, type: file.type, path };
        } catch (err) {
            alert('تعذّر رفع الملف: ' + (err && err.message ? err.message : err));
            nqState.sending = false;
            if (sendBtn) sendBtn.disabled = false;
            return;
        }
        nqState.sending = false;
        if (sendBtn) sendBtn.disabled = false;

        if (!nqState.files[channelId]) nqState.files[channelId] = [];
        nqState.files[channelId].unshift({
            id: msg.id,
            mid: msg.id,
            name: file.name,
            size: file.size,
            type: file.type,
            path: msg.file.path,
            author: me.name,
            time: msg.time
        });
    }

    if (!nqState.messages[channelId]) nqState.messages[channelId] = [];
    nqState.messages[channelId].push(msg);

    input.value = '';
    input.style.height = 'auto';
    clearPendingFile();

    nqSave();
    renderMessages();
    renderChannels();
    renderFilesPanel();
    updateFilesBadge();
    updateGlobalStats();
}

function handleMessageKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
    input.focus();
    input.setSelectionRange(start + emoji.length, start + emoji.length);
    autoResize(input);
}

/* ============================================================
   رفع الملفات
   ============================================================ */
function triggerFileUpload() {
    document.getElementById('fileInput')?.click();
}

const NQ_CFG = () => window.PORTAL_CFG || {};
const NQ_BUCKET = () => NQ_CFG().FILES_BUCKET || 'portal-files';
const NQ_MAX = () => (NQ_CFG().MAX_FILE_MB || 50) * 1024 * 1024;

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > NQ_MAX()) {
        alert('حجم الملف كبير جداً. الحد الأقصى ' + (NQ_CFG().MAX_FILE_MB || 50) + ' ميغابايت.');
        e.target.value = '';
        return;
    }

    nqState.pendingFile = {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        blob: file
    };
    showFilePreview();
    e.target.value = '';
}

function showFilePreview() {
    const preview = document.getElementById('filePreview');
    const file = nqState.pendingFile;
    if (!preview) return;
    if (!file) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const icon = FILE_ICONS[ext] || 'fa-file';
    preview.innerHTML = `
        <i class="fas ${icon}"></i>
        <strong>${escapeHtml(file.name)}</strong>
        <span style="color:#8a93a3; font-size:11px;">(${formatFileSize(file.size)})</span>
        <span class="remove-file" onclick="clearPendingFile()"><i class="fas fa-times"></i></span>
    `;
    preview.style.display = 'flex';
}

function clearPendingFile() {
    nqState.pendingFile = null;
    const preview = document.getElementById('filePreview');
    if (preview) {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

/* ============================================================
   لوحة الملفات
   ============================================================ */
function toggleFilesPanel() {
    const panel = document.getElementById('filesPanel');
    const notes = document.getElementById('notesPanel');
    if (notes) notes.classList.remove('open');
    if (panel) panel.classList.toggle('open');
}

function renderFilesPanel() {
    const body = document.getElementById('filesBody');
    if (!body) return;
    const files = nqState.files[nqState.currentChannel] || [];

    if (!files.length) {
        body.innerHTML = `
            <div class="fp-empty">
                <i class="fas fa-folder-open"></i>
                <p>لا توجد ملفات مشتركة في هذه القناة بعد.</p>
            </div>
        `;
        return;
    }

    const seen = new Set();
    body.innerHTML = files.filter(f => {                       // إزالة التكرار
        const k = f.path || f.mid || (f.name + '|' + f.time);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    }).map(f => {
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        const icon = FILE_ICONS[ext] || 'fa-file';
        const ref = f.mid || f.id || '';
        const arg = ref ? `'${ref}'` : `'${escapeHtml(f.name).replace(/'/g, '&#39;')}', true`;
        return `
            <div class="file-item" onclick="previewFile(${arg})">
                <div class="fi-icon"><i class="fas ${icon}"></i></div>
                <div class="fi-info">
                    <div class="fi-name">${escapeHtml(f.name)}</div>
                    <div class="fi-meta">${escapeHtml(f.author)} • ${formatFileSize(f.size)}</div>
                </div>
                <button class="mf-action" onclick="event.stopPropagation(); previewFile(${arg})" title="معاينة"><i class="fas fa-eye"></i></button>
                <button class="mf-action" onclick="event.stopPropagation(); downloadFile(${arg})" title="تنزيل">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
    }).join('');
}

function updateFilesBadge() {
    const count = (nqState.files[nqState.currentChannel] || []).length;
    const badge = document.getElementById('filesCountBadge');
    if (badge) badge.textContent = count;
}

function findFileRecord(ref, byName) {
    const ch = nqState.currentChannel;
    const msgs = nqState.messages[ch] || [];
    let m = byName ? msgs.find(x => x.file && x.file.name === ref) : msgs.find(x => x.id === ref);
    if (!m) {                                                   // بحث احتياطي في القنوات الأخرى
        for (const k in nqState.messages) {
            m = (nqState.messages[k] || []).find(x => x.file && (byName ? x.file.name === ref : x.id === ref));
            if (m) break;
        }
    }
    return m && m.file ? m.file : null;
}

async function nqFileUrl(f, forDownload) {
    if (f.path) {
        const c = await PortalCloud.ready;
        const { data, error } = await c.storage.from(NQ_BUCKET()).createSignedUrl(f.path, 3600, forDownload ? { download: f.name } : undefined);
        if (error || !data) throw (error || new Error('تعذّر إنشاء الرابط'));
        return data.signedUrl;
    }
    if (f.dataUrl) return f.dataUrl;                            // ملفات قديمة مخزّنة سابقاً
    throw new Error('الملف غير متاح.');
}

async function downloadFile(ref, byName) {
    const f = findFileRecord(ref, byName);
    if (!f) { alert('الملف غير متاح للتنزيل.'); return; }
    try {
        const url = await nqFileUrl(f, true);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (err) {
        alert('تعذّر تنزيل الملف: ' + (err && err.message ? err.message : err));
    }
}

async function previewFile(ref, byName) {
    const f = findFileRecord(ref, byName);
    if (!f) { alert('الملف غير متاح.'); return; }
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const t = f.type || '';
    const kind = /^image\//.test(t) || /^(jpe?g|png|gif|webp|bmp|svg)$/.test(ext) ? 'img'
        : (t === 'application/pdf' || ext === 'pdf') ? 'pdf'
        : /^video\//.test(t) || /^(mp4|webm|ogg)$/.test(ext) ? 'video'
        : /^audio\//.test(t) || /^(mp3|wav|m4a)$/.test(ext) ? 'audio'
        : (/^text\//.test(t) || ext === 'txt') ? 'pdf' : '';
    if (!kind) { return downloadFile(ref, byName); }            // Word/Excel/PowerPoint: لا معاينة في المتصفح
    try {
        const url = await nqFileUrl(f, false);
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;direction:rtl';
        const inner = kind === 'img' ? `<img src="${url}" style="max-width:100%;max-height:100%;object-fit:contain;background:#fff">`
            : kind === 'video' ? `<video src="${url}" controls style="max-width:100%;max-height:100%"></video>`
            : kind === 'audio' ? `<audio src="${url}" controls></audio>`
            : `<iframe src="${url}" style="width:100%;height:100%;border:0;background:#fff"></iframe>`;
        d.innerHTML = `<div style="width:min(96vw,1000px);height:100%;max-height:92vh;display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;gap:8px;align-items:center;color:#fff"><strong style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</strong>
            <button data-dl style="padding:6px 14px;border-radius:8px;border:0;cursor:pointer">تنزيل</button>
            <button data-x style="padding:6px 14px;border-radius:8px;border:0;cursor:pointer">إغلاق</button></div>
            <div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center">${inner}</div></div>`;
        d.querySelector('[data-x]').onclick = () => d.remove();
        d.querySelector('[data-dl]').onclick = () => downloadFile(ref, byName);
        d.addEventListener('click', (ev) => { if (ev.target === d) d.remove(); });
        document.body.appendChild(d);
    } catch (err) {
        alert('تعذّر فتح المعاينة: ' + (err && err.message ? err.message : err));
    }
}

/* ============================================================
   لوحة الملاحظات الشخصية
   ============================================================ */
function toggleNotesPanel() {
    const panel = document.getElementById('notesPanel');
    const files = document.getElementById('filesPanel');
    if (files) files.classList.remove('open');
    if (panel) panel.classList.toggle('open');
}

function initNotes() {
    const area = document.getElementById('notesArea');
    if (!area) return;
    area.value = nqState.notes;

    let saveTimer;
    area.addEventListener('input', () => {
        const status = document.getElementById('notesStatus');
        if (status) status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الحفظ...';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            nqState.notes = area.value;
            nqSave();
            if (status) status.innerHTML = '<i class="fas fa-check"></i> محفوظ';
        }, 600);
    });
}

/* ============================================================
   قنوات جديدة
   ============================================================ */
function openChannelModal() {
    document.getElementById('channelModal')?.classList.add('open');
    setTimeout(() => document.getElementById('newChannelName')?.focus(), 150);
}
function closeChannelModal() {
    document.getElementById('channelModal')?.classList.remove('open');
}

function pickIcon(btn) {
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function saveChannel(e) {
    if (e && e.preventDefault) e.preventDefault();
    const nameInput = document.getElementById('newChannelName');
    const descInput = document.getElementById('newChannelDesc');
    const name = nameInput?.value.trim();
    const desc = descInput?.value.trim();
    const iconBtn = document.querySelector('.icon-opt.active');
    const icon = iconBtn ? iconBtn.dataset.icon : 'fa-hashtag';

    if (!name) return false;

    const id = 'ch_' + Date.now();
    nqState.channels.push({
        id, name, desc, icon,
        createdAt: new Date().toISOString()
    });
    nqSave();
    closeChannelModal();
    document.getElementById('channelModal')?.querySelector('form')?.reset();
    document.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('active'));
    document.querySelector('.icon-opt')?.classList.add('active');

    renderChannels();
    selectChannel(id);
    updateGlobalStats();
    return false;
}

/* ============================================================
   مسح محادثة
   ============================================================ */
function clearCurrentChannel() {
    if (!nqState.currentChannel) return;
    if (!confirm('هل تريد مسح جميع رسائل هذه القناة؟')) return;
    const paths = (nqState.messages[nqState.currentChannel] || []).filter(m => m.file && m.file.path).map(m => m.file.path);
    if (paths.length) PortalCloud.ready.then(c => c.storage.from(NQ_BUCKET()).remove(paths)).catch(() => {});
    nqState.messages[nqState.currentChannel] = [];
    nqState.files[nqState.currentChannel] = [];
    nqSave();
    renderMessages();
    renderChannels();
    renderFilesPanel();
    updateFilesBadge();
    updateGlobalStats();
}

/* ============================================================
   الإحصائيات العامة
   ============================================================ */
function updateGlobalStats() {
    const channels = nqState.channels.length;
    const totalMessages = Object.values(nqState.messages).reduce((a, arr) => a + arr.length, 0);
    const totalFiles = Object.values(nqState.files).reduce((a, arr) => a + arr.length, 0);
    const notesLength = nqState.notes.trim() ? 1 : 0;

    const elC = document.getElementById('nhStatChannels');
    const elM = document.getElementById('nhStatMessages');
    const elF = document.getElementById('nhStatFiles');
    const elN = document.getElementById('nhStatNotes');

    if (elC) elC.textContent = channels;
    if (elM) elM.textContent = totalMessages;
    if (elF) elF.textContent = totalFiles;
    if (elN) elN.textContent = notesLength;
}

/* ============================================================
   تحديث معلومات المستخدم
   ============================================================ */
function updateUserInfo() {
    const u = getCurrentUser();
    const nameEl = document.getElementById('csUserName');
    const avatarEl = document.getElementById('csUserAvatar');
    if (nameEl) nameEl.textContent = u.name;
    if (avatarEl) avatarEl.textContent = getInitial(u.name);
}

/* ============================================================
   التهيئة
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    nqLoad();
    updateUserInfo();
    renderChannels();
    updateGlobalStats();
    initNotes();

    if (nqState.channels.length) {
        selectChannel(nqState.channels[0].id);
    }

    document.addEventListener('click', (e) => {
        const files = document.getElementById('filesPanel');
        const notes = document.getElementById('notesPanel');
        if (files && files.classList.contains('open') &&
            !files.contains(e.target) &&
            !e.target.closest('[onclick*="toggleFilesPanel"]')) {
            files.classList.remove('open');
        }
        if (notes && notes.classList.contains('open') &&
            !notes.contains(e.target) &&
            !e.target.closest('[onclick*="toggleNotesPanel"]')) {
            notes.classList.remove('open');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('filesPanel')?.classList.remove('open');
            document.getElementById('notesPanel')?.classList.remove('open');
        }
    });
});

document.addEventListener('portal:login', () => {
    updateUserInfo();
    renderMessages();
});

/* مزامنة فورية: تحديث الرسائل عند وصول تغيير من مستخدم آخر */
window.addEventListener('pc:synced', (e) => {
    if (!e.detail.keys.some(k => k.indexOf('niqash_') === 0)) return;
    const cur = nqState.currentChannel;
    nqLoad();
    renderChannels();
    updateGlobalStats();
    if (nqState.channels.some(c => c.id === cur)) { nqState.currentChannel = cur; renderCurrentChannel(); }
    else if (nqState.channels.length) selectChannel(nqState.channels[0].id);
});
