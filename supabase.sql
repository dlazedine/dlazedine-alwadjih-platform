-- ==============================================================================
-- 🏛️ منظومة الوجيه في الإشراف التّربوي — ملف إعداد قاعدة البيانات وتخزين الملفات
-- Al-Wadjih Educational Platform — Complete Supabase Database & Storage Setup
-- ==============================================================================
-- إشراف وتأطير: مفتش التعليم المتوسط درويش الهلالي — المقاطعة الثانية قسنطينة
-- 
-- 🎯 الهدف من هذا الملف:
-- 1. حل خطأ: «تعذّر رفع الملف: جدول أو مخزن غير موجود في Supabase»
--    -> إنشاء مخزن الملفات (Storage Bucket) باسم "exams" وضبط سياسات الأمان (Storage Policies).
-- 2. حل خطأ: «تعذّر الحفظ: جدول أو مخزن غير موجود في Supabase»
--    -> إنشاء جداول wajih_settings و wajih_reports و wajih_prof مع سياسات الأمان وبيانات المتوسطات.
--
-- 🚀 طريقة التشغيل في Supabase:
-- 1. افتح لوحة تحكم مشروعك في Supabase (https://supabase.com/dashboard).
-- 2. ادخل إلى قائمة "SQL Editor" من القائمة الجانبية اليسرى.
-- 3. انقر على "New query" والصق هذا الملف كاملاً.
-- 4. اضغط على زر "Run" (أو Ctrl+Enter).
-- 5. حدّث صفحة فحص الاختبارات في المتصفح وستعمل كافة الوظائف فوراً وبنجاح تام.
-- ==============================================================================

-- تفعيل إضافات توليد المعرفات الفريدة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1️⃣ إعداد مخزن الملفات (Storage Bucket: exams)
-- لحل خطأ رفع ملفات الاختبارات المنجزة (PDF / JPG / PNG)
-- ==============================================================================

-- إنشاء مخزن الملفات 'exams' إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exams',
    'exams',
    true, -- متاح للقراءة وعرض الروابط الموقعة والمعاينة
    10485760, -- الحد الأقصى للملف: 10 ميغابايت (10 * 1024 * 1024)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ضبط سياسات أمان مخزن الملفات (Storage RLS Policies)
-- السماح بقراءة وتحميل ومعاينة الملفات
DROP POLICY IF EXISTS "Public can view exams" ON storage.objects;
CREATE POLICY "Public can view exams"
ON storage.objects FOR SELECT
USING (bucket_id = 'exams');

-- السماح برفع ملفات الاختبارات لجميع المستخدمين المسجلين والضيوف
DROP POLICY IF EXISTS "Users can upload exams" ON storage.objects;
CREATE POLICY "Users can upload exams"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exams');

-- السماح بتحديث وتعديل الملفات في مخزن exams
DROP POLICY IF EXISTS "Users can update exams" ON storage.objects;
CREATE POLICY "Users can update exams"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exams');

-- السماح بحذف الملفات القديمة عند تعديل أو حذف الاختبار
DROP POLICY IF EXISTS "Users can delete exams" ON storage.objects;
CREATE POLICY "Users can delete exams"
ON storage.objects FOR DELETE
USING (bucket_id = 'exams');


-- ==============================================================================
-- 2️⃣ الدالة المساعدة لتحديث حقل updated_at تلقائياً
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 3️⃣ جدول إعدادات المنظومة (wajih_settings)
-- يخزن قائمة المتوسطات الـ 21 للمقاطعة والإعدادات العامة المشتركة
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل الأمان على مستوى الصفوف (RLS)
ALTER TABLE public.wajih_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read wajih_settings" ON public.wajih_settings;
CREATE POLICY "Anyone can read wajih_settings"
ON public.wajih_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_settings" ON public.wajih_settings;
CREATE POLICY "Anyone can insert wajih_settings"
ON public.wajih_settings FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update wajih_settings" ON public.wajih_settings;
CREATE POLICY "Anyone can update wajih_settings"
ON public.wajih_settings FOR UPDATE
USING (true);

-- بذر قائمة متوسطات المقاطعة الثانية قسنطينة (21 متوسطة رسمية وخاصة)
INSERT INTO public.wajih_settings (key, value, updated_at)
VALUES (
    'schools',
    '[
      "متوسطة قريبة رابح",
      "متوسطة زويني الطاهر",
      "متوسطة لشطر القرمي",
      "متوسطة لعطيوي بلقاسم",
      "متوسطة خميسي الجندلي",
      "متوسطة طافر عمّار",
      "متوسطة مراشدي معمر",
      "متوسطة بن باديس",
      "متوسطة علي غرباوي",
      "متوسطة مصطفى عبد النوري",
      "متوسطة رابح بوباكور",
      "متوسطة قريوعة عبد الحميد",
      "متوسطة الخنساء",
      "متوسطة بلحرش عمار",
      "متوسطة هواري بومدين",
      "متوسطة يحياوي صالح",
      "متوسطة بومعزة رشيد",
      "متوسطة بوقفة مسعود",
      "متوسطة نور الملاك الخاصة",
      "متوسطة الشيماء الخاصة",
      "متوسطة نوبا العالمية الخاصة"
    ]'::jsonb,
    now()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

-- بذر بيانات المقاطعة والهيكل الإداري
INSERT INTO public.wajih_settings (key, value, updated_at)
VALUES (
    'district_info',
    '{
      "wilaya": "قسنطينة",
      "district_number": "الثانية",
      "directorate": "مديرية التربية لولاية قسنطينة",
      "inspector_name": "درويش الهلالي",
      "inspector_subject": "اللغة العربية والتربية الإسلامية",
      "academic_year": "2025/2026"
    }'::jsonb,
    now()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();


-- ==============================================================================
-- 4️⃣ جدول بيانات الأساتذة (wajih_prof)
-- يخزن أسماء ومؤسسات ومعلومات أساتذة المقاطعة
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_prof (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهارس لتحسين سرعة الاستعلام
CREATE INDEX IF NOT EXISTS idx_wajih_prof_user_id ON public.wajih_prof(user_id);
CREATE INDEX IF NOT EXISTS idx_wajih_prof_data ON public.wajih_prof USING gin(data);

-- تفعيل الأمان RLS
ALTER TABLE public.wajih_prof ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read wajih_prof" ON public.wajih_prof;
CREATE POLICY "Anyone can read wajih_prof"
ON public.wajih_prof FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_prof" ON public.wajih_prof;
CREATE POLICY "Anyone can insert wajih_prof"
ON public.wajih_prof FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update wajih_prof" ON public.wajih_prof;
CREATE POLICY "Anyone can update wajih_prof"
ON public.wajih_prof FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Anyone can delete wajih_prof" ON public.wajih_prof;
CREATE POLICY "Anyone can delete wajih_prof"
ON public.wajih_prof FOR DELETE
USING (true);

-- محفز تحديث updated_at لجدول الأساتذة
DROP TRIGGER IF EXISTS trg_wajih_prof_updated_at ON public.wajih_prof;
CREATE TRIGGER trg_wajih_prof_updated_at
BEFORE UPDATE ON public.wajih_prof
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- بذر أساتذة تجريبيين للمقاطعة لتسهيل الاختبار المباشر
INSERT INTO public.wajih_prof (id, data)
VALUES 
    ('11111111-1111-1111-1111-111111111111', '{"name":"أحمد بن علي", "inst":"متوسطة علي غرباوي", "subject":"اللغة العربية", "phone":"0661000001"}'::jsonb),
    ('22222222-2222-2222-2222-222222222222', '{"name":"فاطمة الزهراء قاسمي", "inst":"متوسطة الخنساء", "subject":"اللغة العربية", "phone":"0661000002"}'::jsonb),
    ('33333333-3333-3333-3333-333333333333', '{"name":"محمد الهادي بومعزة", "inst":"متوسطة مصطفى عبد النوري", "subject":"اللغة العربية", "phone":"0661000003"}'::jsonb),
    ('44444444-4444-4444-4444-444444444444', '{"name":"سعاد بوحفص", "inst":"متوسطة قريوعة عبد الحميد", "subject":"اللغة العربية", "phone":"0661000004"}'::jsonb),
    ('55555555-5555-5555-5555-555555555555', '{"name":"رشيد بلحرش", "inst":"متوسطة بلحرش عمار", "subject":"اللغة العربية", "phone":"0661000005"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 5️⃣ جدول تقارير وفحوصات الاختبارات (wajih_reports)
-- الجدول الرئيسي لتخزين بطاقات فحص وتقويم الاختبارات (kind = 'exam')
-- وأيضاً تقويمات بلوم (kind = 'bloom') والزيارات التفتيشية
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prof_id UUID REFERENCES public.wajih_prof(id) ON DELETE SET NULL,
    kind TEXT NOT NULL DEFAULT 'exam', -- exam, bloom, visit, audit
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    published BOOLEAN NOT NULL DEFAULT false, -- إتاحة البطاقة للأستاذ
    created_by UUID,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهارس لتحسين سرعة البحث والتصفية
CREATE INDEX IF NOT EXISTS idx_wajih_reports_kind ON public.wajih_reports(kind);
CREATE INDEX IF NOT EXISTS idx_wajih_reports_prof_id ON public.wajih_reports(prof_id);
CREATE INDEX IF NOT EXISTS idx_wajih_reports_published ON public.wajih_reports(published);
CREATE INDEX IF NOT EXISTS idx_wajih_reports_created_at ON public.wajih_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wajih_reports_data ON public.wajih_reports USING gin(data);

-- تفعيل الأمان RLS
ALTER TABLE public.wajih_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read wajih_reports" ON public.wajih_reports;
CREATE POLICY "Anyone can read wajih_reports"
ON public.wajih_reports FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_reports" ON public.wajih_reports;
CREATE POLICY "Anyone can insert wajih_reports"
ON public.wajih_reports FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update wajih_reports" ON public.wajih_reports;
CREATE POLICY "Anyone can update wajih_reports"
ON public.wajih_reports FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Anyone can delete wajih_reports" ON public.wajih_reports;
CREATE POLICY "Anyone can delete wajih_reports"
ON public.wajih_reports FOR DELETE
USING (true);

-- محفز تحديث updated_at لجدول التقارير
DROP TRIGGER IF EXISTS trg_wajih_reports_updated_at ON public.wajih_reports;
CREATE TRIGGER trg_wajih_reports_updated_at
BEFORE UPDATE ON public.wajih_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- بذر بطاقة فحص نموذجية أولية للاختبار
INSERT INTO public.wajih_reports (id, prof_id, kind, data, published, created_by_name, created_at)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'exam',
    '{
      "teacher": "أحمد بن علي",
      "school": "متوسطة علي غرباوي",
      "level": "رابعة متوسط",
      "subject": "اللغة العربية",
      "type": "اختبار",
      "period": "الفصل الأول",
      "sections": 2,
      "candidates": 68,
      "resScores": [2, 2, 2, 1.5, 1, 1, 1, 1],
      "compScores": [1, 1, 1, 1, 1, 1, 0.5, 1],
      "resSum": 11.5,
      "compSum": 7.5,
      "total": 19,
      "qual": "نموذجي",
      "date": "2026-10-01",
      "file": null
    }'::jsonb,
    true,
    'مفتش التعليم المتوسط درويش الهلالي',
    now()
)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 6️⃣ جدول سجل الأنشطة والعمليات (wajih_activities)
-- لتسجيل عمليات WJ.act('create' / 'update' / 'delete', 'exam')
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT,
    action TEXT NOT NULL, -- create, update, delete, view, export
    target_type TEXT NOT NULL, -- exam, bloom, school, prof
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wajih_activities_created_at ON public.wajih_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wajih_activities_target ON public.wajih_activities(target_type);

ALTER TABLE public.wajih_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read wajih_activities" ON public.wajih_activities;
CREATE POLICY "Anyone can read wajih_activities"
ON public.wajih_activities FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_activities" ON public.wajih_activities;
CREATE POLICY "Anyone can insert wajih_activities"
ON public.wajih_activities FOR INSERT
WITH CHECK (true);


-- ==============================================================================
-- 7️⃣ جدول ملفات المستخدمين والأدوار (wajih_users)
-- يربط حسابات auth.users بأدوار المنظومة (inspector / supervisor / teacher)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    password TEXT DEFAULT 'prof2026',
    role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('inspector', 'supervisor', 'teacher', 'admin')),
    school TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ضمان وجود حقول البريد وكلمة المرور إن كان الجدول موجوداً مسبقاً
ALTER TABLE public.wajih_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.wajih_users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'prof2026';

ALTER TABLE public.wajih_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read wajih_users" ON public.wajih_users;
CREATE POLICY "Anyone can read wajih_users"
ON public.wajih_users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can insert or update wajih_users" ON public.wajih_users;
CREATE POLICY "Anyone can insert or update wajih_users"
ON public.wajih_users FOR ALL
USING (true);

-- بذر حسابات أساتذة المقاطعة لضمان الدخول السحابي المباشر من أي هاتف أو جهاز
INSERT INTO public.wajih_users (id, username, full_name, email, password, role, school)
VALUES
    ('U_toufouti25houssem', 'toufouti25houssem', 'حسام الدين تفوتي', 'toufouti25houssem@gmail.com', 'prof2026', 'teacher', 'متوسطة الإخوة بوسالم'),
    ('U_dalilaamoura', 'dalilaamoura', 'دليلة عمورة', 'dalilaamoura37@gmail.com', 'prof2026', 'teacher', 'متوسطة لشطر القرمي'),
    ('U_mazouzi', 'mazouzi', 'سعاد معزوزي', 'snace25000@gmail.com', 'prof2026', 'teacher', 'متوسطة بوشمال الوزناجي')
ON CONFLICT (username) DO UPDATE
SET password = EXCLUDED.password, full_name = EXCLUDED.full_name, school = EXCLUDED.school;


-- ==============================================================================
-- 8️⃣ جداول تكميلية لمنظومة الوجيه (الاستبيانات والنقاش والمعالجة)
-- لضمان عمل كافة أدوات المنصة السحابية بسلاسة تامة
-- ==============================================================================

-- استبيانات المقاطعة ودراسة المقترحات
CREATE TABLE IF NOT EXISTS public.wajih_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.wajih_surveys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can access wajih_surveys" ON public.wajih_surveys;
CREATE POLICY "Anyone can access wajih_surveys" ON public.wajih_surveys FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.wajih_survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID REFERENCES public.wajih_surveys(id) ON DELETE CASCADE,
    respondent_name TEXT,
    respondent_school TEXT,
    respondent_role TEXT DEFAULT 'teacher',
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.wajih_survey_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can access wajih_survey_responses" ON public.wajih_survey_responses;
CREATE POLICY "Anyone can access wajih_survey_responses" ON public.wajih_survey_responses FOR ALL USING (true);

-- ركن النقاش والمحادثة المهنية
CREATE TABLE IF NOT EXISTS public.wajih_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL DEFAULT 'general',
    sender_name TEXT NOT NULL,
    sender_role TEXT DEFAULT 'teacher',
    content TEXT NOT NULL,
    file_attachment JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.wajih_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can access wajih_messages" ON public.wajih_messages;
CREATE POLICY "Anyone can access wajih_messages" ON public.wajih_messages FOR ALL USING (true);


-- ==============================================================================
-- 7️⃣ الفضاء التشاركي لبنك الوثائق والتقويمات (wajih_documents)
-- رفع الوقفات التقويمية، الاختبارات الفصلية، الواجبات، والمشاريع باعتماد وتأشيرة تفتيشية
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- waqfah, ikhtibar, wajib, mashrou3, mudhakira, marji3
    subject TEXT DEFAULT 'اللغة العربية',
    level TEXT,
    period TEXT,
    description TEXT,
    school TEXT,
    author TEXT NOT NULL,
    author_username TEXT,
    author_role TEXT DEFAULT 'teacher',
    status TEXT DEFAULT 'pending', -- pending (قيد المراجعة), approved (معتمد تفتيشياً), rejected (مرفوض), revision (يحتاج تعديل)
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    file_url TEXT,
    file_data JSONB,
    accreditation_code TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    downloads INT DEFAULT 0,
    views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.wajih_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view wajih_documents" ON public.wajih_documents;
CREATE POLICY "Anyone can view wajih_documents" ON public.wajih_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_documents" ON public.wajih_documents;
CREATE POLICY "Anyone can insert wajih_documents" ON public.wajih_documents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update wajih_documents" ON public.wajih_documents;
CREATE POLICY "Anyone can update wajih_documents" ON public.wajih_documents FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete wajih_documents" ON public.wajih_documents;
CREATE POLICY "Anyone can delete wajih_documents" ON public.wajih_documents FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_wajih_docs_category ON public.wajih_documents (category);
CREATE INDEX IF NOT EXISTS idx_wajih_docs_status ON public.wajih_documents (status);
CREATE INDEX IF NOT EXISTS idx_wajih_docs_created ON public.wajih_documents (created_at DESC);


-- ==============================================================================
-- 9️⃣ جدول سجلات المعالجة البيداغوجية ورصد التعثرات (wajih_remedials)
-- يربط السجلات المضافة من الأساتذة مع لوحة التحكم التفتيشية مباشرة
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wajih_remedials (
    id TEXT PRIMARY KEY,
    school TEXT NOT NULL,
    teacher TEXT NOT NULL,
    teacher_username TEXT,
    sections TEXT DEFAULT '1م1',
    students_count INT DEFAULT 0,
    repeating_count INT DEFAULT 0,
    cat_c_count INT DEFAULT 0,
    cat_d_count INT DEFAULT 0,
    criteria_count INT DEFAULT 1,
    has_plan BOOLEAN DEFAULT false,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.wajih_remedials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view wajih_remedials" ON public.wajih_remedials;
CREATE POLICY "Anyone can view wajih_remedials" ON public.wajih_remedials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert wajih_remedials" ON public.wajih_remedials;
CREATE POLICY "Anyone can insert wajih_remedials" ON public.wajih_remedials FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update wajih_remedials" ON public.wajih_remedials;
CREATE POLICY "Anyone can update wajih_remedials" ON public.wajih_remedials FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete wajih_remedials" ON public.wajih_remedials;
CREATE POLICY "Anyone can delete wajih_remedials" ON public.wajih_remedials FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_wajih_remedials_created ON public.wajih_remedials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wajih_remedials_teacher ON public.wajih_remedials (teacher);
CREATE INDEX IF NOT EXISTS idx_wajih_remedials_school ON public.wajih_remedials (school);

-- بذر أولي لسجلات المعالجة لضمان ظهور السجلات لكافة الأساتذة في لوحة التحكم
INSERT INTO public.wajih_remedials (id, school, teacher, teacher_username, sections, students_count, repeating_count, cat_c_count, cat_d_count, criteria_count, has_plan, details)
VALUES 
    ('rem_001', 'متوسطة مصطفى فيلالي', 'مناصرية لمين', 'menasria', '2م1', 45, 3, 7, 10, 1, false, '{"field":"الأداء القرائي (خارج فترة الامتحان)","criteria":"احترام الوصل والفصل","level":"تحكم جزئي"}'::jsonb),
    ('rem_002', 'متوسطة خميسي الجندلي', 'عيساوي سعيدة', 'aissaoui', '1م6 - 1م7', 67, 5, 23, 16, 3, true, '{"field":"فهم المنطوق والمكتوب","criteria":"تحديد الفكرة العامة والنسق اللغوي","level":"تحكم جزئي"}'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- ✅ تم الانتهاء من بناء هيكل قاعدة البيانات والمخزن السحابي بنجاح!
-- الآن:
-- 1. افتح صفحة فحص الاختبارات (fahs-ikhtibar.html).
-- 2. افتح الفضاء التشاركي لبنك الوثائق والتقويمات (documents.html).
-- 3. ارفع أي وقفة تقويمية أو اختبار فصلي -> سيتم الحفظ والاعتماد التفتيشي بنجاح.
-- ==============================================================================
