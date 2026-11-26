/* ===== لوحة مدير مشكاة — تبويب «بوابة البرامج» =====
   إظهار البوابة أو إخفاؤها، قائمة المسموح لهم بالدخول (الاسم والرمز)، سجل الدخول والنشاط، ورفع ملفات البرامج.
   يعمل بالدخول نفسه المستخدم في تبويب «سعر ميزانية البيت» (حساب Google المسجّل صاحباً للتطبيق). */
(function () {
  'use strict';
  const SB_URL = 'https://uakmtakkctlkjvuityug.supabase.co';
  const SB_KEY = 'sb_publishable_qHWTZdtAJgTlYMmYuGq2mA_6nE8nX-J';
  const BUCKET = 'programs';
  const FLAG = 'mk-open-portal';
  const q = s => document.querySelector(s);
  const body = () => q('#gBody');
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = t => (window.toast ? window.toast(t) : alert(t));
  const MOCK = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]mock/.test(location.search);
  let sb = null, data = null, titles = {}, busy = false;

  function client() {
    if (sb) return sb;
    if (MOCK) return (sb = mockClient());
    if (!window.supabase || !window.supabase.createClient) throw new Error('تعذر تحميل مكتبة Supabase.');
    // نفس مفتاح التخزين المستخدم في تبويب السعر حتى يكفي تسجيل دخول واحد
    sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'mk-admin-budget', persistSession: true, detectSessionInUrl: false, flowType: 'pkce' } });
    return sb;
  }
  async function rpc(n, a) { const { data, error } = await client().rpc(n, a || {}); if (error) throw new Error(error.message); return data; }
  const loading = t => { body().innerHTML = '<div class="loading"><div class="spin"></div>' + e(t) + '</div>'; };
  const fmt = d => d ? new Date(d).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const ACTIONS = { login: 'تسجيل دخول', login_failed: 'محاولة دخول فاشلة', view: 'مشاهدة قسم', open_course: 'فتح مقرر', view_presentation: 'مشاهدة العرض',
    download: 'تنزيل ملف', open_file: 'فتح ملف', search: 'بحث', logout: 'خروج' };

  async function open() {
    if (busy) return; busy = true;
    loading('جارٍ تحميل بوابة البرامج…');
    try {
      const c = client();
      const { data: { session } } = await c.auth.getSession();
      if (location.search.includes('code=')) history.replaceState(null, '', location.pathname);
      if (!session) return renderLogin();
      const owner = await rpc('is_app_owner');
      if (!owner) { body().innerHTML = '<div class="err">الحساب ' + e(session.user.email) + ' غير مسجّل صاحباً للتطبيق.</div>'; return; }
      try { data = await rpc('portal_admin_get'); }
      catch (err) {
        body().innerHTML = '<div class="err">تعذر تحميل بيانات البوابة: ' + e(err.message) + '</div><div class="box"><h3>الإعداد لأول مرة</h3>' +
          '<p>في Supabase افتح مشروع <b>mishkatapps-budget</b> ← SQL Editor، والصق محتوى الملف <b dir="ltr">supabase/programs_portal.sql</b> من مستودع الموقع، ثم Run.</p>' +
          '<p>ثم من Authentication ← Sign In / Providers فعّل <b dir="ltr">Allow anonymous sign-ins</b>، وارجع هنا واضغط «إعادة المحاولة».</p>' +
          '<button class="btn sm" id="gRetry">إعادة المحاولة</button></div>';
        q('#gRetry').onclick = open; return;
      }
      await loadTitles();
      render(session.user.email || '');
    } catch (err) { body().innerHTML = '<div class="err">' + e(err.message || err) + '</div>'; }
    finally { busy = false; }
  }

  function renderLogin() {
    body().innerHTML = '<div class="box" style="max-width:560px"><h3>📚 بوابة البرامج</h3><p>لإدارة البوابة سجّل الدخول بحساب Google المسجَّل صاحباً للتطبيق (الدخول نفسه المستخدم في تبويب السعر).</p>' +
      '<button class="btn" id="gLogin">تسجيل الدخول</button></div>';
    q('#gLogin').onclick = async () => {
      try { sessionStorage.setItem(FLAG, '1'); } catch (x) {}
      const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      if (error) say('تعذر بدء الدخول: ' + error.message);
    };
  }

  async function loadTitles() {
    if (Object.keys(titles).length) return;
    try {
      const { data: d } = await client().storage.from(BUCKET).createSignedUrl('content.json', 120);
      const c = await (await fetch(d.signedUrl, { cache: 'no-store' })).json();
      c.programs.forEach(p => {
        titles[p.id] = p.name;
        p.library.forEach(x => ['pdf', 'docx', 'pptx'].forEach(k => { if (x[k]) titles[x[k]] = x.title + ' (' + k.toUpperCase() + ')'; }));
        Object.entries(p.degrees).forEach(([dk, d]) => d.core.concat(d.elec, [d.capstone]).forEach(cc => { titles[p.id + '/' + cc.code] = cc.code + ' – ' + cc.ar; }));
      });
    } catch (x) { /* لم تُرفع الملفات بعد */ }
  }
  const itemName = it => {
    if (!it) return '';
    if (titles[it]) return titles[it];
    const m = it.match(/^(agri|proj)\/(.+)$/);
    const sec = { overview: 'نظرة عامة', courses: 'الخطط والمقررات', outcomes: 'مخرجات التعلم', feasibility: 'الجدوى والتوظيف', research: 'الموضوعات البحثية', presentation: 'العرض التقديمي', library: 'مكتبة الملفات' };
    if (m && titles[m[1]]) return titles[m[1]] + ' › ' + (sec[m[2]] || m[2]);
    return it === 'home' ? 'الصفحة الرئيسية للبوابة' : it;
  };

  function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(8)); r.forEach((v, i) => { s += a[v % a.length]; if (i === 3) s += '-'; }); return s; }

  function render(email) {
    const st = data.stats || {};
    const portalUrl = location.origin + location.pathname.replace(/admin\/?(index\.html)?$/, '') + 'programs/';
    body().innerHTML =
      '<div class="kpis"><div class="kpi k1"><b>' + (data.users || []).length + '</b><span>المسموح لهم</span></div>' +
      '<div class="kpi k3"><b>' + (st.logins_today || 0) + '</b><span>دخول اليوم</span></div>' +
      '<div class="kpi k2"><b>' + (st.downloads_total || 0) + '</b><span>تنزيلات (الإجمالي)</span></div>' +
      '<div class="kpi k4"><b>' + (st.failed_today || 0) + '</b><span>محاولات فاشلة اليوم</span></div>' +
      '<div class="kpi k5"><b>' + (st.active_sessions || 0) + '</b><span>جلسات نشطة</span></div></div>' +
      '<div class="grid2"><div class="box"><h3>ظهور بوابة البرامج</h3>' +
      '<p>الحالة الآن: <b style="color:' + (data.visible ? '#15803d' : '#b42626') + '">' + (data.visible ? '✅ ظاهرة — يظهر رابطها في الموقع ويمكن الدخول بالرموز' : '⛔ مخفية — لا يظهر الرابط ولا يمكن الدخول') + '</b></p>' +
      '<div class="ra"><button class="btn sm" id="gVis">' + (data.visible ? 'إخفاء البوابة' : 'إظهار البوابة') + '</button>' +
      '<a class="btn ghost sm" href="' + e(portalUrl) + '" target="_blank">فتح البوابة ↗</a></div></div>' +
      '<div class="box"><h3>ملفات البرامج</h3><p style="font-size:14px">اختر مجلد <b>«بوابة البرامج - ملفات الرفع»</b> كاملاً من جهازك لرفعه أو تحديثه (يستبدل الملفات الموجودة بالأسماء نفسها).</p>' +
      '<input type="file" id="gDir" webkitdirectory directory multiple hidden><div class="ra"><button class="btn sm" id="gPick">📁 اختيار المجلد ورفعه</button><span id="gUp" style="font-size:13px;color:var(--mut)"></span></div>' +
      '<div id="gBar" hidden style="height:10px;background:#f1ead8;border-radius:8px;overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gold),var(--gold2))"></i></div></div></div>' +

      '<div class="box" style="margin-bottom:16px"><h3>المسموح لهم بالدخول</h3>' +
      '<form id="gAdd" class="pf"><label>الاسم<input id="gName" required maxlength="120" placeholder="مثال: د. أحمد محمد"></label>' +
      '<label>رمز الدخول<input id="gCode" required minlength="4" maxlength="40" dir="ltr" value="' + genCode() + '"></label>' +
      '<label>ملاحظة (اختياري)<input id="gNote" maxlength="200" placeholder="الجهة أو الصفة"></label>' +
      '<div class="ra"><button type="button" class="btn ghost sm" id="gGen">رمز جديد</button><button class="btn sm">إضافة</button></div></form>' +
      '<div style="overflow-x:auto"><table class="gt"><thead><tr><th>الاسم</th><th>الرمز</th><th>الحالة</th><th>آخر دخول</th><th>دخول</th><th>تنزيلات</th><th></th></tr></thead><tbody>' +
      (data.users || []).map(u => '<tr data-id="' + e(u.id) + '"><td><b>' + e(u.name) + '</b>' + (u.note ? '<div style="font-size:12.5px;color:var(--mut)">' + e(u.note) + '</div>' : '') + '</td>' +
        '<td dir="ltr" style="font-family:monospace;font-weight:700">' + e(u.code) + '</td>' +
        '<td>' + (u.active ? '<span style="color:#15803d">مفعّل</span>' : '<span style="color:#b42626">موقوف</span>') + '</td>' +
        '<td>' + fmt(u.last_login) + '</td><td>' + (u.logins || 0) + '</td><td>' + (u.downloads || 0) + '</td>' +
        '<td style="white-space:nowrap"><button class="btn ghost sm" data-a="copy">نسخ الدعوة</button> <button class="btn ghost sm" data-a="edit">تعديل</button> ' +
        '<button class="btn ghost sm" data-a="toggle">' + (u.active ? 'إيقاف' : 'تفعيل') + '</button> <button class="btn ghost sm" data-a="log">النشاط</button> <button class="btn ghost sm" data-a="del">حذف</button></td></tr>').join('') +
      ((data.users || []).length ? '' : '<tr><td colspan="7" style="text-align:center;color:var(--mut)">لا يوجد مستخدمون بعد — أضف أول اسم ورمز أعلاه.</td></tr>') +
      '</tbody></table></div></div>' +

      '<div class="box"><h3>سجل الدخول والنشاط</h3>' +
      '<div class="ra" style="flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
      '<select id="fU"><option value="">كل المستخدمين</option>' + (data.users || []).map(u => '<option value="' + e(u.id) + '">' + e(u.name) + '</option>').join('') + '</select>' +
      '<select id="fA"><option value="">كل الأنشطة</option>' + Object.entries(ACTIONS).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') + '</select>' +
      '<label style="font-size:13px">من <input type="date" id="fF"></label><label style="font-size:13px">إلى <input type="date" id="fT"></label>' +
      '<button class="btn sm" id="fGo">عرض</button><button class="btn ghost sm" id="fCsv">⬇ تصدير CSV</button></div><div id="gLog"><div class="loading"><div class="spin"></div>جارٍ تحميل السجل…</div></div></div>' +
      '<p style="color:var(--mut);font-size:13px;margin-top:10px">متصل باسم <span dir="ltr">' + e(email) + '</span></p>';

    q('#gGen').onclick = () => { q('#gCode').value = genCode(); };
    q('#gVis').onclick = async () => { try { await rpc('portal_set_visible', { p_visible: !data.visible }); say(data.visible ? 'أُخفيت البوابة' : 'أصبحت البوابة ظاهرة'); open(); } catch (x) { say('تعذر: ' + x.message); } };
    q('#gAdd').onsubmit = async ev => {
      ev.preventDefault();
      try { await rpc('portal_user_save', { p_id: null, p_name: q('#gName').value, p_code: q('#gCode').value, p_active: true, p_note: q('#gNote').value || null }); say('أُضيف ✓'); open(); }
      catch (x) { say(/duplicate|unique/i.test(x.message) ? 'هذا الرمز مستخدم لشخص آخر — اختر رمزاً مختلفاً' : 'تعذر: ' + x.message); }
    };
    body().querySelectorAll('tr[data-id] button').forEach(b => b.onclick = () => userAction(b.dataset.a, (data.users || []).find(u => u.id === b.closest('tr').dataset.id)));
    q('#gPick').onclick = () => q('#gDir').click();
    q('#gDir').onchange = ev => upload([...ev.target.files]);
    q('#fGo').onclick = loadLog; q('#fCsv').onclick = csv;
    loadLog();
  }

  async function userAction(a, u) {
    if (!u) return;
    try {
      if (a === 'copy') {
        const url = location.origin + location.pathname.replace(/admin\/?(index\.html)?$/, '') + 'programs/';
        await navigator.clipboard.writeText('السلام عليكم ' + u.name + '،\nيمكنك الاطلاع على برامج الدراسات العليا من «بوابة البرامج»:\n' + url + '\nرمز الدخول: ' + u.code);
        say('نُسخت رسالة الدعوة');
      } else if (a === 'edit') {
        const name = prompt('الاسم:', u.name); if (name == null) return;
        const code = prompt('رمز الدخول:', u.code); if (code == null) return;
        const note = prompt('ملاحظة:', u.note || ''); if (note == null) return;
        await rpc('portal_user_save', { p_id: u.id, p_name: name, p_code: code, p_active: u.active, p_note: note || null }); say('حُفظ ✓'); open();
      } else if (a === 'toggle') {
        await rpc('portal_user_save', { p_id: u.id, p_name: u.name, p_code: u.code, p_active: !u.active, p_note: u.note }); say(u.active ? 'أُوقف' : 'فُعّل'); open();
      } else if (a === 'del') {
        if (!confirm('حذف «' + u.name + '» نهائياً من قائمة المسموح لهم؟ يبقى نشاطه السابق في السجل.')) return;
        await rpc('portal_user_delete', { p_id: u.id }); say('حُذف'); open();
      } else if (a === 'log') { q('#fU').value = u.id; loadLog(); q('#gLog').scrollIntoView({ behavior: 'smooth' }); }
    } catch (x) { say('تعذر: ' + x.message); }
  }

  let rows = [];
  async function loadLog() {
    const el = q('#gLog'); el.innerHTML = '<div class="loading"><div class="spin"></div>جارٍ تحميل السجل…</div>';
    try {
      const f = q('#fF').value, t = q('#fT').value;
      rows = await rpc('portal_events_list', { p_from: f ? f + 'T00:00:00' : null, p_to: t ? t + 'T23:59:59' : null, p_user: q('#fU').value || null, p_action: q('#fA').value || null, p_limit: 1000 }) || [];
      el.innerHTML = rows.length ? '<div style="overflow-x:auto;max-height:520px"><table class="gt"><thead><tr><th>الوقت</th><th>المستخدم</th><th>النشاط</th><th>العنصر</th><th>الجهاز</th></tr></thead><tbody>' +
        rows.map(r => '<tr><td style="white-space:nowrap">' + fmt(r.at) + '</td><td>' + e(r.user_name || '—') + '</td><td>' + e(ACTIONS[r.action] || r.action) + '</td>' +
          '<td>' + e(itemName(r.item)) + '</td><td style="font-size:12px;color:var(--mut)">' + e(device(r.user_agent)) + '</td></tr>').join('') +
        '</tbody></table></div><p style="font-size:13px;color:var(--mut)">' + rows.length + ' سجلاً (أحدث 1000 بحد أقصى)</p>' : '<div class="empty-st">لا يوجد نشاط بعد</div>';
    } catch (x) { el.innerHTML = '<div class="err">' + e(x.message) + '</div>'; }
  }
  const device = ua => !ua ? '' : /iPhone|Android/i.test(ua) ? 'هاتف' : /iPad|Tablet/i.test(ua) ? 'جهاز لوحي' : 'حاسب';
  function csv() {
    if (!rows.length) return say('لا توجد سجلات');
    const line = a => a.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',');
    const txt = '﻿' + [line(['الوقت', 'المستخدم', 'النشاط', 'العنصر', 'التفاصيل', 'المتصفح'])].concat(rows.map(r => line([new Date(r.at).toISOString(), r.user_name, ACTIONS[r.action] || r.action, itemName(r.item), r.detail ? JSON.stringify(r.detail) : '', r.user_agent]))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' })); a.download = 'portal-activity-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }

  async function upload(files) {
    files = files.filter(f => !/(^|\/)\./.test(f.webkitRelativePath || f.name));
    if (!files.length) return;
    const keyOf = f => (f.webkitRelativePath || f.name).split('/').slice(1).join('/');
    if (!files.some(f => keyOf(f) === 'content.json')) return say('هذا ليس مجلد «بوابة البرامج - ملفات الرفع» (لا يحتوي content.json)');
    if (!confirm('رفع ' + files.length + ' ملفاً إلى المخزن الخاص؟ تُستبدل الملفات الموجودة بالأسماء نفسها.')) return;
    const bar = q('#gBar'), fill = bar.querySelector('i'), lab = q('#gUp'); bar.hidden = false;
    const type = k => ({ pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', json: 'application/json' }[k.split('.').pop()] || 'application/octet-stream');
    let done = 0, failed = [];
    const queue = files.slice(); const worker = async () => {
      while (queue.length) {
        const f = queue.shift(), key = keyOf(f);
        const { error } = await client().storage.from(BUCKET).upload(key, f, { upsert: true, contentType: type(key), cacheControl: '300' });
        if (error) failed.push(key + ': ' + error.message);
        done++; fill.style.width = (done / files.length * 100) + '%'; lab.textContent = done + ' / ' + files.length;
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    lab.textContent = failed.length ? ('اكتمل مع ' + failed.length + ' خطأ') : ('✓ رُفعت ' + done + ' ملفاً');
    if (failed.length) alert('لم تُرفع هذه الملفات:\n' + failed.slice(0, 15).join('\n'));
    titles = {}; await loadTitles();
  }

  /* محاكاة محلية للاختبار (localhost + ?mock فقط) */
  function mockClient() {
    const users = [{ id: 'u1', name: 'د. أحمد محمد', code: 'AB7K-Q2XM', active: true, note: 'عضو لجنة', created_at: new Date().toISOString(), last_login: new Date().toISOString(), logins: 3, downloads: 5 }];
    let visible = false;
    const ev = [{ at: new Date().toISOString(), user_name: 'د. أحمد محمد', action: 'download', item: 'agri/courses/master/MC01.pdf', user_agent: 'Mozilla Windows' },
                { at: new Date(Date.now() - 3600e3).toISOString(), user_name: 'د. أحمد محمد', action: 'login', item: null, user_agent: 'Mozilla Android' },
                { at: new Date(Date.now() - 7200e3).toISOString(), user_name: null, action: 'login_failed', item: null, user_agent: 'Mozilla iPhone' }];
    const api = {
      is_app_owner: () => true,
      portal_admin_get: () => ({ visible, users, stats: { logins_today: 1, downloads_total: 5, failed_today: 1, active_sessions: 1 } }),
      portal_set_visible: a => (visible = a.p_visible),
      portal_user_save: a => { if (a.p_id) Object.assign(users.find(u => u.id === a.p_id), { name: a.p_name, code: a.p_code, active: a.p_active, note: a.p_note }); else users.unshift({ id: 'u' + Date.now(), name: a.p_name, code: a.p_code, active: true, note: a.p_note, created_at: new Date().toISOString(), logins: 0, downloads: 0 }); return 'ok'; },
      portal_user_delete: a => { users.splice(users.findIndex(u => u.id === a.p_id), 1); return true; },
      portal_events_list: () => ev,
    };
    return { auth: { getSession: async () => ({ data: { session: { user: { email: 'mishkatapps@gmail.com' } } } }) },
      rpc: async (n, a) => ({ data: api[n](a || {}), error: null }),
      storage: { from: () => ({ createSignedUrl: async k => ({ data: { signedUrl: '../programs/mock/files/' + k } }), upload: async () => ({ error: null }) }) } };
  }

  window.mkPortal = { open, reload: open };
  let back = false; try { back = sessionStorage.getItem(FLAG) === '1'; sessionStorage.removeItem(FLAG); } catch (x) {}
  // بعد العودة من Google يتولى تبويب السعر استلام الجلسة أولاً، ثم نفتح تبويب البوابة
  if (back) { const t = document.querySelector('.tab[data-tab="g"]'); if (t) setTimeout(() => t.click(), 1500); }
})();
