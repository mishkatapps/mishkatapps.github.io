/* مشكاة — تهاني المناسبات وتوصيات الوقت
   المصدر: جدول Google «بنك تهاني وتوصيات مشكاة» (ورقتا «المناسبات» و«العبارات»)،
   مع نسخة احتياطية في js/greet-data.js ونسخة مخبّأة في المتصفح. */
(function () {
  var SHEET_ID = '1cR7mfBJTQsePtKjPTtSFrOw4f4HMNG_h1FkHVTBmHN8';
  var EN = !!window.MK_EN, CK = 'mk-greet-v1';
  var box = document.getElementById('greet'); if (!box) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- قراءة الجدول ---------- */
  function csv(text) {   // محلل CSV بسيط يدعم علامات التنصيص والأسطر داخل الخانة
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function sheetUrl(name) { return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(name) + '&_=' + Math.floor(Date.now() / 300000); }
  function fetchBank() {
    return Promise.all(['المناسبات', 'العبارات'].map(function (n) {
      return fetch(sheetUrl(n), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(csv);
    })).then(function (a) { if (a[0].length < 2 || a[1].length < 2) throw 0; return { occ: a[0], msg: a[1] }; });
  }
  function toObjs(rows, map) {   // الأعمدة بأسماء الصف الأول — فلا يضر تغيير ترتيبها
    var h = rows[0].map(function (x) { return String(x).trim(); });
    return rows.slice(1).map(function (r) { var o = {}; Object.keys(map).forEach(function (k) { var i = h.indexOf(map[k]); o[k] = i < 0 ? '' : String(r[i] == null ? '' : r[i]).trim(); }); return o; });
  }
  function parse(bank) {
    var on = function (v) { return !/^(لا|no|false|0)$/i.test(v || ''); };
    var occ = toObjs(bank.occ, { key: 'المفتاح', name: 'المناسبة', en: 'English', hm: 'الشهر الهجري', d1: 'من يوم', d2: 'إلى يوم', wd: 'يوم الأسبوع', t1: 'من وقت', t2: 'إلى وقت', pr: 'الأولوية', on: 'مفعّل', rem: 'التذكير قبل (أيام)' }).filter(function (o) { return o.key && on(o.on); });
    var msg = toObjs(bank.msg, { key: 'المفتاح', type: 'النوع', ar: 'النص العربي', en: 'English', ev: 'الدليل', st: 'الملصق', img: 'صورة (رابط اختياري)', on: 'مفعّل' }).filter(function (m) { return m.key && (m.ar || m.en) && on(m.on); });
    return { occ: occ, msg: msg };
  }

  /* ---------- الوقت والتاريخ ---------- */
  var WD = { 'الأحد': 0, 'الاحد': 0, 'الاثنين': 1, 'الإثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الاربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6,
             sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  function parts(tz, date, cal) {
    var o = { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' };
    var p = {}; try { new Intl.DateTimeFormat('en-US-u-nu-latn' + (cal ? '-ca-' + cal : ''), o).formatToParts(date).forEach(function (x) { p[x.type] = x.value; }); } catch (e) {}
    return p;
  }
  function minsOf(tz, d) { var p = parts(tz, d); return (+p.hour % 24) * 60 + (+p.minute); }
  function context(now) {
    var P = window.MK_PRAY && window.MK_PRAY.now ? window.MK_PRAY.now() : null;
    var tz = P ? P.loc.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
    var h = parts(tz, now, 'islamic-umalqura'), g = parts(tz, now);
    var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g.weekday];
    var M = { now: minsOf(tz, now) };
    if (P) {
      ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (k) { M[k] = minsOf(tz, P.T[k]); });
      var night = 1440 - M.maghrib + M.fajr;
      M.mid = Math.round(M.maghrib + night / 2) % 1440;
      M.third = Math.round(M.fajr - night / 3 + 1440) % 1440;
    }
    return { hm: parseInt(h.month, 10), hd: parseInt(h.day, 10), wd: wd, M: M, ok: !!P };
  }
  var TK = { 'بداية اليوم': 'start', 'الفجر': 'fajr', 'الشروق': 'sunrise', 'الظهر': 'dhuhr', 'العصر': 'asr', 'المغرب': 'maghrib', 'العشاء': 'isha', 'منتصف الليل': 'mid', 'الثلث الأخير': 'third', 'نهاية اليوم': 'end' };
  function tmin(v, M, isEnd) {
    var k = TK[v] || String(v).toLowerCase();
    if (k === 'start') return 0; if (k === 'end') return 1440;
    var m = /^(\d{1,2}):(\d{2})$/.exec(v); if (m) return +m[1] * 60 + +m[2];   // يقبل أيضًا وقتًا صريحًا مثل 21:30
    return M[k] != null ? M[k] : (isEnd ? 1440 : 0);
  }
  function active(o, c) {
    var n = function (v) { var x = parseInt(v, 10); return isNaN(x) ? null : x; };
    if (String(o.hm).trim()) {   // شهر واحد أو أكثر بفاصلة: 11،12،1،7
      var ms = String(o.hm).split(/[،,؛;\s]+/).map(function (x) { return parseInt(x, 10); }).filter(function (x) { return !isNaN(x); });
      if (ms.length && ms.indexOf(c.hm) < 0) return false;
    }
    var d1 = n(o.d1), d2 = n(o.d2);
    if (d1 != null && c.hd < d1) return false;
    if ((d2 != null ? d2 : d1) != null && c.hd > (d2 != null ? d2 : d1)) return false;
    if (o.wd) {
      var days = o.wd.split(/[،,؛;\s]+/).filter(Boolean).map(function (w) { return WD[w.toLowerCase()]; });
      if (days.indexOf(c.wd) < 0) return false;
    }
    if (o.t1 || o.t2) {
      if (!c.ok && (TK[o.t1] || TK[o.t2])) return false;   // لا مواقيت ← لا نعرض توصيات مرتبطة بوقت
      var a = o.t1 ? tmin(o.t1, c.M) : 0, b = o.t2 ? tmin(o.t2, c.M, true) : 1440, t = c.M.now;
      if (a <= b ? !(t >= a && t < b) : !(t >= a || t < b)) return false;
    }
    return true;
  }

  /* ---------- الاختيار والعرض ---------- */
  var BANK = null, CUR = {};
  function pick(type, ctx, avoid) {
    var occ = BANK.occ.filter(function (o) { return active(o, ctx); }).sort(function (a, b) { return (+b.pr || 0) - (+a.pr || 0); });
    for (var i = 0; i < occ.length; i++) {
      var list = BANK.msg.filter(function (m) { return m.key === occ[i].key && (m.type === type || (type === 'توصية' && m.type === 'نصيحة')) && (EN ? m.en : m.ar); });
      if (!list.length) continue;
      if (avoid && list.length > 1) list = list.filter(function (m) { return m !== avoid; });
      return { occ: occ[i], m: list[Math.floor(Math.random() * list.length)], n: list.length };
    }
    return null;
  }
  function imgUrl(u) {   // روابط ملصقات مشكاة تُحمَّل من نفس الموقع (أسرع، وتسمح برسمها في صورة المشاركة)
    return String(u || '').replace(/^https?:\/\/mishkatapps\.github\.io\//i, '');
  }
  function sticker(m) {
    return m.img ? '<img class="gs-img" src="' + esc(imgUrl(m.img)) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<span class=gs-emo>' + esc(m.st || '✨') + '</span>\'">' : '<span class="gs-emo" aria-hidden="true">' + esc(m.st || '✨') + '</span>';
  }
  function card(kind, r) {
    var m = r.m, txt = EN ? m.en : m.ar, title = EN ? (r.occ.en || r.occ.name) : r.occ.name;
    return '<article class="gcard g-' + kind + '"><div class="gtop"><span class="glbl">' + esc(title) + '</span></div>' +
      '<div class="gbody">' + sticker(m) + '<p class="gtxt">' + esc(txt) + '</p>' + (!EN && m.ev ? '<small class="gev">' + esc(m.ev) + '</small>' : '') + '</div>' +
      '<div class="gbtns">' + (r.n > 1 ? '<button class="btn sm" data-g="next" data-k="' + kind + '">' + (EN ? '↻ Another' : '↻ عبارة أخرى') + '</button>' : '') +
      '<button class="btn sm" data-g="copy" data-k="' + kind + '">' + (EN ? '⧉ Copy' : '⧉ نسخ') + '</button>' +
      '<button class="btn sm gold" data-g="img" data-k="' + kind + '">' + (EN ? '🖼 Share as image' : '🖼 مشاركة كصورة') + '</button>' +
      (m.img ? '<button class="btn sm" data-g="stk" data-k="' + kind + '">' + (EN ? '📥 Sticker' : '📥 الملصق') + '</button>' : '') + '</div></article>';
  }
  function render(keep) {
    if (!BANK) return;
    var ctx = context(new Date());
    var g = pick('تهنئة', ctx, keep === 'g' && CUR.g ? CUR.g.m : null), r = pick('توصية', ctx, keep === 'r' && CUR.r ? CUR.r.m : null);
    if (keep === 'g') r = CUR.r; else if (keep === 'r') g = CUR.g;
    CUR = { g: g, r: r };
    box.innerHTML = (g ? card('g', g) : '') + (r ? card('r', r) : '');
    box.hidden = !g && !r; box.classList.toggle('one', !(g && r));
  }
  function shareText(r) { var m = r.m; return (m.st ? m.st + ' ' : '') + (EN ? m.en : m.ar) + '\n\n— ' + (EN ? 'Mishkat · https://mishkatapps.github.io/?lang=en' : 'مشكاة · https://mishkatapps.github.io/'); }
  function toast(t) { var o = document.getElementById('toast'); if (!o) return; o.textContent = t; o.classList.add('on'); setTimeout(function () { o.classList.remove('on'); }, 1800); }

  /* صورة مربعة بأسلوب الملصقات للمشاركة في واتساب وغيره */
  function wrapLines(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function loadImg(u) { return new Promise(function (res) { if (!u) return res(null); var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = imgUrl(u); }); }
  function makeImage(r) { return loadImg(r.m.img).then(function (im) { return drawCard(r, im); }); }
  function drawCard(r, im) {
    var S = 1080, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var x = cv.getContext('2d'), m = r.m, txt = EN ? m.en : m.ar;
    var bg = x.createRadialGradient(S / 2, S * 0.3, 60, S / 2, S / 2, S * 0.8); bg.addColorStop(0, '#1a3778'); bg.addColorStop(0.55, '#0b1d48'); bg.addColorStop(1, '#050d24');
    x.fillStyle = bg; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#d9b15c'; x.lineWidth = 6; x.strokeRect(36, 36, S - 72, S - 72); x.lineWidth = 2; x.strokeRect(52, 52, S - 104, S - 104);
    x.textAlign = 'center'; x.direction = EN ? 'ltr' : 'rtl';
    x.textBaseline = 'middle';
    var top = 440;
    if (im) { x.drawImage(im, S / 2 - 260, 70, 520, 520); top = 600; }
    else { x.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText(m.st || '✨', S / 2, 270);
      x.fillStyle = '#e9cf8c'; x.font = 'bold 40px Tajawal, "Segoe UI", sans-serif'; x.fillText(EN ? (r.occ.en || r.occ.name) : r.occ.name, S / 2, 440); }
    var box = im ? 330 : 420, y1 = im ? 610 : 520, fs = EN ? (im ? 44 : 52) : (im ? 50 : 60); x.fillStyle = '#f6e7bd';
    do { x.font = (EN ? '' : 'bold ') + fs + 'px ' + (EN ? 'Tajawal, "Segoe UI", sans-serif' : 'Amiri, "Traditional Arabic", serif'); var L = wrapLines(x, txt, S - 200); fs -= 4; } while (L.length * fs * 1.7 > box && fs > 28);
    var lh = (fs + 4) * 1.7, y0 = y1 + (box - L.length * lh) / 2 + lh / 2;
    L.forEach(function (l, i) { x.fillText(l, S / 2, y0 + i * lh); });
    x.fillStyle = '#d9b15c'; x.font = 'bold 34px Tajawal, "Segoe UI", sans-serif'; x.direction = 'rtl';
    x.fillText(EN ? 'Mishkat · mishkatapps.github.io' : 'مشكاة · mishkatapps.github.io', S / 2, S - 110);
    return new Promise(function (res) { cv.toBlob(res, 'image/png'); });
  }
  function shareImage(r) {
    var go = function () {
      makeImage(r).then(function (blob) {
        var f = new File([blob], 'mishkat-' + r.occ.key + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], text: shareText(r) }).catch(function () {}); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); toast(EN ? 'Image saved' : 'تم حفظ الصورة');
      });
    };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('bold 60px Amiri'), document.fonts.load('bold 40px Tajawal')]).then(go, go); else go();
  }
  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return; var k = b.dataset.k, r = CUR[k]; if (!r) return;
    if (b.dataset.g === 'next') render(k);
    else if (b.dataset.g === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(shareText(r)) : Promise.reject()).then(function () { toast(EN ? 'Copied' : 'تم النسخ'); }, function () {}); }
    else if (b.dataset.g === 'img') shareImage(r);
    else if (b.dataset.g === 'stk') fetch(imgUrl(r.m.img)).then(function (x) { return x.blob(); }).then(function (blob) {
      var f = new File([blob], 'mishkat-sticker-' + r.occ.key + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f] }).catch(function () {});
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); toast(EN ? 'Sticker saved' : 'تم حفظ الملصق');
    }).catch(function () {});
  });

  /* ---------- التذكير المسبق (نافذة عند دخول الموقع) ---------- */
  var RK = 'mk-remind-ack', ROFF = 'mk-remind-off', RSHOWN = 'mk-remind-shown';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} }
  function dayInfo(tz, d) { var h = parts(tz, d, 'islamic-umalqura'), g = parts(tz, d); return { hm: parseInt(h.month, 10), hd: parseInt(h.day, 10), wd: { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[g.weekday], ymd: g.year + '-' + g.month + '-' + g.day }; }
  function startsOn(o, x) {   // هل تبدأ المناسبة في هذا اليوم؟
    var n = function (v) { var k = parseInt(v, 10); return isNaN(k) ? null : k; };
    var m = n(o.hm), d1 = n(o.d1);
    if (o.wd) { var days = o.wd.split(/[،,؛;\s]+/).filter(Boolean).map(function (w) { return WD[w.toLowerCase()]; }); if (days.indexOf(x.wd) < 0) return false; if (m == null && d1 == null) return true; }
    if (d1 == null) return m != null && x.hm === m && x.hd === 1;
    return (m == null || x.hm === m) && x.hd === d1;
  }
  function upcoming() {
    if (!BANK) return [];
    var P = window.MK_PRAY && window.MK_PRAY.now ? window.MK_PRAY.now() : null, tz = P ? P.loc.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
    var now = Date.now(), today = dayInfo(tz, new Date(now)), ack = {}; try { ack = JSON.parse(ls(RK) || '{}'); } catch (e) {}
    var out = [], seen = {};
    BANK.occ.forEach(function (o) {
      var R = parseInt(o.rem, 10); if (!(R > 0) || seen[o.key]) return;
      for (var d = 1; d <= R; d++) {
        var x = dayInfo(tz, new Date(now + d * 864e5));
        if (!startsOn(o, x)) continue;
        if (d > 1 && startsOn(o, dayInfo(tz, new Date(now)))) break;
        var id = o.key + '|' + x.ymd; if (ack[id]) break;
        var list = BANK.msg.filter(function (m) { return m.key === o.key && m.type === 'تذكير' && (EN ? m.en : m.ar); });
        if (!list.length) break;
        seen[o.key] = 1; out.push({ id: id, occ: o, d: d, m: list[Math.floor(Math.random() * list.length)] }); break;
      }
    });
    return out.sort(function (a, b) { return a.d - b.d || (+b.occ.pr || 0) - (+a.occ.pr || 0); });
  }
  function when(d) { return EN ? (d === 1 ? 'Tomorrow' : d === 2 ? 'In two days' : 'In ' + d + ' days') : (d === 1 ? 'غدًا' : d === 2 ? 'بعد يومين' : 'بعد ' + d + ' أيام'); }
  function showReminders(force) {
    if (!force && (ls(ROFF) === '1' || sessionStorage.getItem(RSHOWN))) return;
    var list = upcoming(); if (!list.length) { if (force) toast(EN ? 'No upcoming reminders' : 'لا توجد تذكيرات قادمة'); return; }
    try { sessionStorage.setItem(RSHOWN, '1'); } catch (e) {}
    var old = document.getElementById('mkRemind'); if (old) old.remove();
    var w = document.createElement('div'); w.id = 'mkRemind'; w.className = 'rmd-back'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
    w.innerHTML = '<div class="rmd"><button class="rmd-x" aria-label="' + (EN ? 'Close' : 'إغلاق') + '">✕</button><h3>🔔 ' + (EN ? 'Reminder' : 'تذكير') + '</h3>' +
      list.map(function (r) { return '<div class="rmd-it">' + (r.m.img ? '<img src="' + esc(imgUrl(r.m.img)) + '" alt="">' : '<span class="rmd-emo">' + esc(r.m.st || '🔔') + '</span>') +
        '<div><b>' + esc(EN ? (r.occ.en || r.occ.name) : r.occ.name) + ' <em>— ' + when(r.d) + '</em></b><p>' + esc(EN ? r.m.en : r.m.ar) + '</p>' + (!EN && r.m.ev ? '<small>' + esc(r.m.ev) + '</small>' : '') + '</div></div>'; }).join('') +
      '<div class="rmd-btns"><button class="btn gold" data-r="ok">' + (EN ? '✓ Got it — don’t remind me again' : '✓ تلقّيت التذكير — لا تكرّره') + '</button><button class="btn" data-r="later">' + (EN ? 'Later' : 'لاحقًا') + '</button></div>' +
      '<button class="rmd-off" data-r="off">' + (EN ? 'Don’t show reminders again' : 'عدم إظهار نافذة التذكير مرة أخرى') + '</button></div>';
    document.body.appendChild(w); document.body.classList.add('rmd-open');
    var close = function () { w.remove(); document.body.classList.remove('rmd-open'); };
    w.addEventListener('click', function (e) {
      if (e.target === w || e.target.closest('.rmd-x') || e.target.closest('[data-r="later"]')) return close();
      if (e.target.closest('[data-r="ok"]')) { var a = {}; try { a = JSON.parse(ls(RK) || '{}'); } catch (x) {} list.forEach(function (r) { a[r.id] = Date.now(); }); ls(RK, JSON.stringify(a)); close(); toast(EN ? 'Noted — may Allah accept from you' : 'تقبّل الله منك'); }
      else if (e.target.closest('[data-r="off"]')) { ls(ROFF, '1'); close(); bell(); navToggle(); toast(EN ? 'Reminders turned off' : 'تم إيقاف نافذة التذكير'); }
    });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  }
  function bell() {   // رابط صغير تحت البطاقات لإعادة تفعيل التذكير أو عرضه
    var b = document.getElementById('mkBell'); if (!b) { b = document.createElement('div'); b.id = 'mkBell'; b.className = 'rmd-bell'; box.parentNode.insertBefore(b, box.nextSibling); }
    var off = ls(ROFF) === '1', n = upcoming().length;
    b.innerHTML = off ? '<button>' + (EN ? '🔔 Turn reminders back on' : '🔔 تفعيل نافذة التذكير') + '</button>' : (n ? '<button>' + (EN ? '🔔 Upcoming reminders (' + n + ')' : '🔔 تذكيرات قادمة (' + n + ')') + '</button>' : '');
    b.onclick = function (e) { if (!e.target.closest('button')) return; if (off) { try { localStorage.removeItem(ROFF); } catch (x) {} } showReminders(true); bell(); navToggle(); };
  }

  function navToggle() {   // مفتاح في قائمة الموقع: تشغيل/إيقاف نافذة التذكير عند الدخول
    var links = document.querySelector('nav .links'); if (!links) return;
    var a = document.getElementById('mkRemNav');
    if (!a) { a = document.createElement('a'); a.id = 'mkRemNav'; a.href = '#'; a.className = 'rmd-nav'; a.setAttribute('role', 'switch');
      var cta = links.querySelector('.cta'); links.insertBefore(a, cta || null);
      a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation();
        var nowOff = ls(ROFF) !== '1';
        if (nowOff) ls(ROFF, '1'); else { try { localStorage.removeItem(ROFF); } catch (x) {} }
        navToggle(); bell(); toast(nowOff ? (EN ? 'Reminder window turned off' : 'تم إيقاف نافذة التذكير') : (EN ? 'Reminder window turned on' : 'تم تفعيل نافذة التذكير'));
        if (!nowOff) setTimeout(function () { document.body.classList.remove('menu-open'); showReminders(true); }, 400); }); }
    var on = ls(ROFF) !== '1';
    a.classList.toggle('on', on); a.setAttribute('aria-checked', on ? 'true' : 'false');
    var lbl = EN ? 'Reminder popup' : 'نافذة التذكير عند الدخول';
    a.title = lbl + ': ' + (on ? (EN ? 'on' : 'مفعّلة') : (EN ? 'off' : 'موقوفة'));
    a.innerHTML = '<span>' + (on ? '🔔' : '🔕') + ' <span class="t">' + lbl + '</span></span><span class="sw" aria-hidden="true"></span>';
  }

  /* ---------- التشغيل ---------- */
  var cached = null; try { cached = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) {}
  BANK = parse(cached || window.MK_GREET_DEFAULT || { occ: [[]], msg: [[]] });
  render(); bell(); navToggle();
  var remT = setTimeout(function () { showReminders(); }, 2500);   // تنتظر بيانات الجدول قليلًا ثم تظهر
  fetchBank().then(function (b) {
    var s = JSON.stringify(b); if (cached && JSON.stringify(cached) === s) return;
    try { localStorage.setItem(CK, s); } catch (e) {}
    BANK = parse(b); render(); bell();
  }).catch(function () {});
  var sig = function () { var c = context(new Date()); return BANK.occ.filter(function (o) { return active(o, c); }).map(function (o) { return o.key; }).join(','); }, last = sig();
  setInterval(function () { var s = sig(); if (s !== last) { last = s; render(); } }, 60 * 1000);   // تتغير البطاقات عند دخول وقت جديد فقط
  window.MK_GREET_TEST = { context: context, active: active, bank: function () { return BANK; }, render: render, upcoming: upcoming, show: showReminders };
})();
