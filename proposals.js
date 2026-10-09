/* ============================================================
   دراسة المقترحات والاستبيانات التربوية — المنطق التفاعلي الموحّد
   المقاطعة الثانية قسنطينة — إشراف المفتش درويش الهلالي
   ============================================================ */

const LS_PR_SURVEYS    = 'proposals_surveys';
const LS_PR_RESPONSES  = 'proposals_responses';

let prState = {
    surveys: [],
    responses: [],
    currentSurvey: null,
    currentAnswers: {},
    builderQuestions: []
};

const DEFAULT_SURVEYS = [
    {
        id: 'S001',
        title: 'استبيان تقويم أثر المعالجة البيداغوجية والأنشطة الفارقية',
        category: 'moualaja',
        description: 'استبيان موجّه لأساتذة المقاطعة الثانية لدراسة الأثر الميداني لجلسات المعالجة البيداغوجية وتطوير بنك الأنشطة الفارقية وحصص الأعمال الموجهة.',
        status: 'open',
        deadline: null,
        createdAt: '2026-02-01T09:00:00Z',
        createdBy: 'المفتش درويش الهلالي',
        questions: [
            { id: 'q1', text: 'كيف تقيّم نجاعة تشخيص التعثرات القرائية في بداية الفصل الدراسي؟', type: 'scale', required: true },
            { id: 'q2', text: 'ما أهم العوائق الميدانية التي تواجه تطبيق المعالجة الصفية؟', type: 'multiple', required: true,
              options: ['كثافة الفوج التربوي', 'ضيق الحيز الزمني للحصة', 'نقص السندات المكيفة', 'صعوبة تشخيص الفروق الفردية'] },
            { id: 'q3', text: 'هل أسهم بنك الأنشطة المشترك في تيسير حصص الدعم والتفويج؟', type: 'yesno', required: true },
            { id: 'q4', text: 'مقترحات عملية لتطوير أدوات التقويم التكويني والخطط العلاجية:', type: 'text', required: false }
        ]
    },
    {
        id: 'S002',
        title: 'استطلاع آراء حول هندسة المقاطع التعلمية ومستويات الفهم القرائي الخمسة',
        category: 'arabic',
        description: 'رصد الممارسات الصفية في بناء المقاطع والمذكرات وتوليد الأسئلة القرائية وفق شبكة مستويات الفهم الخمسة بمناهج الجيل الثاني.',
        status: 'open',
        deadline: null,
        createdAt: '2026-03-01T10:00:00Z',
        createdBy: 'المفتش درويش الهلالي',
        questions: [
            { id: 'q1', text: 'ما مدى ملاءمة شبكة مستويات الفهم القرائي الخمسة لنصوص المنهاج؟', type: 'scale', required: true },
            { id: 'q2', text: 'أي الميادين يحتاج إلى تدعيم أكبر بنماذج مذكرات جاهزة وتوجيهات ديداكتيكية؟', type: 'multiple', required: true,
              options: ['فهم المنطوق وإنتاجه', 'فهم المكتوب (قراءة ودراسة نص)', 'فهم المكتوب (ظواهر لغوية)', 'الإنتاج الكتابي والتعبير'] },
            { id: 'q3', text: 'هل ساعدتك بوابة تعليمية العربية في تجويد صياغة الوضعيات المشكلة الأم؟', type: 'yesno', required: true },
            { id: 'q4', text: 'رأيكم ومقترحاتكم لتطوير مصمم المذكرات البيداغوجية بالبوابة:', type: 'text', required: false }
        ]
    },
    {
        id: 'S003',
        title: 'استبيان فحص ومطابقة الوقفات التقويمية والاختبارات المدرسية',
        category: 'fahss',
        description: 'استقصاء حول معايير بناء مواضيع الاختبارات والفروض، ومطابقة شبكة تقويم الموارد (12 نقطة) والوضعية الإدماجية (8 نقاط) مع المنشورات التفتيشية.',
        status: 'open',
        deadline: null,
        createdAt: '2026-03-15T08:30:00Z',
        createdBy: 'المفتش درويش الهلالي',
        questions: [
            { id: 'q1', text: 'ما مدى وضوح شبكة فحص الاختبارات المعيارية المقترحة من طرف التفتيش؟', type: 'scale', required: true },
            { id: 'q2', text: 'ما الصعوبة الأبرز في بناء الوضعية الإدماجية التقويمية المركبة؟', type: 'multiple', required: true,
              options: ['انتقاء السند الدال والسياق الواقعي', 'صياغة تعليمة محددة بدقة', 'ملاءمة المعايير الأربعة (الوجاهة، الانسجام، السلامة، الإتقان)', 'احترام الحجم والزمن المحدد'] },
            { id: 'q3', text: 'هل تود اعتماد بطاقة فحص الاختبارات كأداة تدقيق ذاتي قبل طبع المواضيع؟', type: 'yesno', required: true },
            { id: 'q4', text: 'مقترحاتك لتحسين جودة الأسئلة والتقويمات بالمقاطعة:', type: 'text', required: false }
        ]
    },
    {
        id: 'S004',
        title: 'مقترحات ترقية وتطوير المنظومة الرقمية الشاملة للمقاطعة الثانية',
        category: 'general',
        description: 'شاركنا برأيك واقتراحاتك حول الميزات الإضافية التي ترغب في توفرها بالمنظومة (بنك الأسئلة، فضاءات التواصل، أدوات الذكاء الاصطناعي المساندة).',
        status: 'open',
        deadline: null,
        createdAt: '2026-03-25T11:00:00Z',
        createdBy: 'المفتش درويش الهلالي',
        questions: [
            { id: 'q1', text: 'ما هو تقييمك العام لسهولة استخدام البوابة وتكامل أدواتها؟', type: 'scale', required: true },
            { id: 'q2', text: 'ما هي الإضافة التي تراها الأكثر إلحاحاً لتطوير الممارسة المهنية؟', type: 'multiple', required: true,
              options: ['تطبيق هاتف ذكي أوفلاين', 'بنك نماذج اختبارات محلولة بالمقاطعة', 'غرفة ندوات افتراضية مصورة', 'مساعد ذكي لتوليد الأنشطة القرائية'] },
            { id: 'q3', text: 'هل تعتمد على البوابة في تحضيرك وتخطيطك الأسبوعي؟', type: 'yesno', required: true },
            { id: 'q4', text: 'رسالة أو مقترح حر توجهه للمفتشية التربوية بالمقاطعة الثانية:', type: 'text', required: false }
        ]
    }
];

function getCurrentUser() {
    if (window.PortalAuth && typeof PortalAuth.getUser === 'function') {
        const u = PortalAuth.getUser();
        if (u) {
            return {
                name: u.fullName || u.username,
                role: u.role || 'teacher',
                school: u.school || 'المقاطعة الثانية قسنطينة'
            };
        }
    }
    return { name: 'أستاذ ممارس', role: 'teacher', school: 'المقاطعة الثانية' };
}

function canManageSurveys() {
    if (window.PortalAuth && typeof PortalAuth.canAccessInspectorTools === 'function') {
        return PortalAuth.canAccessInspectorTools();
    }
    const u = getCurrentUser();
    return u.role === 'inspector' || u.role === 'supervisor' || u.role === 'admin';
}

function prLoad() {
    try {
        const storedSurveys = localStorage.getItem(LS_PR_SURVEYS);
        if (storedSurveys) {
            prState.surveys = JSON.parse(storedSurveys);
        } else {
            prState.surveys = [...DEFAULT_SURVEYS];
            prSaveSurveys();
        }
    } catch(e) {
        prState.surveys = [...DEFAULT_SURVEYS];
    }

    try {
        prState.responses = JSON.parse(localStorage.getItem(LS_PR_RESPONSES) || '[]');
    } catch(e) {
        prState.responses = [];
    }
}

function prSaveSurveys() {
    try {
        localStorage.setItem(LS_PR_SURVEYS, JSON.stringify(prState.surveys));
    } catch(e) {}
}

function prSaveResponses() {
    try {
        localStorage.setItem(LS_PR_RESPONSES, JSON.stringify(prState.responses));
    } catch(e) {}
}

function switchPr(tabId) {
    document.querySelectorAll('.pt-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.pr-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabId));
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'surveys') renderSurveys();
    if (tabId === 'mine') renderMine();
    if (tabId === 'results') { fillResultsSelector(); renderResults(); }
    if (tabId === 'builder') renderManagerSurveys();
}

function applyPermissions() {
    const user = getCurrentUser();
    const canManage = canManageSurveys();

    // User greeting & role badge
    const nameEl = document.getElementById('userGreetName');
    const roleEl = document.getElementById('userGreetRole');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) {
        const roleLabel = (user.role === 'inspector' || user.role === 'مفتش') ? 'مفتش' :
                          (user.role === 'supervisor' || user.role === 'مشرف') ? 'مشرف تربوي' : 'أستاذ';
        roleEl.textContent = roleLabel;
    }

    // Header restricted links
    const dLink = document.getElementById('dashTopLink');
    const tLink = document.getElementById('taqyimTopLink');
    if (dLink) dLink.style.display = canManage ? 'inline-flex' : 'none';
    if (tLink) tLink.style.display = canManage ? 'inline-flex' : 'none';

    // Builder tab
    const btnB = document.getElementById('builderTabBtn');
    if (btnB) btnB.style.display = canManage ? 'inline-flex' : 'none';
}

function renderSurveys() {
    const grid = document.getElementById('surveysGrid');
    if (!grid) return;
    const me = getCurrentUser();

    grid.innerHTML = prState.surveys.map((s) => {
        const done = prState.responses.some(r => r.surveyId === s.id && r.respondent === me.name);
        const isOpen = s.status === 'open';
        const qCount = s.questions ? s.questions.length : 0;
        const totalResp = prState.responses.filter(r => r.surveyId === s.id).length;

        return `
            <div class="survey-card" style="--sc-color: var(--moss);">
                <div class="sc-top">
                    <div class="sc-icon-wrap"><i class="fas fa-clipboard-list"></i></div>
                    <span class="sc-status ${isOpen ? 'open' : 'closed'}">${isOpen ? 'مفتوح للمشاركة' : 'مغلق'}</span>
                </div>
                <div class="sc-title">${escapeHtml(s.title)}</div>
                <div class="sc-desc">${escapeHtml(s.description)}</div>
                <div class="sc-meta">
                    <span><i class="fas fa-question-circle"></i> ${qCount} أسئلة</span>
                    <span><i class="fas fa-users"></i> ${totalResp} مشاركة</span>
                    <span><i class="fas fa-user-pen"></i> تأطير: ${escapeHtml(s.createdBy || 'المفتش درويش الهلالي')}</span>
                </div>
                <div class="sc-actions">
                    ${done ? `<span class="sc-done-badge"><i class="fas fa-check-circle"></i> تم إرسال مشاركتكم بنجاح</span>` :
                             (isOpen ? `<button class="btn btn-primary" onclick="openAnswer('${s.id}')"><i class="fas fa-pen-to-square"></i> شارك الآن</button>` :
                                       `<span style="color:#888; font-size:12px; font-weight:700;"><i class="fas fa-lock"></i> الاستبيان مغلق حالياً</span>`)}
                </div>
            </div>
        `;
    }).join('');
}

function openAnswer(surveyId) {
    const survey = prState.surveys.find(s => s.id === surveyId);
    if (!survey) return;
    prState.currentSurvey = survey;
    prState.currentAnswers = {};

    document.getElementById('amTitle').textContent = survey.title;
    document.getElementById('amSubtitle').textContent = survey.description;

    const body = document.getElementById('amBody');
    body.innerHTML = survey.questions.map((q, i) => `
        <div class="answer-question">
            <div class="aq-header">
                <span class="aq-num">${i + 1}</span>
                <span class="aq-text">${escapeHtml(q.text)} ${q.required ? '<span style="color:var(--danger)">*</span>' : ''}</span>
            </div>
            ${renderQuestionControl(q)}
        </div>
    `).join('');

    document.getElementById('answerModal').classList.add('open');
}

function renderQuestionControl(q) {
    if (q.type === 'scale') {
        return `
            <div class="aq-scale">
                ${[1, 2, 3, 4, 5].map(n => `
                    <label class="aq-scale-option">
                        <input type="radio" name="${q.id}" value="${n}" onchange="prState.currentAnswers['${q.id}'] = ${n}">
                        <span class="aq-scale-num">${n}</span>
                        <span style="font-size:10px; font-weight:700;">${['ضعيف', 'متوسط', 'جيد', 'جيد جداً', 'ممتاز'][n-1]}</span>
                    </label>
                `).join('')}
            </div>
        `;
    }
    if (q.type === 'yesno') {
        return `
            <div class="aq-options">
                <label class="aq-option"><input type="radio" name="${q.id}" value="نعم" onchange="prState.currentAnswers['${q.id}'] = 'نعم'"> نعم، بالتأكيد</label>
                <label class="aq-option"><input type="radio" name="${q.id}" value="لا" onchange="prState.currentAnswers['${q.id}'] = 'لا'"> لا، يحتاج إلى مراجعة</label>
            </div>
        `;
    }
    if (q.type === 'multiple') {
        return `
            <div class="aq-options">
                ${(q.options || []).map(opt => `
                    <label class="aq-option"><input type="checkbox" onchange="handleCheckboxAnswer('${q.id}', '${escapeAttr(opt)}', this.checked)"> ${escapeHtml(opt)}</label>
                `).join('')}
            </div>
        `;
    }
    return `<textarea class="field" style="width:100%; min-height:80px; padding:10px; border-radius:8px; border:1px solid var(--line); font-family:inherit; font-size:13px;" placeholder="اكتب اقتراحك الميداني المفصل هنا..." oninput="prState.currentAnswers['${q.id}'] = this.value"></textarea>`;
}

function handleCheckboxAnswer(qId, val, checked) {
    if (!prState.currentAnswers[qId] || !Array.isArray(prState.currentAnswers[qId])) {
        prState.currentAnswers[qId] = [];
    }
    if (checked) {
        if (!prState.currentAnswers[qId].includes(val)) prState.currentAnswers[qId].push(val);
    } else {
        prState.currentAnswers[qId] = prState.currentAnswers[qId].filter(v => v !== val);
    }
}

function closeAnswerModal() {
    document.getElementById('answerModal')?.classList.remove('open');
}

function submitAnswer() {
    if (!prState.currentSurvey) return;
    const survey = prState.currentSurvey;

    // Validate required questions
    for (let q of survey.questions) {
        if (q.required) {
            const ans = prState.currentAnswers[q.id];
            if (ans === undefined || ans === null || ans === '' || (Array.isArray(ans) && ans.length === 0)) {
                alert(`يرجى الإجابة عن السؤال المطلوب رقم: "${q.text}"`);
                return;
            }
        }
    }

    const me = getCurrentUser();
    const newResponse = {
        id: 'r_' + Date.now(),
        surveyId: survey.id,
        surveyTitle: survey.title,
        respondent: me.name,
        role: me.role,
        school: me.school,
        answers: { ...prState.currentAnswers },
        date: new Date().toISOString()
    };

    prState.responses.push(newResponse);
    prSaveResponses();

    // Log to dashboard live activity feed
    try {
        const feed = JSON.parse(localStorage.getItem('portal_activity_feed') || '[]');
        feed.unshift({
            id: 'act_' + Date.now(),
            user: me.name,
            role: me.role,
            action: 'مشاركة في استبيان',
            details: `سجل استجابة على: "${survey.title}"`,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('portal_activity_feed', JSON.stringify(feed.slice(0, 50)));
    } catch(e) {}

    closeAnswerModal();
    renderSurveys();
    updateStats();
    alert('✅ شكراً لمشاركتكم البيداغوجية القيمة! تم تسجيل إجاباتكم بنجاح.');
}

function renderMine() {
    const me = getCurrentUser();
    const mine = prState.responses.filter(r => r.respondent === me.name);
    const grid = document.getElementById('mineGrid');
    const empty = document.getElementById('mineEmpty');
    if (!grid) return;

    if (!mine.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = mine.map(r => `
        <div class="mine-card" style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="color:var(--moss-dark); font-size:15px; font-weight:800;"><i class="fas fa-check-circle" style="color:var(--moss);"></i> ${escapeHtml(r.surveyTitle || 'مشاركة مسجلة')}</h4>
                <span style="font-size:11px; background:#eef4e8; color:var(--moss-dark); padding:3px 8px; border-radius:10px; font-weight:700;">مؤكدة</span>
            </div>
            <p style="font-size:12px; color:#6b7280;">تاريخ التسجيل: ${new Date(r.date).toLocaleString('ar-DZ')}</p>
        </div>
    `).join('');
}

function fillResultsSelector() {
    const sel = document.getElementById('resultsSurveySelect');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = prState.surveys.map(s => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('');
    if (currentVal && prState.surveys.some(s => s.id === currentVal)) {
        sel.value = currentVal;
    }
}

function renderResults() {
    const surveyId = document.getElementById('resultsSurveySelect')?.value || prState.surveys[0]?.id;
    const cont = document.getElementById('resultsContent');
    if (!cont || !surveyId) return;

    const s = prState.surveys.find(x => x.id === surveyId);
    if (!s) return;
    const resps = prState.responses.filter(r => r.surveyId === surveyId);

    cont.innerHTML = `
        <div style="background:#fff; padding:22px; border-radius:14px; border:1.5px solid var(--line); box-shadow:0 4px 14px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid var(--line); padding-bottom:12px;">
                <div>
                    <h3 style="color:var(--moss-dark); font-size:18px; font-weight:800; margin-bottom:4px;">${escapeHtml(s.title)}</h3>
                    <p style="font-size:12.5px; color:#5b6f82;">${escapeHtml(s.description)}</p>
                </div>
                <div style="background:#f4f8f0; border:1px solid var(--moss); padding:6px 14px; border-radius:20px; font-size:13px; font-weight:700; color:var(--moss-dark);">
                    <i class="fas fa-users"></i> إجمالي المشاركات: <strong>${resps.length}</strong> مشاركة
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:16px;">
                ${s.questions.map((q, idx) => {
                    const answersForQ = resps.map(r => r.answers[q.id]).filter(a => a !== undefined);
                    return `
                        <div style="background:#faf8f2; border:1px solid var(--line); border-radius:10px; padding:14px;">
                            <div style="font-weight:700; font-size:13.5px; color:var(--ink); margin-bottom:10px;">
                                <span style="background:var(--moss); color:#fff; width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-size:12px; margin-left:6px;">${idx+1}</span>
                                ${escapeHtml(q.text)}
                            </div>
                            ${renderQuestionAggregate(q, answersForQ)}
                        </div>
                    `;
                }).join('')}
            </div>

            <div style="font-size:13px; color:var(--moss-dark); background:#f4f8f0; padding:14px; border-radius:10px; margin-top:20px; border-right:4px solid var(--moss);">
                <i class="fas fa-lightbulb"></i> <strong>التوجيه التفتيشي:</strong> يتم استثمار وتفريغ كافة المقترحات دورياً ضمن جلسات التنسيق التفتيشي للمقاطعة الثانية بقسنطينة، وتؤخذ بعين الاعتبار في تصميم الندوات التربوية وبنك الأنشطة.
            </div>
        </div>
    `;
}

function renderQuestionAggregate(q, answers) {
    if (!answers.length) {
        return `<div style="font-size:12px; color:#888;">لم تُسجل أي إجابات لهذا السؤال حتى الآن.</div>`;
    }

    if (q.type === 'scale') {
        const sum = answers.reduce((a, b) => a + (+b || 0), 0);
        const avg = (sum / answers.length).toFixed(1);
        const pct = Math.round((avg / 5) * 100);
        return `
            <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; font-weight:700;">
                    <span>المتوسط الحسابي: <strong>${avg} / 5</strong> (${pct}%)</span>
                    <span>عدد المقيمين: ${answers.length}</span>
                </div>
                <div style="height:10px; background:#e0e0e0; border-radius:5px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--moss), var(--gold));"></div>
                </div>
            </div>
        `;
    }

    if (q.type === 'yesno') {
        const yesCount = answers.filter(a => a === 'نعم').length;
        const noCount = answers.filter(a => a === 'لا').length;
        const yesPct = Math.round((yesCount / answers.length) * 100);
        const noPct = 100 - yesPct;
        return `
            <div style="display:flex; gap:16px; font-size:12.5px; font-weight:700;">
                <div style="color:var(--moss-dark);">نعم: ${yesCount} (${yesPct}%)</div>
                <div style="color:var(--danger);">لا: ${noCount} (${noPct}%)</div>
            </div>
        `;
    }

    if (q.type === 'multiple') {
        const counts = {};
        answers.forEach(arr => {
            if (Array.isArray(arr)) {
                arr.forEach(opt => { counts[opt] = (counts[opt] || 0) + 1; });
            } else if (arr) {
                counts[arr] = (counts[arr] || 0) + 1;
            }
        });
        return `
            <div style="display:flex; flex-direction:column; gap:6px;">
                ${Object.entries(counts).map(([opt, cnt]) => {
                    const pct = Math.round((cnt / answers.length) * 100);
                    return `
                        <div style="font-size:12px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                <span>${escapeHtml(opt)}</span>
                                <span style="font-weight:700;">${cnt} (${pct}%)</span>
                            </div>
                            <div style="height:6px; background:#e0e0e0; border-radius:3px; overflow:hidden;">
                                <div style="width:${pct}%; height:100%; background:var(--moss);"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Text / open proposals
    return `
        <div style="max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
            ${answers.map(ans => `
                <div style="background:#fff; border:1px solid #e2e5e8; padding:8px 12px; border-radius:6px; font-size:12px; color:#333;">
                    ${escapeHtml(ans)}
                </div>
            `).join('')}
        </div>
    `;
}

/* ---------- إدارة منشئ الاستبيانات (للمفتش) ---------- */
function addQuestionPrompt() {
    const qText = prompt('أدخل نص السؤال الجديد:');
    if (!qText || !qText.trim()) return;

    const qType = prompt('اختر نوع السؤال:\n1: مقياس من 1 إلى 5 (scale)\n2: نعم / لا (yesno)\n3: اختيارات متعددة (multiple)\n4: نص مقترح حر (text)', '1');
    let type = 'scale';
    let options = null;

    if (qType === '2') type = 'yesno';
    else if (qType === '3') {
        type = 'multiple';
        const optsRaw = prompt('أدخل الخيارات مفصولة بفاصلة (مثال: خيار 1, خيار 2, خيار 3):');
        options = (optsRaw || '').split(',').map(x => x.trim()).filter(Boolean);
        if (!options.length) options = ['خيار أ', 'خيار ب'];
    } else if (qType === '4') type = 'text';

    prState.builderQuestions.push({
        id: 'q_' + Date.now(),
        text: qText.trim(),
        type: type,
        options: options,
        required: true
    });

    renderBuilderQuestions();
}

function renderBuilderQuestions() {
    const countEl = document.getElementById('builderQCount');
    const listEl = document.getElementById('builderQuestionsList');
    if (countEl) countEl.textContent = prState.builderQuestions.length;
    if (!listEl) return;

    if (!prState.builderQuestions.length) {
        listEl.innerHTML = `<p style="font-size:12px; color:#888;">لم تتم إضافة أسئلة بعد. انقر على "إضافة سؤال" أعلاه.</p>`;
        return;
    }

    listEl.innerHTML = prState.builderQuestions.map((q, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--line); border-radius:8px; padding:8px 12px; font-size:12.5px;">
            <div>
                <strong>${idx + 1}.</strong> ${escapeHtml(q.text)}
                <span style="font-size:11px; color:#888; margin-right:6px;">(${q.type})</span>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeBuilderQuestion(${idx})">✕</button>
        </div>
    `).join('');
}

function removeBuilderQuestion(idx) {
    prState.builderQuestions.splice(idx, 1);
    renderBuilderQuestions();
}

function resetSurveyBuilder() {
    document.getElementById('newSurveyTitle').value = '';
    document.getElementById('newSurveyDesc').value = '';
    prState.builderQuestions = [];
    renderBuilderQuestions();
}

function handleCreateSurvey(e) {
    e.preventDefault();
    const title = document.getElementById('newSurveyTitle')?.value.trim();
    const desc = document.getElementById('newSurveyDesc')?.value.trim();
    const category = document.getElementById('newSurveyCategory')?.value || 'general';

    if (!title || !desc) {
        alert('يرجى إكمال عنوان ووصف الاستبيان.');
        return false;
    }

    if (!prState.builderQuestions.length) {
        alert('يرجى إضافة سؤال واحد على الأقل للاستبيان.');
        return false;
    }

    const me = getCurrentUser();
    const newSurvey = {
        id: 'S_' + Date.now(),
        title: title,
        description: desc,
        category: category,
        status: 'open',
        deadline: null,
        createdAt: new Date().toISOString(),
        createdBy: me.name,
        questions: [...prState.builderQuestions]
    };

    prState.surveys.unshift(newSurvey);
    prSaveSurveys();
    resetSurveyBuilder();
    renderSurveys();
    updateStats();
    fillResultsSelector();
    renderManagerSurveys();

    alert('🎉 تم نشر الاستبيان التربوي الجديد بنجاح وإتاحته لأساتذة المقاطعة!');
    switchPr('surveys');
    return false;
}

function renderManagerSurveys() {
    const list = document.getElementById('managerSurveysList');
    if (!list) return;

    list.innerHTML = prState.surveys.map(s => {
        const respCount = prState.responses.filter(r => r.surveyId === s.id).length;
        const isOpen = s.status === 'open';
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--line); padding:10px 0; font-size:13px; flex-wrap:wrap; gap:8px;">
                <div>
                    <strong>${escapeHtml(s.title)}</strong>
                    <div style="font-size:11px; color:#888;">${s.questions.length} أسئلة | ${respCount} مشاركة مسجلة</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn btn-outline btn-sm" onclick="toggleSurveyStatus('${s.id}')">
                        ${isOpen ? 'إغلاق الاستبيان' : 'فتح الاستبيان'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSurvey('${s.id}')">حذف</button>
                </div>
            </div>
        `;
    }).join('');
}

function toggleSurveyStatus(surveyId) {
    const s = prState.surveys.find(x => x.id === surveyId);
    if (!s) return;
    s.status = s.status === 'open' ? 'closed' : 'open';
    prSaveSurveys();
    renderSurveys();
    renderManagerSurveys();
}

function deleteSurvey(surveyId) {
    if (!confirm('هل أنت متأكد من حذف هذا الاستبيان وكافة إجاباته؟')) return;
    prState.surveys = prState.surveys.filter(x => x.id !== surveyId);
    prState.responses = prState.responses.filter(r => r.surveyId !== surveyId);
    prSaveSurveys();
    prSaveResponses();
    renderSurveys();
    updateStats();
    fillResultsSelector();
    renderManagerSurveys();
}

function exportCurrentSurveyExcel() {
    const surveyId = document.getElementById('resultsSurveySelect')?.value;
    if (!surveyId) { alert('يرجى اختيار استبيان أولاً'); return; }
    const s = prState.surveys.find(x => x.id === surveyId);
    const resps = prState.responses.filter(r => r.surveyId === surveyId);

    if (!resps.length) {
        alert('لا توجد مشاركات مسجلة لهذا الاستبيان حتى الآن.');
        return;
    }

    const rows = resps.map((r, i) => {
        const row = {
            'رقم': i + 1,
            'الأستاذ': r.respondent,
            'الدور': r.role,
            'المؤسسة': r.school,
            'التاريخ': new Date(r.date).toLocaleDateString('ar-DZ')
        };
        s.questions.forEach((q, qIdx) => {
            const ans = r.answers[q.id];
            row[`س${qIdx+1}: ${q.text}`] = Array.isArray(ans) ? ans.join('; ') : (ans || '');
        });
        return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'المشاركات');
    XLSX.writeFile(wb, `استبيان_${s.title.slice(0, 20)}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function updateStats() {
    const elS = document.getElementById('prStatSurveys');
    const elR = document.getElementById('prStatResponses');
    const elM = document.getElementById('prStatMine');
    if (elS) elS.textContent = prState.surveys.filter(s => s.status === 'open').length;
    if (elR) elR.textContent = prState.responses.length;
    const me = getCurrentUser();
    const mineCount = prState.responses.filter(r => r.respondent === me.name).length;
    if (elM) elM.textContent = mineCount;
}

function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s); }

document.addEventListener('DOMContentLoaded', () => {
    prLoad();
    applyPermissions();
    renderSurveys();
    updateStats();
    fillResultsSelector();
    renderResults();
});

// React to cross-tab login/logout events
window.addEventListener('storage', (e) => {
    if (e.key === 'pgb_session' || e.key === 'pgb_session_persistent' || e.key === 'portalUser') {
        applyPermissions();
        renderSurveys();
        updateStats();
    }
});
