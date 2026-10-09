/* ============================================================
   إعدادات الاتصال بـ Supabase — منظومة الوجيه في الإشراف التربوي
   ============================================================ */
window.SUPABASE_CONFIG = {
    url: window.localStorage.getItem('supabase_custom_url') || "https://yzxyttieobyblznaehcl.supabase.co",
    anonKey: window.localStorage.getItem('supabase_custom_anon_key') || "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u"
};

window.PORTAL_CFG = {
    SUPABASE_URL: window.SUPABASE_CONFIG.url,
    SUPABASE_KEY: window.SUPABASE_CONFIG.anonKey,
    EMAIL_DOMAIN: "wajih-portal.dz",
    SHARED_KEYS: [
        "traitementData",
        "studentsRecords",
        "niqash_channels",
        "niqash_files",
        "niqash_messages"
    ],
    LABELS: {
        "traitementData": "سجلات المعالجة",
        "studentsRecords": "سجلات التلاميذ",
        "didactic_portal_segments": "المقاطع الديداكتيكية",
        "didactic_portal_memos": "المذكرات",
        "niqash_channels": "قنوات النقاش",
        "niqash_messages": "رسائل النقاش",
        "niqash_files": "ملفات النقاش",
        "app_state_amal": "الأعمال الموجهة",
        "learnerResults": "نتائج المتعلمين",
        "learnerQuizzes": "اختبارات المتعلمين",
        "integratedGlossary": "المعجم المدمج"
    },
    HIDE: /photo|logo|avatar|img|media/i
};
