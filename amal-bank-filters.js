/**
 * ============================================================
 * فلترة متقدمة في بنك الأنشطة
 * Advanced Filtering in Activity Bank
 * ============================================================
 */

class ActivityBankFilter {
    /**
     * تطبيق الفلاتر المتقدمة على جدول بنك الأنشطة
     * @param {Object} app - كائن التطبيق الرئيسي
     */
    static applyBankFilters(app) {
        const teacher = (document.getElementById('filterTeacher')?.value || '').trim();
        const subject = (document.getElementById('filterSubject')?.value || '').trim();
        const level = (document.getElementById('filterLevel')?.value || '').trim();
        const type = (document.getElementById('filterType')?.value || '').trim();

        const resultSpan = document.getElementById('bankFilterResult');

        // إعادة تصيير البنك أولاً
        app.renderBank();

        // التحقق من عدم وجود فلاتر مطبقة
        if (!teacher && !subject && !level && !type) {
            if (resultSpan) {
                resultSpan.innerHTML = '<i class="fas fa-info-circle"></i> لا فلتر مطبّق';
                resultSpan.style.background = '#fff';
                resultSpan.style.color = '#6c7a8d';
            }
            return;
        }

        // الحصول على جميع صفوف الجدول
        const rows = document.querySelectorAll('#bankTableBody tr');
        let visibleCount = 0;
        const totalRows = rows.length;

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 11) return;

            // استخراج البيانات من الخلايا
            const rowTeacher = (cells[10]?.textContent || '').toLowerCase().trim();
            const rowSubject = (cells[3]?.textContent || '').trim();
            const rowLevel = (cells[2]?.textContent || '').trim();
            const rowType = (cells[10]?.textContent || '').toLowerCase().trim();

            let matches = true;

            // تطبيق فلاتر المعلم
            if (teacher && !rowTeacher.includes(teacher.toLowerCase())) {
                matches = false;
            }

            // تطبيق فلتر المادة
            if (subject && rowSubject !== subject) {
                matches = false;
            }

            // تطبيق فلتر المستوى
            if (level && rowLevel !== level) {
                matches = false;
            }

            // تطبيق فلتر النوع (مشترك/نموذج/مستخلص)
            if (type) {
                if (type === 'shared' && !rowType.includes('مشترك')) {
                    matches = false;
                }
                if (type === 'model' && !rowType.includes('نموذج')) {
                    matches = false;
                }
                if (type === 'local' && !rowType.includes('مستخلص')) {
                    matches = false;
                }
            }

            // عرض أو إخفاء الصف
            row.style.display = matches ? '' : 'none';
            if (matches) visibleCount++;
        });

        // تحديث نص النتائج
        if (resultSpan) {
            if (visibleCount === 0) {
                resultSpan.innerHTML = '<i class="fas fa-exclamation-circle"></i> لا توجد نتائج';
                resultSpan.style.background = '#fdecea';
                resultSpan.style.color = 'var(--danger)';
            } else {
                resultSpan.innerHTML = `<i class="fas fa-filter"></i> ${visibleCount} نتيجة من ${totalRows}`;
                resultSpan.style.background = '#e6f4ea';
                resultSpan.style.color = 'var(--success)';
            }
        }
    }

    /**
     * مسح جميع الفلاتر المطبقة
     * @param {Object} app - كائن التطبيق الرئيسي
     */
    static clearBankFilters(app) {
        // مسح قيم الفلاتر
        const filterIds = ['filterTeacher', 'filterSubject', 'filterLevel', 'filterType'];
        filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
            }
        });

        // إعادة تعيين رسالة النتائج
        const resultSpan = document.getElementById('bankFilterResult');
        if (resultSpan) {
            resultSpan.innerHTML = '<i class="fas fa-info-circle"></i> لا فلتر مطبّق';
            resultSpan.style.background = '#fff';
            resultSpan.style.color = '#6c7a8d';
        }

        // إعادة تصيير البنك بدون فلاتر
        app.renderBank();
        showToast('تم مسح الفلاتر', 'info', 1500);
    }

    /**
     * ملء قائمة فلتر المعلمين بالأسماء المتاحة
     * @param {Object} store - كائن التخزين (Store)
     */
    static populateTeacherFilter(store) {
        const select = document.getElementById('filterTeacher');
        if (!select) return;

        // جمع أسماء المعلمين الفريدة
        const teachers = new Set();
        store.state.customActivities.forEach(activity => {
            if (activity.owner_name) {
                teachers.add(activity.owner_name);
            }
        });

        // حفظ القيمة الحالية
        const currentValue = select.value;

        // بناء خيارات القائمة
        select.innerHTML = '<option value="">👤 كل الأساتذة</option>' +
            Array.from(teachers)
                .sort()
                .map(name => `<option value="${sanitize(name)}">${sanitize(name)}</option>`)
                .join('');

        // استعادة القيمة السابقة إذا كانت موجودة
        if (currentValue && Array.from(teachers).includes(currentValue)) {
            select.value = currentValue;
        }
    }

    /**
     * ملء قائمة فلتر المواد بالمواد المتاحة
     * @param {Object} store - كائن التخزين (Store)
     */
    static populateSubjectFilter(store) {
        const select = document.getElementById('filterSubject');
        if (!select) return;

        // جمع المواد الفريدة
        const subjects = new Set();
        store.state.customActivities.forEach(activity => {
            if (activity.subject) {
                subjects.add(activity.subject);
            }
        });

        // حفظ القيمة الحالية
        const currentValue = select.value;

        // بناء خيارات القائمة
        select.innerHTML = '<option value="">📚 كل المواد</option>' +
            Array.from(subjects)
                .sort()
                .map(subject => `<option value="${sanitize(subject)}">${sanitize(subject)}</option>`)
                .join('');

        // استعادة القيمة السابقة
        if (currentValue && Array.from(subjects).includes(currentValue)) {
            select.value = currentValue;
        }
    }

    /**
     * ملء قائمة فلتر المستويات
     * @param {Object} store - كائن التخزين (Store)
     */
    static populateLevelFilter(store) {
        const select = document.getElementById('filterLevel');
        if (!select) return;

        // جمع المستويات الفريدة
        const levels = new Set();
        store.state.customActivities.forEach(activity => {
            if (activity.level) {
                levels.add(activity.level);
            }
        });

        // حفظ القيمة الحالية
        const currentValue = select.value;

        // بناء خيارات القائمة
        select.innerHTML = '<option value="">🎓 كل المستويات</option>' +
            Array.from(levels)
                .sort()
                .map(level => `<option value="${sanitize(level)}">${sanitize(level)}</option>`)
                .join('');

        // استعادة القيمة السابقة
        if (currentValue && Array.from(levels).includes(currentValue)) {
            select.value = currentValue;
        }
    }

    /**
     * الحصول على إحصائيات الفلترة
     * @returns {Object} إحصائيات الفلترة
     */
    static getFilterStatistics() {
        const stats = {
            total: 0,
            visible: 0,
            filtered: 0
        };

        const rows = document.querySelectorAll('#bankTableBody tr');
        stats.total = rows.length;
        stats.visible = Array.from(rows).filter(row => row.style.display !== 'none').length;
        stats.filtered = stats.total - stats.visible;

        return stats;
    }

    /**
     * تصدير نتائج الفلترة إلى CSV
     * @param {string} filename - اسم الملف المراد تصديره
     */
    static exportFilteredResults(filename = 'نتائج_الفلترة.csv') {
        const rows = document.querySelectorAll('#bankTableBody tr:not([style*="display: none"])');
        const headers = document.querySelectorAll('#bankTableBody thead th');

        let csv = '';

        // إضافة الرؤوس
        headers.forEach(header => {
            csv += `"${header.textContent}",`;
        });
        csv = csv.slice(0, -1) + '\n';

        // إضافة الصفوف المرئية
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                csv += `"${cell.textContent}",`;
            });
            csv = csv.slice(0, -1) + '\n';
        });

        // تحميل الملف
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);

        showToast(`تم تصدير ${rows.length} نتيجة`, 'success', 2000);
    }

    /**
     * إعادة تعيين الفلاتر والرجوع للعرض الكامل
     * @param {Object} app - كائن التطبيق الرئيسي
     */
    static resetFilters(app) {
        this.clearBankFilters(app);
    }
}

/**
 * دالة مساعدة لتنظيف النصوص
 * @param {string} text - النص المراد تنظيفه
 * @returns {string} النص المنظف
 */
function sanitize(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * دالة مساعدة لعرض الإشعارات
 * @param {string} message - رسالة الإشعار
 * @param {string} type - نوع الإشعار (success, error, info, warning)
 * @param {number} duration - مدة الإشعار بالميلي ثانية
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * إنشاء حاوية الإشعارات إذا لم تكن موجودة
 * @returns {HTMLElement} حاوية الإشعارات
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ربط الفئة مع الكائنات العالمية إذا لزم الأمر
if (typeof window !== 'undefined') {
    window.ActivityBankFilter = ActivityBankFilter;
}
