/* ============================================================
   session-manager.js — المصدر الوحيد للحقيقة في إدارة الجلسة
   الإصدار 3.0.0
   ============================================================ */
(function () {
  'use strict';

  const KEYS = {
    main: 'pgb_session',
    persistent: 'pgb_session_persistent',
    legacy: 'portal_session_v2',
    legacyPersistent: 'portal_session_v2_persistent',
    user: 'portalUser'
  };
  const DURATION = 24 * 60 * 60 * 1000;

  const DEFAULT_USERS = [
    { id: 'U001', username: 'inspector', password: 'inspector2026',
      fullName: 'درويش الهلالي', email: 'dlazedine68@gmail.com',
      role: 'inspector', school: 'المقاطعة الثانية — قسنطينة', active: true },
    { id: 'U002', username: 'teacher', password: 'teacher2026',
      fullName: 'أستاذ تجريبي', email: 'teacher@edu.dz',
      role: 'teacher', school: 'متوسطة قسنطينة', active: true },
    { id: 'U003', username: 'supervisor', password: 'supervisor2026',
      fullName: 'مشرف تربوي', email: 'supervisor@edu.dz',
      role: 'supervisor', school: 'مفتشية التعليم المتوسط', active: true },
    { id: 'U004', username: 'admin', password: 'admin2026',
      fullName: 'مدير المنظومة', email: 'admin@edu.dz',
      role: 'inspector', school: 'المفتشية العامة', active: true }
  ];

  function normalizeRole(role) {
    const r = String(role || '').trim().toLowerCase();
    if (r === 'inspector' || r === 'مفتش' || r === 'admin' || r === 'مدير') return 'inspector';
    if (r === 'supervisor' || r === 'مشرف' || r === 'مساعد مفتش') return 'supervisor';
    return 'teacher';
  }

  function getRoleLabelAr(role) {
    const r = normalizeRole(role);
    if (r === 'inspector') return 'مفتش';
    if (r === 'supervisor') return 'مشرف';
    return 'أستاذ(ة)';
  }

  function getAllUsers() {
    const users = [...DEFAULT_USERS];
    try {
      const dashUsers = JSON.parse(localStorage.getItem('dashboard_users') || '[]');
      dashUsers.forEach(du => {
        if (!du.username) return;
        const idx = users.findIndex(u => u.username.toLowerCase() === du.username.toLowerCase());
        const mapped = {
          id: du.id || 'U' + Date.now() + Math.random().toString(36).slice(2, 6),
          username: du.username,
          password: du.password || 'temp123',
          fullName: du.name || du.fullName || du.username,
          email: du.email || '',
          role: normalizeRole(du.role),
          school: du.school || '',
          active: du.status !== 'suspended' && du.active !== false
        };
        if (idx >= 0) users[idx] = { ...users[idx], ...mapped };
        else users.push(mapped);
      });
    } catch (e) { console.warn('getAllUsers error:', e); }
    return users;
  }

  function buildSession(user) {
    return {
      user: {
        id: user.id || 'u_' + Date.now(),
        username: user.username || '',
        fullName: user.fullName || user.name || user.username || 'مستخدم',
        email: user.email || '',
        role: normalizeRole(user.role),
        school: user.school || ''
      },
      startedAt: Date.now(),
      expiresAt: Date.now() + DURATION
    };
  }

  const Session = {
    save(user, persist = true) {
      const session = buildSession(user);
      const json = JSON.stringify(session);
      try {
        sessionStorage.setItem(KEYS.main, json);
        sessionStorage.setItem(KEYS.legacy, json);
        if (persist) {
          localStorage.setItem(KEYS.persistent, json);
          localStorage.setItem(KEYS.legacyPersistent, json);
        } else {
          localStorage.removeItem(KEYS.persistent);
          localStorage.removeItem(KEYS.legacyPersistent);
        }
        localStorage.setItem(KEYS.user, JSON.stringify({
          name: session.user.fullName,
          username: session.user.username,
          role: getRoleLabelAr(session.user.role),
          email: session.user.email,
          school: session.user.school
        }));
      } catch (e) { console.error('Session.save error:', e); }

      document.dispatchEvent(new CustomEvent('portal:login', {
        detail: { user: session.user }
      }));
      return session;
    },

    get() {
      try {
        const raw = sessionStorage.getItem(KEYS.main)
                  || localStorage.getItem(KEYS.persistent)
                  || sessionStorage.getItem(KEYS.legacy)
                  || localStorage.getItem(KEYS.legacyPersistent);
        if (raw) {
          const s = JSON.parse(raw);
          if (s && s.user) {
            if (Date.now() > s.expiresAt) { this.clear(); return null; }
            s.user.role = normalizeRole(s.user.role);
            return s.user;
          }
        }
        const legacyRaw = localStorage.getItem(KEYS.user);
        if (legacyRaw) {
          const old = JSON.parse(legacyRaw);
          const migrated = {
            username: old.username || 'user',
            fullName: old.name || old.username || 'مستخدم',
            email: old.email || '',
            role: normalizeRole(old.role),
            school: old.school || ''
          };
          this.save(migrated, true);
          return buildSession(migrated).user;
        }
        return null;
      } catch (e) { console.error('Session.get error:', e); return null; }
    },

    clear() {
      try {
        Object.values(KEYS).forEach(k => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('portal:logout'));
    },

    isLoggedIn() { return this.get() !== null; },
    isInspector() { const u = this.get(); return !!u && u.role === 'inspector'; },
    isSupervisor() { const u = this.get(); return !!u && (u.role === 'supervisor' || u.role === 'inspector'); },
    canManage() { const u = this.get(); return !!u && (u.role === 'inspector' || u.role === 'supervisor'); },
    isTeacher() { const u = this.get(); return !!u && u.role === 'teacher'; }
  };

  function login(username, password, persist = true) {
    if (!username || !password) {
      return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
    }
    const cleanUser = String(username).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const users = getAllUsers();
    const found = users.find(u =>
      u.username.toLowerCase() === cleanUser && u.password === cleanPass
    );
    if (!found) {
      return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }
    if (found.active === false) {
      return { success: false, error: 'هذا الحساب موقوف حالياً، يرجى مراجعة الإدارة.' };
    }
    Session.save(found, persist);

    try {
      const activity = JSON.parse(localStorage.getItem('dashboard_activity') || '[]');
      activity.unshift({
        id: 'A' + Date.now(),
        user: found.fullName || found.username,
        type: 'login',
        color: found.role === 'inspector' ? 'var(--gold)' : 'var(--teal)',
        icon: 'fa-sign-in-alt',
        text: `سجّل الدخول للمنظومة (${getRoleLabelAr(found.role)})`,
        time: new Date().toISOString()
      });
      localStorage.setItem('dashboard_activity', JSON.stringify(activity.slice(0, 200)));
    } catch (e) {}

    return { success: true, user: found };
  }

  function requireLogin(redirectTo = 'index.html') {
    if (!Session.isLoggedIn()) {
      try { sessionStorage.setItem('portal_redirect_after_login', window.location.pathname); } catch (e) {}
      window.location.replace(redirectTo);
      return false;
    }
    return true;
  }

  function requireInspector(redirectTo = 'index.html') {
    if (!Session.canManage()) {
      alert('هذه الصفحة مخصّصة للمفتش أو المشرف التربوي فقط.');
      window.location.replace(redirectTo);
      return false;
    }
    return true;
  }

  function requireTeacher(redirectTo = 'index.html') {
    if (!Session.isLoggedIn()) {
      window.location.replace(redirectTo);
      return false;
    }
    return true;
  }

  function consumeRedirect() {
    try {
      const url = sessionStorage.getItem('portal_redirect_after_login');
      sessionStorage.removeItem('portal_redirect_after_login');
      return url;
    } catch (e) { return null; }
  }

  window.PortalAuth = {
    Session,
    login,
    logout: (redirect) => {
      Session.clear();
      if (redirect) window.location.href = redirect;
    },
    getUser: () => Session.get(),
    isLoggedIn: () => Session.isLoggedIn(),
    isInspector: () => Session.isInspector(),
    isSupervisor: () => Session.isSupervisor(),
    canAccessInspectorTools: () => Session.canManage(),
    isTeacher: () => Session.isTeacher(),
    requireLogin,
    requireInspector,
    requireTeacher,
    getRoleLabel: getRoleLabelAr,
    consumeRedirect,
    getAllUsers,
    normalizeRole,
    SESSION_KEY: KEYS.main,
    VERSION: '3.0.0'
  };

  function fireReady() {
    document.dispatchEvent(new CustomEvent('portal:ready', {
      detail: { user: Session.get() }
    }));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireReady);
  } else {
    fireReady();
  }

  console.log('✅ session-manager.js v3.0.0 — جاهز');
})();