// ============================================================
//  sahafa-dashboard.js - إدارة ركن الكتابة الهادفة في لوحة التحكم
// ============================================================

let _sahafaArticles = [];

function safeGetElement(id) {
    return document.getElementById(id);
}

async function loadSahafaArticles() {
    const tbody = safeGetElement('sahafaTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;"><i class="fas fa-spinner fa-spin"></i> جارٍ التحميل من السحابة...</td></tr>';

    try {
        if (typeof sbMain === 'undefined' || !sbMain) {
            throw new Error('اتصال Supabase غير متوفر');
        }

        const { data, error } = await sbMain
            .from('sahafa_articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        _sahafaArticles = data || [];
        renderSahafaTable();
    } catch (e) {
        console.error('Sahafa load error:', e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:20px;"><i class="fas fa-exclamation-triangle"></i> تعذر تحميل المقالات: ${e.message}</td></tr>`;
    }
}

function renderSahafaTable() {
    const tbody = safeGetElement('sahafaTableBody');
    if (!tbody) return;
    
    // ✅ القاموس المحدث بـ 6 تصنيفات إبداعية
    const categoryLabels = { 
        adab: '🖋️ أدب وخواطر', 
        bida: '🎓 تجارب بيداغوجية', 
        chaan: '🏛️ شأن تربوي',
        mutaalim: '🎭 أقلام المتعلمين',
        reportage: '📸 فعاليات وروبورتاجات',
        kutub: '💡 قراءات في كتب'
    };
    const statusLabels = { pending: '⏳ قيد المراجعة', published: '✅ منشور', rejected: '❌ مرفوض' };

    if (_sahafaArticles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:20px;">لا توجد مقالات مرسلة بعد.</td></tr>';
        return;
    }

    tbody.innerHTML = _sahafaArticles.map((a, i) => `
        <tr>
            <td>${i + 1}</td>
            <td style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(a.title)}">
                <strong>${escapeHtml(a.title)}</strong>
                ${a.cover_image_url ? ' <small style="color:var(--gold);"><i class="fas fa-image"></i></small>' : ''}
                ${a.video_url ? ' <small style="color:#e74c3c;"><i class="fas fa-video"></i></small>' : ''}
            </td>
            <td><strong>${escapeHtml(a.author_name)}</strong></td>
            <td><span style="background:#eef3f9; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700;">${categoryLabels[a.category] || a.category}</span></td>
            <td style="font-size:11.5px; color:var(--text-muted);">${new Date(a.created_at).toLocaleString('ar-DZ')}</td>
            <td><span style="font-size:11px; padding:3px 8px; border-radius:10px; background:${a.status === 'published' ? '#d4edda' : a.status === 'rejected' ? '#f8d7da' : '#fff3cd'}; color:${a.status === 'published' ? '#155724' : a.status === 'rejected' ? '#721c24' : '#856404'}; font-weight:700;">${statusLabels[a.status] || a.status}</span></td>
            <td style="white-space:nowrap;">
                ${a.status !== 'published' ? `<button class="btn btn-sm btn-success" onclick="publishSahafa('${a.id}')" title="نشر المقال"><i class="fas fa-check"></i></button>` : ''}
                ${a.status !== 'rejected' ? `<button class="btn btn-sm btn-warning" onclick="rejectSahafa('${a.id}')" title="رفض"><i class="fas fa-times"></i></button>` : ''}
                <button class="btn btn-sm btn-info" onclick="addNoteSahafa('${a.id}')" title="إرسال توجيه للكاتب"><i class="fas fa-comment-dots"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteSahafa('${a.id}')" title="حذف"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

async function publishSahafa(id) {
    if (!confirm('هل تريد نشر هذا المقال في الجدارية الصحفية؟')) return;
    try {
        const { error } = await sbMain.from('sahafa_articles').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        showToast('✅ تم نشر المقال في الجدارية بنجاح', 'success');
        loadSahafaArticles();
    } catch (e) { 
        console.error(e);
        showToast('❌ تعذر النشر: ' + e.message, 'error'); 
    }
}

async function rejectSahafa(id) {
    if (!confirm('هل تريد رفض هذا المقال؟')) return;
    try {
        const { error } = await sbMain.from('sahafa_articles').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        showToast('✅ تم رفض المقال', 'success');
        loadSahafaArticles();
    } catch (e) { 
        console.error(e);
        showToast('❌ تعذر الرفض', 'error'); 
    }
}

async function deleteSahafa(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المقال نهائياً من الجدارية؟')) return;
    try {
        const { error } = await sbMain.from('sahafa_articles').delete().eq('id', id);
        if (error) throw error;
        showToast('🗑️ تم حذف المقال بنجاح', 'info');
        loadSahafaArticles();
    } catch (e) { 
        console.error(e);
        showToast('❌ تعذر الحذف', 'error'); 
    }
}

async function addNoteSahafa(id) {
    const note = prompt('أدخل التوجيه أو الملاحظة التي تريد إرسالها للأستاذ الكاتب لتعديل المقال:');
    if (!note || !note.trim()) return;
    
    try {
        const { error } = await sbMain.from('sahafa_articles').update({ 
            admin_notes: note.trim(),
            status: 'pending',
            updated_at: new Date().toISOString()
        }).eq('id', id);
        if (error) throw error;
        showToast('✅ تم إرسال الملاحظة للأستاذ وسيتمكن من تعديل المقال', 'success');
        loadSahafaArticles();
    } catch (e) { 
        console.error(e);
        showToast('❌ تعذر إرسال الملاحظة', 'error'); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sahafaTab = document.querySelector('.main-tab[data-maintab="sahafa"]');
    if (sahafaTab) {
        sahafaTab.addEventListener('click', loadSahafaArticles);
    }
});