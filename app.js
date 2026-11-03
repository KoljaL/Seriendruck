const $ = (id) => document.getElementById(id);
const NL = String.fromCharCode(10),
  TAB = String.fromCharCode(9),
  CR = String.fromCharCode(13);
const KEYS = ['docName', 'rec', 'enc', 'addrT', 'salT', 'sender', 'oRet', 'sendPos', 'layout', 'oMono', 'monoT', 'vermerk', 'date', 'subj', 'oAutoDate', 'oInfo', 'infoT', 'oDate', 'oId', 'idPre', 'idStart', 'oLogo', 'logoW', 'logoH', 'logoTop', 'logoRight', 'clos', 'oAtt', 'att', 'form', 'ff', 'fs', 'lh', 'oFmPrev', 'oFmPrint', 'oNum', 'oCont', 'oFoot', 'foot', 'scope'];
let logo = null,
  timer = null,
  rows = [],
  cols = [];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function toast(m, err) {
  const t = $('toast');
  t.textContent = m;
  t.className = (err ? 'err ' : '') + 'on';
  clearTimeout(t._t);
  t._t = setTimeout(() => (t.className = ''), 2600);
}
function setTheme(dark, persist) {
  const theme = dark ? 'dark' : 'light';
  if (persist) {
    document.body.classList.add('theme-fade');
    clearTimeout(setTheme.t);
    setTheme.t = setTimeout(() => document.body.classList.remove('theme-fade'), 450);
  }
  document.body.dataset.theme = theme;
  $('themeToggle').classList.toggle('is-dark', dark);
  $('themeToggle').setAttribute('aria-pressed', dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#3a254c' : '#663399';
  if (persist) {
    try {
      localStorage.setItem('sbg3_theme', theme);
    } catch (error) {
      console.error('Designmodus konnte nicht gespeichert werden:', error);
      toast('Designmodus konnte nicht gespeichert werden.', true);
    }
  }
}
(function initTheme() {
  let theme = 'light';
  try {
    theme = localStorage.getItem('sbg3_theme') === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.error('Gespeicherter Designmodus konnte nicht geladen werden:', error);
    toast('Gespeicherter Designmodus konnte nicht geladen werden.', true);
  }
  setTheme(theme === 'dark', false);
  $('themeToggle').addEventListener('click', () => setTheme(document.body.dataset.theme !== 'dark', true));
})();

/* ---------- Bereinigung des Brieftexts (Allowlist) ---------- */
const OK = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'HR']);
function clean(html) {
  const d = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
  (function walk(n) {
    [...n.childNodes].forEach((c) => {
      if (c.nodeType === 3) return;
      if (c.nodeType !== 1) {
        c.remove();
        return;
      }
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE'].includes(c.tagName)) {
        c.remove();
        return;
      }
      walk(c);
      if (!OK.has(c.tagName)) {
        c.replaceWith(...c.childNodes);
        return;
      }
      if (c.tagName === 'HR' && !c.hasAttribute('data-break')) {
        c.remove();
        return;
      }
      const al = (c.style && c.style.textAlign) || c.getAttribute('align') || '';
      [...c.attributes].forEach((a) => c.removeAttribute(a.name));
      if (c.tagName === 'HR') c.setAttribute('data-break', '1');
      else if (['left', 'center', 'right', 'justify'].includes(al)) c.style.textAlign = al;
    });
  })(d.body);
  return d.body.innerHTML;
}

/* ---------- CSV ---------- */
function parseCSV(t) {
  t = t.split(CR).join('');
  if (t.charCodeAt(0) === 65279) t = t.slice(1);
  const first = t.split(NL)[0] || '';
  const cnt = (c) => first.split(c).length;
  const dl = [
    [TAB, cnt(TAB)],
    [';', cnt(';')],
    [',', cnt(',')],
  ].sort((a, b) => b[1] - a[1])[0][0];
  const out = [];
  let r = [],
    f = '',
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c == '"') {
        if (t[i + 1] == '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c == '"') q = true;
    else if (c == dl) {
      r.push(f);
      f = '';
    } else if (c == NL) {
      r.push(f);
      f = '';
      out.push(r);
      r = [];
    } else f += c;
  }
  if (f !== '' || r.length) {
    r.push(f);
    out.push(r);
  }
  return { data: out.filter((x) => x.some((v) => v.trim())), dl };
}
function loadCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  if ($('rec').value.trim() && !confirm('Vorhandene Empfängerliste ersetzen?')) {
    e.target.value = '';
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    const { data, dl } = parseCSV(rd.result);
    $('rec').value = data.map((r) => r.join(TAB)).join(NL);
    upd();
    toast(Math.max(0, data.length - 1) + ' Empfänger geladen');
  };
  rd.readAsText(file, $('enc').value);
  e.target.value = '';
}
function readRows() {
  const t = $('rec').value;
  if (!t.trim()) {
    cols = [];
    rows = [];
    return;
  }
  const { data } = parseCSV(t);
  cols = data[0].map((h) => h.trim());
  rows = data.slice(1).map((r) => {
    const o = {};
    cols.forEach((c, i) => (o[c] = (r[i] || '').trim()));
    return o;
  });
}

/* ---------- Platzhalter ---------- */
const missing = new Set(),
  empties = new Set();
function briefanrede(r) {
  const g = (k) => {
    const c = Object.keys(r).find((x) => x.toLowerCase() === k);
    return c ? r[c] : '';
  };
  const a = g('anrede').toLowerCase(),
    t = g('titel'),
    n = g('nachname');
  if (!n) return 'Sehr geehrte Damen und Herren,';
  const nm = (t ? t + ' ' : '') + n;
  if (/^frau/.test(a)) return 'Sehr geehrte Frau ' + nm + ',';
  if (/^herr/.test(a)) return 'Sehr geehrter Herr ' + nm + ',';
  return 'Sehr geehrte Damen und Herren,';
}
function ctx(r, i) {
  const c = { ...r };
  const set = (k, v) => (c[k] = v);
  set('Briefanrede', briefanrede(r));
  set('Datum', $('date').value);
  set('Betreff', $('subj').value);
  set('Brief_ID', ($('idPre').value || '') + ((parseInt($('idStart').value) || 1) + i));
  return c;
}
function look(c, k) {
  const kk = Object.keys(c).find((x) => x.toLowerCase() === k.toLowerCase());
  return kk === undefined ? undefined : c[kk];
}
function subText(s, c) {
  return String(s).replace(/{([^{}]+)}/g, (m, k) => {
    if (k.includes(NL)) return m;
    const v = look(c, k.trim());
    if (v === undefined) {
      missing.add(m);
      return m;
    }
    if (v === '' && !/^(titel|zusatz)/i.test(k.trim())) empties.add(m);
    return v;
  });
}
function subHtml(html, c) {
  const d = document.createElement('div');
  d.innerHTML = html;
  const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
  const ns = [];
  while (w.nextNode()) ns.push(w.currentNode);
  ns.forEach((n) => {
    n.nodeValue = subText(n.nodeValue, c);
  });
  return d;
}

/* ---------- Seitenaufbau ---------- */
function block() {
  return document.createElement('div');
}
function makePage(o, cfg, first, idx) {
  const p = block();
  p.className = 'page lay-' + cfg.layout;
  p.style.setProperty('--ff', cfg.ff);
  p.style.setProperty('--fs', cfg.fs);
  p.style.setProperty('--lh', cfg.lh);
  const A = cfg.form === 'A';
  let h = '';
  const marks = [A ? 87 : 105, A ? 192 : 210];
  const fm = cfg.fmPrev || cfg.fmPrint;
  if (fm) {
    h += marks.map((m) => '<div class="abs fm ' + (cfg.fmPrint ? '' : 'sc') + '" style="top:' + m + 'mm;width:5mm"></div>').join('') + ('<div class="abs fm ' + (cfg.fmPrint ? '' : 'sc') + '" style="top:148.5mm;width:8mm"></div>');
  }
  let top = first ? (A ? 85 : 98.5) : cfg.cont ? 25 : 20;
  if (first) {
    const ad = cfg.addr.map(esc).join('<br>');
    const top0 = A ? 27 : 45;
    h += '<div class="abs addr" style="top:' + top0 + 'mm">' + (cfg.vermerk ? '<div style="font-size:8pt;font-weight:700;height:5mm">' + esc(cfg.vermerk) + '</div>' : '<div style="height:5mm"></div>') + (cfg.ret ? '<div class="ret">' + esc(cfg.ret) + '</div>' : '') + ad + '</div>';
    if (cfg.infoRows.length) h += '<div class="abs info" style="top:' + (top0 + 5) + 'mm">' + cfg.infoRows.map((r) => '<div>' + r + '</div>').join('') + '</div>';
    if (cfg.sendBlock.length && cfg.sendPos === 'head') h += '<div class="abs sendhead" style="top:10mm;height:' + (top0 - 12) + 'mm;font-size:' + (A ? '8pt' : '9pt') + '">' + cfg.sendBlock.map(esc).join('<br>') + '</div>';
    if (cfg.layout === 'line' && cfg.sendBlock.length && cfg.sendPos === 'head') h += '<div class="abs rule" style="top:' + (top0 - 3) + 'mm"></div>';
    if (!cfg.logo && cfg.mono) h += '<div class="abs mono">' + esc(cfg.mono) + '</div>';
    if (cfg.logo) h += '<img class="abs logo" src="' + cfg.logo + '" alt="" style="width:' + cfg.logoW + 'mm;height:' + cfg.logoH + 'mm;top:' + cfg.logoTop + 'mm;right:' + cfg.logoRight + 'mm">';
  } else if (cfg.cont) {
    h += '<div class="abs cont"><span>' + esc(cfg.contL) + '</span><span>' + esc(cfg.contD) + '</span><span class="pn"></span></div>';
  }
  const showNum = cfg.num && !cfg.cont;
  const bot = cfg.foot || showNum ? 22 : 15;
  h += '<div class="main" style="top:' + top + 'mm;bottom:' + bot + 'mm"></div>';
  if (cfg.foot || showNum) h += '<div class="abs foot"><div>' + (cfg.foot ? cfg.footH : '') + '</div><div class="num" style="white-space:nowrap">' + (showNum ? '<span class="pn"></span>' : '') + '</div></div>';
  p.innerHTML = h;
  return p;
}
function monogram(t, sl) {
  if (t) return t.toUpperCase().slice(0, 3);
  const nm = (sl[1] || sl[0] || '').split(/[·,|]/)[0];
  const w = nm.split(/\s+/).filter((x) => x && !/^(gmbh|mbh|ag|ug|kg|ohg|se|e\.?k\.?|co\.?|&|und)$/i.test(x));
  return w
    .slice(0, 2)
    .map((x) => [...x][0].toUpperCase())
    .join('');
}
function logoMm(id, fallback, min, max) {
  const value = $(id).value.trim();
  const number = value === '' ? fallback : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function buildLetter(r, i, host) {
  const c = ctx(r, i);
  const cfg = {
    form: $('form').value,
    ff: $('ff').value,
    fs: $('fs').value,
    lh: $('lh').value,
    fmPrev: $('oFmPrev').checked,
    fmPrint: $('oFmPrint').checked,
    num: $('oNum').checked,
    cont: $('oCont').checked,
    foot: $('oFoot').checked,
    addr: subText($('addrT').value, c)
      .split(NL)
      .map((s) => s.trim())
      .filter(Boolean),
    ret: $('oRet').checked ? subText($('sender').value.split(NL)[0] || '', c) : '',
    vermerk: subText($('vermerk').value, c),
    subj: subText($('subj').value, c),
    logo: $('oLogo').checked ? logo : null,
    logoW: logoMm('logoW', 20, 1, 170),
    logoH: logoMm('logoH', 15, 1, 280),
    logoTop: logoMm('logoTop', 5, 0, 280),
    logoRight: logoMm('logoRight', 20, 0, 190),
    footH: subText($('foot').value, c).split(NL).map(esc).join('<br>'),
  };
  cfg.layout = $('layout').value || 'business';
  const sl = subText($('sender').value, c)
    .split(NL)
    .map((x) => x.trim())
    .filter(Boolean);
  cfg.sendPos = $('sendPos').value;
  cfg.sendBlock = cfg.sendPos === 'none' ? [] : sl.length > 1 ? sl.slice(1) : sl;
  if (cfg.sendPos === 'foot' && cfg.sendBlock.length) {
    cfg.foot = true;
    cfg.footH = esc(cfg.sendBlock.join(' · ')) + (cfg.footH ? '<br>' + cfg.footH : '');
  }
  cfg.mono = $('oMono').checked ? monogram($('monoT').value.trim(), sl) : '';
  cfg.contL = cfg.addr[0] || '';
  cfg.contD = subText($('date').value, c);
  cfg.infoRows = [];
  if (cfg.sendPos === 'info' && cfg.sendBlock.length) cfg.infoRows.push('<b>' + cfg.sendBlock.map(esc).join('<br>') + '</b><br>&nbsp;');
  if ($('oInfo').checked)
    subText($('infoT').value, c)
      .split(NL)
      .filter((s) => s.trim())
      .forEach((l) => {
        const x = l.indexOf(':');
        cfg.infoRows.push(x > 0 ? '<b>' + esc(l.slice(0, x)) + ':</b> ' + esc(l.slice(x + 1).trim()) : esc(l));
      });
  if ($('oDate').checked) cfg.infoRows.push('<b>Datum:</b> ' + esc(subText($('date').value, c)));
  if ($('oId').checked) cfg.infoRows.push('<b>Brief-ID:</b> ' + esc(c.Brief_ID));

  // Inhalt als Blockliste
  const body = subHtml(clean($('ed').innerHTML), c);
  const items = [];
  const first = block();
  first.className = 'subj';
  first.textContent = cfg.subj;
  const sal = block();
  sal.textContent = subText($('salT').value, c);
  sal.style.marginBottom = '1em';
  const pre = [first, sal];
  [...body.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      if (n.nodeValue.trim()) {
        const p = document.createElement('p');
        p.textContent = n.nodeValue;
        items.push(p);
      }
    } else if (n.tagName === 'HR') items.push('BREAK');
    else items.push(n);
  });
  const clos = block();
  clos.className = 'clos';
  clos.textContent = subText($('clos').value, c);
  const tail = [clos];
  if ($('oAtt').checked && $('att').value.trim()) {
    const a = block();
    a.className = 'att';
    a.textContent = subText($('att').value, c);
    tail.push(a);
  }

  const pages = [];
  const newPage = () => {
    const p = makePage(null, cfg, pages.length === 0, i);
    host.appendChild(p);
    pages.push(p);
    const m = p.querySelector('.main');
    const b = block();
    b.className = 'body';
    m.appendChild(b);
    return { p, m, b };
  };
  let cur = newPage();
  pre.forEach((n) => cur.m.insertBefore(n, cur.b));
  const over = () => cur.m.scrollHeight > cur.m.clientHeight + 1;
  const add = (n) => {
    cur.b.appendChild(n);
    if (over() && cur.b.children.length > 1) {
      cur.b.removeChild(n);
      cur = newPage();
      cur.b.appendChild(n);
    }
  };
  items.forEach((n) => {
    if (n === 'BREAK') {
      cur = newPage();
      return;
    }
    add(n);
  });
  tail.forEach((n) => {
    cur.m.appendChild(n);
    if (over() && cur.m.children.length > 1) {
      cur.m.removeChild(n);
      cur = newPage();
      cur.m.appendChild(n);
    }
  });
  pages.forEach((p, k) => {
    const nm = p.querySelector('.pn');
    if (nm && cfg.num) nm.textContent = 'Seite ' + (k + 1) + ' von ' + pages.length;
  });
  return pages.length;
}

/* ---------- Rendern ---------- */
function fillSel() {
  const s = $('sel'),
    cur = s.value;
  s.innerHTML =
    '<option value="all">Alle (' +
    rows.length +
    ')</option>' +
    rows
      .map((r, i) => {
        const nm = [r.Vorname, r.Nachname].filter(Boolean).join(' ') || r[cols[0]] || 'Empfänger';
        return '<option value="' + i + '">' + (i + 1) + ': ' + esc(nm) + '</option>';
      })
      .join('');
  s.value = [...s.options].some((o) => o.value === cur) ? cur : rows.length ? '0' : 'all';
}
function render() {
  missing.clear();
  empties.clear();
  const v = $('view');
  v.innerHTML = '';
  if (!rows.length) {
    v.innerHTML = '<div class="empty">Keine Empfänger. Daten einfügen oder „Beispiel" laden.</div>';
    $('pgInfo').textContent = '';
    showWarn();
    return;
  }
  const sel = $('sel').value;
  const list = sel === 'all' ? rows.map((r, i) => [r, i]) : [[rows[+sel], +sel]];
  let tot = 0;
  list.forEach(([r, i]) => (tot += buildLetter(r, i, v)));
  $('pgInfo').textContent = list.length + ' Brief(e), ' + tot + ' Seite(n)';
  showWarn();
  zoomIt();
}
function showWarn() {
  let h = '';
  if (missing.size) h += '⚠ Unbekannte Platzhalter: <b>' + [...missing].map(esc).join(', ') + '</b><br>';
  if (empties.size) h += '⚠ Leere Werte bei: <b>' + [...empties].map(esc).join(', ') + '</b> (in mindestens einem Brief)';
  $('warn').innerHTML = h;
}
function zoomIt() {
  const z = $('zoom').value / 100;
  $('view').style.zoom = z;
}
function step(d) {
  const s = $('sel');
  let n = s.selectedIndex + d;
  if (n < 0 || n >= s.options.length) return;
  s.selectedIndex = n;
  render();
}
function chips() {
  const names = [...cols, 'Briefanrede', 'Datum', 'Betreff', 'Brief_ID'];
  $('chips').innerHTML = names.map((n) => '<button onmousedown="event.preventDefault()" onclick="insVar(' + "'" + '' + esc(n).replace(/'/g, '') + '' + "'" + ')">{' + esc(n) + '}</button>').join('');
  $('recInfo').textContent = rows.length ? rows.length + ' Empfänger, Spalten: ' + cols.join(', ') : 'Noch keine Daten. Erste Zeile = Spaltennamen (z. B. Anrede;Vorname;Nachname;Straße;PLZ;Ort).';
}
let lastFocus = null;
document.addEventListener('focusin', (e) => {
  if (e.target.matches('input[type=text],textarea,#ed')) lastFocus = e.target;
});
function insVar(n) {
  const t = lastFocus && lastFocus.id !== 'rec' ? lastFocus : $('ed');
  const s = '{' + n + '}';
  if (t.id === 'ed') {
    t.focus();
    document.execCommand('insertText', false, s);
  } else {
    t.focus();
    const a = t.selectionStart,
      b = t.selectionEnd;
    t.value = t.value.slice(0, a) + s + t.value.slice(b);
    t.selectionStart = t.selectionEnd = a + s.length;
  }
  upd();
}
function cmd(c) {
  $('ed').focus();
  document.execCommand(c);
  upd();
}
function pbreak() {
  $('ed').focus();
  document.execCommand('insertHTML', false, '<hr data-break="1"><p><br></p>');
  upd();
}
$('ed').addEventListener('paste', (e) => {
  e.preventDefault();
  const h = e.clipboardData.getData('text/html');
  const t = e.clipboardData.getData('text/plain');
  document.execCommand('insertHTML', false, h ? clean(h) : esc(t).split(NL).join('<br>'));
  upd();
});
$('ed').addEventListener('input', () => upd());

/* ---------- Zustand ---------- */
function getState() {
  const d = { v: 3, logo, body: clean($('ed').innerHTML) };
  KEYS.forEach((k) => {
    const e = $(k);
    d[k] = e.type === 'checkbox' ? e.checked : e.value;
  });
  return d;
}
function setState(d) {
  KEYS.forEach((k) => {
    if (d[k] === undefined) return;
    const e = $(k);
    if (e.type === 'checkbox') e.checked = !!d[k];
    else e.value = d[k];
  });
  if (d.logoW === undefined) $('logoW').value = '60';
  if (d.logoH === undefined) $('logoH').value = '20';
  if (d.logoTop === undefined) $('logoTop').value = '10';
  if (d.logoRight === undefined) $('logoRight').value = '20';
  if (d.layout === undefined) $('layout').value = 'business';
  if (!$('layout').value) $('layout').value = 'business';
  if (d.oMono === undefined) {
    $('oMono').checked = false;
    $('monoT').value = '';
  }
  $('ed').innerHTML = clean(d.body || '');
  logo = typeof d.logo === 'string' && /^data:image[/](png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(d.logo) ? d.logo : null;
}
function save() {
  dirty = true;
  showStatus();
  try {
    localStorage.setItem('sbg3_auto', JSON.stringify(getState()));
  } catch (e) {
    toast('Automatisches Speichern fehlgeschlagen (Speicher voll?). Bitte Export nutzen.', true);
  }
}
function syncDocumentName() {
  const name = $('docName').value.trim();
  document.title = name || 'Seriendruck';
  $('docName').style.width = Math.min(Math.max((name || $('docName').placeholder).length * 1.1 + 3, 14), 40) + 'ch';
}
$('docName').addEventListener('input', () => {
  syncDocumentName();
  save();
});
function upd() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const ad = $('oAutoDate').checked;
    if (ad) $('date').value = today();
    $('date').readOnly = ad;
    readRows();
    fillSel();
    chips();
    render();
    save();
  }, 350);
}
const today = () => new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
document.querySelectorAll('[data-k]').forEach((e) => {
  e.addEventListener('input', upd);
  e.addEventListener('change', upd);
});

/* ---------- Entwürfe, Export, Import ---------- */
function drafts() {
  try {
    return JSON.parse(localStorage.getItem('sbg3_drafts') || '{}');
  } catch (e) {
    return {};
  }
}
const DRAFT_DEFAULT = 'Unbenannter Entwurf';
let dirty = false,
  lastSaved = null;
function markClean(saved) {
  dirty = false;
  if (saved) lastSaved = new Date();
  showStatus();
}
function showStatus() {
  const s = $('draftStatus');
  if (dirty) s.textContent = '● ungespeichert';
  else if (lastSaved) s.textContent = '✓ gespeichert ' + lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  else s.textContent = '';
  s.classList.toggle('dirty', dirty);
}
function fillDrafts() {
  const list = $('draftList');
  const names = Object.keys(drafts());
  list.textContent = '';
  if (!names.length) {
    const p = document.createElement('p');
    p.className = 'dm-empty';
    p.textContent = 'Noch keine Entwürfe im Browser';
    list.appendChild(p);
    return;
  }
  names.forEach((n) => {
    const row = document.createElement('div');
    row.className = 'dm-row';
    const open = document.createElement('button');
    open.type = 'button';
    open.setAttribute('role', 'menuitem');
    open.className = 'dm-open';
    open.textContent = n;
    open.title = 'Entwurf „' + n + '“ öffnen';
    open.addEventListener('click', () => draftLoad(n));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'dm-del';
    del.title = 'Entwurf „' + n + '“ löschen';
    del.setAttribute('aria-label', del.title);
    del.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-trash"/></svg>';
    del.addEventListener('click', () => draftDel(n));
    row.append(open, del);
    list.appendChild(row);
  });
}
function setMenu(open) {
  $('draftMenu').hidden = !open;
  $('draftMenuBtn').setAttribute('aria-expanded', open);
}
$('draftMenuBtn').addEventListener('click', () => setMenu($('draftMenu').hidden));
document.addEventListener('click', (e) => {
  if (!e.target.closest('.draft-menu-wrap')) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('draftMenu').hidden) {
    setMenu(false);
    $('draftMenuBtn').focus();
  }
});
$('docName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === 'Escape') e.target.blur();
});
$('docName').addEventListener('blur', () => {
  if (!$('docName').value.trim()) $('docName').value = DRAFT_DEFAULT;
  syncDocumentName();
});
function draftSave() {
  let n = $('docName').value.trim() || DRAFT_DEFAULT;
  $('docName').value = n;
  syncDocumentName();
  const d = drafts();
  if (d[n] && !confirm('Entwurf „' + n + '“ überschreiben?')) return;
  d[n] = getState();
  try {
    localStorage.setItem('sbg3_drafts', JSON.stringify(d));
    fillDrafts();
    markClean(true);
    toast('Im Browser gespeichert');
  } catch (e) {
    toast('Browser-Speicher voll. Bitte als Datei sichern.', true);
  }
}
function draftLoad(n) {
  setMenu(false);
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen und „' + n + '“ öffnen?')) return;
  const d = drafts()[n];
  if (!d) return toast('Entwurf nicht gefunden', true);
  setState({ ...d, docName: n });
  syncDocumentName();
  upd();
  setTimeout(() => markClean(true), 600);
  toast('Entwurf geöffnet');
}
function draftDel(n) {
  if (!confirm('Entwurf „' + n + '“ aus dem Browser löschen?')) return;
  const d = drafts();
  delete d[n];
  localStorage.setItem('sbg3_drafts', JSON.stringify(d));
  fillDrafts();
}
function draftExample() {
  setMenu(false);
  loadExample();
}
function draftNew() {
  setMenu(false);
  if (!confirm('Alle aktuellen Eingaben verwerfen und neu beginnen?')) return;
  const c = window.confirm;
  window.confirm = () => true;
  loadExample();
  window.confirm = c;
  $('rec').value = '';
  $('subj').value = '';
  $('docName').value = DRAFT_DEFAULT;
  lastSaved = null;
  syncDocumentName();
  upd();
}
function exportJSON() {
  const b = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const name = $('docName').value.trim() || 'Seriendruck';
  const filename =
    name
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/[. ]+$/, '')
      .trim() || 'Seriendruck';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = filename + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
function importJSON(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!confirm('Aktuelle Eingaben durch Import ersetzen?')) return;
      setState({ ...d, docName: d.docName || f.name.replace(/\.json$/i, '') });
      syncDocumentName();
      upd();
      toast('Importiert');
    } catch (x) {
      toast('Ungültige JSON-Datei', true);
    }
  };
  r.readAsText(f);
  e.target.value = '';
}
function loadLogo(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 600 / im.width),
        c = document.createElement('canvas');
      c.width = im.width * s;
      c.height = im.height * s;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      logo = c.toDataURL('image/png');
      $('oLogo').checked = true;
      upd();
      toast('Logo geladen');
    };
    im.onerror = () => toast('Bild nicht lesbar', true);
    im.src = r.result;
  };
  r.readAsDataURL(f);
  e.target.value = '';
}

/* ---------- Drucken ---------- */
function doPrint() {
  readRows();
  if (!rows.length) return toast('Keine Empfänger', true);
  const pa = $('printArea');
  pa.innerHTML = '';
  const sel = $('sel').value;
  const list = $('scope').value === 'one' && sel !== 'all' ? [[rows[+sel], +sel]] : rows.map((r, i) => [r, i]);
  missing.clear();
  empties.clear();
  list.forEach(([r, i]) => buildLetter(r, i, pa));
  if (missing.size && !confirm('Unbekannte Platzhalter: ' + [...missing].join(', ') + NL + 'Trotzdem drucken?')) return;
  document.body.classList.toggle('nofmprint', !$('oFmPrint').checked);
  setTimeout(() => {
    window.print();
  }, 60);
}
window.addEventListener('afterprint', () => {
  $('printArea').innerHTML = '';
});

/* ---------- Beispiel & Start ---------- */
const X = (o) => {
  for (const k in o) if (typeof o[k] === 'string') o[k] = o[k].split('¶').join(NL);
  return o;
};
function loadExample() {
  if (!confirm('Alle aktuellen Eingaben durch das Beispiel ersetzen?')) return;
  setState(
    X({
      rec: 'Anrede;Titel;Vorname;Nachname;Firma;Straße;PLZ;Ort¶Frau;Dr.;Anna;Schmidt;Technologiezentrum Süd;Innovationspark 12;80331;München¶Herr;;Thomas;Weber;Weber & Partner Logistik;Am Hafen 88;20457;Hamburg¶Frau;;Erika;Mustermann;;Beispielstraße 42;54321;Köln',
      enc: 'utf-8',
      addrT: '{Firma}¶{Anrede} {Titel} {Vorname} {Nachname}¶{Straße}¶{PLZ} {Ort}',
      salT: '{Briefanrede}',
      sender: 'Musterfirma GmbH · Industriestraße 42 · 10115 Berlin¶Musterfirma GmbH¶Industriestraße 42¶10115 Berlin',
      oRet: true,
      sendPos: 'head',
      layout: 'business',
      oMono: false,
      monoT: '',
      vermerk: '',
      date: today(),
      oAutoDate: true,
      subj: 'Vertragsanpassungen für das Geschäftsjahr',
      oInfo: true,
      infoT: 'Ansprechpartner: Daniel Düsentrieb¶Telefon: 030 1234567¶E-Mail: service@musterfirma.de',
      oDate: true,
      oId: false,
      idPre: 'REF-',
      idStart: '1001',
      oLogo: false,
      body: '<p>wir freuen uns, Ihnen unsere überarbeiteten Rahmenbedingungen vorzustellen. Die Unterlagen für <b>{Firma}</b> liegen bei.</p><p>Ab sofort bieten wir Ihnen:</p><ul><li><b>Erweiterte Supportzeiten</b> rund um die Uhr</li><li><i>Schnellere Reaktionszeiten</i> innerhalb von zwei Stunden</li></ul><p>Bitte prüfen Sie Ihre Daten auf Richtigkeit und teilen Sie uns Änderungen bis zum {Datum} mit.</p>',
      clos: 'Mit freundlichen Grüßen¶¶¶Daniel Düsentrieb¶Leitung Kundenservice',
      oAtt: false,
      att: 'Anlagen: Rahmenbedingungen 2027',
      form: 'B',
      ff: 'Arial',
      fs: '11pt',
      lh: '1.3',
      oFmPrev: true,
      oFmPrint: false,
      oNum: true,
      oCont: true,
      oFoot: true,
      foot: 'Musterfirma GmbH · Geschäftsführer: Max Muster · Amtsgericht Berlin HRB 998877¶IBAN DE12 3456 7890 1234 5678 90 · USt-IdNr. DE123456789',
      scope: 'all',
    }),
  );
  logo = null;
  upd();
}
(function init() {
  $('docName').value = 'Seriendruck_' + new Date().toISOString().slice(0, 10);
  fillDrafts();
  let d = null;
  try {
    d = JSON.parse(localStorage.getItem('sbg3_auto') || 'null');
  } catch (e) {}
  if (d) {
    setState(d);
    upd();
  } else {
    $('rec').value = '';
    loadExampleSilent();
  }
  syncDocumentName();
  setTimeout(() => markClean(false), 700);
  function loadExampleSilent() {
    const c = window.confirm;
    window.confirm = () => true;
    loadExample();
    window.confirm = c;
  }
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI)).catch((error) => {
      console.error('Service Worker konnte nicht registriert werden:', error);
      toast('Offline-Speicherung konnte nicht aktiviert werden.', true);
    });
  });
}
