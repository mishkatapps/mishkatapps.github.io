/* مشكاة — تطبيقات الملصقات في قسم «تطبيقاتنا»
   تُبنى البطاقات من img/stickers/catalog.json (الذي تحرره لوحة المدير)، فتبقى مطابقة للحزم دائمًا.
   لكل تطبيق: زر التحميل، ومعاينة الحزم مع صورة JPG مجمّعة لكل حزمة تُرسم في المتصفح، وطريقة الاستخدام. */
(function () {
  var box = document.getElementById('stkApps'); if (!box) return;
  var EN = !!window.MK_EN, T = function (a, e) { return EN ? e : a; };
  var REL = 'https://github.com/mohammadelshennawy-bit/mishkat-stickers/releases/latest/download/';
  var DESC = { a: [T('تواصل ومناسبات', 'Greetings & occasions'), '💬'], b: [T('أذكار وأدعية', 'Adhkar & duas'), '📿'], c: [T('أحاديث نبوية', 'Prophetic hadith'), '📜'] };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var apk = function (a) { return a.appId === 'com.mishkat.stickers' ? 'mishkat-stickers.apk' : 'mishkat-stickers-' + a.id + '.apk'; };
  var CAT, BY = {};
  var src = function (id) { var it = BY[id]; return 'img/stickers/' + (it && it.src ? it.src : id + '.png'); };
  var pname = function (p) { return EN && p.nameEn ? p.nameEn : p.name; };
  var aname = function (a) { return EN && a.nameEn ? a.nameEn : a.name; };

  Promise.all([fetch('img/stickers/catalog.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
               fetch('img/stickers/index.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })])
    .then(function (r) { CAT = r[0]; r[1].forEach(function (i) { BY[i.id] = i; }); draw(); })
    .catch(function () { box.innerHTML = '<p class="sub">' + T('تعذّر تحميل قائمة الحزم — جرّب لاحقًا.', 'Could not load the packs — try again later.') + '</p>'; });

  function packsOf(a) { return a.packs.map(function (id) { return CAT.packs.filter(function (p) { return p.id === id; })[0]; }).filter(function (p) { return p && p.ids.length >= 3; }); }

  function draw() {
    var apps = (CAT.apps || []).filter(function (a) { return packsOf(a).length; });
    box.innerHTML = apps.map(function (a) {
      var ps = packsOf(a), n = ps.reduce(function (s, p) { return s + p.ids.length; }, 0), d = DESC[a.id] || ['', '🎨'];
      return '<article class="app stk"><div class="h"><span class="stkL">' + esc(EN ? String(a.id).toUpperCase() : (a.letter || '')) + '</span><div><h3>' + esc(aname(a)) + '</h3><small>' + d[1] + ' ' + esc(d[0]) + '</small>' +
        '<span class="ver">' + ps.length + T(' حزم · ', ' packs · ') + n + T(' ملصقًا', ' stickers') + '</span></div></div>' +
        '<div class="stkStrip">' + ps.map(function (p) { return '<img src="' + esc(src(p.tray || p.ids[0])) + '" alt="" title="' + esc(pname(p)) + '" loading="lazy">'; }).join('') + '</div>' +
        '<ul class="stkPk">' + ps.map(function (p) { return '<li>' + esc(pname(p)) + ' <small>(' + p.ids.length + ')</small></li>'; }).join('') + '</ul>' +
        '<div class="btns"><a class="btn gold" href="' + REL + apk(a) + '" data-ev="dl-stk-' + esc(a.id) + '">' + T('⬇ تحميل لأندرويد', '⬇ Download for Android') + '</a>' +
        '<button class="btn" data-prev="' + esc(a.id) + '">' + T('🖼 صور الحزم (JPG)', '🖼 Pack images (JPG)') + '</button></div></article>';
    }).join('');
    box.onclick = function (e) { var b = e.target.closest('[data-prev]'); if (b) preview(apps.filter(function (a) { return a.id === b.dataset.prev; })[0]); };
  }

  /* ---------- صورة JPG مجمّعة للحزمة ---------- */
  var loadImg = function (u) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = u; }); };
  function collage(p, a) {
    var C = 6, S = 170, G = 8, P = 24, HDR = 150, FT = 56, rows = Math.ceil(p.ids.length / C);
    var W = P * 2 + C * S + (C - 1) * G, H = HDR + P + rows * S + (rows - 1) * G + P + FT;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
    x.fillStyle = '#ece5dd'; x.fillRect(0, 0, W, H);   // لون خلفية محادثة واتساب
    var g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#0b1d3f'); g.addColorStop(1, '#16306a'); x.fillStyle = g; x.fillRect(0, 0, W, HDR);
    x.fillStyle = '#c9a227'; x.fillRect(0, HDR - 5, W, 5);
    x.direction = EN ? 'ltr' : 'rtl'; x.textAlign = 'center';
    x.fillStyle = '#f3d77a'; x.font = '700 50px Amiri, serif'; x.fillText(pname(p), W / 2, 66);
    x.fillStyle = '#ffffff'; x.font = '500 27px Tajawal, sans-serif'; x.fillText(aname(a) + ' · ' + p.ids.length + T(' ملصقًا', ' stickers'), W / 2, 115);
    return document.fonts.ready.then(function () { return Promise.all(p.ids.map(function (id) { return loadImg(src(id)); })); }).then(function (ims) {
      // إعادة كتابة العنوان بعد تحميل الخطوط
      x.fillStyle = g; x.fillRect(0, 0, W, HDR - 5);
      x.fillStyle = '#f3d77a'; x.font = '700 50px Amiri, serif'; x.fillText(pname(p), W / 2, 66);
      x.fillStyle = '#ffffff'; x.font = '500 27px Tajawal, sans-serif'; x.fillText(aname(a) + ' · ' + p.ids.length + T(' ملصقًا', ' stickers'), W / 2, 115);
      ims.forEach(function (im, i) {
        if (!im) return; var c = i % C, r = Math.floor(i / C);
        var cx = EN ? P + c * (S + G) : W - P - S - c * (S + G);   // من اليمين في العربية
        x.drawImage(im, cx, HDR + P + r * (S + G), S, S);
      });
      x.fillStyle = '#0b1d3f'; x.fillRect(0, H - FT, W, FT);
      x.fillStyle = '#f3d77a'; x.font = '700 24px Tajawal, sans-serif'; x.fillText(T('مشكاة — برمجيات نافعة · mishkatapps.github.io', 'Mishkat — beneficial software · mishkatapps.github.io'), W / 2, H - 20);
      return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/jpeg', 0.9); });
    });
  }
  function save(blob, name) { var u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }

  function preview(a) {
    var ps = packsOf(a), w = document.createElement('div'); w.className = 'stkMod';
    w.innerHTML = '<div class="in"><button class="x" aria-label="' + T('إغلاق', 'Close') + '">✕</button><h3>' + esc(aname(a)) + '</h3>' +
      '<div class="row"><a class="btn gold sm" href="' + REL + apk(a) + '">' + T('⬇ تحميل التطبيق', '⬇ Download app') + '</a><button class="btn sm" data-all>' + T('⬇ تنزيل كل صور الحزم', '⬇ Download all pack images') + '</button><button class="btn sm" data-how>' + T('📖 طريقة الاستخدام', '📖 How to use') + '</button></div>' +
      '<div class="stkHow" hidden>' + how() + '</div>' +
      '<div class="grid">' + ps.map(function (p, i) { return '<figure data-i="' + i + '"><div class="ph">' + T('جارٍ تجهيز الصورة…', 'Preparing image…') + '</div><figcaption><b>' + esc(pname(p)) + '</b> <small>(' + p.ids.length + ')</small><button class="btn sm" data-dl="' + i + '" disabled>⬇ JPG</button></figcaption></figure>'; }).join('') + '</div></div>';
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    var close = function () { w.remove(); document.body.style.overflow = ''; }, blobs = [];
    w.addEventListener('click', function (e) {
      if (e.target === w || e.target.closest('.x')) return close();
      if (e.target.closest('[data-how]')) { var h = w.querySelector('.stkHow'); h.hidden = !h.hidden; return; }
      var d = e.target.closest('[data-dl]'); if (d && blobs[+d.dataset.dl]) return save(blobs[+d.dataset.dl], fname(a, ps[+d.dataset.dl], +d.dataset.dl));
      if (e.target.closest('[data-all]')) blobs.forEach(function (b, i) { if (b) setTimeout(function () { save(b, fname(a, ps[i], i)); }, i * 600); });
    });
    ps.reduce(function (chain, p, i) {
      return chain.then(function () { return collage(p, a).then(function (b) {
        blobs[i] = b; var f = w.querySelector('[data-i="' + i + '"]'); if (!f) return;
        f.querySelector('.ph').outerHTML = '<img src="' + URL.createObjectURL(b) + '" alt="">'; f.querySelector('[data-dl]').disabled = false;
      }); });
    }, Promise.resolve());
  }
  function fname(a, p, i) { return 'mishkat-stickers-' + a.id + '-' + String(i + 1).padStart(2, '0') + '.jpg'; }
  function how() {
    return EN
      ? '<ol><li><b>Download</b> the app file (APK) on your Android phone and open it. If asked, allow “Install unknown apps” for your browser.</li><li><b>Open</b> the app: you will see its packs.</li><li>Tap <b>“➕ Add to WhatsApp”</b> under a pack, then <b>“Add”</b> in WhatsApp’s window. Each pack is added on its own.</li><li>In any WhatsApp chat tap 😊 ← <b>Stickers</b> ← the pack icon, and send.</li></ol><p>Why three apps? WhatsApp allows at most 10 packs per app, so the stickers are split into three apps that install side by side. <b>iPhone:</b> the app is for Android; on iPhone save a pack image or a sticker and use WhatsApp’s “Create sticker”.</p>'
      : '<ol><li><b>حمّل</b> ملف التطبيق (APK) على هاتف أندرويد وافتحه. إن طُلب منك فاسمح بـ«تثبيت التطبيقات غير المعروفة» للمتصفح.</li><li><b>افتح</b> التطبيق: تظهر حزمه.</li><li>اضغط <b>«➕ أضف إلى واتساب»</b> تحت الحزمة، ثم <b>«إضافة»</b> في نافذة واتساب. كل حزمة تُضاف وحدها.</li><li>في أي محادثة واتساب اضغط 😊 ← <b>الملصقات</b> ← أيقونة الحزمة، وأرسل.</li></ol><p>لماذا ثلاثة تطبيقات؟ واتساب يسمح بعشر حزم على الأكثر لكل تطبيق، فقُسمت الملصقات على ثلاثة تطبيقات تُثبَّت جنبًا إلى جنب. <b>آيفون:</b> التطبيق لأندرويد؛ وعلى آيفون احفظ صورة الحزمة أو الملصق واستخدم «إنشاء ملصق» في واتساب.</p>';
  }
})();
