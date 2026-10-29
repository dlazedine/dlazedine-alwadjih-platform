// sahafa-edit.js - إدارة تعديل المقالات ورفع الوسائط

const SUPABASE_URL = "https://yzxyttieobyblznaehcl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentArticle = null;

// 1. جلب المقال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
        alert('لم يتم العثور على معرف المقال.');
        window.location.href = 'sahafa.html';
        return;
    }

    document.getElementById('articleId').value = articleId;
    await fetchArticle(articleId);
    setupMediaPreview();
});

async function fetchArticle(id) {
    try {
        const { data, error } = await sb.from('sahafa_articles').select('*').eq('id', id).single();
        if (error) throw error;
        
        currentArticle = data;
        
        // تعبئة الحقول
        document.getElementById('title').value = data.title || '';
        document.getElementById('content').value = data.content || '';
        
        // عرض الملاحظات إن وجدت
        if (data.admin_notes) {
            document.getElementById('adminNoteText').textContent = data.admin_notes;
            document.getElementById('adminNoteBox').classList.add('active');
        }

        // عرض الصورة الحالية إن وجدت
        if (data.cover_image_url) {
            const preview = document.getElementById('coverPreview');
            preview.src = data.cover_image_url;
            preview.style.display = 'block';
        }

    } catch (err) {
        console.error(err);
        alert('تعذر جلب المقال. تأكد من الرابط.');
    }
}

// 2. معاينة الصورة قبل الرفع
function setupMediaPreview() {
    document.getElementById('coverFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const preview = document.getElementById('coverPreview');
                preview.src = evt.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// 3. حفظ التعديلات ورفع الوسائط
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');
    const id = document.getElementById('articleId').value;
    
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const coverFile = document.getElementById('coverFile').files[0];
    const videoFile = document.getElementById('videoFile').files[0];

    if (!title || !content) {
        msg.className = 'msg error'; msg.textContent = 'يرجى ملء العنوان ونص المقال.'; return;
    }

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الحفظ والرفع...';
    msg.className = 'msg'; msg.style.display = 'none';

    try {
        let coverUrl = currentArticle.cover_image_url;
        let videoUrl = currentArticle.video_url;

        // رفع الصورة إذا تم اختيارها
        if (coverFile) {
            msg.className = 'msg success'; msg.textContent = '⏳ جارٍ رفع الصورة...';
            const fileExt = coverFile.name.split('.').pop();
            const fileName = `cover_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await sb.storage.from('sahafa_media').upload(fileName, coverFile);
            if (uploadError) throw uploadError;
            const { data: urlData } = sb.storage.from('sahafa_media').getPublicUrl(fileName);
            coverUrl = urlData.publicUrl;
        }

        // رفع الفيديو إذا تم اختياره
        if (videoFile) {
            msg.textContent = '⏳ جارٍ رفع الفيديو...';
            const fileExt = videoFile.name.split('.').pop();
            const fileName = `video_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await sb.storage.from('sahafa_media').upload(fileName, videoFile);
            if (uploadError) throw uploadError;
            const { data: urlData } = sb.storage.from('sahafa_media').getPublicUrl(fileName);
            videoUrl = urlData.publicUrl;
        }

        // تحديث قاعدة البيانات
        const { error: updateError } = await sb.from('sahafa_articles').update({
            title: title,
            content: content,
            cover_image_url: coverUrl,
            video_url: videoUrl,
            status: 'pending', // إعادة الحالة إلى قيد المراجعة
            admin_notes: null, // مسح الملاحظات القديمة بعد التعديل
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (updateError) throw updateError;

        msg.className = 'msg success';
        msg.textContent = '✅ تم حفظ التعديلات وإعادة إرسال المقال للمفتش بنجاح! سيتم توجيهك الآن...';
        
        setTimeout(() => { window.location.href = 'sahafa.html'; }, 2000);

    } catch (err) {
        console.error(err);
        msg.className = 'msg error';
        msg.textContent = '❌ حدث خطأ أثناء الحفظ: ' + err.message;
    } finally {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات وإعادة الإرسال';
    }
});