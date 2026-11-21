/* ===== لوحة مدير مشكاة — تبويب «الملصقات» =====
   • المكتبة: كل الملصقات، البحث والتصفية، التحديد المتعدد، الإظهار/الإيقاف، التعديل، الحذف، وسم «يحتاج تصحيحًا».
   • إضافة واستبدال: رفع صور جديدة (تُجهَّز تلقائيًا 512×512 بخلفية شفافة) أو صور مصححة بنفس المعرّف.
   • المراجعة: قائمة الملصقات الموسومة، ونص جاهز يُلصق لـ Claude.
   • الحزم: إنشاء وتعديل وتوزيع تلقائي (3–30 ملصقًا في الحزمة).
   • التطبيقات: «ملصقات مشكاة (أ)، (ب)…» وتوزيع الحزم عليها (حتى 10 حزم لكل تطبيق — قيد واتساب).

   مصادر البيانات:
   - الإظهار/الإيقاف: ورقة «إتاحة الملصقات» في جدول بنك التهاني (getStickers / setStickers) — يُحفظ فورًا.
   - كل ما عداه: مسودة في هذا المتصفح، ثم «🚀 نشر» يحفظها في مستودع الموقع على GitHub بـ Commit واحد
     عبر Apps Script (stkRead / stkCommit في Stickers.gs):
       img/stickers/index.json · img/stickers/catalog.json · img/stickers/<الصور> · stickers/stickers/*.json */
(function () {
  'use strict';
  const q = s => document.querySelector(s), body = () => q('#sBody');
  const P = { idx: 'img/stickers/index.json', cats: 'img/stickers/categories.json', cat: 'img/stickers/catalog.json', lib: 'stickers/stickers/library.json', def: 'stickers/stickers/packs-default.json' };
  const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر'];
  const LATIN = 'abcdefghijklmnopqrst';
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const FLAGS = [['text', '✍️', 'تصحيح النص'], ['transp', '🔲', 'جعل الخلفية شفافة'], ['bold', '🅱️', 'زيادة سمك الخطوط']];
  const DKEY = 'mk-stk-draft-v1';
  const EMO = { occasion: ['🎉', '🌙'], greet: ['☀️', '🌙'], salam: ['👋', '🤝'], thanks: ['🙏', '❤️'], congrats: ['🎉', '🥳'], religious: ['🌙', '🕌'], dhikr: ['📿', '🤲'], dua: ['🤲', '💚'], hadith: ['📜', '💚'], health: ['🤲', '💐'], condolence: ['🤲', '🕊️'], love: ['❤️', '🌹'], fun: ['😄', '👍'], daily: ['☕', '😊'], travel: ['✈️', '🧳'], wishes: ['🤲', '💚'] };

  const S = {
    loaded: false, sub: 'lib', bg: 'dk', show: 120, canGh: true, ghErr: '', canVis: true, visErr: '',
    base: null,          // ما في المستودع الآن: { idx, cats, cat, lib, sha:{} }
    idx: [], cats: {}, cat: null, libMeta: {},   // المسودة
    dels: {}, up: {},    // حذف معلّق، صور معلّقة { id: { b64, ext, w, h, size, isNew } }
    on: {}, sel: new Set(), f: { q: '', cat: '', st: '', fl: '', pk: '' }, last: null
  };
  const isOn = id => !/^(لا|no|false|0)$/i.test(String(S.on[id] == null ? 'نعم' : S.on[id]).trim());
  const BY = () => { const m = {}; S.idx.forEach(it => m[it.id] = it); return m; };
  const srcOf = it => it.src || it.id + '.png';
  const imgOf = it => S.up[it.id] ? S.up[it.id].url : '../img/stickers/' + srcOf(it) + (S.bust ? '?v=' + S.bust : '');
  const strip = t => String(t || '').replace(/[ً-ْٰـ]/g, '');
  const cName = k => (S.cats[k] && S.cats[k].ar) || k || '—';
  const clone = o => JSON.parse(JSON.stringify(o));
  const packsOf = id => S.cat.packs.filter(p => p.ids.includes(id));
  const appOf = pid => S.cat.apps.find(a => a.packs.includes(pid));
  const dirty = () => S.base && (Object.keys(S.up).length || Object.keys(S.dels).length || JSON.stringify(S.idx) !== JSON.stringify(S.base.idx) || JSON.stringify(S.cat) !== JSON.stringify(S.base.cat));

  /* ---------- التحميل ---------- */
  async function load() {
    body().innerHTML = '<div class="loading"><div class="spin"></div>جارٍ تحميل الملصقات…</div>';
    let files = null;
    try {
      const r = await run('stkRead', [P.idx, P.cats, P.cat, P.lib]); files = {}; r.forEach(f => files[f.path] = f); S.canGh = true; S.ghErr = '';
    } catch (e) {
      if (/انتهت الجلسة|سجّل الدخول/.test(e.message || '')) { body().innerHTML = '<div class="err">' + esc(e.message) + '</div>'; return; }
      S.canGh = false; S.ghErr = e.message || String(e);
    }
    const J = (p, d) => { try { return files && files[p] && files[p].text != null ? JSON.parse(files[p].text) : d; } catch (e) { return d; } };
    let idx = J(P.idx, null), cats = J(P.cats, null), cat = J(P.cat, null), lib = J(P.lib, null);
    if (!idx) {   // قراءة فقط من الموقع المنشور
      const v = '?_=' + Date.now(), g = async u => { try { return await (await fetch(u + v, { cache: 'no-store' })).json(); } catch (e) { return null; } };
      idx = await g('../' + P.idx); cats = cats || await g('../' + P.cats); cat = cat || await g('../' + P.cat); lib = lib || await g('../' + P.lib);
      if (!idx) { body().innerHTML = '<div class="err">تعذّر تحميل فهرس الملصقات.</div>'; return; }
    }
    if (!cat) cat = await seedCatalog(lib);
    cat.packs = cat.packs || []; cat.apps = cat.apps || []; cat.review = cat.review || {};
    S.libMeta = {}; ((lib && lib.items) || []).forEach(i => S.libMeta[i.id] = { em: i.em, acc: i.acc });
    S.base = { idx: clone(idx), cats: cats || {}, cat: clone(cat) };
    S.idx = clone(idx); S.cats = cats || (lib && lib.cats) || {}; S.cat = clone(cat); S.dels = {}; S.up = {}; S.sel.clear();
    restoreDraft();
    // الإظهار/الإيقاف من الورقة
    S.on = {};
    try { const d = await run('getStickers'); d.rows.forEach(r => S.on[r.id] = r.on); S.canVis = true; }
    catch (e) { S.canVis = false; S.visErr = e.message || String(e); try { await readOnlyVis(); } catch (x) {} }
    S.loaded = true; draw();
  }
  async function readOnlyVis() {
    const u = 'https://docs.google.com/spreadsheets/d/1cR7mfBJTQsePtKjPTtSFrOw4f4HMNG_h1FkHVTBmHN8/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent('إتاحة الملصقات') + '&_=' + Date.now();
    const t = await (await fetch(u, { cache: 'no-store' })).text();
    const rows = t.trim().split('\n').map(l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
    const h = rows[0].map(x => x.trim()), iI = h.indexOf('المعرّف'), iE = h.indexOf('مفعّل');
    if (iI >= 0 && iE >= 0) rows.slice(1).forEach(r => { if (r[iI]) S.on[r[iI].trim()] = r[iE]; });
  }
  async function seedCatalog(lib) {   // أول مرة: الحزم العشر الحالية في تطبيق «ملصقات مشكاة» تصبح التطبيق (أ)
    let def = null; try { def = await (await fetch('../' + P.def + '?_=' + Date.now(), { cache: 'no-store' })).json(); } catch (e) {}
    const packs = ((def && def.sticker_packs) || []).map(p => ({ id: p.identifier, name: p.name, nameEn: p.name_en || '', ids: p.stickers.map(s => s.image_file.replace(/\.webp$/, '')), tray: (p.tray_image_file || '').replace(/^tray_|\.png$/g, ''), v: +p.image_data_version || 1 }));
    return { version: '', updated: '', packs, apps: [{ id: 'a', letter: 'أ', name: 'ملصقات مشكاة (أ)', nameEn: 'Mishkat Stickers (A)', appId: 'com.mishkat.stickers', packs: packs.map(p => p.id) }], review: {} };
  }

  /* ---------- المسودة في المتصفح ---------- */
  function saveDraft() {
    try {
      if (!dirty()) { localStorage.removeItem(DKEY); return; }
      localStorage.setItem(DKEY, JSON.stringify({ baseHash: hashBase(), idx: S.idx, cat: S.cat, dels: S.dels, at: Date.now() }));
    } catch (e) {}
  }
  const hashBase = () => { const s = JSON.stringify([S.base.idx, S.base.cat]); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  function restoreDraft() {
    let d = null; try { d = JSON.parse(localStorage.getItem(DKEY) || 'null'); } catch (e) {}
    if (!d) return;
    if (d.baseHash !== hashBase()) { S.draftNote = 'وُجدت مسودة قديمة كُتبت على نسخة سابقة من الملصقات، فلم تُستعد (تغيّرت الملفات في المستودع بعدها).'; try { localStorage.removeItem(DKEY); } catch (e) {} return; }
    S.idx = d.idx; S.cat = d.cat; S.dels = d.dels || {};
    S.draftNote = 'استُعيدت تغييراتك غير المنشورة من ' + new Date(d.at).toLocaleString('ar-EG-u-nu-latn') + '. (الصور المرفوعة غير المنشورة لا تُحفظ بعد إغلاق الصفحة.)';
  }
  function changed() { saveDraft(); drawBar(); }
  window.addEventListener('beforeunload', e => { if (Object.keys(S.up).length) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- الهيكل ---------- */
  function counts() {
    const live = S.idx.filter(it => !S.dels[it.id]);
    return { all: live.length, on: live.filter(it => isOn(it.id)).length, rev: Object.keys(S.cat.review).filter(id => !S.dels[id] && S.idx.some(i => i.id === id)).length,
      packs: S.cat.packs.length, apps: S.cat.apps.length, unassigned: live.filter(it => !S.cat.packs.some(p => p.ids.includes(it.id))).length };
  }
  function draw() {
    const c = counts();
    body().innerHTML = `
      ${S.canGh ? '' : `<div class="errbox"><b>الحفظ في الموقع غير مفعّل بعد:</b> ${esc(S.ghErr)}<br>يمكنك التصفح والإظهار والإيقاف، لكن الإضافة والحذف والحزم والتطبيقات تحتاج إعداد Stickers.gs ومفتاح GitHub كما في الدليل.</div>`}
      ${S.canVis ? '' : `<div class="warnbox">الإظهار والإيقاف للقراءة فقط الآن (${esc(S.visErr)}).</div>`}
      ${S.draftNote ? `<div class="okbox">${esc(S.draftNote)}</div>` : ''}
      <div class="pubbar" id="sBar"></div>
      <div class="kpis">
        <div class="kpi k1"><b>${c.on}</b><span>ملصق ظاهر للزوار</span></div>
        <div class="kpi" style="background:linear-gradient(135deg,#7a2e2e,#a34b3b)"><b>${c.all - c.on}</b><span>موقوف</span></div>
        <div class="kpi" style="background:linear-gradient(135deg,#8a6100,#c98f00)"><b>${c.rev}</b><span>يحتاج تصحيحًا</span></div>
        <div class="kpi k4"><b>${c.packs}</b><span>حزمة · ${c.unassigned} ملصق خارج الحزم</span></div>
        <div class="kpi k5"><b>${c.apps}</b><span>تطبيق ملصقات</span></div>
      </div>
      <div class="ssub" id="sSub">
        ${[['lib', '🗂 المكتبة', c.all], ['add', '➕ إضافة واستبدال', Object.keys(S.up).length || ''], ['rev', '🛠 يحتاج تصحيحًا', c.rev], ['packs', '📦 الحزم', c.packs], ['apps', '📱 التطبيقات', c.apps]]
          .map(([k, l, n]) => `<button data-sub="${k}" class="${S.sub === k ? 'on' : ''}">${l}${n !== '' ? ` <b>${n}</b>` : ''}</button>`).join('')}
      </div>
      <div id="sView"></div>`;
    q('#sSub').onclick = e => { const b = e.target.closest('[data-sub]'); if (!b) return; S.sub = b.dataset.sub; S.draftNote = ''; draw(); };
    drawBar();
    ({ lib: viewLib, add: viewAdd, rev: viewRev, packs: viewPacks, apps: viewApps })[S.sub]();
  }
  function drawBar() {
    const b = q('#sBar'); if (!b) return;
    const d = dirty(), nUp = Object.keys(S.up).length, nDel = Object.keys(S.dels).length;
    b.className = 'pubbar' + (d ? ' dirty' : '');
    const parts = [];
    if (nUp) parts.push(nUp + ' صورة جديدة/مصححة');
    if (nDel) parts.push(nDel + ' للحذف');
    if (d && JSON.stringify(S.cat) !== JSON.stringify(S.base.cat)) parts.push('تعديلات الحزم/التطبيقات/المراجعة');
    if (d && JSON.stringify(S.idx) !== JSON.stringify(S.base.idx)) parts.push('تعديلات نصوص أو تصنيفات');
    b.innerHTML = d
      ? `<span>📝 <b>تغييرات غير منشورة:</b> ${esc(parts.join(' · '))}</span><span class="sp"></span>
         <button class="btn ghost sm" id="sUndo" style="color:#fff;border-color:rgba(255,255,255,.5)">↺ تجاهل التغييرات</button>
         <button class="btn sm" id="sPub" ${S.canGh ? '' : 'disabled'}>🚀 نشر إلى الموقع والتطبيقات</button>`
      : `<span>✓ لا توجد تغييرات غير منشورة</span><span class="sp"></span>${S.last ? `<small>آخر نشر: <a href="${esc(S.last.url || '#')}" target="_blank">${esc(S.last.when)}</a> · يظهر في الموقع خلال دقيقة أو اثنتين</small>` : `<small>الإظهار والإيقاف يُحفظان فورًا؛ وبقية التغييرات تُجمع ثم تُنشر بزر واحد.</small>`}`;
    if (q('#sPub')) q('#sPub').onclick = publish;
    if (q('#sUndo')) q('#sUndo').onclick = () => { if (!confirm('تجاهل كل التغييرات غير المنشورة (بما فيها الصور المرفوعة)؟')) return; S.idx = clone(S.base.idx); S.cat = clone(S.base.cat); S.dels = {}; S.up = {}; S.draftNote = ''; saveDraft(); draw(); };
    q('#sSub') && q('#sSub').querySelectorAll('[data-sub]').forEach(x => { if (x.dataset.sub === 'add') { const n = Object.keys(S.up).length; x.innerHTML = '➕ إضافة واستبدال' + (n ? ` <b>${n}</b>` : ''); } });
  }

  /* ---------- المكتبة ---------- */
  function filtered() {
    const k = strip(S.f.q).toLowerCase();
    return S.idx.filter(it => {
      if (S.f.cat && (it.cat || 'occasion') !== S.f.cat) return false;
      if (S.f.st === 'on' && (!isOn(it.id) || S.dels[it.id])) return false;
      if (S.f.st === 'off' && (isOn(it.id) || S.dels[it.id])) return false;
      if (S.f.st === 'del' && !S.dels[it.id]) return false;
      if (S.f.st === 'new' && !S.up[it.id]) return false;
      if (S.f.fl === 'any' && !S.cat.review[it.id]) return false;
      if (S.f.fl && S.f.fl !== 'any' && !(S.cat.review[it.id] || {})[S.f.fl]) return false;
      if (S.f.pk === '-' && S.cat.packs.some(p => p.ids.includes(it.id))) return false;
      if (S.f.pk && S.f.pk !== '-' && !(S.cat.packs.find(p => p.id === S.f.pk) || { ids: [] }).ids.includes(it.id)) return false;
      if (k && !(it.id.toLowerCase().includes(k) || strip(it.ar).includes(k) || (it.en || '').toLowerCase().includes(k))) return false;
      return true;
    });
  }
  function viewLib() {
    const cats = Object.keys(S.cats).concat([...new Set(S.idx.map(it => it.cat || 'occasion'))].filter(c => !S.cats[c]));
    q('#sView').innerHTML = `
      <div class="filters">
        <input type="search" id="sQ" placeholder="ابحث بنص الملصق أو معرّفه (مثل gp_101)" value="${esc(S.f.q)}">
        <select id="sCat"><option value="">كل التصنيفات</option>${cats.map(c => `<option value="${esc(c)}" ${S.f.cat === c ? 'selected' : ''}>${esc(cName(c))} (${S.idx.filter(it => (it.cat || 'occasion') === c).length})</option>`).join('')}</select>
        <select id="sSt"><option value="">كل الحالات</option><option value="on">الظاهرة</option><option value="off">الموقوفة</option><option value="del">المحددة للحذف</option><option value="new">صور جديدة/مصححة</option></select>
        <select id="sFl"><option value="">المراجعة: الكل</option><option value="any">🛠 يحتاج تصحيحًا (أي نوع)</option>${FLAGS.map(([k, i, l]) => `<option value="${k}">${i} ${l}</option>`).join('')}</select>
        <select id="sPk"><option value="">كل الحزم</option><option value="-">— خارج الحزم —</option>${S.cat.packs.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${p.ids.length})</option>`).join('')}</select>
        <select id="sBg" class="hsel" title="خلفية المعاينة"><option value="dk">خلفية داكنة (كواتساب)</option><option value="lt">مربعات (لكشف الشفافية)</option><option value="wh">خلفية بيضاء</option></select>
        <span class="chip" id="sCount"></span>
      </div>
      <div class="sbulk" id="sBulk"></div>
      <div class="sgrid" id="sGrid"></div>
      <div style="text-align:center;margin-top:12px"><button class="btn ghost sm" id="sMore" hidden>عرض المزيد</button></div>`;
    ['#sSt', '#sFl', '#sPk', '#sBg'].forEach(s => { const el = q(s), k = { '#sSt': 'st', '#sFl': 'fl', '#sPk': 'pk' }[s]; el.value = k ? S.f[k] : S.bg; });
    q('#sQ').oninput = e => { S.f.q = e.target.value.trim(); S.show = 120; list(); };
    q('#sCat').onchange = e => { S.f.cat = e.target.value; S.show = 120; list(); };
    q('#sSt').onchange = e => { S.f.st = e.target.value; S.show = 120; list(); };
    q('#sFl').onchange = e => { S.f.fl = e.target.value; S.show = 120; list(); };
    q('#sPk').onchange = e => { S.f.pk = e.target.value; S.show = 120; list(); };
    q('#sBg').onchange = e => { S.bg = e.target.value; list(); };
    q('#sMore').onclick = () => { S.show += 120; list(); };
    q('#sGrid').onclick = onGrid; q('#sGrid').onchange = onGridChange;
    list();
  }
  function card(it) {
    const on = isOn(it.id), del = !!S.dels[it.id], up = S.up[it.id], rv = S.cat.review[it.id], pk = packsOf(it.id);
    return `<article class="sc ${del ? 'del' : on ? '' : 'off'} ${up ? 'new' : ''} ${S.sel.has(it.id) ? 'sel' : ''}" data-id="${esc(it.id)}">
      <input type="checkbox" class="ck" ${S.sel.has(it.id) ? 'checked' : ''} title="تحديد">
      ${rv ? `<span class="flags">${FLAGS.filter(f => rv[f[0]]).map(f => `<i title="${f[2]}">${f[1]}</i>`).join('')}${rv.note && !FLAGS.some(f => rv[f[0]]) ? '<i title="ملاحظة">📝</i>' : ''}</span>` : ''}
      <button class="sth ${S.bg === 'lt' ? 'lt' : S.bg === 'wh' ? 'wh' : ''}" data-open><img src="${esc(imgOf(it))}" alt="" loading="lazy"></button>
      <div class="st">${esc(it.ar || it.en || '—')}</div>
      <div class="sm2"><span class="mono">${esc(it.id)}</span><span class="chip">${esc(cName(it.cat || 'occasion'))}</span></div>
      ${pk.length ? `<div class="pk" title="${esc(pk.map(p => p.name).join('، '))}">📦 ${esc(pk[0].name)}${pk.length > 1 ? ' +' + (pk.length - 1) : ''}</div>` : ''}
      ${del ? `<div class="row"><span class="chip" style="background:#fbd5d5;color:#7f1d1d">سيُحذف عند النشر</span><button class="btn ghost sm" data-undel>تراجع</button></div>`
        : `<label class="hsw"><input type="checkbox" data-vis ${on ? 'checked' : ''} ${S.canVis ? '' : 'disabled'}><span></span>${on ? 'ظاهر' : 'موقوف'}</label>`}
    </article>`;
  }
  function list() {
    const L = filtered(), g = q('#sGrid'); q('#sCount').textContent = L.length + ' ملصق';
    g.innerHTML = L.length ? L.slice(0, S.show).map(card).join('') : '<div class="empty-st">لا نتائج</div>';
    q('#sMore').hidden = L.length <= S.show;
    bulkBar(L);
  }
  function bulkBar(L) {
    const n = S.sel.size, b = q('#sBulk');
    b.innerHTML = `<button class="btn ghost sm" data-b="selAll">☑ تحديد كل المعروض (${L.length})</button>` +
      (n ? `<button class="btn ghost sm" data-b="selNone">✕ إلغاء التحديد</button><b style="color:var(--navy)">المحدد: ${n}</b>
        ${S.canVis ? '<button class="btn sm" data-b="on">✓ إظهار</button><button class="btn ghost sm" data-b="off">⦸ إيقاف</button>' : ''}
        <button class="btn blue sm" data-b="pack">📦 أضف إلى حزمة…</button>
        <button class="btn sm" data-b="flag" style="background:#fff3c4">🛠 وسم للتصحيح…</button>
        <button class="btn red sm" data-b="del">🗑 حذف</button>` : `<span class="hnote" style="margin:0">حدّد ملصقات (مربع الاختيار أعلى كل بطاقة) لتطبيق إجراء عليها معًا، أو اضغط على الصورة لفتح تفاصيل الملصق.</span>`);
    b.onclick = e => {
      const k = (e.target.closest('[data-b]') || {}).dataset; if (!k || !k.b) return;
      const ids = [...S.sel];
      if (k.b === 'selAll') { L.forEach(it => S.sel.add(it.id)); return list(); }
      if (k.b === 'selNone') { S.sel.clear(); return list(); }
      if (k.b === 'on' || k.b === 'off') return setVis(ids, k.b === 'on' ? 'نعم' : 'لا');
      if (k.b === 'pack') return pickPack(ids);
      if (k.b === 'flag') return flagDialog(ids);
      if (k.b === 'del') { if (!confirm('تحديد ' + ids.length + ' ملصقًا للحذف؟ يُحذف كل ملصق من الموقع ومن كل الحزم عند النشر. (يمكن التراجع قبل النشر)')) return; ids.forEach(id => S.dels[id] = 1); S.sel.clear(); changed(); list(); }
    };
  }
  function onGrid(e) {
    const c = e.target.closest('.sc'); if (!c) return; const id = c.dataset.id;
    if (e.target.closest('[data-open]')) return detail(id);
    if (e.target.closest('[data-undel]')) { delete S.dels[id]; changed(); list(); }
  }
  function onGridChange(e) {
    const c = e.target.closest('.sc'); if (!c) return; const id = c.dataset.id;
    if (e.target.classList.contains('ck')) { e.target.checked ? S.sel.add(id) : S.sel.delete(id); c.classList.toggle('sel', e.target.checked); bulkBar(filtered()); }
    if (e.target.hasAttribute('data-vis')) setVis([id], e.target.checked ? 'نعم' : 'لا');
  }
  async function setVis(ids, on) {
    if (!S.canVis || !ids.length) return;
    const prev = {}; ids.forEach(id => { prev[id] = S.on[id]; S.on[id] = on; }); if (S.sub === 'lib') list();
    try { await run('setStickers', ids, on); toast((on === 'نعم' ? 'أُظهر: ' : 'أُوقف: ') + (ids.length > 1 ? ids.length + ' ملصقًا' : ids[0]) + ' ✓'); }
    catch (e) { ids.forEach(id => S.on[id] = prev[id]); if (S.sub === 'lib') list(); toast('تعذّر الحفظ: ' + (e.message || e)); }
  }

  /* ---------- النوافذ ---------- */
  function modal(html, cls) {
    const w = document.createElement('div'); w.className = 'smod';
    w.innerHTML = `<div class="in ${cls || ''}"><button class="x" aria-label="إغلاق">✕</button>${html}</div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const close = () => { w.remove(); document.body.style.overflow = ''; };
    w.addEventListener('click', e => { if (e.target === w || e.target.closest('.x')) close(); });
    return { el: w.firstElementChild, close };
  }
  function detail(id) {
    const it = S.idx.find(x => x.id === id); if (!it) return;
    const rv = S.cat.review[id] || {}, pk = packsOf(id), cats = Object.keys(S.cats).length ? Object.keys(S.cats) : [...new Set(S.idx.map(x => x.cat))];
    const m = modal(`<h3>الملصق <span class="mono">${esc(id)}</span></h3>
      <div class="sdet">
        <div><img class="big sth ${S.bg === 'lt' ? 'lt' : S.bg === 'wh' ? 'wh' : ''}" id="dImg" src="${esc(imgOf(it))}" alt="">
          <div class="bgsw"><button data-bg="">داكنة</button><button data-bg="lt">مربعات</button><button data-bg="wh">بيضاء</button></div>
          <p class="hnote">الملف: <span class="mono">${esc(srcOf(it))}</span>${S.up[id] ? ` · <b style="color:#2563eb">صورة جديدة غير منشورة (${Math.round(S.up[id].size / 1024)} ك.ب)</b>` : ''}<br>
          <a href="../img/stickers/${esc(srcOf(it))}" target="_blank">فتح الصورة المنشورة ↗</a></p>
          <div class="row"><button class="btn sm" id="dRep">🔁 استبدال الصورة</button><input type="file" id="dFile" accept="image/*" hidden></div>
        </div>
        <div>
          <div class="sform">
            <label>النص العربي<input id="dAr" value="${esc(it.ar || '')}"></label>
            <label>النص الإنجليزي<input id="dEn" value="${esc(it.en || '')}" dir="ltr"></label>
            <label>التصنيف<select id="dCat">${cats.map(c => `<option value="${esc(c)}" ${(it.cat || 'occasion') === c ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</select></label>
          </div>
          <div class="fl"><b>🛠 يحتاج من Claude:</b>
            ${FLAGS.map(([k, i, l]) => `<label><input type="checkbox" data-fl="${k}" ${rv[k] ? 'checked' : ''}> ${i} ${l}</label>`).join('')}
            <label style="flex-direction:column;align-items:stretch">ملاحظة أو التصحيح المطلوب بالضبط (مثلًا النص الصحيح)<textarea id="dNote" class="sinp" rows="3">${esc(rv.note || '')}</textarea></label>
          </div>
          <p class="hnote">الحزم: ${pk.length ? pk.map(p => `<span class="chip">${esc(p.name)}${appOf(p.id) ? ' · ' + esc(appOf(p.id).letter) : ''}</span>`).join(' ') : 'خارج الحزم'} · الحالة: ${isOn(id) ? 'ظاهر' : 'موقوف'}</p>
          <div class="row"><button class="btn" id="dSave">✓ حفظ في المسودة</button>
            ${rv && Object.keys(rv).length ? '<button class="btn green sm" id="dDone">✓ تم التصحيح (إزالة الوسم)</button>' : ''}
            <span style="flex:1"></span>
            ${S.dels[id] ? '<button class="btn ghost sm" id="dUndel">↺ إلغاء الحذف</button>' : '<button class="btn red sm" id="dDel">🗑 حذف الملصق</button>'}</div>
        </div>
      </div>`);
    const E = m.el;
    E.querySelector('.bgsw').onclick = e => { const b = e.target.closest('[data-bg]'); if (!b) return; E.querySelector('#dImg').className = 'big sth ' + b.dataset.bg; };
    E.querySelector('#dRep').onclick = () => E.querySelector('#dFile').click();
    E.querySelector('#dFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const r = await prepare(f, { removeBg: false }); stage(id, r, false); E.querySelector('#dImg').src = r.url; toast('ستُستبدل الصورة عند النشر'); changed(); };
    E.querySelector('#dSave').onclick = () => {
      it.ar = E.querySelector('#dAr').value.trim(); const en = E.querySelector('#dEn').value.trim(); if (en) it.en = en; else delete it.en; it.cat = E.querySelector('#dCat').value;
      const f = {}; E.querySelectorAll('[data-fl]').forEach(c => { if (c.checked) f[c.dataset.fl] = 1; }); const note = E.querySelector('#dNote').value.trim(); if (note) f.note = note;
      if (Object.keys(f).length) { f.at = (S.cat.review[id] || {}).at || new Date().toISOString().slice(0, 10); S.cat.review[id] = f; } else delete S.cat.review[id];
      changed(); m.close(); draw();
    };
    if (E.querySelector('#dDone')) E.querySelector('#dDone').onclick = () => { delete S.cat.review[id]; changed(); m.close(); draw(); };
    if (E.querySelector('#dDel')) E.querySelector('#dDel').onclick = () => { if (!confirm('حذف الملصق ' + id + ' من الموقع ومن كل الحزم عند النشر؟')) return; S.dels[id] = 1; changed(); m.close(); draw(); };
    if (E.querySelector('#dUndel')) E.querySelector('#dUndel').onclick = () => { delete S.dels[id]; changed(); m.close(); draw(); };
  }
  function flagDialog(ids) {
    const m = modal(`<h3>🛠 وسم ${ids.length} ملصقًا للتصحيح</h3>
      <div class="fl">${FLAGS.map(([k, i, l]) => `<label><input type="checkbox" data-fl="${k}"> ${i} ${l}</label>`).join('')}
        <label style="flex-direction:column;align-items:stretch">ملاحظة مشتركة (اختياري)<textarea id="fNote" class="sinp" rows="2"></textarea></label></div>
      <div class="row"><button class="btn" id="fOk">✓ وسم</button><button class="btn ghost sm" id="fClr">إزالة الوسم عنها</button></div>`, 'nar');
    m.el.querySelector('#fOk').onclick = () => {
      const f = {}; m.el.querySelectorAll('[data-fl]').forEach(c => { if (c.checked) f[c.dataset.fl] = 1; }); const n = m.el.querySelector('#fNote').value.trim(); if (n) f.note = n;
      if (!Object.keys(f).length) return toast('اختر نوع التصحيح');
      const at = new Date().toISOString().slice(0, 10); ids.forEach(id => S.cat.review[id] = Object.assign({}, S.cat.review[id] || {}, f, { at: (S.cat.review[id] || {}).at || at }));
      S.sel.clear(); changed(); m.close(); draw(); toast('وُسم ' + ids.length + ' ملصقًا');
    };
    m.el.querySelector('#fClr').onclick = () => { ids.forEach(id => delete S.cat.review[id]); S.sel.clear(); changed(); m.close(); draw(); };
  }
  function pickPack(ids) {
    const m = modal(`<h3>📦 إضافة ${ids.length} ملصقًا إلى حزمة</h3>
      <div class="apk">${S.cat.packs.map(p => { const room = 30 - p.ids.length; return `<label class="${room <= 0 ? 'dis' : ''}"><input type="radio" name="pp" value="${esc(p.id)}" ${room <= 0 ? 'disabled' : ''}> ${esc(p.name)} <small>${p.ids.length}/30${appOf(p.id) ? ' · ' + esc(appOf(p.id).name) : ''}</small></label>`; }).join('') || '<div class="empty-st">لا توجد حزم بعد</div>'}</div>
      <div class="sform"><label>أو حزمة جديدة باسم<input id="ppNew" placeholder="مثل: أدعية من القرآن ١"></label></div>
      <p class="hnote">الحزمة تتسع لـ30 ملصقًا؛ ما يزيد يُضاف إلى حزم جديدة متتالية بالاسم نفسه.</p>
      <button class="btn" id="ppOk">✓ إضافة</button>`, 'nar');
    m.el.querySelector('#ppOk').onclick = () => {
      const nn = m.el.querySelector('#ppNew').value.trim(), r = m.el.querySelector('[name=pp]:checked');
      let rest = ids.slice();
      if (!nn && !r) return toast('اختر حزمة أو اكتب اسم حزمة جديدة');
      if (r) { const p = S.cat.packs.find(x => x.id === r.value); rest = rest.filter(id => !p.ids.includes(id)); const add = rest.splice(0, 30 - p.ids.length); p.ids.push(...add); bump(p); }
      let i = 1; const nm = nn || (S.cat.packs.find(x => x.id === (r && r.value)) || {}).name || 'حزمة';
      while (rest.length) { const p = newPack(nm + (i > 1 || rest.length > 30 || r ? ' ' + AR(i + (r ? 1 : 0)) : '')); p.ids = rest.splice(0, 30); i++; }
      S.sel.clear(); changed(); m.close(); draw(); toast('تمت الإضافة');
    };
  }

  /* ---------- تجهيز الصور ---------- */
  const loadImg = f => new Promise((res, rej) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('صورة غير صالحة: ' + f.name)); im.src = u; });
  function removeWhite(ctx, w, h, tol) {   // يجعل الخلفية الفاتحة المتصلة بالحواف شفافة
    const d = ctx.getImageData(0, 0, w, h), a = d.data, seen = new Uint8Array(w * h), st = [];
    const ok = i => { const p = i * 4; return a[p + 3] > 0 && a[p] > 255 - tol && a[p + 1] > 255 - tol && a[p + 2] > 255 - tol; };
    for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
    while (st.length) { const i = st.pop(); if (seen[i]) continue; seen[i] = 1; if (!ok(i)) continue; a[i * 4 + 3] = 0; const x = i % w, y = (i / w) | 0;
      if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w); }
    ctx.putImageData(d, 0, 0);
  }
  async function prepare(file, opt) {
    const im = await loadImg(file), c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    let sw = im.naturalWidth, sh = im.naturalHeight;
    // قص الحواف الشفافة ثم الملاءمة داخل 496×496 (هامش 8 بكسل) — واتساب يطلب 512×512 بالضبط
    const t = document.createElement('canvas'); t.width = sw; t.height = sh; const tx = t.getContext('2d'); tx.drawImage(im, 0, 0);
    if (opt.removeBg) removeWhite(tx, sw, sh, opt.tol || 28);
    const d = tx.getImageData(0, 0, sw, sh).data; let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
    for (let y = 0; y < sh; y++) for (let xx = 0; xx < sw; xx++) if (d[(y * sw + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = sw - 1; y1 = sh - 1; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, M = opt.margin == null ? 8 : opt.margin, s = Math.min((512 - 2 * M) / bw, (512 - 2 * M) / bh);
    const dw = Math.round(bw * s), dh = Math.round(bh * s);
    x.imageSmoothingQuality = 'high'; x.drawImage(t, x0, y0, bw, bh, Math.round((512 - dw) / 2), Math.round((512 - dh) / 2), dw, dh);
    let blob = null, ext = 'webp';
    for (const qq of [0.95, 0.9, 0.82, 0.74, 0.65, 0.55]) { blob = await new Promise(r => c.toBlob(r, 'image/webp', qq)); if (!blob || blob.type !== 'image/webp') { blob = null; break; } if (blob.size <= 100 * 1024) break; }
    if (!blob) { blob = await new Promise(r => c.toBlob(r, 'image/png')); ext = 'png'; }   // متصفح لا يدعم WebP: يُحوَّل عند بناء التطبيق
    const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    return { b64, ext, size: blob.size, url: URL.createObjectURL(blob), w: im.naturalWidth, h: im.naturalHeight };
  }
  function stage(id, r, isNew) {
    const it = S.idx.find(x => x.id === id);
    S.up[id] = Object.assign({}, r, { isNew, oldSrc: it && !isNew ? srcOf(it) : '' });
    if (it) it.src = id + '.' + r.ext;
  }

  /* ---------- إضافة واستبدال ---------- */
  let PEND = [];   // صور مختارة لم تُعتمد بعد
  function nextId(prefix) {
    const used = new Set(S.idx.map(i => i.id).concat(PEND.map(p => p.id))); let n = 1;
    S.idx.forEach(i => { const m = new RegExp('^' + prefix + '_(\\d+)$').exec(i.id); if (m) n = Math.max(n, +m[1] + 1); });
    while (used.has(prefix + '_' + String(n).padStart(3, '0'))) n++;
    return prefix + '_' + String(n).padStart(3, '0');
  }
  function viewAdd() {
    const cats = Object.keys(S.cats).length ? Object.keys(S.cats) : [...new Set(S.idx.map(x => x.cat))];
    q('#sView').innerHTML = `
      <p class="hnote">اختر صورًا أو اسحبها هنا. تُجهَّز تلقائيًا بمواصفات واتساب: 512×512 بكسل، WebP، أقل من 100 كيلوبايت، مع قص الحواف الفارغة.
        <b>للاستبدال</b> (مثلًا بعد تصحيح Claude): اجعل اسم الملف هو معرّف الملصق نفسه مثل <span class="mono">gp_101.webp</span> فيحلّ محل القديم.</p>
      <div class="sform">
        <label>بادئة معرّفات الملصقات الجديدة<input id="aPre" class="mono" value="${esc(S.pre || 'mk')}" placeholder="مثل qd لأدعية القرآن"></label>
        <label>التصنيف الافتراضي<select id="aCat">${cats.map(c => `<option value="${esc(c)}" ${S.aCat === c ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</select></label>
        <label>بعد الإضافة إلى المكتبة<select id="aPack"><option value="">لا تضفها إلى حزمة</option><option value="+">حزمة جديدة (أو حزم بحد 30)</option>${S.cat.packs.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${p.ids.length}/30)</option>`).join('')}</select></label>
        <label style="justify-content:flex-end"><span><input type="checkbox" id="aBg" ${S.aBg ? 'checked' : ''}> إزالة الخلفية البيضاء المتصلة بالحواف</span></label>
      </div>
      <div class="drop" id="aDrop"><b>⬆ اسحب الصور هنا أو اضغط للاختيار</b>PNG أو WebP أو JPG — يمكن اختيار عدة صور معًا<input type="file" id="aFile" accept="image/*" multiple hidden></div>
      <div id="aList"></div>`;
    q('#aPre').onchange = e => S.pre = e.target.value.trim().replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'mk';
    q('#aCat').onchange = e => S.aCat = e.target.value; S.aCat = q('#aCat').value;
    q('#aBg').onchange = e => S.aBg = e.target.checked;
    const dz = q('#aDrop'), fi = q('#aFile');
    dz.onclick = () => fi.click(); fi.onchange = () => addFiles([...fi.files]);
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('on'); }; dz.ondragleave = () => dz.classList.remove('on');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('on'); addFiles([...e.dataTransfer.files].filter(f => /^image\//.test(f.type))); };
    drawPend();
  }
  async function addFiles(files) {
    if (!files.length) return;
    const pre = S.pre || 'mk', by = BY();
    q('#aList').innerHTML = '<div class="loading"><div class="spin"></div>جارٍ تجهيز ' + files.length + ' صورة…</div>';
    for (const f of files) {
      try {
        const base = f.name.replace(/\.[^.]+$/, ''), rep = !!by[base];
        const r = await prepare(f, { removeBg: !!S.aBg });
        PEND.push(Object.assign(r, { id: rep ? base : nextId(pre), rep, name: f.name, ar: rep ? by[base].ar : '', en: rep ? by[base].en || '' : '', cat: rep ? by[base].cat : S.aCat }));
      } catch (e) { toast(e.message); }
    }
    drawPend();
  }
  function drawPend() {
    const L = q('#aList'); if (!L) return;
    if (!PEND.length) { L.innerHTML = Object.keys(S.up).length ? `<div class="okbox">في المسودة ${Object.keys(S.up).length} صورة جاهزة للنشر. تجدها في «المكتبة» بتصفية «صور جديدة/مصححة».</div>` : ''; return; }
    const cats = Object.keys(S.cats).length ? Object.keys(S.cats) : [...new Set(S.idx.map(x => x.cat))];
    L.innerHTML = `<div class="row" style="margin-top:12px"><b>${PEND.length} صورة: ${PEND.filter(p => !p.rep).length} جديدة، ${PEND.filter(p => p.rep).length} استبدال</b><span style="flex:1"></span>
        <button class="btn ghost sm" id="pClr">✕ إلغاء الكل</button><button class="btn" id="pOk">✓ اعتماد وإضافتها إلى المسودة</button></div>
      <div class="uplist">${PEND.map((p, i) => `<div class="upit ${p.rep ? 'rep' : ''}" data-i="${i}">
        <div class="sth lt"><img src="${p.url}" alt=""></div>
        <div class="meta"><span>${esc(p.name)}</span><span>${p.w}×${p.h} ← 512 · ${Math.round(p.size / 1024)} ك.ب ${p.size > 100 * 1024 ? '⚠️' : ''}</span></div>
        ${p.rep ? `<b style="color:#8a6100;font-size:13px">🔁 استبدال <span class="mono">${esc(p.id)}</span></b>` : `<input data-k="id" class="mono" value="${esc(p.id)}" title="المعرّف">`}
        <input data-k="ar" value="${esc(p.ar)}" placeholder="النص العربي (للبحث وللمكفوفين)">
        <input data-k="en" value="${esc(p.en)}" placeholder="English text (optional)" dir="ltr">
        ${p.rep ? '' : `<select data-k="cat">${cats.map(c => `<option value="${esc(c)}" ${p.cat === c ? 'selected' : ''}>${esc(cName(c))}</option>`).join('')}</select>`}
        <button class="btn ghost sm" data-rm>✕ إزالة</button></div>`).join('')}</div>`;
    L.oninput = L.onchange = e => { const d = e.target.closest('[data-i]'); if (!d || !e.target.dataset.k) return; PEND[+d.dataset.i][e.target.dataset.k] = e.target.dataset.k === 'id' ? e.target.value.trim().replace(/[^A-Za-z0-9_\-]/g, '') : e.target.value; };
    L.onclick = e => { const d = e.target.closest('[data-i]'); if (d && e.target.closest('[data-rm]')) { PEND.splice(+d.dataset.i, 1); drawPend(); } };
    q('#pClr').onclick = () => { PEND = []; drawPend(); };
    q('#pOk').onclick = commitPend;
  }
  function commitPend() {
    const ids = new Set(S.idx.map(i => i.id)), seen = new Set();
    for (const p of PEND) {
      if (!p.rep && (!p.id || ids.has(p.id) || seen.has(p.id))) return toast('معرّف مكرر أو فارغ: ' + (p.id || '—'));
      if (!p.rep && !/^[A-Za-z0-9_\-]+$/.test(p.id)) return toast('المعرّف بحروف إنجليزية وأرقام فقط: ' + p.id);
      seen.add(p.id);
    }
    const added = [];
    PEND.forEach(p => {
      if (p.rep) { const it = S.idx.find(x => x.id === p.id); if (p.ar) it.ar = p.ar; if (p.en) it.en = p.en; stage(p.id, p, false); }
      else { const it = { id: p.id, ar: p.ar || '', src: p.id + '.' + p.ext, cat: p.cat || S.aCat, occ: [] }; if (p.en) it.en = p.en; S.idx.push(it); stage(p.id, p, true); added.push(p.id); }
    });
    const tgt = q('#aPack') && q('#aPack').value;
    if (added.length && tgt) {
      let rest = added.slice();
      if (tgt !== '+') { const p = S.cat.packs.find(x => x.id === tgt); const a = rest.splice(0, 30 - p.ids.length); p.ids.push(...a); bump(p); }
      const nm = tgt === '+' ? (prompt('اسم الحزمة الجديدة:', cName(S.aCat)) || cName(S.aCat)) : (S.cat.packs.find(x => x.id === tgt).name);
      let i = 1; while (rest.length) { const p = newPack(nm + (rest.length > 30 || i > 1 || tgt !== '+' ? ' ' + AR(i + (tgt !== '+' ? 1 : 0)) : '')); p.ids = rest.splice(0, 30); i++; }
    }
    const n = PEND.length; PEND = []; changed(); draw(); toast(n + ' صورة في المسودة — اضغط «نشر» لحفظها في الموقع');
  }

  /* ---------- المراجعة ---------- */
  function viewRev() {
    const ids = Object.keys(S.cat.review).filter(id => S.idx.some(i => i.id === id) && !S.dels[id]);
    q('#sView').innerHTML = ids.length ? `
      <p class="hnote">هذه الملصقات موسومة بأنها تحتاج تصحيحًا. انسخ الطلب والصقه في محادثة Claude؛ وبعد أن يرسل الصور المصححة ارفعها من «إضافة واستبدال» بأسمائها نفسها، ثم اضغط «تم التصحيح».
        <b>انشر أولًا</b> حتى يقرأ Claude قائمة المراجعة من الموقع إن احتاج.</p>
      <div class="row" style="margin-bottom:10px"><button class="btn" id="rCopy">📋 نسخ طلب التصحيح لـ Claude</button><button class="btn ghost sm" id="rSel">☑ تحديدها في المكتبة</button></div>
      <textarea class="req" id="rTxt" readonly>${esc(reqText(ids))}</textarea>
      <div class="sgrid" style="margin-top:12px" id="rGrid">${ids.map(id => { const it = S.idx.find(i => i.id === id), r = S.cat.review[id];
        return `<article class="sc" data-id="${esc(id)}"><button class="sth" data-open><img src="${esc(imgOf(it))}" alt="" loading="lazy"></button>
          <div class="st">${esc(it.ar || '—')}</div><div class="sm2"><span class="mono">${esc(id)}</span>${S.up[id] ? '<span class="chip" style="background:#dbeafe">صورة جديدة</span>' : ''}</div>
          <div style="font-size:12.5px">${FLAGS.filter(f => r[f[0]]).map(f => f[1] + ' ' + f[2]).join('<br>')}${r.note ? '<br>📝 ' + esc(r.note) : ''}</div>
          <button class="btn green sm" data-done>✓ تم التصحيح</button></article>`; }).join('')}</div>`
      : '<div class="empty-st">لا توجد ملصقات موسومة للتصحيح.<br>من «المكتبة» افتح أي ملصق أو حدّد عدة ملصقات ثم «🛠 وسم للتصحيح».</div>';
    if (!ids.length) return;
    q('#rCopy').onclick = async () => { const t = q('#rTxt'); try { await navigator.clipboard.writeText(t.value); toast('نُسخ الطلب ✓'); } catch (e) { t.select(); document.execCommand('copy'); toast('نُسخ الطلب ✓'); } };
    q('#rSel').onclick = () => { S.sel = new Set(ids); S.sub = 'lib'; S.f.fl = 'any'; draw(); };
    q('#rGrid').onclick = e => { const c = e.target.closest('.sc'); if (!c) return; if (e.target.closest('[data-open]')) return detail(c.dataset.id); if (e.target.closest('[data-done]')) { delete S.cat.review[c.dataset.id]; changed(); draw(); } };
  }
  function reqText(ids) {
    const lines = ['طلب تصحيح ملصقات مشكاة — ' + ids.length + ' ملصقًا', 'المستودع: mishkatapps/mishkatapps.github.io — المجلد img/stickers', 'المطلوب: صور مصححة بالأسماء نفسها (512×512، WebP، خلفية شفافة، أقل من 100 ك.ب)، مع الحفاظ على التصميم.', ''];
    ids.forEach((id, i) => { const it = S.idx.find(x => x.id === id), r = S.cat.review[id];
      lines.push((i + 1) + ') ' + id + ' — https://mishkatapps.github.io/img/stickers/' + srcOf(it));
      if (it.ar) lines.push('   النص الحالي: ' + it.ar);
      const need = FLAGS.filter(f => r[f[0]]).map(f => f[2]); if (need.length) lines.push('   المطلوب: ' + need.join('، '));
      if (r.note) lines.push('   ملاحظة: ' + r.note); });
    return lines.join('\n');
  }

  /* ---------- الحزم ---------- */
  function newPack(name) {
    const used = new Set(S.cat.packs.map(p => p.id)); let n = S.cat.packs.length + 1; while (used.has('mishkat_' + n)) n++;
    const p = { id: 'mishkat_' + n, name: (name || 'حزمة ' + AR(n)).slice(0, 120), nameEn: '', ids: [], tray: '', v: 1 }; S.cat.packs.push(p); return p;
  }
  function bump(p) { const b = (S.base.cat.packs || []).find(x => x.id === p.id); p.v = b ? (b.v || 1) + 1 : 1; }
  const live = id => S.idx.some(i => i.id === id) && !S.dels[id];
  function packIssues(p) {
    const ok = p.ids.filter(live), vis = ok.filter(isOn), out = [];
    if (vis.length < 3) out.push('أقل من 3 ملصقات ظاهرة — لن تظهر في واتساب');
    if (p.ids.length > 30) out.push('أكثر من 30 ملصقًا');
    if (ok.length < p.ids.length) out.push((p.ids.length - ok.length) + ' ملصق محذوف');
    if (!appOf(p.id)) out.push('غير موزعة على تطبيق');
    return out;
  }
  const trayOf = p => { const t = p.tray && live(p.tray) ? p.tray : p.ids.find(live); const it = t && S.idx.find(i => i.id === t); return it ? imgOf(it) : ''; };
  function viewPacks() {
    q('#sView').innerHTML = `
      <div class="row" style="margin-bottom:12px"><button class="btn" id="kNew">➕ حزمة جديدة</button><button class="btn blue" id="kAuto">⚙️ توزيع الملصقات على حزم تلقائيًا</button>
        <span class="hnote" style="margin:0">واتساب: من 3 إلى 30 ملصقًا في الحزمة، والملصق نفسه يمكن أن يكون في أكثر من حزمة.</span></div>
      <div class="plist">${S.cat.packs.map(p => { const is = packIssues(p), a = appOf(p.id);
        return `<div class="pcard ${is.length && !(is.length === 1 && is[0].startsWith('غير موزعة')) ? 'bad' : ''}" data-p="${esc(p.id)}">
          <div class="ph"><img src="${esc(trayOf(p))}" alt=""><div><b>${esc(p.name)}</b><small>${p.ids.length}/30 ملصقًا · <span class="mono">${esc(p.id)}</span> · ${a ? '📱 ' + esc(a.name) : 'بلا تطبيق'}</small></div></div>
          <div class="strip">${p.ids.filter(live).slice(0, 12).map(id => { const it = S.idx.find(i => i.id === id); return `<img src="${esc(imgOf(it))}" alt="" loading="lazy">`; }).join('')}</div>
          ${is.length ? `<small style="color:#a32222">⚠️ ${esc(is.join(' · '))}</small>` : ''}
          <div class="row"><button class="btn sm" data-edit>✎ تعديل</button><button class="btn ghost sm" data-up title="تحريك للأعلى">▲</button><button class="btn ghost sm" data-dn title="تحريك للأسفل">▼</button><span style="flex:1"></span><button class="btn red sm" data-del>🗑</button></div>
        </div>`; }).join('') || '<div class="empty-st">لا توجد حزم. أنشئ حزمة أو استخدم التوزيع التلقائي.</div>'}</div>`;
    q('#kNew').onclick = () => { const n = prompt('اسم الحزمة:'); if (!n) return; const p = newPack(n.trim()); changed(); editPack(p.id); };
    q('#kAuto').onclick = autoDialog;
    q('.plist').onclick = e => {
      const c = e.target.closest('[data-p]'); if (!c) return; const id = c.dataset.p, i = S.cat.packs.findIndex(p => p.id === id);
      if (e.target.closest('[data-edit]')) return editPack(id);
      if (e.target.closest('[data-up]') && i > 0) { [S.cat.packs[i - 1], S.cat.packs[i]] = [S.cat.packs[i], S.cat.packs[i - 1]]; changed(); return viewPacks(); }
      if (e.target.closest('[data-dn]') && i < S.cat.packs.length - 1) { [S.cat.packs[i + 1], S.cat.packs[i]] = [S.cat.packs[i], S.cat.packs[i + 1]]; changed(); return viewPacks(); }
      if (e.target.closest('[data-del]')) { if (!confirm('حذف الحزمة «' + S.cat.packs[i].name + '»؟ (الملصقات نفسها لا تُحذف)')) return; S.cat.packs.splice(i, 1); S.cat.apps.forEach(a => a.packs = a.packs.filter(x => x !== id)); changed(); draw(); }
    };
  }
  function editPack(pid) {
    const p = S.cat.packs.find(x => x.id === pid); if (!p) return;
    const m = modal('<div id="peB"></div>');
    const render = () => {
      const a = appOf(pid);
      m.el.querySelector('#peB').innerHTML = `<h3>✎ الحزمة: ${esc(p.name)}</h3>
        <div class="sform"><label>الاسم بالعربية (يظهر في واتساب)<input id="peN" value="${esc(p.name)}" maxlength="120"></label>
          <label>الاسم بالإنجليزية<input id="peE" value="${esc(p.nameEn || '')}" dir="ltr" maxlength="120"></label>
          <label>التطبيق<select id="peA"><option value="">— بلا تطبيق —</option>${S.cat.apps.map(x => `<option value="${esc(x.id)}" ${a && a.id === x.id ? 'selected' : ''} ${x !== a && x.packs.length >= 10 ? 'disabled' : ''}>${esc(x.name)} (${x.packs.length}/10)</option>`).join('')}</select></label></div>
        <div class="row" style="margin:6px 0 10px"><b>${p.ids.length}/30 ملصقًا</b> <span class="hnote" style="margin:0">★ أيقونة الحزمة · ◀ ▶ لتغيير الترتيب · ✕ للإزالة من الحزمة</span><span style="flex:1"></span>
          <button class="btn blue sm" id="peAdd" ${p.ids.length >= 30 ? 'disabled' : ''}>➕ إضافة ملصقات من المكتبة</button><button class="btn sm" id="peOk">✓ تم</button></div>
        <div class="pe-grid">${p.ids.map((id, i) => { const it = S.idx.find(x => x.id === id); const tray = (p.tray || p.ids[0]) === id;
          return `<div class="pe-it ${tray ? 'tray' : ''}" data-i="${i}" title="${esc(it ? it.ar : id)}"><span class="n">${i + 1}</span>${it ? `<img src="${esc(imgOf(it))}" alt="" loading="lazy">` : `<span style="color:#fff;font-size:11px">${esc(id)} (محذوف)</span>`}
            <div class="t"><button data-a="tray" title="اجعله الأيقونة">★</button><button data-a="r" title="قبله">▶</button><button data-a="l" title="بعده">◀</button><button data-a="x">✕</button></div></div>`; }).join('')}</div>`;
      const E = m.el;
      E.querySelector('#peN').onchange = e => { p.name = e.target.value.trim() || p.name; bump(p); changed(); };
      E.querySelector('#peE').onchange = e => { p.nameEn = e.target.value.trim(); bump(p); changed(); };
      E.querySelector('#peA').onchange = e => { S.cat.apps.forEach(x => x.packs = x.packs.filter(y => y !== pid)); const x = S.cat.apps.find(y => y.id === e.target.value); if (x) x.packs.push(pid); changed(); };
      E.querySelector('#peOk').onclick = () => { m.close(); draw(); };
      E.querySelector('#peAdd').onclick = () => picker(p, render);
      E.querySelector('.pe-grid').onclick = e => { const b = e.target.closest('[data-a]'), d = e.target.closest('[data-i]'); if (!b || !d) return; const i = +d.dataset.i, A = b.dataset.a;
        if (A === 'tray') p.tray = p.ids[i];
        if (A === 'r' && i > 0) [p.ids[i - 1], p.ids[i]] = [p.ids[i], p.ids[i - 1]];
        if (A === 'l' && i < p.ids.length - 1) [p.ids[i + 1], p.ids[i]] = [p.ids[i], p.ids[i + 1]];
        if (A === 'x') { if (p.tray === p.ids[i]) p.tray = ''; p.ids.splice(i, 1); }
        bump(p); changed(); render(); };
    };
    render();
    m.el.parentElement.addEventListener('click', e => { if (e.target === m.el.parentElement || e.target.closest('.x')) draw(); });
  }
  function picker(p, after) {
    const sel = new Set(); let f = { q: '', cat: '', out: true };
    const m = modal(`<h3>➕ إضافة إلى «${esc(p.name)}» <small style="color:var(--mut)">(المتاح: ${30 - p.ids.length})</small></h3>
      <div class="filters"><input type="search" id="kq" placeholder="بحث…"><select id="kc"><option value="">كل التصنيفات</option>${Object.keys(S.cats).map(c => `<option value="${esc(c)}">${esc(cName(c))}</option>`).join('')}</select>
        <label><input type="checkbox" id="ko" checked> خارج الحزم فقط</label><span class="chip" id="kn"></span><button class="btn sm" id="kok">✓ إضافة المحدد</button></div>
      <div class="pe-grid" id="kg"></div>`);
    const E = m.el, lst = () => { const k = strip(f.q).toLowerCase();
      const L = S.idx.filter(it => live(it.id) && !p.ids.includes(it.id) && (!f.cat || it.cat === f.cat) && (!f.out || !S.cat.packs.some(x => x.ids.includes(it.id))) && (!k || it.id.toLowerCase().includes(k) || strip(it.ar).includes(k)));
      E.querySelector('#kg').innerHTML = L.slice(0, 300).map(it => `<div class="pe-it ${sel.has(it.id) ? 'tray' : ''}" data-id="${esc(it.id)}" title="${esc(it.ar)}" style="cursor:pointer"><img src="${esc(imgOf(it))}" alt="" loading="lazy"></div>`).join('') || '<div class="empty-st">لا نتائج</div>';
      E.querySelector('#kn').textContent = 'المحدد ' + sel.size + ' · المعروض ' + L.length; };
    E.querySelector('#kq').oninput = e => { f.q = e.target.value; lst(); }; E.querySelector('#kc').onchange = e => { f.cat = e.target.value; lst(); }; E.querySelector('#ko').onchange = e => { f.out = e.target.checked; lst(); };
    E.querySelector('#kg').onclick = e => { const d = e.target.closest('[data-id]'); if (!d) return; const id = d.dataset.id;
      if (sel.has(id)) sel.delete(id); else { if (p.ids.length + sel.size >= 30) return toast('الحزمة تتسع لـ30 ملصقًا'); sel.add(id); } d.classList.toggle('tray', sel.has(id)); E.querySelector('#kn').textContent = 'المحدد ' + sel.size; };
    E.querySelector('#kok').onclick = () => { p.ids.push(...sel); bump(p); changed(); m.close(); after(); };
    lst();
  }
  function autoDialog() {
    const m = modal(`<h3>⚙️ توزيع الملصقات على حزم تلقائيًا</h3>
      <p class="hnote">تُجمع الملصقات حسب التصنيف، ويُقسم كل تصنيف إلى حزم متساوية تقريبًا لا تزيد على الحد المختار، وتُسمّى باسم التصنيف (مثل «أدعية ١»، «أدعية ٢»).</p>
      <div class="sform"><label>الحد الأقصى في الحزمة<select id="auN">${[30, 24, 20].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label>ما يُوزَّع<select id="auS"><option value="out">الملصقات خارج الحزم فقط (تبقى الحزم الحالية كما هي)</option><option value="all">كل الملصقات من جديد (تُحذف الحزم الحالية)</option></select></label>
        <label style="justify-content:flex-end"><span><input type="checkbox" id="auH" checked> استبعاد الملصقات الموقوفة</span></label>
        <label style="justify-content:flex-end"><span><input type="checkbox" id="auA" checked> وزّع الحزم الجديدة على التطبيقات أيضًا</span></label></div>
      <div id="auP" class="hnote"></div><button class="btn" id="auOk">✓ توزيع</button>`, 'nar');
    const E = m.el, plan = () => {
      const N = +E.querySelector('#auN').value, all = E.querySelector('#auS').value === 'all', noHid = E.querySelector('#auH').checked;
      const inPk = new Set(all ? [] : S.cat.packs.flatMap(p => p.ids));
      const L = S.idx.filter(it => live(it.id) && !inPk.has(it.id) && (!noHid || isOn(it.id)));
      const order = Object.keys(S.cats).concat([...new Set(L.map(i => i.cat))].filter(c => !S.cats[c]));
      const out = [];
      order.forEach(c => { const g = L.filter(i => (i.cat || 'occasion') === c).map(i => i.id); if (!g.length) return; const n = Math.ceil(g.length / N), sz = Math.ceil(g.length / n);
        for (let i = 0; i < n; i++) out.push({ cat: c, name: cName(c) + (n > 1 ? ' ' + AR(i + 1) : ''), nameEn: ((S.cats[c] || {}).en || c) + (n > 1 ? ' ' + (i + 1) : ''), ids: g.slice(i * sz, (i + 1) * sz) }); });
      const tiny = out.filter(p => p.ids.length < 3);
      E.querySelector('#auP').innerHTML = `<b>${L.length}</b> ملصقًا ← <b>${out.length}</b> حزمة${tiny.length ? ` · ⚠️ ${tiny.length} حزمة فيها أقل من 3 ملصقات (${tiny.map(p => esc(p.name)).join('، ')}) — ستُدمج مع حزمة أخرى أو أضف إليها لاحقًا` : ''}`;
      return { out, all };
    };
    E.querySelectorAll('select,input').forEach(x => x.onchange = plan); plan();
    E.querySelector('#auOk').onclick = () => {
      const { out, all } = plan(); if (!out.length) return toast('لا توجد ملصقات للتوزيع');
      if (all && !confirm('سيُحذف ' + S.cat.packs.length + ' حزمة حالية وتُنشأ ' + out.length + ' حزمة جديدة. متابعة؟')) return;
      if (all) { S.cat.packs = []; S.cat.apps.forEach(a => a.packs = []); }
      // الحزم الصغيرة جدًا (أقل من 3) تُضم إلى حزمة «متنوعة»
      const small = out.filter(p => p.ids.length < 3), big = out.filter(p => p.ids.length >= 3), misc = small.flatMap(p => p.ids);
      for (let i = 0; i < misc.length; i += 30) big.push({ name: 'متنوعة' + (misc.length > 30 ? ' ' + AR(i / 30 + 1) : ''), nameEn: 'Mixed', ids: misc.slice(i, i + 30) });
      const made = big.filter(p => p.ids.length).map(x => { const p = newPack(x.name); p.nameEn = x.nameEn; p.ids = x.ids; return p; });
      if (E.querySelector('#auA').checked) autoApps(made.map(p => p.id));
      changed(); m.close(); draw(); toast('أُنشئت ' + made.length + ' حزمة');
    };
  }

  /* ---------- التطبيقات ---------- */
  function newApp() {
    const n = S.cat.apps.length, used = new Set(S.cat.apps.map(a => a.id)); let i = 0; while (used.has(LATIN[i])) i++;
    const a = { id: LATIN[i], letter: LETTERS[i], name: 'ملصقات مشكاة (' + LETTERS[i] + ')', nameEn: 'Mishkat Stickers (' + LATIN[i].toUpperCase() + ')', appId: i === 0 ? 'com.mishkat.stickers' : 'com.mishkat.stickers.' + LATIN[i], packs: [] };
    S.cat.apps.push(a); return a;
  }
  function autoApps(pids) {
    pids = (pids || S.cat.packs.map(p => p.id)).filter(id => !appOf(id));
    pids.forEach(id => { let a = S.cat.apps.find(x => x.packs.length < 10); if (!a) a = newApp(); a.packs.push(id); });
  }
  function viewApps() {
    const free = S.cat.packs.filter(p => !appOf(p.id));
    q('#sView').innerHTML = `
      <div class="row" style="margin-bottom:12px"><button class="btn" id="apNew">➕ تطبيق جديد (${esc(LETTERS[S.cat.apps.length] || '')})</button>
        <button class="btn blue" id="apAuto" ${free.length ? '' : 'disabled'}>⚙️ توزيع الحزم غير الموزعة (${free.length}) تلقائيًا</button>
        <span class="hnote" style="margin:0">واتساب يسمح بـ10 حزم على الأكثر لكل تطبيق. كل تطبيق يُبنى ملف APK مستقلًا ويُثبَّت بجانب الآخر.</span></div>
      <div class="plist">${S.cat.apps.map((a, i) => { const ps = a.packs.map(id => S.cat.packs.find(p => p.id === id)).filter(Boolean), n = new Set(ps.flatMap(p => p.ids.filter(live))).size;
        return `<div class="pcard acard" data-a="${esc(a.id)}">
          <div class="ph"><span class="letter">${esc(a.letter)}</span><div><b>${esc(a.name)}</b><small>${ps.length}/10 حزم · ${n} ملصقًا · <span class="mono">${esc(a.appId)}</span></small></div></div>
          <div style="font-size:13px;line-height:1.9">${ps.map(p => `📦 ${esc(p.name)} <small style="color:var(--mut)">(${p.ids.length})</small>`).join('<br>') || '<span style="color:var(--mut)">لا توجد حزم</span>'}</div>
          <small class="hnote" style="margin:0">ملف التنزيل: <span class="mono">${esc(apkName(a))}</span></small>
          <div class="row"><button class="btn sm" data-edit>✎ الحزم والاسم</button><span style="flex:1"></span>${i === 0 ? '' : '<button class="btn red sm" data-del>🗑</button>'}</div></div>`; }).join('')}</div>`;
    q('#apNew').onclick = () => { if (S.cat.apps.length >= LETTERS.length) return; const a = newApp(); changed(); editApp(a.id); };
    q('#apAuto').onclick = () => { autoApps(); changed(); draw(); toast('وُزّعت الحزم على التطبيقات'); };
    q('.plist').onclick = e => { const c = e.target.closest('[data-a]'); if (!c) return; const id = c.dataset.a;
      if (e.target.closest('[data-edit]')) return editApp(id);
      if (e.target.closest('[data-del]')) { const a = S.cat.apps.find(x => x.id === id); if (!confirm('حذف «' + a.name + '»؟ حزمه تصبح بلا تطبيق.')) return; S.cat.apps = S.cat.apps.filter(x => x.id !== id); changed(); draw(); } };
  }
  const apkName = a => a.appId === 'com.mishkat.stickers' ? 'mishkat-stickers.apk' : 'mishkat-stickers-' + a.id + '.apk';
  function editApp(aid) {
    const a = S.cat.apps.find(x => x.id === aid); if (!a) return;
    const m = modal(`<h3>📱 ${esc(a.name)}</h3>
      <div class="sform"><label>الاسم بالعربية<input id="axN" value="${esc(a.name)}"></label><label>الاسم بالإنجليزية<input id="axE" value="${esc(a.nameEn)}" dir="ltr"></label>
        <label>معرّف أندرويد (لا تغيّره بعد نشر التطبيق)<input id="axI" class="mono" value="${esc(a.appId)}"></label></div>
      <b>الحزم (حتى 10):</b> <span id="axC" class="chip"></span>
      <div class="apk" id="axL">${S.cat.packs.map(p => { const o = appOf(p.id); return `<label class="${o && o.id !== aid ? 'dis' : ''}"><input type="checkbox" value="${esc(p.id)}" ${a.packs.includes(p.id) ? 'checked' : ''}> ${esc(p.name)} <small>${p.ids.length} ملصقًا${o && o.id !== aid ? ' · في ' + esc(o.name) + ' (ستُنقل)' : ''}</small></label>`; }).join('')}</div>
      <p class="hnote">ترتيب الحزم في التطبيق هو ترتيبها في تبويب «الحزم».</p>
      <button class="btn" id="axOk">✓ حفظ</button>`, 'nar');
    const E = m.el, cnt = () => { const n = E.querySelectorAll('#axL input:checked').length; E.querySelector('#axC').textContent = n + '/10'; E.querySelector('#axC').style.background = n > 10 ? '#fbd5d5' : ''; };
    E.querySelector('#axL').onchange = cnt; cnt();
    E.querySelector('#axOk').onclick = () => {
      const ch = [...E.querySelectorAll('#axL input:checked')].map(i => i.value); if (ch.length > 10) return toast('الحد 10 حزم لكل تطبيق');
      const id = E.querySelector('#axI').value.trim(); if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(id)) return toast('معرّف أندرويد غير صالح');
      if (S.cat.apps.some(x => x !== a && x.appId === id)) return toast('المعرّف مستخدم في تطبيق آخر');
      S.cat.apps.forEach(x => { if (x !== a) x.packs = x.packs.filter(p => !ch.includes(p)); });
      a.packs = S.cat.packs.map(p => p.id).filter(p => ch.includes(p)); a.name = E.querySelector('#axN').value.trim() || a.name; a.nameEn = E.querySelector('#axE').value.trim(); a.appId = id;
      changed(); m.close(); draw();
    };
  }

  /* ---------- النشر ---------- */
  function buildFiles() {
    const delIds = new Set(Object.keys(S.dels));
    const idx = S.idx.filter(it => !delIds.has(it.id));
    const cat = clone(S.cat);
    cat.packs.forEach(p => { p.ids = p.ids.filter(id => !delIds.has(id) && idx.some(i => i.id === id)); if (p.tray && !p.ids.includes(p.tray)) p.tray = ''; });
    Object.keys(cat.review).forEach(id => { if (!idx.some(i => i.id === id)) delete cat.review[id]; });
    cat.version = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13); cat.updated = new Date().toISOString();
    // ملفات صفحة «ملصقات مشكاة» في الموقع: المكتبة كاملة + حزم التطبيق (أ)
    const lib = { cats: S.cats, items: idx.map(it => ({ id: it.id, src: srcOf(it), cat: it.cat || 'occasion', ar: it.ar || '', en: it.en || it.ar || '', em: (S.libMeta[it.id] || {}).em || EMO[it.cat] || ['😊'], acc: (S.libMeta[it.id] || {}).acc || it.en || '' })) };
    const A = cat.apps[0], byId = {}; idx.forEach(i => byId[i.id] = i);
    const def = { android_play_store_link: '', ios_app_store_link: '', catalog_version: cat.version, sticker_packs: (A ? A.packs : []).map(pid => cat.packs.find(p => p.id === pid)).filter(p => p && p.ids.length >= 3).map(p => ({
      identifier: p.id, name: p.name, name_en: p.nameEn || '', publisher: 'مشكاة · Mishkat', tray_image_file: 'tray_' + (p.tray || p.ids[0]) + '.png', image_data_version: String(p.v || 1), avoid_cache: false,
      publisher_email: 'mishkatapps@gmail.com', publisher_website: 'https://mishkatapps.github.io/', privacy_policy_website: '', license_agreement_website: '', animated_sticker_pack: false,
      stickers: p.ids.slice(0, 30).map(id => ({ image_file: id + '.webp', emojis: (lib.items.find(x => x.id === id) || {}).em || ['😊'], accessibility_text: (byId[id].en || byId[id].ar || '').slice(0, 120) })) })) };
    const J = o => JSON.stringify(o, null, 0);
    const files = [{ path: P.idx, text: J(idx) }, { path: P.cat, text: JSON.stringify(cat, null, 1) }, { path: P.lib, text: J(lib) }, { path: P.def, text: J(def) }];
    const imgs = Object.entries(S.up).filter(([id]) => !delIds.has(id)).map(([id, u]) => ({ path: 'img/stickers/' + id + '.' + u.ext, b64: u.b64, old: u.oldSrc && u.oldSrc !== id + '.' + u.ext ? 'img/stickers/' + u.oldSrc : '' }));
    const dels = [];
    S.base.idx.filter(it => delIds.has(it.id)).forEach(it => dels.push({ path: 'img/stickers/' + srcOf(it), del: true }));
    imgs.forEach(f => { if (f.old) dels.push({ path: f.old, del: true }); delete f.old; });
    return { files, imgs, dels, cat };
  }
  async function publish() {
    if (!S.canGh) return;
    const warn = S.cat.packs.filter(p => packIssues(p).some(x => /أقل من 3|أكثر من 30/.test(x)));
    const { files, imgs, dels, cat } = buildFiles();
    if (!confirm(`نشر التغييرات إلى الموقع؟\n• ${imgs.length} صورة · ${dels.length} ملف للحذف\n• ${cat.packs.length} حزمة · ${cat.apps.length} تطبيق${warn.length ? '\n⚠️ ' + warn.length + ' حزمة فيها أقل من 3 ملصقات ظاهرة أو أكثر من 30 (لن تظهر في واتساب كما هي)' : ''}\n\nبعد النشر: الموقع يتحدث خلال دقيقة أو اثنتين، والتطبيقات تتحدث عند بنائها في المرة القادمة.`)) return;
    const bar = q('#sBar'); const prog = t => { bar.innerHTML = `<div class="loading" style="padding:0;color:#fff"><div class="spin"></div>${esc(t)}</div>`; };
    try {
      // الصور على دفعات (حد حجم الطلب)، ثم الملفات النصية والحذف في Commit أخير
      let res = null;
      for (let i = 0; i < imgs.length; i += 25) { prog('رفع الصور ' + (i + 1) + '–' + Math.min(i + 25, imgs.length) + ' من ' + imgs.length + '…'); res = await run('stkCommit', imgs.slice(i, i + 25), 'ملصقات: رفع ' + Math.min(25, imgs.length - i) + ' صورة من لوحة المدير'); }
      prog('حفظ الفهرس والحزم والتطبيقات…');
      res = await run('stkCommit', files.concat(dels), 'ملصقات: تحديث الفهرس والحزم والتطبيقات من لوحة المدير');
      S.last = { url: res.url, when: new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }) };
      Object.values(S.up).forEach(u => { try { URL.revokeObjectURL(u.url); } catch (e) {} });
      S.bust = Date.now(); try { localStorage.removeItem(DKEY); } catch (e) {}
      toast('نُشرت التغييرات ✓');
      await load();
    } catch (e) { toast('تعذّر النشر: ' + (e.message || e)); drawBar(); alert('تعذّر النشر:\n' + (e.message || e) + '\n\nتغييراتك ما زالت محفوظة في المسودة.'); }
  }

  window.mkStickers = { open: () => { if (!S.loaded) load(); }, reload: () => { if (dirty() && !confirm('إعادة التحميل تحتفظ بالمسودة لكن تُسقط الصور غير المنشورة. متابعة؟')) return; load(); } };
})();
