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
                    <button class="mf-action" onclick="downloadFile('${escapeHtml(m.file.name)}')" title="تنزيل">
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
function sendMessage() {
    if (!nqState.currentChannel) {
        alert('اختر قناة أولاً.');
        return;
    }
    const input = document.getElementById('messageInput');
    if (!input) return;
    const text = input.value.trim();
    const file = nqState.pendingFile;

    if (!text && !file) return;

    const me = getCurrentUser();
    const msg = {
        id: 'M' + Date.now(),
        author: me.name,
        role: me.role,
        text,
        time: new Date().toISOString(),
        type: file ? 'file' : 'text'
    };

    if (file) {
        msg.file = {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: file.dataUrl
        };

        if (!nqState.files[nqState.currentChannel]) nqState.files[nqState.currentChannel] = [];
        nqState.files[nqState.currentChannel].unshift({
            name: file.name,
            size: file.size,
            author: me.name,
            time: msg.time
        });
    }

    if (!nqState.messages[nqState.currentChannel]) nqState.messages[nqState.currentChannel] = [];
    nqState.messages[nqState.currentChannel].push(msg);

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

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى 5 ميغابايت.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
        nqState.pendingFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: evt.target.result
        };
        showFilePreview();
    };
    reader.readAsDataURL(file);
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

    body.innerHTML = files.map(f => {
        const ext = (f.name.split('.').pop() || '').toLowerCase();
        const icon = FILE_ICONS[ext] || 'fa-file';
        return `
            <div class="file-item" onclick="downloadFile('${escapeHtml(f.name)}')">
                <div class="fi-icon"><i class="fas ${icon}"></i></div>
                <div class="fi-info">
                    <div class="fi-name">${escapeHtml(f.name)}</div>
                    <div class="fi-meta">${escapeHtml(f.author)} • ${formatFileSize(f.size)}</div>
                </div>
                <button class="mf-action" onclick="event.stopPropagation(); downloadFile('${escapeHtml(f.name)}')">
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

function downloadFile(fileName) {
    const messages = nqState.messages[nqState.currentChannel] || [];
    const msg = messages.find(m => m.file && m.file.name === fileName);
    if (!msg || !msg.file?.dataUrl) {
        alert('الملف غير متاح للتنزيل.');
        return;
    }
    const a = document.createElement('a');
    a.href = msg.file.dataUrl;
    a.download = fileName;
    a.click();
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
