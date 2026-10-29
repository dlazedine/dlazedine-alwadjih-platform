// sahafa-edit.js - إدارة تعديل المقالات ورفع الوسائط (نسخة تدعم ألبوم الصور)

const SUPABASE_URL = "https://yzxyttieobyblznaehcl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentArticle = null;

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
    setupFormSubmit();
});

async function fetchArticle(id) {
    try {
        const { data, error } = await sb.from('sahafa_articles').select('*').eq('id', id).single();
        if (error) throw error;
        
        currentArticle = data;
        document.getElementById('category').value = data.category || 'adab';
        document.getElementById('title').value = data.title || '';
        document.getElementById('content').value = data.content || '';
        
        if (data.admin_notes) {
            document.getElementById('adminNoteText').textContent = data.admin_notes;
            document.getElementById('adminNoteBox').classList.add('active');
        }

        if (data.cover_image_url) {
            const preview = document.getElementById('coverPreview');
            preview.src = data.cover_image_url;
            preview.style.display = 'block';
        }

    } catch (err) {
        console.error('Fetch Error:', err);
        alert('تعذر جلب المقال. تأكد من الرابط.');
        window.location.href = 'sahafa.html';
    }
}

function setupMediaPreview() {
    const coverInput = document.getElementById('coverFile');
    if(coverInput) {
        coverInput.addEventListener('change', function(e) {
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
}

function setupFormSubmit() {
    const form = document.getElementById('editForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
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

        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ الحفظ...';
        msg.className = 'msg'; msg.style.display = 'none';

        try {
            let coverUrl = currentArticle ? currentArticle.cover_image_url : null;
            let videoUrl = currentArticle ? currentArticle.video_url : null;
            // ✅ جلب ألبوم الصور الحالي
            let galleryData = currentArticle && currentArticle.images_gallery ? currentArticle.images_gallery : [];

            if (coverFile) {
                msg.className = 'msg success'; msg.textContent = '⏳ جارٍ رفع الصورة...';
                const fileExt = coverFile.name.split('.').pop();
                const fileName = `cover_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await sb.storage.from('sahafa_media').upload(fileName, coverFile);
                if (uploadError) throw uploadError;
                const { data: urlData } = sb.storage.from('sahafa_media').getPublicUrl(fileName);
                coverUrl = urlData.publicUrl;
                
                // ✅ إضافة الصورة الجديدة إلى الألبوم
                galleryData.push(coverUrl);
            }

            if (videoFile) {
                msg.textContent = '⏳ جارٍ رفع الفيديو...';
                const fileExt = videoFile.name.split('.').pop();
                const fileName = `video_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await sb.storage.from('sahafa_media').upload(fileName, videoFile);
                if (uploadError) throw uploadError;
                const { data: urlData } = sb.storage.from('sahafa_media').getPublicUrl(fileName);
                videoUrl = urlData.publicUrl;
            }

            // ✅ كائن التحديث (هنا نضع كل البيانات)
            const { error: updateError } = await sb.from('sahafa_articles').update({
                title: title,
                content: content,
                cover_image_url: coverUrl,
                video_url: videoUrl,
                images_gallery: galleryData, // تحديث الألبوم
                status: 'pending',
                admin_notes: null,
                updated_at: new Date().toISOString()
            }).eq('id', id);

            if (updateError) throw updateError;

            msg.className = 'msg success';
            msg.textContent = '✅ تم حفظ التعديلات وإعادة إرسال المقال للمفتش بنجاح!';
            
            setTimeout(() => { window.location.href = 'sahafa.html'; }, 2000);

        } catch (err) {
            console.error('Save Error:', err);
            msg.className = 'msg error';
            msg.textContent = '❌ حدث خطأ أثناء الحفظ: ' + (err.message || 'خطأ غير معروف');
        } finally {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات وإعادة الإرسال للمراجعة';
        }
    });
}