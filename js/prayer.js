/* مواقيت الصلاة — نفس محرك تطبيق «روض الذكر» */
(function () {
const pad = n => String(n).padStart(2, '0');
const KEY = 'mk-pray';
let S = { pray: { city: 'cairo', method: 'egypt', asr: 1, h24: false, lat: null, lng: null, tz: null, label: '' } };
try { Object.assign(S.pray, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S.pray)); } catch (e) {} };
const CITIES = [
  ['cairo','القاهرة',30.0444,31.2357,'Africa/Cairo','egypt'],['giza','الجيزة',30.0131,31.2089,'Africa/Cairo','egypt'],
  ['alex','الإسكندرية',31.2001,29.9187,'Africa/Cairo','egypt'],['mansoura','المنصورة',31.0409,31.3785,'Africa/Cairo','egypt'],
  ['tanta','طنطا',30.7865,31.0004,'Africa/Cairo','egypt'],['zagazig','الزقازيق',30.5877,31.502,'Africa/Cairo','egypt'],
  ['benha','بنها',30.4659,31.1848,'Africa/Cairo','egypt'],['shebin','شبين الكوم',30.5503,31.0106,'Africa/Cairo','egypt'],
  ['damanhour','دمنهور',31.0341,30.4682,'Africa/Cairo','egypt'],['kafr','كفر الشيخ',31.1107,30.9388,'Africa/Cairo','egypt'],
  ['damietta','دمياط',31.4165,31.8133,'Africa/Cairo','egypt'],['portsaid','بورسعيد',31.2653,32.3019,'Africa/Cairo','egypt'],
  ['ismailia','الإسماعيلية',30.5965,32.2715,'Africa/Cairo','egypt'],['suez','السويس',29.9668,32.5498,'Africa/Cairo','egypt'],
  ['fayoum','الفيوم',29.3084,30.8428,'Africa/Cairo','egypt'],['benisuef','بني سويف',29.0661,31.0994,'Africa/Cairo','egypt'],
  ['minya','المنيا',28.0871,30.7618,'Africa/Cairo','egypt'],['assiut','أسيوط',27.1783,31.1859,'Africa/Cairo','egypt'],
  ['sohag','سوهاج',26.5591,31.6957,'Africa/Cairo','egypt'],['qena','قنا',26.1551,32.716,'Africa/Cairo','egypt'],
  ['luxor','الأقصر',25.6872,32.6396,'Africa/Cairo','egypt'],['aswan','أسوان',24.0889,32.8998,'Africa/Cairo','egypt'],
  ['hurghada','الغردقة',27.2579,33.8116,'Africa/Cairo','egypt'],['sharm','شرم الشيخ',27.9158,34.3299,'Africa/Cairo','egypt'],
  ['arish','العريش',31.1313,33.7983,'Africa/Cairo','egypt'],['matrouh','مرسى مطروح',31.3543,27.2373,'Africa/Cairo','egypt'],
  ['makkah','مكة المكرمة',21.4225,39.8262,'Asia/Riyadh','umm'],['madinah','المدينة المنورة',24.4672,39.6111,'Asia/Riyadh','umm'],
  ['riyadh','الرياض',24.7136,46.6753,'Asia/Riyadh','umm'],['jeddah','جدة',21.4858,39.1925,'Asia/Riyadh','umm'],
  ['dammam','الدمام',26.4207,50.0888,'Asia/Riyadh','umm'],['dubai','دبي',25.2048,55.2708,'Asia/Dubai','dubai'],
  ['abudhabi','أبوظبي',24.4539,54.3773,'Asia/Dubai','dubai'],['doha','الدوحة',25.2854,51.531,'Asia/Qatar','qatar'],
  ['kuwait','الكويت',29.3759,47.9774,'Asia/Kuwait','kuwait'],['manama','المنامة',26.2285,50.586,'Asia/Bahrain','mwl'],
  ['muscat','مسقط',23.588,58.3829,'Asia/Muscat','mwl'],['amman','عمّان',31.9454,35.9284,'Asia/Amman','mwl'],
  ['quds','القدس',31.7683,35.2137,'Asia/Jerusalem','mwl'],['gaza','غزة',31.5017,34.4668,'Asia/Gaza','egypt'],
  ['beirut','بيروت',33.8938,35.5018,'Asia/Beirut','mwl'],['damascus','دمشق',33.5138,36.2765,'Asia/Damascus','mwl'],
  ['baghdad','بغداد',33.3152,44.3661,'Asia/Baghdad','mwl'],['khartoum','الخرطوم',15.5007,32.5599,'Africa/Khartoum','egypt'],
  ['tripoli','طرابلس',32.8872,13.1913,'Africa/Tripoli','egypt'],['tunis','تونس',36.8065,10.1815,'Africa/Tunis','mwl'],
  ['algiers','الجزائر',36.7538,3.0588,'Africa/Algiers','mwl'],['rabat','الرباط',34.0209,-6.8416,'Africa/Casablanca','mwl'],
  ['casablanca','الدار البيضاء',33.5731,-7.5898,'Africa/Casablanca','mwl'],['sanaa','صنعاء',15.3694,44.191,'Asia/Aden','mwl'],
  ['istanbul','إسطنبول',41.0082,28.9784,'Europe/Istanbul','turkey'],['london','لندن',51.5074,-0.1278,'Europe/London','mwl']
];
const CITY = Object.fromEntries(CITIES.map(c => [c[0], { id: c[0], name: c[1], lat: c[2], lng: c[3], tz: c[4], method: c[5] }]));
const METHODS = {
  egypt: ['الهيئة المصرية العامة للمساحة', 19.5, 17.5], umm: ['أم القرى (مكة)', 18.5, '90'],
  mwl: ['رابطة العالم الإسلامي', 18, 17], karachi: ['جامعة العلوم الإسلامية بكراتشي', 18, 18],
  isna: ['أمريكا الشمالية (ISNA)', 15, 15], dubai: ['دبي', 18.2, 18.2], kuwait: ['الكويت', 18, 17.5],
  qatar: ['قطر', 18, '90'], turkey: ['رئاسة الشؤون الدينية التركية', 18, 17]
};
const PNAMES = [['fajr','الفجر'],['sunrise','الشروق'],['dhuhr','الظهر'],['asr','العصر'],['maghrib','المغرب'],['isha','العشاء']];
const dtr = d => d * Math.PI / 180, rtd = r => r * 180 / Math.PI;
const sin = d => Math.sin(dtr(d)), cos = d => Math.cos(dtr(d)), tan = d => Math.tan(dtr(d));
const asin = x => rtd(Math.asin(x)), acos = x => rtd(Math.acos(Math.max(-1, Math.min(1, x)))), atan2 = (y, x) => rtd(Math.atan2(y, x)), acot = x => rtd(Math.atan(1 / x));
const fixA = a => a - 360 * Math.floor(a / 360), fixH = a => a - 24 * Math.floor(a / 24);
function julian(y, m, d) { if (m <= 2) { y -= 1; m += 12; } const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
function sunPos(jd) {
  const D = jd - 2451545.0, g = fixA(357.529 + 0.98560028 * D), q = fixA(280.459 + 0.98564736 * D);
  const L = fixA(q + 1.915 * sin(g) + 0.020 * sin(2 * g)), e = 23.439 - 0.00000036 * D;
  const RA = atan2(cos(e) * sin(L), cos(L)) / 15;
  return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - fixH(RA) };
}
function tzOffsetMin(tz, date) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
    const g = t => +p.find(x => x.type === t).value;
    return Math.round((Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - date.getTime()) / 60000);
  } catch (e) { return -date.getTimezoneOffset(); }
}
function ymdIn(tz, date) {
  try { const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const g = t => +p.find(x => x.type === t).value; return [g('year'), g('month'), g('day')]; }
  catch (e) { return [date.getFullYear(), date.getMonth() + 1, date.getDate()]; }
}
function prayLoc() {
  const P = S.pray;
  if (P.city === 'custom' && P.lat != null) return { name: P.label || 'موقعي', lat: P.lat, lng: P.lng, tz: P.tz || Intl.DateTimeFormat().resolvedOptions().timeZone };
  return CITY[P.city] || CITY.cairo;
}
function prayerTimes(y, m, d, loc) {
  const [, fa, is] = METHODS[S.pray.method] || METHODS.egypt;
  const lat = loc.lat, lng = loc.lng;
  const jd0 = julian(y, m, d) - lng / (15 * 24);
  const mid = t => fixH(12 - sunPos(jd0 + t).eqt);
  const angT = (ang, t, ccw) => { const dc = sunPos(jd0 + t).decl, n = mid(t); const T = acos((-sin(ang) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat))) / 15; return n + (ccw ? -T : T); };
  const asrT = (f, t) => { const dc = sunPos(jd0 + t).decl; return angT(-acot(f + tan(Math.abs(lat - dc))), t); };
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
  for (let k = 0; k < 2; k++) {
    const p = Object.fromEntries(Object.entries(t).map(([a, b]) => [a, b / 24]));
    t = { fajr: angT(fa, p.fajr, true), sunrise: angT(0.833, p.sunrise, true), dhuhr: mid(p.dhuhr),
          asr: asrT(S.pray.asr === 2 ? 2 : 1, p.asr), maghrib: angT(0.833, p.maghrib), isha: typeof is === 'string' ? 0 : angT(is, p.isha) };
    if (typeof is === 'string') t.isha = t.maghrib + (+is) / 60;
  }
  const base = Date.UTC(y, m - 1, d), off = tzOffsetMin(loc.tz, new Date(base + 12 * 3600e3));
  const out = {};
  for (const [k] of PNAMES) {
    const utcH = t[k] - lng / 15;                                  // الزمن العالمي
    out[k] = new Date(base + Math.round(utcH * 60) * 60000);        // لحظة مطلقة
  }
  out._off = off;
  return out;
}
function fmtTime(date, loc) {
  const o = { hour: 'numeric', minute: '2-digit', hour12: !S.pray.h24, timeZone: loc.tz, numberingSystem: 'latn' };
  try { return new Intl.DateTimeFormat('ar-EG-u-nu-latn', o).format(date); }
  catch (e) { return pad(date.getHours()) + ':' + pad(date.getMinutes()); }
}
function nextPrayer() {
  const loc = prayLoc(), now = new Date();
  const [y, m, d] = ymdIn(loc.tz, now);
  const T = prayerTimes(y, m, d, loc);
  for (const [k, n] of PNAMES) { if (k === 'sunrise') continue; if (T[k] > now) return { key: k, name: n, at: T[k], T, loc }; }
  const tm = new Date(Date.UTC(y, m - 1, d) + 36 * 3600e3); const [y2, m2, d2] = ymdIn(loc.tz, tm);
  const T2 = prayerTimes(y2, m2, d2, loc);
  return { key: 'fajr', name: 'الفجر', at: T2.fajr, T, loc, tomorrow: true };
}
function countdown(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); }
const $ = id => document.getElementById(id);
const ICON = { fajr: '🌅', sunrise: '☀️', dhuhr: '🕛', asr: '🌤️', maghrib: '🌇', isha: '🌙' };
function render() {
  const np = nextPrayer(), loc = np.loc, T = np.T, now = new Date();
  let cur = null; for (const [k] of PNAMES) if (k !== 'sunrise' && T[k] <= now) cur = k;
  $('prNext').textContent = np.name; $('prAt').textContent = fmtTime(np.at, loc);
  $('prCity').textContent = loc.name;
  $('prDate').textContent = (() => { try { return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: loc.tz }).format(now) + ' · ' + new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric', timeZone: loc.tz }).format(now); } catch (e) { return ''; } })();
  $('prList').innerHTML = PNAMES.map(([k, n]) => `<div class="pt ${k === np.key && !np.tomorrow ? 'next' : ''} ${k === cur ? 'cur' : ''}"><span class="i">${ICON[k]}</span><b>${n}</b><span class="t">${fmtTime(T[k], loc)}</span></div>`).join('');
  tick();
}
function tick() { const np = nextPrayer(); $('prCd').textContent = countdown(np.at - new Date()); if (np.at - new Date() < 1000) setTimeout(render, 1500); }
function init() {
  if (!$('prList')) return;
  const sel = $('prCitySel'), ms = $('prMethod');
  sel.innerHTML = CITIES.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('') + (S.pray.city === 'custom' ? `<option value="custom">${S.pray.label || 'موقعي'}</option>` : '');
  sel.value = S.pray.city;
  ms.innerHTML = Object.entries(METHODS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join(''); ms.value = S.pray.method;
  sel.onchange = () => { if (sel.value !== 'custom') { S.pray.city = sel.value; S.pray.method = CITY[sel.value].method; ms.value = S.pray.method; } save(); render(); };
  ms.onchange = () => { S.pray.method = ms.value; save(); render(); };
  $('prGeo').onclick = () => {
    if (!navigator.geolocation) return;
    $('prGeo').textContent = '… جارٍ التحديد';
    navigator.geolocation.getCurrentPosition(p => {
      Object.assign(S.pray, { city: 'custom', lat: +p.coords.latitude.toFixed(4), lng: +p.coords.longitude.toFixed(4), tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        label: `موقعي (${p.coords.latitude.toFixed(2)}, ${p.coords.longitude.toFixed(2)})` });
      save(); $('prGeo').textContent = '📍 موقعي'; init();
    }, () => { $('prGeo').textContent = '📍 موقعي'; alert('تعذّر تحديد الموقع — اختر المدينة من القائمة'); }, { timeout: 10000 });
  };
  render(); clearInterval(init._t); init._t = setInterval(tick, 1000);
}
init();
})();
