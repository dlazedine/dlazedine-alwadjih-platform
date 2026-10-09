/* ============================================================
   portal-cloud.js — نواة الربط السحابي مع Supabase لمنظومة الوجيه
   ============================================================ */
(function() {
    'use strict';

    // تحميل مكتبة Supabase JS ديناميكياً إن لم تكن محملة
    function loadSupabaseScript() {
        return new Promise((resolve) => {
            if (window.supabase) return resolve(window.supabase);
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => resolve(window.supabase);
            script.onerror = () => {
                console.warn('تعذر تحميل مكتبة Supabase عبر CDN، جاري الاعتماد على التخزين المحلي الاحتياطي.');
                resolve(null);
            };
            document.head.appendChild(script);
        });
    }

    window.initPortalCloud = async function() {
        await loadSupabaseScript();
        const conf = window.SUPABASE_CONFIG || {
            url: "https://yzxyttieobyblznaehcl.supabase.co",
            anonKey: "sb_publishable_JE7zHZ97cZ92gUALD0II-w_j04eEo2u"
        };

        let client = null;
        if (window.supabase && conf.url && conf.anonKey) {
            try {
                client = window.supabase.createClient(conf.url, conf.anonKey);
            } catch (e) {
                console.warn('خطأ في تهيئة عميل Supabase:', e);
            }
        }
        return client;
    };
})();
