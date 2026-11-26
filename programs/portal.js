/* ===== بوابة البرامج — مشكاة =====
   الدخول برمز يتحقق منه الخادم (Supabase)، والملفات في مخزن خاص لا يُفتح إلا لجلسة صالحة. */
(function () {
  'use strict';
  const SB_URL = 'https://uakmtakkctlkjvuityug.supabase.co';
  const SB_KEY = 'sb_publishable_qHWTZdtAJgTlYMmYuGq2mA_6nE8nX-J'; // مفتاح عام بطبيعته؛ الحماية في دوال القاعدة وسياسات التخزين
  const BUCKET = 'programs';
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2400); };
  const loading = t => { app.innerHTML = '<div class="loading"><div class="spin"></div>' + esc(t || 'جارٍ التحميل…') + '</div>'; };

  /* ---------- الاتصال بالخادم (أو محاكاة محلية للاختبار على localhost فقط) ---------- */
  const MOCK = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]mock/.test(location.search);
  let sb = null;
  function client() {
    if (sb) return sb;
    if (MOCK) return (sb = mockClient());
    if (!window.supabase || !window.supabase.createClient) throw new Error('تعذر تحميل مكتبة الاتصال. تحقق من الإنترنت ثم حدّث الصفحة.');
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'mk-portal', persistSession: true, autoRefreshToken: true } });
    return sb;
  }
  async function rpc(name, args) {
    const { data, error } = await client().rpc(name, args || {});
    if (error) throw new Error(error.message);
    return data;
  }
  async function signedUrl(key, downloadName) {
    const opts = downloadName ? { download: downloadName } : undefined;
    const { data, error } = await client().storage.from(BUCKET).createSignedUrl(key, 600, opts);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }
  function log(action, item, detail) { rpc('portal_log', { p_action: action, p_item: item || null, p_detail: detail || null }).catch(() => {}); }

  /* ---------- الحالة ---------- */
  const S = { name: '', content: null, prog: null, deg: 'master' };

  async function boot() {
    loading('جارٍ فتح بوابة البرامج…');
    try {
      const visible = await rpc('portal_status');
      if (!visible) return renderClosed();
      const { data: { session } } = await client().auth.getSession();
      if (session) {
        const me = await rpc('portal_me');
        if (me && me.ok) { S.name = me.name; return afterLogin(); }
      }
      renderGate();
    } catch (e) {
      // قبل إعداد قاعدة البيانات (أو أي تعذر في معرفة الحالة) تُعرض البوابة كأنها مغلقة
      if (/portal_status|schema cache|does not exist/i.test(e.message || '')) return renderClosed();
      renderError(e);
    }
  }

  function renderClosed() {
    setHeader(false);
    app.innerHTML = '<div class="gate"><h2>بوابة البرامج</h2><p>البوابة غير متاحة حالياً.</p><a class="btn" href="../">العودة إلى موقع مشكاة</a></div>';
  }
  function renderError(e) {
    app.innerHTML = '<div class="gate"><h2>بوابة البرامج</h2><div class="err">' + esc(e.message || e) + '</div><button class="btn" onclick="location.reload()">إعادة المحاولة</button></div>';
  }
  function setHeader(on) {
    $('#who').hidden = !on; $('#outBtn').hidden = !on; $('#homeBtn').hidden = !on;
    if (on) $('#who').textContent = 'مرحباً، ' + S.name;
  }

  function renderGate(msg) {
    setHeader(false);
    app.innerHTML = '<form class="gate" id="gate" autocomplete="off"><h2>بوابة البرامج</h2>' +
      '<p>أدخل رمز الدخول الذي وصلك للاطلاع على البرامج والملفات.</p>' +
      (msg ? '<div class="err">' + esc(msg) + '</div>' : '') +
      '<input id="code" inputmode="text" maxlength="40" placeholder="رمز الدخول" aria-label="رمز الدخول" required>' +
      '<button class="btn" id="go">دخول</button><p class="note">يُسجَّل الدخول والنشاط داخل البوابة لأغراض المتابعة.</p></form>';
    const code = $('#code'); code.focus();
    $('#gate').onsubmit = async e => {
      e.preventDefault();
      const v = code.value.trim(); if (!v) return;
      const btn = $('#go'); btn.disabled = true; btn.textContent = 'جارٍ التحقق…';
      try {
        const c = client();
        let { data: { session } } = await c.auth.getSession();
        if (!session) {
          const r = await c.auth.signInAnonymously();
          if (r.error) throw new Error(r.error.message.includes('Anonymous') ? 'خاصية الدخول المؤقت غير مفعّلة في الخادم بعد. أبلغ مدير مشكاة.' : r.error.message);
        }
        const res = await rpc('portal_login', { p_code: v, p_ua: navigator.userAgent });
        if (res && res.ok) { S.name = res.name; return afterLogin(); }
        const why = res && res.reason;
        renderGate(why === 'locked' ? 'محاولات كثيرة غير صحيحة. انتظر 15 دقيقة ثم أعد المحاولة.' : why === 'closed' ? 'البوابة غير متاحة حالياً.' : 'رمز الدخول غير صحيح.');
      } catch (err) { renderGate(err.message || String(err)); }
    };
  }

  async function afterLogin() {
    setHeader(true);
    loading('جارٍ تحميل البرامج…');
    try {
      if (!S.content) {
        const url = await signedUrl('content.json');
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error('تعذر تحميل محتوى البرامج (' + r.status + '). ربما لم تُرفع الملفات بعد.');
        S.content = await r.json();
      }
      route();
    } catch (e) { renderError(e); }
  }

  /* ---------- التنقل (روابط داخلية #/…) ---------- */
  window.addEventListener('hashchange', () => { if (S.content) route(); });
  $('#homeBtn').onclick = () => { location.hash = '#/'; };
  $('#outBtn').onclick = async () => {
    log('logout');
    try { await client().auth.signOut(); } catch (e) {}
    S.name = ''; S.content = null; location.hash = ''; renderGate();
  };
  let lastLogged = '';
  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const prog = S.content.programs.find(p => p.id === parts[0]);
    const key = location.hash || '#/';
    if (key !== lastLogged) { lastLogged = key; log('view', prog ? (prog.id + '/' + (parts[1] || 'overview')) : 'home'); }
    if (!prog) return renderHome();
    S.prog = prog; applyTheme(prog.theme);
    renderProgram(prog, parts[1] || 'overview', parts[2]);
    window.scrollTo({ top: 0 });
  }
  function applyTheme(t) {
    const r = document.documentElement.style;
    r.setProperty('--p', t.primary); r.setProperty('--p2', t.primary2); r.setProperty('--acc', t.accent);
    r.setProperty('--pink', t.ink); r.setProperty('--pbg', t.bg); r.setProperty('--ppale', t.pale); r.setProperty('--psoft', t.soft);
  }

  function renderHome() {
    app.innerHTML = '<div class="hello"><h2>بوابة البرامج</h2></div>' +
      '<p class="note" style="margin-top:-10px">اختر البرنامج للاطلاع على رؤيته وخططه ومقرراته وملفاته والعرض التقديمي.</p>' +
      '<div class="pcards">' + S.content.programs.map(p => {
        const d = p.degrees;
        return '<a class="pcard" href="#/' + p.id + '"><div class="hd" style="background:linear-gradient(120deg,' + p.theme.primary + ',' + p.theme.primary2 + ')">' +
          '<h3>' + esc(p.name) + '</h3><div class="en">' + esc(p.nameEn) + '</div></div>' +
          '<div class="ft">' + ['diploma', 'master', 'phd'].map(k => '<span class="chip" style="background:' + p.theme.pale + ';color:' + p.theme.ink + '">' + esc(d[k].name) + ' · ' + d[k].hours + ' ساعة</span>').join('') +
          '<span class="chip" style="background:' + p.theme.soft + ';color:' + p.theme.ink + '">' + p.library.length + ' ملفاً</span></div></a>';
      }).join('') + '</div>';
  }

  const SECTIONS = [['overview', 'نظرة عامة'], ['courses', 'الخطط والمقررات'], ['outcomes', 'مخرجات التعلم'], ['feasibility', 'الجدوى والتوظيف'],
    ['research', 'الموضوعات البحثية'], ['presentation', 'العرض التقديمي'], ['library', 'مكتبة الملفات']];
  const DEGS = ['diploma', 'master', 'phd'];

  function renderProgram(p, sec, arg) {
    let h = '<div class="phead"><h2>' + esc(p.name) + '</h2><div class="en">' + esc(p.nameEn) + '</div></div>';
    h += '<nav class="snav">' + SECTIONS.map(([k, t]) => '<a href="#/' + p.id + '/' + k + '" class="' + (k === sec ? 'on' : '') + '">' + t + '</a>').join('') + '</nav>';
    h += '<div id="secBody"></div>';
    app.innerHTML = h;
    const body = $('#secBody');
    ({ overview, courses, outcomes, feasibility, research, presentation, library }[sec] || overview)(p, body, arg);
  }

  /* ---------- الأقسام ---------- */
  function overview(p, el) {
    let h = '<div class="sec"><h3>هوية البرنامج</h3><p>' + esc(p.identity) + '</p></div>';
    h += '<div class="sec"><h3>الرؤية</h3><p>' + esc(p.vision) + '</p><p class="en">' + esc(p.visionEn) + '</p>' +
      '<h3 style="margin-top:16px">الرسالة</h3><p>' + esc(p.mission) + '</p><p class="en">' + esc(p.missionEn) + '</p></div>';
    h += '<div class="sec"><h3>الدرجات العلمية</h3><div class="grid">' + DEGS.map(k => {
      const d = p.degrees[k];
      return '<div class="card"><b class="big">' + d.hours + '</b><b>' + esc(d.name) + '</b><div class="note">' + esc(d.levelName) + ' في الإطار الوطني للمؤهلات</div>' +
        '<div>' + d.compulsory + ' مقررات إجبارية + ' + d.pick + ' اختيارية من ' + d.elec.length + (d.project ? ' + مشروع ' + d.project + ' ساعات' : ' + رسالة ' + d.thesis + ' ساعة') + '</div>' +
        '<a class="btn sm p" style="margin-top:8px" href="#/' + p.id + '/courses/' + k + '">عرض المقررات</a></div>';
    }).join('') + '</div></div>';
    h += '<div class="sec"><h3>الأهداف</h3>' + DEGS.map(k => '<h4>' + esc(p.degrees[k].name) + '</h4><ol>' + p.degrees[k].objectives.map(o => '<li>' + esc(o) + '</li>').join('') + '</ol>').join('') + '</div>';
    el.innerHTML = h;
  }

  function degSwitch(p, sec, cur) {
    return '<div class="degsw">' + DEGS.map(k => '<button data-d="' + k + '" class="' + (k === cur ? 'on' : '') + '">' + esc(p.degrees[k].name) + '</button>').join('') + '</div>';
  }
  function bindDeg(p, sec) { document.querySelectorAll('.degsw button').forEach(b => b.onclick = () => { location.hash = '#/' + p.id + '/' + sec + '/' + b.dataset.d; }); }

  function courses(p, el, arg) {
    const k = DEGS.includes(arg) ? arg : 'master'; const d = p.degrees[k];
    const tot = d.hours, seg = (v, c, col, t) => '<div style="width:' + (v / tot * 100) + '%;background:' + c + ';color:' + col + '">' + t + ' ' + v + '</div>';
    const card = c => '<div class="cc ' + (c.kind === 'elec' ? 'elec' : c.kind === 'capstone' ? 'cap' : '') + '" data-code="' + esc(c.code) + '"><span class="code">' + esc(c.code) + '</span><span class="ar">' + esc(c.ar) + '</span><span class="ce">' + esc(c.en) + '</span><span class="dm">' + esc(c.domain) + '</span></div>';
    el.innerHTML = '<div class="sec">' + degSwitch(p, 'courses', k) +
      '<h3>' + esc(d.name) + ' — ' + tot + ' ساعة معتمدة (' + esc(d.levelName) + ')</h3>' +
      '<div class="hbar">' + seg(d.compulsory * 2, p.theme.primary, '#fff', 'إجباري') + seg(d.pick * 2, p.theme.accent, p.theme.ink, 'اختياري') +
      seg(d.project || d.thesis, '#E9C46A', '#1d2433', d.project ? 'مشروع' : 'رسالة') + '</div>' +
      '<h4>المقررات الإجبارية (' + d.core.length + ') — يدرسها جميع الطلاب</h4><div class="ccards">' + d.core.map(card).join('') + card(d.capstone) + '</div>' +
      '<h4>الوعاء الاختياري (' + d.elec.length + ' مقرراً) — يختار الطالب ' + d.pick + '</h4><div class="ccards">' + d.elec.map(card).join('') + '</div>' +
      '<p class="note">اضغط على أي مقرر لعرض وصفه باللغتين وتنزيل توصيفه.</p></div>';
    bindDeg(p, 'courses');
    el.querySelectorAll('.cc').forEach(x => x.onclick = () => openCourse(p, d, x.dataset.code));
  }
  function openCourse(p, d, code) {
    const c = d.core.concat(d.elec, [d.capstone]).find(x => x.code === code); if (!c) return;
    log('open_course', p.id + '/' + code, { title: c.ar });
    $('#mBody').innerHTML = '<span class="chip">' + esc(c.code) + ' · ' + esc(d.name) + '</span>' +
      '<h3 style="margin:10px 0 2px;color:' + p.theme.primary + '">' + esc(c.ar) + '</h3><div class="en" style="font-weight:700">' + esc(c.en) + '</div>' +
      '<p class="note">' + esc(c.domain) + '</p><p>' + esc(c.descAr) + '</p><p class="en">' + esc(c.descEn) + '</p>' +
      '<h4>الموضوعات الرئيسة</h4><ul>' + c.topics.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      '<div class="dl">' + dlButtons({ title: 'توصيف ' + c.ar, pdf: c.pdf, docx: c.docx }) + '</div>';
    $('#modal').hidden = false; bindDl($('#mBody'));
  }
  $('#mClose').onclick = () => { $('#modal').hidden = true; };
  $('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').hidden = true; };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal').hidden = true; });

  function outcomes(p, el, arg) {
    const k = DEGS.includes(arg) ? arg : 'master'; const d = p.degrees[k]; const D = S.content.domains;
    el.innerHTML = '<div class="sec">' + degSwitch(p, 'outcomes', k) + '<h3>' + esc(d.name) + ' — ' + esc(d.levelName) + ' في الإطار الوطني للمؤهلات</h3>' +
      '<div class="tw"><table><tr><th style="width:18%">المجال</th><th>مواصفات المستوى</th></tr>' + ['K', 'S', 'C'].map(x => '<tr><td><b>' + D[x] + '</b></td><td>' + esc(d.nqf[x]) + '</td></tr>').join('') + '</table></div>' +
      '<h4>مخرجات التعلم المستهدفة</h4><div class="tw"><table><tr><th style="width:7%">الكود</th><th style="width:13%">المجال</th><th>المخرج</th><th>Outcome</th></tr>' +
      d.plos.map(o => '<tr><td><b>' + o.code + '</b></td><td>' + D[o.domain] + '</td><td>' + esc(o.ar) + '</td><td class="ltr">' + esc(o.en) + '</td></tr>').join('') + '</table></div></div>';
    bindDeg(p, 'outcomes');
  }

  function feasibility(p, el) {
    const sw = p.swot;
    el.innerHTML =
      '<div class="sec"><h3>البرامج المناظرة وما يميز البرنامج</h3><div class="tw"><table><tr><th>البرنامج المناظر</th><th>وجه التقاطع</th><th>الدلالة</th></tr>' +
      p.competitors.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.overlap) + '</td><td>' + esc(c.meaning) + '</td></tr>').join('') + '</table></div><p><b>التميز: </b>' + esc(p.diff) + '</p></div>' +
      '<div class="sec"><h3>فرص التوظيف في مصر</h3><div class="grid">' + DEGS.map(k => '<div class="card"><b>' + esc(p.degrees[k].name) + '</b><ul>' +
        p.degrees[k].jobs.map(j => '<li>' + esc(j.path) + ' — <span class="note">' + esc(j.where) + '</span></li>').join('') + '</ul></div>').join('') + '</div></div>' +
      '<div class="sec"><h3>الفرص خارج مصر</h3><div class="tw"><table><tr><th>السوق</th><th>أمثلة المسارات</th><th>ملاحظات</th></tr>' +
      p.abroad.map(a => '<tr><td><b>' + esc(a.market) + '</b></td><td>' + esc(a.paths) + '</td><td>' + esc(a.note) + '</td></tr>').join('') + '</table></div></div>' +
      '<div class="sec"><h3>التحليل الرباعي</h3><div class="swot">' +
      [['S', 'نقاط القوة', '#E3F0D2'], ['W', 'نقاط الضعف', '#FBEBD0'], ['O', 'الفرص', '#D6ECE6'], ['T', 'التهديدات', '#F3DED6']].map(([x, t, c]) => '<div style="background:' + c + '"><b>' + t + '</b><p style="margin:6px 0 0">' + esc(sw[x]) + '</p></div>').join('') + '</div></div>';
  }

  function research(p, el) {
    const block = (lv, title) => '<div class="sec"><h3>' + title + '</h3>' + p.research[lv].map(a => '<h4>' + esc(a.axis) + '</h4><div class="tw"><table><tr><th style="width:50%">العنوان المقترح</th><th>Proposed title</th></tr>' +
      a.items.map(i => '<tr><td>' + esc(i.ar) + '</td><td class="ltr">' + esc(i.en) + '</td></tr>').join('') + '</table></div>').join('') + '</div>';
    el.innerHTML = block('master', 'موضوعات مقترحة لرسائل الماجستير') + block('phd', 'موضوعات مقترحة لرسائل الدكتوراه');
  }

  async function presentation(p, el) {
    const deck = p.library.find(x => x.cat === 'deck') || {};
    el.innerHTML = '<div class="sec"><h3>العرض التقديمي</h3><p class="note">عرض تفاعلي متشعب: صفحة المحتويات تنقلك إلى أي قسم، وفي أسفل كل شريحة أزرار للعودة والتنقل.</p>' +
      '<div class="dl" style="margin-bottom:12px">' + dlButtons({ title: 'العرض التقديمي', pdf: deck.pdf, pptx: deck.pptx }) + '</div>' +
      '<div id="vw"><div class="loading"><div class="spin"></div>جارٍ فتح العرض…</div></div></div>';
    bindDl(el);
    try {
      const url = await signedUrl(deck.pdf);
      $('#vw').innerHTML = '<iframe class="viewer" src="' + esc(url) + '#view=FitH" title="العرض التقديمي"></iframe><p class="note">إن لم يظهر العرض على هاتفك فاستخدم زر «فتح PDF» أعلاه.</p>';
      log('view_presentation', deck.pdf);
    } catch (e) { $('#vw').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }

  function library(p, el) {
    const cats = [...new Map(p.library.map(x => [x.cat, x.catName])).entries()];
    el.innerHTML = '<div class="sec lib"><h3>مكتبة الملفات (' + p.library.length + ')</h3><p class="note">جميع الملفات متاحة بصيغتي PDF وWord، والعرض التقديمي بصيغتي PDF وPowerPoint.</p>' +
      '<div class="filters"><input type="search" id="lq" placeholder="ابحث باسم الملف أو كود المقرر"><select id="lc"><option value="">كل الفئات</option>' +
      cats.map(([k, t]) => '<option value="' + esc(k) + '">' + esc(t) + '</option>').join('') + '</select></div><div id="lr"></div></div>';
    const draw = () => {
      const q = $('#lq').value.trim().toLowerCase(), c = $('#lc').value;
      const rows = p.library.filter(x => (!c || x.cat === c) && (!q || (x.title + ' ' + x.catName).toLowerCase().includes(q)));
      $('#lr').innerHTML = rows.length ? rows.map(x => '<div class="row"><div class="t"><b>' + esc(x.title) + '</b><div class="cat">' + esc(x.catName) + '</div></div><div class="dl">' + dlButtons(x) + '</div></div>').join('') : '<p class="note">لا توجد نتائج.</p>';
      bindDl($('#lr'));
    };
    let t; $('#lq').oninput = () => { clearTimeout(t); t = setTimeout(() => { draw(); const v = $('#lq').value.trim(); if (v.length > 2) log('search', v); }, 400); };
    $('#lc').onchange = draw; draw();
  }

  /* ---------- أزرار الفتح والتنزيل ---------- */
  function dlButtons(x) {
    const b = (key, kind, label, cls) => key ? '<button class="btn sm ' + cls + '" data-key="' + esc(key) + '" data-kind="' + kind + '" data-title="' + esc(x.title) + '">' + label + '</button>' : '';
    return b(x.pdf, 'open', '👁 فتح PDF', 'p2') + b(x.pdf, 'pdf', '⬇ PDF', 'p') + b(x.docx, 'docx', '⬇ Word', 'p') + b(x.pptx, 'pptx', '⬇ PowerPoint', 'p');
  }
  function bindDl(root) {
    root.querySelectorAll('button[data-key]').forEach(b => b.onclick = async () => {
      const key = b.dataset.key, kind = b.dataset.kind, title = b.dataset.title;
      const ext = key.split('.').pop();
      const fname = (title || 'ملف').replace(/[\\/:*?"<>|]/g, '-').slice(0, 120) + '.' + ext;
      b.disabled = true;
      try {
        const w = kind === 'open' ? window.open('', '_blank') : null;
        const url = await signedUrl(key, kind === 'open' ? null : fname);
        log(kind === 'open' ? 'open_file' : 'download', key, { title: title, format: ext });
        if (w) w.location = url; else { const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
        if (kind !== 'open') toast('بدأ التنزيل');
      } catch (e) { toast('تعذر: ' + (e.message || e)); }
      finally { b.disabled = false; }
    });
  }

  /* ---------- محاكاة محلية للاختبار (localhost + ?mock فقط) ---------- */
  function mockClient() {
    const st = JSON.parse(sessionStorage.getItem('mkMock') || '{"session":null,"user":null}');
    const save = () => sessionStorage.setItem('mkMock', JSON.stringify(st));
    window.mkMockLog = window.mkMockLog || [];
    const visible = !/closed/.test(location.search);
    const api = {
      portal_status: () => visible,
      portal_me: () => st.user ? { ok: true, name: st.user } : { ok: false },
      portal_login: a => (a.p_code === 'TEST-1234' ? (st.user = 'مستخدم تجريبي', save(), { ok: true, name: st.user }) : { ok: false, reason: 'wrong' }),
      portal_log: a => { window.mkMockLog.push(a); console.log('[portal_log]', a.p_action, a.p_item || ''); if (a.p_action === 'logout') { st.user = null; save(); } return true; },
    };
    return {
      auth: { getSession: async () => ({ data: { session: st.session } }), signInAnonymously: async () => { st.session = { anon: true }; save(); return {}; }, signOut: async () => { st.session = null; st.user = null; save(); } },
      rpc: async (n, a) => ({ data: api[n](a || {}), error: null }),
      storage: { from: () => ({ createSignedUrl: async (key, ttl, o) => ({ data: { signedUrl: 'mock/files/' + key + (o && o.download ? '?download=1' : '') }, error: null }) }) },
    };
  }

  boot();
})();
