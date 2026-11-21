/* ملصقات مشكاة — واجهة واحدة للتطبيق (أندرويد) وللموقع.
   • المكتبة: كل ملصقات مشكاة مقسّمة بالتصنيف.
   • «حزمي لواتساب» (في التطبيق): واتساب يسمح بـ10 حزم على الأكثر لكل تطبيق، وفي الحزمة من 3 إلى 30 ملصقًا؛
     لذلك تأتي 10 حزم جاهزة يستطيع المستخدم تعديلها (إضافة/حذف ملصقات وتغيير الاسم) ثم إضافتها إلى واتساب.
   • في المتصفح: لا يسمح واتساب بإضافة ملصقات من مواقع الويب، فنعرض تنزيل التطبيق وطريقة «إنشاء ملصق» داخل واتساب. */
(function () {
  'use strict';
  const APK = 'https://github.com/mohammadelshennawy-bit/mishkat-stickers/releases/latest/download/mishkat-stickers.apk';
  const SITE = !!window.MKS_SITE;   // صفحة الموقع تستخدم ملفات img/stickers نفسها
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  let EN = (store.get('mks-lang', '') || (/^ar/i.test(navigator.language || 'ar') ? 'ar' : 'en')) === 'en';
  const qs = new URLSearchParams(location.search); if (qs.get('lang') === 'en') EN = true; if (qs.get('lang') === 'ar') EN = false;
  const T = {
    title: ['ملصقات مشكاة', 'Mishkat Stickers'], sub: ['ملصقات إسلامية تُضاف إلى واتساب كملصقات حقيقية', 'Islamic stickers you can add to WhatsApp as real stickers'],
    foot: ['مشكاة — برمجيات نافعة', 'Mishkat — beneficial software'], ver: ['الإصدار', 'Version'],
    lib: ['🗂 المكتبة', '🗂 Library'], mine: ['📦 حزمي لواتساب', '📦 My WhatsApp packs'], all: ['الكل', 'All'],
    add: ['➕ أضف إلى واتساب', '➕ Add to WhatsApp'], added: ['✓ مضافة', '✓ Added'], adding: ['جارٍ الفتح…', 'Opening…'],
    addBiz: ['➕ واتساب الأعمال', '➕ WhatsApp Business'], upd: ['↻ حدّث في واتساب', '↻ Update in WhatsApp'],
    stickers: ['ملصق', 'stickers'], share: ['↗ مشاركة صورةً', '↗ Share as image'], dl: ['⬇ تنزيل', '⬇ Download'], close: ['إغلاق', 'Close'],
    toPack: ['➕ أضف إلى حزمة', '➕ Add to a pack'], choosePack: ['اختر الحزمة', 'Choose a pack'], full: ['ممتلئة', 'full'], inPack: ['موجود', 'already in'],
    edit: ['✎ تعديل', '✎ Edit'], done: ['تم', 'Done'], rename: ['✎ الاسم', '✎ Rename'], newName: ['اسم الحزمة:', 'Pack name:'],
    makeIcon: ['اجعله الأيقونة', 'Make it the icon'], remove: ['✕ احذف من الحزمة', '✕ Remove from pack'], reset: ['↺ استعادة الحزمة الأصلية', '↺ Restore original pack'],
    min3: ['تحتاج الحزمة 3 ملصقات على الأقل', 'A pack needs at least 3 stickers'], max30: ['الحزمة ممتلئة (30 ملصقًا)', 'The pack is full (30 stickers)'],
    addedTo: ['أُضيف إلى ', 'Added to '], removed: ['حُذف من الحزمة', 'Removed from the pack'], editHint: ['اضغط على ملصق لحذفه أو جعله أيقونة الحزمة. ولإضافة ملصقات: افتح «المكتبة» واضغط على الملصق ← «أضف إلى حزمة».', 'Tap a sticker to remove it or make it the pack icon. To add stickers, open the Library, tap a sticker → “Add to a pack”.'],
    okAdded: ['أُضيفت الحزمة — تجدها في درج الملصقات في واتساب 🎉', 'Pack added — find it in WhatsApp’s sticker tray 🎉'],
    cancelled: ['لم تُضف الحزمة', 'Pack was not added'], noWa: ['واتساب غير مثبّت على هذا الهاتف', 'WhatsApp is not installed on this phone'], errAdd: ['تعذّرت الإضافة: ', 'Could not add: '],
    nativeHint: ['في «حزمي لواتساب» 10 حزم جاهزة: اضغط «أضف إلى واتساب» لكل حزمة ووافق في نافذة واتساب، ثم تجد الملصقات في درج الملصقات 😊. ويمكنك تعديل أي حزمة بملصقات من المكتبة (حتى 30 في الحزمة).', '“My WhatsApp packs” has 10 ready packs: tap “Add to WhatsApp” on each and confirm in WhatsApp, then find them in the sticker tray 😊. You can edit any pack with stickers from the Library (up to 30 per pack).'],
    webTitle: ['لإرسال هذه الملصقات «كملصقات» في واتساب', 'To send these as real WhatsApp stickers'],
    webApp: ['📱 حمّل تطبيق «ملصقات مشكاة» لأندرويد', '📱 Get the Mishkat Stickers app for Android'],
    webAppTip: ['يضيف الحزم إلى درج ملصقات واتساب بضغطة — مجاني وبلا إعلانات.', 'Adds packs to WhatsApp’s sticker tray with one tap — free, no ads.'],
    webOr: ['أو بدون تطبيق (آيفون وأندرويد وواتساب ويب):', 'Or without the app (iPhone, Android, WhatsApp Web):'],
    webSteps: ['نزّل الملصق من هنا ← في واتساب افتح درج الملصقات 😊 ← «إنشاء ملصق» ← اختر الصورة ← أرسِل. سيُحفظ في ملصقاتك.', 'Download the sticker here → in WhatsApp open the sticker tray 😊 → “Create sticker” → pick the image → send. It will be saved to your stickers.'],
    whyImg: ['ملاحظة: مشاركة الصورة من أي تطبيق آخر تصل «صورة» لا «ملصقًا» — هذا قيد في واتساب نفسه.', 'Note: sharing an image from other apps arrives as a photo, not a sticker — a WhatsApp limitation.'],
    shareTip: ['المشاركة ترسله صورةً. ليصل ملصقًا: أضفه إلى إحدى حزمك ثم أرسله من درج الملصقات في واتساب.', 'Sharing sends it as an image. To send a real sticker, add it to one of your packs and send it from WhatsApp’s sticker tray.']
  };
  const t = k => (T[k] || [k, k])[EN ? 1 : 0];
  const toast = m => { const o = $('#toast'); o.textContent = m; o.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => o.classList.remove('on'), 2600); };
  const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const PL = {}; const plug = n => { const C = window.Capacitor; if (!C) return null; if (!PL[n]) PL[n] = (C.Plugins && C.Plugins[n]) || (C.registerPlugin ? C.registerPlugin(n) : null); return PL[n]; };
  const WS = () => native() ? plug('WaStickers') : null;

  let LIB = { cats: {}, items: [] }, BY = {}, DEF = null, PACKS = [], ST = {}, OFF = {};
  /* إتاحة الملصقات: ورقة «إتاحة الملصقات» في جدول بنك التهاني (يتحكم فيها المدير من لوحته). ما لم يُذكر فيها يظهر. */
  const SHEET = '1cR7mfBJTQsePtKjPTtSFrOw4f4HMNG_h1FkHVTBmHN8';
  try { OFF = JSON.parse(store.get('mks-off', '{}')) || {}; } catch (e) { OFF = {}; }
  function csv(t) { const R = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); R.push(r); r = []; f = ''; } else if (c !== '\r') f += c; }
    if (f || r.length) { r.push(f); R.push(r); } return R; }
  async function fetchOff() {
    const u = 'https://docs.google.com/spreadsheets/d/' + SHEET + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent('إتاحة الملصقات') + '&_=' + Math.floor(Date.now() / 300000);
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
    try { const rows = csv(await (await fetch(u, { signal: ctl.signal })).text()), h = (rows[0] || []).map(x => String(x).trim()), iI = h.indexOf('المعرّف'), iE = h.indexOf('مفعّل');
      if (iI < 0 || iE < 0) return null; const o = {};
      rows.slice(1).forEach(r => { if (/^(لا|no|false|0)$/i.test(String(r[iE] || '').trim())) o[String(r[iI]).trim()] = 1; });
      return o; } catch (e) { return null; } finally { clearTimeout(tm); }
  }
  const avail = id => BY[id] && !OFF[id];
  const hash = a => { let h = 5381; a.join(',').split('').forEach(c => h = ((h << 5) + h + c.charCodeAt(0)) >>> 0); return h.toString(36); };
  let VIEW = store.get('mks-view', 'mine'), CAT = store.get('mks-cat', ''), EDIT = '';
  if (!native()) VIEW = 'lib';
  const img = it => SITE ? '../img/stickers/' + it.src : 'stickers/all/' + it.id + '.webp';
  const tray = id => SITE ? img(BY[id]) : 'stickers/tray/' + id + '.png';
  const catName = k => { const c = LIB.cats[k]; return c ? (EN ? c.en : c.ar) : k; };

  /* ---------- «حزمي»: الحالة والحفظ ---------- */
  function seedPacks() {
    return DEF.sticker_packs.map((p, i) => ({ id: p.identifier, name: p.name, nameEn: p.name_en || '', ids: p.stickers.map(s => s.image_file.replace(/\.webp$/, '')), v: 1, def: i }));
  }
  function loadPacks() {
    let s = null; try { s = JSON.parse(store.get('mks-packs-v1', 'null')); } catch (e) {}
    // نشر حزم جديدة من لوحة المدير (catalog_version) يعيد الحزم الافتراضية الجديدة بدل القديمة المحفوظة
    const ver = DEF.catalog_version || ''; if (ver && store.get('mks-cat-ver', '') !== ver) { s = null; store.set('mks-cat-ver', ver); }
    PACKS = Array.isArray(s) && s.length ? s.filter(p => p && p.id).map(p => Object.assign(p, { ids: (p.ids || []).filter(id => BY[id]) })) : seedPacks();
  }
  function contents() {   // بصيغة contents.json التي يقرؤها مزوّد الملصقات في أندرويد
    return { android_play_store_link: '', ios_app_store_link: '', sticker_packs: PACKS.map(p => Object.assign({}, p, { ids: p.ids.filter(avail) })).filter(p => p.ids.length >= 3).map(p => ({
      identifier: p.id, name: (p.name || 'مشكاة').slice(0, 120), publisher: 'مشكاة · Mishkat', tray_image_file: 'tray_' + p.ids[0] + '.png',
      image_data_version: (p.v || 1) + '.' + hash(p.ids.slice(0, 30)), avoid_cache: false, publisher_email: 'mishkatapps@gmail.com', publisher_website: 'https://mishkatapps.github.io/',
      privacy_policy_website: '', license_agreement_website: '', animated_sticker_pack: false,
      stickers: p.ids.slice(0, 30).map(id => ({ image_file: id + '.webp', emojis: BY[id].em || ['😊'], accessibility_text: BY[id].acc || '' })) })) };
  }
  async function savePacks(changed) {
    if (changed) { const p = PACKS.find(x => x.id === changed); if (p) p.v = (p.v || 1) + 1; }
    store.set('mks-packs-v1', JSON.stringify(PACKS));
    const P = WS(); if (P && P.savePacks) { try { await P.savePacks({ json: JSON.stringify(contents()) }); } catch (e) { toast(String(e && e.message || e)); } }
  }
  const packName = p => EN && p.nameEn ? p.nameEn : p.name;

  /* ---------- الرسم ---------- */
  function applyLang() {
    document.documentElement.lang = EN ? 'en' : 'ar'; document.documentElement.dir = EN ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
    $('#lang').textContent = EN ? 'ع' : 'EN'; document.title = t('title') + (EN ? ' — Islamic stickers for WhatsApp' : ' — ملصقات إسلامية لواتساب');
  }
  function hint() {
    const h = $('#hint');
    if (native()) { h.innerHTML = `<p>${esc(t('nativeHint'))}</p>`; return; }
    h.innerHTML = `<h2>${esc(t('webTitle'))}</h2>
      <a class="btn gold big" href="${APK}" data-ev="apk">${esc(t('webApp'))}</a><p class="mut">${esc(t('webAppTip'))}</p>
      <details><summary>${esc(t('webOr'))}</summary><p>${esc(t('webSteps'))}</p><p class="mut">${esc(t('whyImg'))}</p></details>`;
  }
  function nav() {
    const vis = LIB.items.filter(i => !OFF[i.id]), cats = Object.keys(LIB.cats).filter(k => vis.some(i => i.cat === k));
    $('#packs').innerHTML = (native() ? `<div class="views"><button class="vw ${VIEW === 'mine' ? 'on' : ''}" data-v="mine">${esc(t('mine'))}</button><button class="vw ${VIEW === 'lib' ? 'on' : ''}" data-v="lib">${esc(t('lib'))}</button></div>` : '') +
      (VIEW === 'lib' ? `<div class="chips"><button class="pk ${!CAT ? 'on' : ''}" data-c="">${esc(t('all'))} <small>${vis.length}</small></button>` +
        cats.map(k => `<button class="pk ${CAT === k ? 'on' : ''}" data-c="${k}">${esc(catName(k))} <small>${vis.filter(i => i.cat === k).length}</small></button>`).join('') + '</div>' : '');
  }
  function gridOf(ids, attr) { return `<div class="grid">${ids.map(id => `<button class="st" ${attr}="${id}" aria-label="${esc(EN ? BY[id].en || BY[id].ar : BY[id].ar)}"><img src="${img(BY[id])}" alt="" loading="lazy"></button>`).join('')}</div>`; }
  function render() {
    nav();
    const box = $('#pack');
    if (VIEW === 'lib') { const L = LIB.items.filter(i => !OFF[i.id] && (!CAT || i.cat === CAT)).map(i => i.id); box.innerHTML = gridOf(L, 'data-s'); return; }
    if (EDIT) { const p = PACKS.find(x => x.id === EDIT); if (!p) { EDIT = ''; return render(); }
      box.innerHTML = `<div class="ph"><img src="${p.ids.filter(avail)[0] ? tray(p.ids.filter(avail)[0]) : ''}" alt=""><div><h2>${esc(packName(p))}</h2><small>${p.ids.length}/30 ${esc(t('stickers'))}</small></div>
        <div class="acts"><button class="btn" data-rename="${p.id}">${esc(t('rename'))}</button><button class="btn" data-reset="${p.id}">${esc(t('reset'))}</button><button class="btn gold" data-done>${esc(t('done'))}</button></div></div>
        <p class="mut">${esc(t('editHint'))}</p>${gridOf(p.ids.filter(avail), 'data-e')}`; return; }
    box.innerHTML = PACKS.map(p => `<article class="pc"><div class="ph"><img src="${p.ids.filter(avail)[0] ? tray(p.ids.filter(avail)[0]) : ''}" alt=""><div><h2>${esc(packName(p))}</h2><small>${p.ids.length}/30 ${esc(t('stickers'))}</small></div>
        <div class="acts" data-acts="${p.id}">${addButtons(p)}<button class="btn" data-edit="${p.id}">${esc(t('edit'))}</button></div></div>
        <div class="strip">${p.ids.filter(avail).slice(0, 8).map(id => `<img src="${img(BY[id])}" alt="" loading="lazy">`).join('')}</div></article>`).join('');
    PACKS.forEach(p => { if (!ST[p.id]) status(p.id).then(() => { const a = document.querySelector(`[data-acts="${p.id}"]`); if (a) a.innerHTML = addButtons(p) + `<button class="btn" data-edit="${p.id}">${esc(t('edit'))}</button>`; }); });
  }

  /* ---------- واتساب ---------- */
  async function status(id) { const P = WS(); if (!P) return null; try { ST[id] = await P.status({ id }); } catch (e) { ST[id] = null; } return ST[id]; }
  function addButtons(p) {
    if (!native()) return '';
    if (p.ids.filter(avail).length < 3) return `<span class="chip warn">${esc(t('min3'))}</span>`;
    const s = ST[p.id];
    if (!s) return `<button class="btn wa" data-add="${p.id}">${esc(t('add'))}</button>`;
    if (!s.whatsapp && !s.business) return `<span class="chip warn">${esc(t('noWa'))}</span>`;
    let h = '';
    if (s.whatsapp) h += s.addedWa ? `<span class="chip ok">${esc(t('added'))}</span>` : `<button class="btn wa" data-add="${p.id}" data-target="com.whatsapp">${esc(t('add'))}</button>`;
    if (s.business) h += s.addedWb ? `<span class="chip ok">${esc(t('added'))} (Business)</span>` : `<button class="btn wa" data-add="${p.id}" data-target="com.whatsapp.w4b">${esc(t('addBiz'))}</button>`;
    return h;
  }
  async function add(id, target) {
    const P = WS(), p = PACKS.find(x => x.id === id); if (!P || !p) return;
    if (p.ids.filter(avail).length < 3) return toast(t('min3'));
    await savePacks();
    const b = document.querySelector(`[data-add="${id}"]${target ? `[data-target="${target}"]` : ''}`); if (b) { b.disabled = true; b.textContent = t('adding'); }
    try {
      const r = await P.add({ id, name: packName(p), target: target || '' });
      if (r && r.ok) toast(t('okAdded')); else if (r && r.error) toast(t('errAdd') + r.error); else toast(t('cancelled'));
    } catch (e) { toast(/NO_WHATSAPP/.test(String(e && (e.code || e.message))) ? t('noWa') : t('errAdd') + (e && e.message || e)); }
    delete ST[id]; render();
  }

  /* ---------- مشاركة وتنزيل ---------- */
  async function blobOf(url, type) {
    const b = await (await fetch(url)).blob(); if (!type || b.type === type) return b;
    const im = await createImageBitmap(b), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
    return await new Promise(r => c.toBlob(r, type));
  }
  const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
  async function shareSticker(it) {
    try {
      const blob = await blobOf(img(it), 'image/png'), name = `mishkat-${it.id}.png`;
      const SH = plug('Share'), FS = plug('Filesystem');
      if (native() && SH && FS) { const w = await FS.writeFile({ path: name, data: await b64(blob), directory: 'CACHE' }); await SH.share({ files: [w.uri], dialogTitle: t('share') }); return; }
      const f = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; }
      download(it);
    } catch (e) { if (!/cancel|abort/i.test(String(e && (e.message || e)))) toast(String(e && e.message || e)); }
  }
  async function download(it) {
    const blob = await blobOf(img(it), 'image/png'), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `mishkat-${it.id}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- النوافذ ---------- */
  function sheet(html, onClick) {
    const w = $('#sheet'); w.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="x" aria-label="${esc(t('close'))}">✕</button>${html}</div>`; w.hidden = false;
    w.onclick = e => { if (e.target === w || e.target.closest('.x')) { w.hidden = true; return; } onClick(e, () => { w.hidden = true; }); };
  }
  function libSheet(id) {
    const it = BY[id];
    sheet(`<img class="big" src="${img(it)}" alt="${esc(EN ? it.en || it.ar : it.ar)}">
      <div class="row">${native() ? `<button class="btn wa" data-topack>${esc(t('toPack'))}</button>` : ''}<button class="btn" data-share>${esc(t('share'))}</button>${native() ? '' : `<button class="btn" data-dl>${esc(t('dl'))}</button>`}</div>
      <p class="mut">${esc(native() ? t('shareTip') : t('webSteps'))}</p>`, (e, close) => {
      if (e.target.closest('[data-share]')) shareSticker(it);
      if (e.target.closest('[data-dl]')) download(it);
      if (e.target.closest('[data-topack]')) choosePack(id);
    });
  }
  function choosePack(id) {
    sheet(`<h3>${esc(t('choosePack'))}</h3><div class="plist">${PACKS.map(p => { const has = p.ids.includes(id), full = p.ids.length >= 30;
      return `<button class="pl" data-to="${p.id}" ${has || full ? 'disabled' : ''}><img src="${p.ids.filter(avail)[0] ? tray(p.ids.filter(avail)[0]) : ''}" alt=""><span>${esc(packName(p))}</span><small>${has ? t('inPack') : full ? t('full') : p.ids.length + '/30'}</small></button>`; }).join('')}</div>`, async (e, close) => {
      const b = e.target.closest('[data-to]'); if (!b) return;
      const p = PACKS.find(x => x.id === b.dataset.to); if (!p || p.ids.length >= 30) return toast(t('max30'));
      p.ids.push(id); close(); await savePacks(p.id); delete ST[p.id]; toast(t('addedTo') + packName(p));
    });
  }
  function editSheet(id) {
    const p = PACKS.find(x => x.id === EDIT), it = BY[id];
    sheet(`<img class="big" src="${img(it)}" alt=""><div class="row"><button class="btn" data-icon>${esc(t('makeIcon'))}</button><button class="btn danger" data-rm>${esc(t('remove'))}</button></div>`, async (e, close) => {
      if (e.target.closest('[data-icon]')) { p.ids = [id].concat(p.ids.filter(x => x !== id)); close(); await savePacks(p.id); render(); }
      if (e.target.closest('[data-rm]')) { p.ids = p.ids.filter(x => x !== id); close(); await savePacks(p.id); delete ST[p.id]; render(); toast(t('removed')); }
    });
  }

  /* ---------- الأحداث ---------- */
  document.addEventListener('click', async e => {
    const v = e.target.closest('.vw'); if (v) { VIEW = v.dataset.v; EDIT = ''; store.set('mks-view', VIEW); return render(); }
    const c = e.target.closest('[data-c]'); if (c && c.classList.contains('pk')) { CAT = c.dataset.c; store.set('mks-cat', CAT); return render(); }
    if (e.target.closest('#sheet')) return;
    const a = e.target.closest('#pack [data-add]'); if (a) return add(a.dataset.add, a.dataset.target);
    const ed = e.target.closest('[data-edit]'); if (ed) { EDIT = ed.dataset.edit; render(); return window.scrollTo(0, 0); }
    if (e.target.closest('[data-done]')) { EDIT = ''; return render(); }
    const rn = e.target.closest('[data-rename]'); if (rn) { const p = PACKS.find(x => x.id === rn.dataset.rename); const n = prompt(t('newName'), packName(p)); if (n && n.trim()) { if (EN) p.nameEn = n.trim().slice(0, 100); else p.name = n.trim().slice(0, 100); await savePacks(p.id); render(); } return; }
    const rs = e.target.closest('[data-reset]'); if (rs) { const p = PACKS.find(x => x.id === rs.dataset.reset), d = seedPacks().find(x => x.id === p.id); if (d) { p.ids = d.ids; p.name = d.name; p.nameEn = d.nameEn; await savePacks(p.id); render(); } return; }
    const s = e.target.closest('[data-s]'); if (s) return libSheet(s.dataset.s);
    const se = e.target.closest('[data-e]'); if (se) return editSheet(se.dataset.e);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#sheet').hidden = true; });
  $('#lang').onclick = () => { EN = !EN; store.set('mks-lang', EN ? 'en' : 'ar'); applyLang(); hint(); render(); };
  try { const A = plug('App'); if (A && A.addListener) A.addListener('resume', () => { ST = {}; render(); }); } catch (e) {}

  applyLang(); hint();
  Promise.all([fetch((SITE ? '' : '') + 'stickers/library.json').then(r => r.json()), fetch('stickers/packs-default.json').then(r => r.json())]).then(([L, D]) => {
    LIB = L; LIB.items.forEach(i => BY[i.id] = i); DEF = D;
    if (D.app_name) { T.title = [D.app_name, D.app_name_en || D.app_name]; applyLang(); }   // اسم التطبيق: «ملصقات مشكاة (ب)»…
    loadPacks();
    if (CAT && !LIB.cats[CAT]) CAT = '';
    render(); if (native()) savePacks();
    fetchOff().then(o => { if (!o) return; const ch = JSON.stringify(o) !== JSON.stringify(OFF); OFF = o; store.set('mks-off', JSON.stringify(o)); if (ch) { render(); if (native()) savePacks(); } });
  }).catch(() => toast('تعذّر تحميل الملصقات'));
  if ('serviceWorker' in navigator && !native() && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
