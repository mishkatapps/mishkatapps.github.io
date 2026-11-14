/* مشكاة — اللغة (العربية/الإنجليزية) + قائمة الموبايل + التاريخ الميلادي والهجري
   يُحمَّل في <head> قبل أي محتوى، فيضبط اتجاه الصفحة قبل رسمها. */
(function () {
  var KEY = 'mk-lang', q = /[?&]lang=(ar|en)\b/.exec(location.search), L = 'ar';
  try { L = (q && q[1]) || localStorage.getItem(KEY) || 'ar'; } catch (e) {}   // العربية هي الأصل، والإنجليزية باختيار الزائر
  if (L !== 'en') L = 'ar';
  if (q) { try { localStorage.setItem(KEY, L); } catch (e) {} }
  var EN = L === 'en', html = document.documentElement;
  html.lang = L; html.dir = EN ? 'ltr' : 'rtl'; html.classList.add('lang-' + L);
  window.MK_LANG = L; window.MK_EN = EN;
  window.MK_T = function (ar, en) { return EN ? en : ar; };

  function apply() {
    // نصوص العناصر: data-en يحمل النسخة الإنجليزية (قد تحتوي على HTML)
    if (EN) {
      document.querySelectorAll('[data-en]').forEach(function (el) { el.innerHTML = el.getAttribute('data-en'); });
      ['title', 'alt', 'aria-label', 'placeholder', 'content'].forEach(function (a) {
        document.querySelectorAll('[data-en-' + a + ']').forEach(function (el) { el.setAttribute(a, el.getAttribute('data-en-' + a)); });
      });
      var t = document.querySelector('meta[name="mk-title-en"]'); if (t) document.title = t.content;
    }
    // زر اللغة + قائمة الموبايل
    var nav = document.querySelector('nav .wrap'), links = document.querySelector('nav .links');
    if (!nav || !links) return;
    var tools = document.createElement('div'); tools.className = 'navtools';
    var lb = document.createElement('a'); lb.className = 'langbtn'; lb.href = '?lang=' + (EN ? 'ar' : 'en') + location.hash;
    lb.textContent = EN ? 'العربية' : 'English'; lb.setAttribute('lang', EN ? 'ar' : 'en');
    lb.setAttribute('aria-label', EN ? 'التحويل إلى العربية' : 'Switch to English');
    lb.onclick = function () { try { localStorage.setItem(KEY, EN ? 'ar' : 'en'); } catch (e) {} };
    var mb = document.createElement('button'); mb.className = 'menubtn'; mb.type = 'button';
    mb.setAttribute('aria-label', EN ? 'Menu' : 'القائمة'); mb.setAttribute('aria-expanded', 'false');
    mb.innerHTML = '<span></span><span></span><span></span>';
    tools.appendChild(lb); tools.appendChild(mb); nav.appendChild(tools);
    var close = function () { document.body.classList.remove('menu-open'); mb.setAttribute('aria-expanded', 'false'); };
    mb.onclick = function (e) { e.stopPropagation(); var o = document.body.classList.toggle('menu-open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    links.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
    document.addEventListener('click', function (e) { if (!e.target.closest('nav')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // التاريخ الميلادي والهجري
    var d = document.getElementById('mkDates');
    if (d) {
      var now = new Date(), g = '', h = '';
      try { g = new Intl.DateTimeFormat(EN ? 'en-GB' : 'ar-EG-u-nu-latn', { weekday: (EN && innerWidth < 520) ? 'short' : 'long', day: 'numeric', month: (EN && innerWidth < 520) ? 'short' : 'long', year: 'numeric' }).format(now) + (EN ? ' CE' : ' م'); } catch (e) {}
      try { h = new Intl.DateTimeFormat(EN ? 'en-GB-u-ca-islamic-umalqura' : 'ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(now).replace(/\s*(AH|هـ)\s*$/, '') + (EN ? ' AH' : ' هـ'); } catch (e) {}
      d.classList.add('one');
      d.innerHTML = '<span class="dg" title="' + (EN ? 'Gregorian date' : 'التاريخ الميلادي') + '"><span class="ic">📅</span>' + g + '</span><span class="sep">·</span><span class="dh" title="' + (EN ? 'Hijri date (Umm al-Qura)' : 'التاريخ الهجري (أم القرى)') + '"><span class="ic">🌙</span>' + h + '</span>';
      var fitDates = function () { d.style.fontSize = ''; var fs = parseFloat(getComputedStyle(d).fontSize), max = d.parentNode.clientWidth - 4; while (d.scrollWidth > max && fs > 9) { fs -= 0.5; d.style.fontSize = fs + 'px'; } };
      fitDates(); addEventListener('resize', fitDates); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDates);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
