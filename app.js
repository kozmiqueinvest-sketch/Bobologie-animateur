/* Bobologie — carnet de bobos pour animateurs.
   Tout est stocké sur le téléphone (localStorage). Aucun serveur. */
(() => {
  'use strict';

  const VERSION = '1.1';
  const STORE_KEY = 'bobologie.v1';

  const DEFAULT_TYPES = ['Égratignure', 'Coupure', 'Bosse / coup', 'Chute', 'Saignement de nez', 'Piqûre d’insecte', 'Écharde', 'Brûlure', 'Doigt pincé', 'Mal de tête', 'Mal de ventre', 'Morsure'];
  const ZONES = ['Tête', 'Visage', 'Nez', 'Bouche / dent', 'Bras', 'Coude', 'Main / doigt', 'Ventre', 'Dos', 'Genou', 'Jambe', 'Pied / cheville'];
  const DEFAULT_CARES = ['Eau + savon', 'Désinfection', 'Pansement', 'Poche de froid', 'Compresse', 'Retrait d’écharde', 'Repos au calme', 'Verre d’eau', 'Surveillance', 'Réconfort'];
  const FLAGS = [
    { key: 'parents', label: 'Parents prévenus', emoji: '📞' },
    { key: 'direction', label: 'Direction prévenue', emoji: '📣' },
    { key: 'watch', label: 'À surveiller', emoji: '👀' },
    { key: 'txTeacher', label: 'À transmettre à l’enseignant', emoji: '🏫' },
    { key: 'txParents', label: 'À transmettre aux parents', emoji: '💬' },
  ];
  // Ce que la direction doit retrouver dans l'onglet « À suivre ».
  const FOLLOW = [
    { key: 'txTeacher', title: 'À transmettre aux enseignants', todo: 'Marquer comme transmis', done: 'Transmis' },
    { key: 'txParents', title: 'À transmettre aux parents', todo: 'Marquer comme transmis', done: 'Transmis' },
    { key: 'watch', title: 'À surveiller', todo: 'Fin de surveillance', done: 'Surveillance terminée' },
  ];
  const NAME_FORMATS = [
    { id: 'first', label: 'Prénom' },
    { id: 'initial', label: 'Prénom + initiale' },
    { id: 'full', label: 'Nom complet' },
  ];

  const ICON = {
    journal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4.5" width="14" height="16.5" rx="3"/><path d="M9 3h6v3H9zM8.5 11.5h7M8.5 15.5h4.5"/></svg>',
    kids: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.7-5 5.500-5s4.900 1.800 5.500 5"/><circle cx="17" cy="9.500" r="2.400"/><path d="M16.800 14.600c2 .300 3.300 1.800 3.700 4.400"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.500 5.500 8 12l6.500 6.500"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.500 5.500 16 12l-6.500 6.500"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.500a8 8 0 0 1-11.800 7L4 20l1.500-4.100A8 8 0 1 1 20 11.500Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.500h12v17l-6-4-6 4z"/></svg>',
    bandage: '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-45 12 12)"><rect x="2.500" y="8" width="19" height="8" rx="4"/><path d="M9 8v8M15 8v8"/><circle cx="12" cy="12" r=".700" fill="currentColor"/></g></svg>',
  };

  const TABS = [
    { id: 'journal', label: 'Journal', icon: ICON.journal },
    { id: 'follow', label: 'À suivre', icon: ICON.pin },
    { id: 'children', label: 'Enfants', icon: ICON.kids },
    { id: 'settings', label: 'Réglages', icon: ICON.settings },
  ];

  /* ---------- Petits outils ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const pad = (n) => String(n).padStart(2, '0');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
  const union = (...lists) => {
    const out = [];
    lists.flat().forEach((v) => { if (v && !out.some((o) => norm(o) === norm(v))) out.push(v); });
    return out;
  };
  const isTime = (v) => /^\d{2}:\d{2}$/.test(v || '');
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

  function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  function todayISO() { return toISO(new Date()); }
  function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function shiftDay(iso, n) { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function fmtDay(iso, withYear) {
    const d = parseISO(iso);
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    if (withYear || d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    const txt = d.toLocaleDateString('fr-FR', opts);
    return d.getDate() === 1 ? txt.replace(' 1 ', ' 1er ') : txt;
  }
  function fmtShort(iso) { return parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function fmtTime(hm) { return isTime(hm) ? hm.replace(':', 'h') : '—'; }

  /* ---------- Données ---------- */
  function normalize(d) {
    d = d && typeof d === 'object' ? d : {};
    const str = (v) => (typeof v === 'string' ? v : '');
    const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : []);
    const children = (Array.isArray(d.children) ? d.children : [])
      .filter((c) => c && c.id && str(c.firstName))
      .map((c) => ({ id: String(c.id), firstName: str(c.firstName), lastName: str(c.lastName), group: str(c.group), notes: str(c.notes), createdAt: +c.createdAt || 0 }));
    const entries = (Array.isArray(d.entries) ? d.entries : [])
      .filter((e) => e && e.id && isDate(e.date))
      .map((e) => ({
        id: String(e.id),
        childId: String(e.childId),
        date: e.date,
        time: isTime(e.time) ? e.time : '00:00',
        types: arr(e.types),
        zones: arr(e.zones),
        details: str(e.details),
        cares: (Array.isArray(e.cares) ? e.cares : []).filter(Boolean).map((k) => ({ id: String(k.id || uid()), time: isTime(k.time) ? k.time : '00:00', items: arr(k.items), note: str(k.note) })),
        flags: Object.fromEntries(FLAGS.map((f) => [f.key, !!(e.flags && e.flags[f.key])])),
        done: Object.fromEntries(FOLLOW.map((f) => [f.key, !!(e.done && e.done[f.key])])),
        by: str(e.by),
        createdAt: +e.createdAt || 0,
      }));
    const s = d.settings && typeof d.settings === 'object' ? d.settings : {};
    return {
      children,
      entries,
      settings: {
        animator: str(s.animator),
        structure: str(s.structure),
        nameFormat: NAME_FORMATS.some((f) => f.id === s.nameFormat) ? s.nameFormat : 'initial',
        customTypes: arr(s.customTypes),
        customCares: arr(s.customCares),
        installHintDismissed: !!s.installHintDismissed,
      },
    };
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) { return normalize({}); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { toast('Enregistrement impossible sur ce téléphone'); }
  }

  let db = load();
  const ui = { tab: 'journal', date: todayISO(), followToday: true, childQuery: '', followAll: false, shareMode: 'day' };
  let form = null;      // bobo en cours de saisie
  let childForm = null; // fiche enfant ouverte

  function childById(id) { return db.children.find((c) => c.id === id) || null; }
  function fullName(c) { return c ? [c.firstName, c.lastName].filter(Boolean).join(' ') : 'Enfant inconnu'; }
  function initials(c) { return ((c.firstName || '?')[0] + ((c.lastName || '')[0] || '')).toUpperCase(); }
  function hue(c) { let h = 0; for (const ch of fullName(c)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function avatar(c) { return `<span class="avatar" style="--h:${hue(c)}" aria-hidden="true">${esc(initials(c))}</span>`; }
  function sortedChildren() { return [...db.children].sort((a, b) => fullName(a).localeCompare(fullName(b), 'fr', { sensitivity: 'base' })); }
  function groups() { return [...new Set(db.children.map((c) => c.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })); }
  function entriesFor(date) { return db.entries.filter((e) => e.date === date).sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt); }
  function entriesOf(childId) { return db.entries.filter((e) => e.childId === childId).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); }
  function followItems(key, all) {
    return db.entries
      .filter((e) => e.flags[key] && (all || !e.done[key]))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }
  function pendingCount() { return FOLLOW.reduce((n, f) => n + followItems(f.key, false).length, 0); }
  function flagText(e, f) {
    const fo = FOLLOW.find((x) => x.key === f.key);
    return `${f.emoji} ${f.label}${fo && e.done[f.key] ? ' (fait)' : ''}`;
  }
  function careText(k) { return [...k.items, k.note].filter(Boolean).join(', '); }

  /* Nom affiché dans le message : on évite les noms complets par défaut,
     et on ajoute l'initiale si deux enfants portent le même prénom. */
  function messageName(c, format) {
    if (!c) return 'Enfant inconnu';
    const first = c.firstName.trim();
    const last = (c.lastName || '').trim();
    if (!last) return first;
    if (format === 'full') return `${first} ${last}`;
    const twin = db.children.some((o) => o.id !== c.id && norm(o.firstName) === norm(first));
    if (format === 'first' && !twin) return first;
    return `${first} ${last[0].toUpperCase()}.`;
  }

  function buildMessage(date, format) {
    const s = db.settings;
    const list = entriesFor(date);
    const out = [`📋 *Bobologie — ${fmtDay(date, true)}*`];
    if (s.structure) out.push(s.structure);
    out.push('');
    if (!list.length) out.push('✅ Aucun bobo à signaler.');
    list.forEach((e) => {
      const c = childById(e.childId);
      out.push(`🕒 *${fmtTime(e.time)}* — *${messageName(c, format)}*${c && c.group ? ` (${c.group})` : ''}`);
      let what = e.types.join(', ') || 'Bobo';
      if (e.zones.length) what += ` — ${e.zones.join(', ').toLowerCase()}`;
      out.push(`🤕 ${what}`);
      if (e.details) out.push(`📝 ${e.details}`);
      if (e.cares.length) e.cares.forEach((k) => out.push(`🩹 Soin à ${fmtTime(k.time)} : ${careText(k)}`));
      else out.push('🩹 Aucun soin nécessaire');
      FLAGS.filter((f) => e.flags[f.key]).forEach((f) => out.push(flagText(e, f)));
      if (e.by) out.push(`👤 Soigné par ${e.by}`);
      out.push('');
    });
    if (list.length) out.push(`Total : ${plural(list.length, 'bobo')}`);
    if (s.animator) out.push(`— ${s.animator}`);
    return out.join('\n').trim();
  }

  function buildFollowMessage(format) {
    const out = ['📌 *À suivre — point direction*'];
    if (db.settings.structure) out.push(db.settings.structure);
    let total = 0;
    FOLLOW.forEach((f) => {
      const list = followItems(f.key, false);
      if (!list.length) return;
      total += list.length;
      out.push('', `*${f.title}* (${list.length})`);
      list.forEach((e) => {
        const c = childById(e.childId);
        let line = `• *${messageName(c, format)}*${c && c.group ? ` (${c.group})` : ''} — ${fmtShort(e.date)} à ${fmtTime(e.time)} : ${e.types.join(', ') || 'Bobo'}`;
        if (e.zones.length) line += ` (${e.zones.join(', ').toLowerCase()})`;
        out.push(line);
        if (e.details) out.push(`   📝 ${e.details}`);
        if (e.cares.length) out.push(`   🩹 ${e.cares.map((k) => `${fmtTime(k.time)} ${careText(k)}`).join(' ; ')}`);
      });
    });
    if (!total) out.push('', '✅ Rien à transmettre ni à surveiller.');
    if (db.settings.animator) out.push('', `— ${db.settings.animator}`);
    return out.join('\n').trim();
  }

  /* ---------- Écrans ---------- */
  function renderShell() {
    $('#app').innerHTML = `
      <main id="view" tabindex="-1"></main>
      <div id="actionbar"></div>
      <nav class="tabs" aria-label="Navigation principale">
        ${TABS.map((t) => `<button type="button" class="tab" data-action="tab" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`).join('')}
      </nav>
      <div id="sheets"></div>
      <div id="toast" role="status" aria-live="polite"></div>`;
  }

  function render() {
    $$('.tab').forEach((b) => { if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const pending = pendingCount();
    $('.tab[data-tab="follow"] span').innerHTML = `À suivre${pending ? ` <b class="badge">${pending}</b>` : ''}`;
    const view = $('#view');
    const bar = $('#actionbar');
    if (ui.tab === 'journal') {
      view.innerHTML = journalHTML();
      bar.innerHTML = `
        <button type="button" class="btn primary grow" data-action="entry-new">${ICON.plus}Noter un bobo</button>
        <button type="button" class="btn wa" data-action="share-open">${ICON.bubble}Partager</button>`;
    } else if (ui.tab === 'follow') {
      view.innerHTML = followHTML();
      bar.innerHTML = `<button type="button" class="btn wa grow" data-action="share-follow">${ICON.bubble}Envoyer le point à la direction</button>`;
    } else if (ui.tab === 'children') {
      view.innerHTML = childrenHTML();
      bar.innerHTML = db.children.length ? `<button type="button" class="btn primary grow" data-action="child-new">${ICON.plus}Ajouter un enfant</button>` : '';
    } else {
      view.innerHTML = settingsHTML();
      bar.innerHTML = '';
    }
  }

  function installHintHTML() {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    if (!ios || standalone || db.settings.installHintDismissed) return '';
    return `<div class="notice">
      <p><b>Installez d’abord l’appli :</b> bouton Partager de Safari, puis « Sur l’écran d’accueil ». Ce que vous saisissez ici dans Safari ne sera pas repris dans l’appli installée.</p>
      <button type="button" data-action="hint-dismiss" aria-label="Masquer ce message">✕</button>
    </div>`;
  }

  function journalHTML() {
    const today = todayISO();
    const isToday = ui.date === today;
    const list = entriesFor(ui.date);
    const kicker = isToday ? 'Aujourd’hui' : ui.date === shiftDay(today, -1) ? 'Hier' : 'Journal';
    const kids = new Set(list.map((e) => e.childId)).size;
    return `
      <header class="masthead">
        <span class="brand">${ICON.bandage}Bobologie</span>
        ${db.settings.structure ? `<span class="brand-sub">${esc(db.settings.structure)}</span>` : ''}
      </header>
      ${installHintHTML()}
      <div class="daybar">
        <button type="button" class="round" data-action="day-prev" aria-label="Jour précédent">${ICON.left}</button>
        <label class="daylabel">
          <span class="kicker">${kicker}</span>
          <span class="daytitle">${esc(fmtDay(ui.date))}</span>
          <input type="date" value="${ui.date}" max="${today}" data-action="day-pick" data-on-change="day-date" aria-label="Choisir un autre jour">
        </label>
        <button type="button" class="round" data-action="day-next" aria-label="Jour suivant"${isToday ? ' disabled' : ''}>${ICON.right}</button>
      </div>
      ${isToday ? '' : '<button type="button" class="link center" data-action="day-today">Revenir à aujourd’hui</button>'}
      ${list.length ? `
        <p class="count">${plural(list.length, 'bobo')} · ${plural(kids, 'enfant')}</p>
        <ol class="timeline">${list.map(entryHTML).join('')}</ol>` : `
        <div class="empty">
          ${ICON.bandage}
          <h2>Aucun bobo ${isToday ? 'pour l’instant' : 'ce jour-là'}</h2>
          <p>${isToday ? 'Tant mieux ! Dès qu’un enfant se fait mal, notez-le ici en quelques secondes.' : 'Rien n’a été noté à cette date.'}</p>
        </div>`}`;
  }

  function entryHTML(e) {
    const c = childById(e.childId);
    const flags = FLAGS.filter((f) => e.flags[f.key]);
    return `<li class="entry">
      <time class="entry-time" datetime="${e.time}">${fmtTime(e.time)}</time>
      <button type="button" class="card entry-card" data-action="entry-edit" data-id="${esc(e.id)}" aria-label="Modifier : ${esc(fullName(c))}, ${fmtTime(e.time)}">
        <span class="entry-head"><span class="entry-name">${esc(fullName(c))}</span>${c && c.group ? `<span class="tag">${esc(c.group)}</span>` : ''}</span>
        <span class="entry-what">${esc(e.types.join(' · ') || 'Bobo')}${e.zones.length ? ` <span class="muted">— ${esc(e.zones.join(', ').toLowerCase())}</span>` : ''}</span>
        ${e.details ? `<span class="entry-details">${esc(e.details)}</span>` : ''}
        ${e.cares.length
          ? e.cares.map((k) => `<span class="care-line"><span class="care-badge">${fmtTime(k.time)}</span><span>${esc(careText(k))}</span></span>`).join('')
          : '<span class="care-line none">Aucun soin noté</span>'}
        ${flags.length ? `<span class="flags">${flags.map((f) => `<span class="flag">${esc(flagText(e, f))}</span>`).join('')}</span>` : ''}
        ${e.by ? `<span class="entry-by">Soigné par ${esc(e.by)}</span>` : ''}
      </button>
    </li>`;
  }

  function followHTML() {
    const sections = FOLLOW.map((f) => {
      const list = followItems(f.key, ui.followAll);
      if (!list.length) return '';
      return `<h2 class="group-title">${f.title} · ${list.length}</h2>
        <div class="follow-list">${list.map((e) => {
          const c = childById(e.childId);
          const isDone = e.done[f.key];
          return `<article class="card follow${isDone ? ' is-done' : ''}">
            <div class="entry-head"><span class="entry-name">${esc(fullName(c))}</span>${c && c.group ? `<span class="tag">${esc(c.group)}</span>` : ''}</div>
            <p class="follow-when">${esc(fmtShort(e.date))} à ${fmtTime(e.time)}${e.by ? ` · noté par ${esc(e.by)}` : ''}</p>
            <p class="entry-what">${esc(e.types.join(' · ') || 'Bobo')}${e.zones.length ? ` <span class="muted">— ${esc(e.zones.join(', ').toLowerCase())}</span>` : ''}</p>
            ${e.details ? `<p class="entry-details">${esc(e.details)}</p>` : ''}
            ${e.cares.map((k) => `<p class="care-line"><span class="care-badge">${fmtTime(k.time)}</span><span>${esc(careText(k))}</span></p>`).join('')}
            ${c && c.notes ? `<p class="alert">⚠️ ${esc(c.notes)}</p>` : ''}
            <div class="follow-actions">
              <button type="button" class="btn ${isDone ? 'ghost' : 'primary'}" data-action="follow-done" data-id="${esc(e.id)}" data-key="${f.key}">${isDone ? `✓ ${f.done} · annuler` : f.todo}</button>
              <button type="button" class="link" data-action="entry-edit" data-id="${esc(e.id)}">Ouvrir</button>
            </div>
          </article>`;
        }).join('')}</div>`;
    }).join('');
    return `
      <header class="masthead"><h1>À suivre</h1><span class="brand-sub">Direction</span></header>
      <p class="hint" style="margin-bottom:12px">Seulement l’important : transmissions aux enseignants et aux parents, bobos à surveiller. Les bobos bénins restent dans le journal.</p>
      <div class="seg" role="group" aria-label="Filtre">
        <button type="button" data-action="follow-filter" data-value="todo" aria-pressed="${!ui.followAll}">À faire</button>
        <button type="button" data-action="follow-filter" data-value="all" aria-pressed="${ui.followAll}">Tout, y compris fait</button>
      </div>
      ${sections || `<div class="empty">${ICON.pin}<h2>Rien à suivre</h2><p>Quand vous cochez « à transmettre » ou « à surveiller » sur un bobo, il apparaît ici.</p></div>`}`;
  }

  function childrenHTML() {
    return `
      <header class="masthead">
        <h1>Enfants</h1>
        <span class="brand-sub">${db.children.length ? plural(db.children.length, 'enfant') : ''}</span>
      </header>
      ${db.children.length ? `<div class="search"><input type="search" placeholder="Rechercher un enfant ou un groupe" value="${esc(ui.childQuery)}" data-on-input="child-q" aria-label="Rechercher" autocomplete="off"></div>` : ''}
      <div id="child-list">${childListHTML()}</div>
      ${db.children.length ? '<button type="button" class="btn ghost block list-foot" data-action="child-import">Coller une liste d’enfants</button>' : ''}`;
  }

  function childListHTML() {
    if (!db.children.length) {
      return `<div class="empty">
        ${ICON.kids}
        <h2>Aucun enfant enregistré</h2>
        <p>Ajoutez les enfants un par un, ou collez votre liste d’appel d’un seul coup.</p>
        <div class="stack">
          <button type="button" class="btn primary" data-action="child-new">${ICON.plus}Ajouter un enfant</button>
          <button type="button" class="btn ghost" data-action="child-import">Coller une liste</button>
        </div>
      </div>`;
    }
    const q = norm(ui.childQuery);
    const list = sortedChildren().filter((c) => !q || norm(`${fullName(c)} ${c.group}`).includes(q));
    if (!list.length) return '<p class="hint center">Aucun enfant ne correspond à cette recherche.</p>';
    const byGroup = new Map();
    list.forEach((c) => { const g = c.group || ''; if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(c); });
    const names = [...byGroup.keys()].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'fr', { numeric: true }));
    const showTitles = names.length > 1 || names[0] !== '';
    return names.map((g) => `
      ${showTitles ? `<h2 class="group-title">${esc(g || 'Sans groupe')}</h2>` : ''}
      <div class="card rows">${byGroup.get(g).map((c) => {
        const n = entriesOf(c.id).length;
        return `<button type="button" class="row" data-action="child-edit" data-id="${esc(c.id)}">
          ${avatar(c)}
          <span class="row-main"><strong>${esc(fullName(c))}</strong><span>${n ? plural(n, 'bobo') + (n > 1 ? ' notés' : ' noté') : 'Aucun bobo'}${c.notes ? ' · ⚠️ infos' : ''}</span></span>
          ${ICON.right}
        </button>`;
      }).join('')}</div>`).join('');
  }

  function segHTML(current, action) {
    return `<div class="seg" role="group" aria-label="Affichage des noms dans le message">
      ${NAME_FORMATS.map((f) => `<button type="button" data-action="${action}" data-value="${f.id}" aria-pressed="${f.id === current}">${f.label}</button>`).join('')}
    </div>`;
  }

  function settingsHTML() {
    const s = db.settings;
    const custom = (key, title) => (s[key].length ? `
      <div class="field"><span class="label">${title}</span>
        <div class="pills">${s[key].map((v) => `<span class="pill">${esc(v)}<button type="button" data-action="custom-remove" data-list="${key}" data-value="${esc(v)}" aria-label="Retirer ${esc(v)}">✕</button></span>`).join('')}</div>
      </div>` : '');
    return `
      <header class="masthead"><h1>Réglages</h1></header>
      <section class="card panel">
        <h2>Vous</h2>
        <label class="field"><span class="label">Votre prénom (signature du message)</span>
          <input type="text" value="${esc(s.animator)}" data-on-input="set-animator" autocapitalize="words" autocomplete="off" placeholder="ex. Camille"></label>
        <label class="field"><span class="label">Nom de la structure</span>
          <input type="text" value="${esc(s.structure)}" data-on-input="set-structure" autocomplete="off" placeholder="ex. Centre de loisirs des Tilleuls"></label>
      </section>
      <section class="card panel">
        <h2>Message WhatsApp</h2>
        <div class="field"><span class="label">Comment nommer les enfants dans le message</span>${segHTML(s.nameFormat, 'set-format')}</div>
        <p class="hint">« Prénom + initiale » évite d’écrire les noms de famille complets dans le groupe.</p>
      </section>
      ${s.customTypes.length || s.customCares.length ? `
      <section class="card panel">
        <h2>Vos choix ajoutés</h2>
        ${custom('customTypes', 'Bobos')}
        ${custom('customCares', 'Soins')}
      </section>` : ''}
      <section class="card panel">
        <h2>Sauvegarde</h2>
        <p class="hint">Les données sont uniquement sur ce téléphone. Exportez une sauvegarde de temps en temps, par exemple avant de changer de téléphone.</p>
        <div class="grid2">
          <button type="button" class="btn ghost" data-action="export">Exporter</button>
          <button type="button" class="btn ghost" data-action="import">Importer</button>
        </div>
        <input type="file" id="import-file" accept="application/json,.json" hidden data-on-change="import-file">
      </section>
      <section class="card panel">
        <h2>Confidentialité</h2>
        <p class="hint">Rien n’est envoyé sur Internet. Seul le message que vous choisissez de partager quitte ce téléphone. Pensez à verrouiller votre téléphone : ces informations concernent des enfants.</p>
        <button type="button" class="btn danger block" data-action="wipe">Tout effacer</button>
      </section>
      <p class="version">Bobologie ${VERSION} · ${plural(db.children.length, 'enfant')} · ${plural(db.entries.length, 'bobo')}</p>`;
  }

  /* ---------- Feuilles, confirmation, toast ---------- */
  const sheetStack = [];
  function setBackgroundInert(on) {
    ['#view', '#actionbar', '.tabs'].forEach((sel) => { const el = $(sel); if (el) el.inert = on; });
  }
  function openSheet({ title, body, cancel = 'Annuler', done, onDone }) {
    const el = document.createElement('div');
    el.className = 'sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="sheet-inner">
      <header class="sheet-head">
        <button type="button" data-action="sheet-close">${esc(cancel)}</button>
        <h2>${esc(title)}</h2>
        ${done ? `<button type="button" data-action="sheet-done">${esc(done)}</button>` : '<span></span>'}
      </header>
      <div class="sheet-body">${body}</div>
    </div>`;
    if (sheetStack.length) sheetStack[sheetStack.length - 1].el.inert = true;
    $('#sheets').appendChild(el);
    sheetStack.push({ el, onDone });
    setBackgroundInert(true);
    return el;
  }
  function closeSheet() {
    const s = sheetStack.pop();
    if (!s) return;
    s.el.remove();
    if (sheetStack.length) sheetStack[sheetStack.length - 1].el.inert = false;
    else setBackgroundInert(false);
  }
  function closeAllSheets() { while (sheetStack.length) closeSheet(); form = null; childForm = null; }
  function topSheet() { return sheetStack.length ? sheetStack[sheetStack.length - 1].el : null; }

  function confirmDialog({ title, text, ok = 'OK', cancel = 'Annuler', danger = false }) {
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.className = 'dialog-back';
      back.innerHTML = `<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 id="dlg-title">${esc(title)}</h2>
        ${text ? `<p>${esc(text)}</p>` : ''}
        <div class="grid2">
          <button type="button" class="btn ghost" data-r="0">${esc(cancel)}</button>
          <button type="button" class="btn ${danger ? 'danger-fill' : 'primary'}" data-r="1">${esc(ok)}</button>
        </div>
      </div>`;
      back.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-r]');
        if (!b && ev.target !== back) return;
        back.remove();
        resolve(!!b && b.dataset.r === '1');
      });
      document.body.appendChild(back);
      $('[data-r="0"]', back).focus();
    });
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- Formulaire bobo ---------- */
  function chipsHTML(options, selected, kind) {
    return options.map((o) => `<button type="button" class="chip${kind ? ' ' + kind : ''}" aria-pressed="${selected.includes(o)}" data-action="chip" data-value="${esc(o)}">${esc(o)}</button>`).join('');
  }
  function addChipHTML(listKey) {
    return `<button type="button" class="chip add" data-action="chip-add" data-list="${listKey}">+ Autre</button>`;
  }
  function careHTML(k, synced) {
    const opts = union(DEFAULT_CARES, db.settings.customCares, k.items);
    return `<div class="care" data-id="${esc(k.id)}">
      <div class="care-top">
        <label class="field"><span class="label">Heure du soin</span>
          <input type="time" class="care-time" value="${k.time}" data-on-input="care-time"${synced ? ' data-synced' : ''}></label>
        <button type="button" class="care-remove" data-action="care-remove">Retirer</button>
      </div>
      <div class="chips" role="group" aria-label="Soins administrés">${chipsHTML(opts, k.items, 'care-chip')}${addChipHTML('customCares')}</div>
      <input type="text" class="care-note" value="${esc(k.note)}" placeholder="Précision (facultatif)" aria-label="Précision sur le soin" autocomplete="off">
    </div>`;
  }

  function openEntryForm(entryId, presetChildId) {
    const existing = entryId ? db.entries.find((e) => e.id === entryId) : null;
    const d = existing ? clone(existing) : {
      id: null, childId: presetChildId || null, date: ui.date, time: nowHM(),
      types: [], zones: [], details: '', cares: [], flags: {}, done: {}, by: db.settings.animator,
    };
    form = { id: d.id, childId: childById(d.childId) ? d.childId : null };
    const cares = d.cares.length ? d.cares : [{ id: uid(), time: d.time, items: [], note: '' }];
    openSheet({
      title: existing ? 'Modifier le bobo' : 'Nouveau bobo',
      done: 'Enregistrer',
      onDone: saveEntry,
      body: `
        <section><h3>Enfant</h3><div id="child-picker"></div></section>
        <section class="grid2">
          <label class="field"><span class="label">Date</span><input type="date" id="e-date" value="${d.date}" max="${todayISO()}"></label>
          <label class="field"><span class="label">Heure du bobo</span><input type="time" id="e-time" value="${d.time}" data-on-input="entry-time"></label>
        </section>
        <section><h3>Quel bobo ?</h3>
          <div class="chips" id="e-types" role="group" aria-label="Type de bobo">${chipsHTML(union(DEFAULT_TYPES, db.settings.customTypes, d.types), d.types)}${addChipHTML('customTypes')}</div></section>
        <section><h3>Où ?<small>facultatif</small></h3>
          <div class="chips" id="e-zones" role="group" aria-label="Zone du corps">${chipsHTML(union(ZONES, d.zones), d.zones)}</div></section>
        <section><label class="field"><span class="label">Comment c’est arrivé, précisions</span>
          <textarea id="e-details" placeholder="ex. A trébuché en courant dans la cour">${esc(d.details)}</textarea></label></section>
        <section><h3>Soins administrés</h3>
          <div id="e-cares">${cares.map((k) => careHTML(k, !existing)).join('')}</div>
          <button type="button" class="btn ghost block" data-action="care-add">${ICON.plus}Ajouter un soin à une autre heure</button></section>
        <section><h3>Suivi</h3>
          <div class="chips" id="e-flags" role="group" aria-label="Suivi">${FLAGS.map((f) => `<button type="button" class="chip" aria-pressed="${!!d.flags[f.key]}" data-action="chip" data-value="${f.key}">${f.emoji} ${f.label}</button>`).join('')}</div></section>
        <section><label class="field"><span class="label">Soigné par</span>
          <input type="text" id="e-by" value="${esc(d.by)}" autocapitalize="words" autocomplete="off" placeholder="Votre prénom"></label></section>
        <section class="field">
          <button type="button" class="btn primary block" data-action="sheet-done">Enregistrer</button>
          ${existing ? '<button type="button" class="btn danger block" data-action="entry-delete">Supprimer ce bobo</button>' : ''}
        </section>`,
    });
    renderChildPicker();
  }

  function renderChildPicker(focus) {
    const host = $('#child-picker');
    if (!host) return;
    const c = childById(form.childId);
    if (c) {
      host.innerHTML = `<div class="card picked">
          ${avatar(c)}
          <div class="picked-main"><strong>${esc(fullName(c))}</strong>${c.group ? `<span>${esc(c.group)}</span>` : ''}</div>
          <button type="button" class="link" data-action="pick-clear">Changer</button>
        </div>
        ${c.notes ? `<p class="alert">⚠️ ${esc(c.notes)}</p>` : ''}`;
      return;
    }
    host.innerHTML = `<input type="search" id="pick-q" placeholder="Prénom de l’enfant…" data-on-input="pick-q" autocomplete="off" autocapitalize="words" aria-label="Rechercher ou ajouter un enfant">
      <div class="chips" id="pick-results"></div>`;
    renderPickResults('');
    if (focus) $('#pick-q').focus();
  }

  function renderPickResults(query) {
    const host = $('#pick-results');
    if (!host) return;
    const q = norm(query);
    const list = sortedChildren().filter((c) => !q || norm(fullName(c)).includes(q));
    const exact = list.some((c) => norm(fullName(c)) === q);
    const chips = list.slice(0, 60).map((c) => `<button type="button" class="chip" data-action="pick" data-id="${esc(c.id)}">${esc(fullName(c))}${c.group ? `<small>${esc(c.group)}</small>` : ''}</button>`).join('');
    const create = q && !exact ? `<button type="button" class="chip create" data-action="pick-create">+ Ajouter « ${esc(query.trim())} »</button>` : '';
    host.innerHTML = chips + create || '<p class="hint">Aucun enfant enregistré : tapez un prénom pour l’ajouter.</p>';
  }

  function saveEntry() {
    const sheet = topSheet();
    const pressed = (root) => $$('.chip[aria-pressed="true"][data-value]', root).map((b) => b.dataset.value);
    if (!form.childId) {
      toast('Choisissez d’abord un enfant');
      $('.sheet-body', sheet).scrollTo({ top: 0 });
      const q = $('#pick-q', sheet);
      if (q) q.focus();
      return;
    }
    const types = pressed($('#e-types', sheet));
    const details = $('#e-details', sheet).value.trim();
    if (!types.length && !details) {
      toast('Indiquez le bobo');
      $('#e-types', sheet).scrollIntoView({ block: 'center' });
      return;
    }
    const time = isTime($('#e-time', sheet).value) ? $('#e-time', sheet).value : nowHM();
    const date = isDate($('#e-date', sheet).value) ? $('#e-date', sheet).value : ui.date;
    const cares = $$('.care', sheet)
      .map((el) => ({
        id: el.dataset.id,
        time: isTime($('.care-time', el).value) ? $('.care-time', el).value : time,
        items: pressed(el),
        note: $('.care-note', el).value.trim(),
      }))
      .filter((k) => k.items.length || k.note)
      .sort((a, b) => a.time.localeCompare(b.time));
    const on = pressed($('#e-flags', sheet));
    const data = {
      childId: form.childId, date, time, types,
      zones: pressed($('#e-zones', sheet)),
      details, cares,
      flags: Object.fromEntries(FLAGS.map((f) => [f.key, on.includes(f.key)])),
      by: $('#e-by', sheet).value.trim(),
    };
    const existing = form.id && db.entries.find((e) => e.id === form.id);
    data.done = Object.fromEntries(FOLLOW.map((f) => [f.key, !!(existing && existing.done[f.key] && data.flags[f.key])]));
    if (existing) Object.assign(existing, data);
    else db.entries.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
    save();
    closeAllSheets();
    ui.tab = 'journal';
    setDate(date);
    render();
    toast(existing ? 'Bobo modifié' : 'Bobo enregistré');
  }

  /* ---------- Fiche enfant ---------- */
  function openChildForm(id) {
    const c = id ? childById(id) : null;
    const hist = c ? entriesOf(c.id) : [];
    const gs = groups();
    childForm = { id: c ? c.id : null };
    openSheet({
      title: c ? 'Fiche enfant' : 'Nouvel enfant',
      done: 'Enregistrer',
      onDone: saveChild,
      body: `
        <section class="field" style="gap:14px">
          <div class="grid2">
            <label class="field"><span class="label">Prénom</span><input type="text" id="c-first" value="${esc(c ? c.firstName : '')}" autocapitalize="words" autocomplete="off"></label>
            <label class="field"><span class="label">Nom</span><input type="text" id="c-last" value="${esc(c ? c.lastName : '')}" autocapitalize="words" autocomplete="off"></label>
          </div>
          <label class="field"><span class="label">Groupe</span><input type="text" id="c-group" value="${esc(c ? c.group : '')}" autocomplete="off" placeholder="ex. 6-8 ans, Les Lutins…"></label>
          ${gs.length ? `<div class="chips" role="group" aria-label="Groupes existants">${gs.map((g) => `<button type="button" class="chip" data-action="group-pick" data-value="${esc(g)}">${esc(g)}</button>`).join('')}</div>` : ''}
          <label class="field"><span class="label">Infos utiles (allergies, PAI…)</span><textarea id="c-notes" placeholder="Affichées en alerte quand vous notez un bobo">${esc(c ? c.notes : '')}</textarea></label>
        </section>
        ${c ? `
        <section><button type="button" class="btn primary block" data-action="child-entry">${ICON.plus}Noter un bobo pour ${esc(c.firstName)}</button></section>
        <section><h3>Historique<small>${hist.length ? plural(hist.length, 'bobo') : ''}</small></h3>
          ${hist.length ? `<ul class="history">${hist.map((e) => `<li><b>${esc(fmtShort(e.date))} · ${fmtTime(e.time)}</b><br>${esc(e.types.join(', ') || 'Bobo')}${e.zones.length ? ` — ${esc(e.zones.join(', ').toLowerCase())}` : ''}${e.cares.length ? `<br><span class="muted">Soins : ${esc(e.cares.map((k) => `${fmtTime(k.time)} ${careText(k)}`).join(' ; '))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Aucun bobo enregistré pour cet enfant.</p>'}
        </section>
        <section><button type="button" class="btn danger block" data-action="child-delete">Supprimer cet enfant</button></section>` : ''}`,
    });
    if (!c) $('#c-first').focus();
  }

  function saveChild() {
    const first = $('#c-first').value.trim();
    if (!first) { toast('Le prénom est obligatoire'); $('#c-first').focus(); return; }
    const data = { firstName: first, lastName: $('#c-last').value.trim(), group: $('#c-group').value.trim(), notes: $('#c-notes').value.trim() };
    const existing = childForm.id && childById(childForm.id);
    if (existing) Object.assign(existing, data);
    else db.children.push(Object.assign({ id: uid(), createdAt: Date.now() }, data));
    save();
    closeAllSheets();
    render();
    toast(existing ? 'Fiche mise à jour' : `${first} est ajouté·e`);
  }

  function parseName(text) {
    const parts = text.replace(/^[\s\-–•*\d.)]+/, '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
    return { firstName: cap(parts[0]), lastName: parts.slice(1).map(cap).join(' ') };
  }

  function saveImportList() {
    const group = $('#imp-group').value.trim();
    const known = new Set(db.children.map((c) => norm(fullName(c))));
    let added = 0;
    $('#imp-list').value.split(/[\n;,]+/).forEach((line) => {
      const n = parseName(line);
      if (!n) return;
      const key = norm(`${n.firstName} ${n.lastName}`);
      if (known.has(key)) return;
      known.add(key);
      db.children.push({ id: uid(), createdAt: Date.now(), firstName: n.firstName, lastName: n.lastName, group, notes: '' });
      added += 1;
    });
    if (!added) { toast('Aucun nouvel enfant à ajouter'); return; }
    save();
    closeAllSheets();
    render();
    toast(`${plural(added, 'enfant')} ajouté${added > 1 ? 's' : ''}`);
  }

  /* ---------- Partage ---------- */
  function openShare(mode) {
    ui.shareMode = mode || 'day';
    const follow = ui.shareMode === 'follow';
    openSheet({
      title: follow ? 'Point direction' : 'Message du jour',
      cancel: 'Fermer',
      body: `
        <p class="hint">Relisez et corrigez si besoin. En touchant « Envoyer sur WhatsApp », vous choisirez ensuite votre groupe dans WhatsApp.</p>
        <div class="field"><span class="label">Noms des enfants</span>${segHTML(db.settings.nameFormat, 'share-format')}</div>
        <label class="field"><span class="label">${follow ? 'Message — tout ce qui reste à faire' : `Message — ${esc(fmtDay(ui.date))}`}</span>
          <textarea id="share-text" data-on-input="share-text"></textarea></label>
        <div class="field">
          <a class="btn wa block" id="share-wa" target="_blank" rel="noopener">${ICON.bubble}Envoyer sur WhatsApp</a>
          <div class="grid2">
            ${navigator.share ? '<button type="button" class="btn ghost" data-action="share-native">Autre appli…</button>' : ''}
            <button type="button" class="btn ghost" data-action="share-copy">Copier le texte</button>
          </div>
        </div>`,
    });
    fillShare();
  }
  function fillShare() {
    const ta = $('#share-text');
    ta.value = ui.shareMode === 'follow' ? buildFollowMessage(db.settings.nameFormat) : buildMessage(ui.date, db.settings.nameFormat);
    syncShareLink();
  }
  function syncShareLink() {
    $('#share-wa').href = 'https://wa.me/?text=' + encodeURIComponent($('#share-text').value);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = $('#share-text');
      ta.focus();
      ta.select();
      document.execCommand('copy');
    }
    toast('Message copié');
  }

  /* ---------- Sauvegarde ---------- */
  async function exportData() {
    const name = `bobologie-sauvegarde-${todayISO()}.json`;
    const json = JSON.stringify(Object.assign({ app: 'bobologie', format: 1, exportedAt: new Date().toISOString() }, db), null, 2);
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Sauvegarde Bobologie' }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { data = null; }
      if (!data || !Array.isArray(data.children) || !Array.isArray(data.entries)) { toast('Ce fichier n’est pas une sauvegarde Bobologie'); return; }
      const next = normalize(data);
      const ok = await confirmDialog({
        title: 'Restaurer cette sauvegarde ?',
        text: `Elle contient ${plural(next.children.length, 'enfant')} et ${plural(next.entries.length, 'bobo')}. Les données actuelles de ce téléphone seront remplacées.`,
        ok: 'Restaurer', danger: true,
      });
      if (!ok) return;
      db = next;
      save();
      render();
      toast('Sauvegarde restaurée');
    };
    reader.readAsText(file);
  }

  /* ---------- Actions ---------- */
  function setDate(iso) {
    const today = todayISO();
    ui.date = iso > today ? today : iso;
    ui.followToday = ui.date === today;
  }

  const actions = {
    tab(el) { ui.tab = el.dataset.tab; render(); $('#view').scrollTop = 0; },
    'hint-dismiss'() { db.settings.installHintDismissed = true; save(); render(); },

    'day-prev'() { setDate(shiftDay(ui.date, -1)); render(); },
    'day-next'() { setDate(shiftDay(ui.date, 1)); render(); },
    'day-today'() { setDate(todayISO()); render(); },
    'day-pick'(el) {
      // Sur ordinateur, un champ date invisible n'ouvre pas son calendrier tout seul.
      if (el.showPicker && matchMedia('(pointer: fine)').matches) { try { el.showPicker(); } catch (e) { /* déjà ouvert */ } }
    },

    'entry-new'() { openEntryForm(null); },
    'entry-edit'(el) { openEntryForm(el.dataset.id); },
    async 'entry-delete'() {
      const ok = await confirmDialog({ title: 'Supprimer ce bobo ?', text: 'Il disparaîtra du journal et du message du jour.', ok: 'Supprimer', danger: true });
      if (!ok) return;
      db.entries = db.entries.filter((e) => e.id !== form.id);
      save();
      closeAllSheets();
      render();
      toast('Bobo supprimé');
    },
    chip(el) { el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true'); },
    'chip-add'(btn) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'chip-input';
      input.placeholder = 'Autre…';
      input.maxLength = 40;
      input.autocomplete = 'off';
      input.enterKeyHint = 'done';
      input.setAttribute('aria-label', 'Ajouter un autre choix');
      btn.hidden = true;
      btn.before(input);
      input.focus();
      let finished = false;
      const finish = (keep) => {
        if (finished) return;
        finished = true;
        const value = input.value.trim().replace(/\s+/g, ' ');
        input.remove();
        btn.hidden = false;
        if (!keep || !value) return;
        const key = btn.dataset.list;
        const same = $$('.chip[data-value]', btn.parentElement).find((b) => norm(b.dataset.value) === norm(value));
        if (same) { same.setAttribute('aria-pressed', 'true'); return; }
        if (!db.settings[key].some((v) => norm(v) === norm(value))) { db.settings[key].push(value); save(); }
        btn.insertAdjacentHTML('beforebegin', chipsHTML([value], [value], key === 'customCares' ? 'care-chip' : ''));
      };
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
        else if (ev.key === 'Escape') { ev.stopPropagation(); finish(false); }
      });
      input.addEventListener('blur', () => finish(true));
    },
    'care-add'() {
      $('#e-cares').insertAdjacentHTML('beforeend', careHTML({ id: uid(), time: nowHM(), items: [], note: '' }, false));
      $('#e-cares').lastElementChild.scrollIntoView({ block: 'center', behavior: 'smooth' });
    },
    'care-remove'(el) { el.closest('.care').remove(); },

    pick(el) { form.childId = el.dataset.id; renderChildPicker(); },
    'pick-clear'() { form.childId = null; renderChildPicker(true); },
    'pick-create'() {
      const n = parseName($('#pick-q').value);
      if (!n) return;
      const c = { id: uid(), createdAt: Date.now(), firstName: n.firstName, lastName: n.lastName, group: '', notes: '' };
      db.children.push(c);
      save();
      form.childId = c.id;
      renderChildPicker();
      toast(`${c.firstName} est ajouté·e à vos enfants`);
    },

    'child-new'() { openChildForm(null); },
    'child-edit'(el) { openChildForm(el.dataset.id); },
    'child-entry'() { openEntryForm(null, childForm.id); },
    'group-pick'(el) { $('#c-group').value = el.dataset.value; },
    async 'child-delete'() {
      const c = childById(childForm.id);
      const n = entriesOf(c.id).length;
      const ok = await confirmDialog({
        title: `Supprimer ${c.firstName} ?`,
        text: n ? `Sa fiche et ses ${plural(n, 'bobo')} enregistré${n > 1 ? 's' : ''} seront effacés définitivement.` : 'Sa fiche sera effacée définitivement.',
        ok: 'Supprimer', danger: true,
      });
      if (!ok) return;
      db.entries = db.entries.filter((e) => e.childId !== c.id);
      db.children = db.children.filter((x) => x.id !== c.id);
      save();
      closeAllSheets();
      render();
      toast('Enfant supprimé');
    },
    'child-import'() {
      openSheet({
        title: 'Coller une liste',
        done: 'Ajouter',
        onDone: saveImportList,
        body: `
          <p class="hint">Un enfant par ligne, sous la forme « Prénom Nom ». Les enfants déjà enregistrés sont ignorés.</p>
          <label class="field"><span class="label">Liste des enfants</span>
            <textarea id="imp-list" rows="9" autocapitalize="words" placeholder="Léa Martin&#10;Noah Bernard&#10;Inès Petit"></textarea></label>
          <label class="field"><span class="label">Groupe pour toute la liste (facultatif)</span>
            <input type="text" id="imp-group" autocomplete="off" placeholder="ex. 6-8 ans"></label>
          <button type="button" class="btn primary block" data-action="sheet-done">Ajouter ces enfants</button>`,
      });
    },

    'sheet-close'() { closeSheet(); if (!sheetStack.length) { form = null; childForm = null; } },
    'sheet-done'() { const s = sheetStack[sheetStack.length - 1]; if (s && s.onDone) s.onDone(); },

    'share-open'() { openShare('day'); },
    'share-follow'() { openShare('follow'); },
    'follow-filter'(el) { ui.followAll = el.dataset.value === 'all'; render(); },
    'follow-done'(el) {
      const e = db.entries.find((x) => x.id === el.dataset.id);
      if (!e) return;
      e.done[el.dataset.key] = !e.done[el.dataset.key];
      save();
      render();
    },
    'share-format'(el) {
      db.settings.nameFormat = el.dataset.value;
      save();
      $$('.seg button', el.parentElement).forEach((b) => b.setAttribute('aria-pressed', b === el));
      fillShare();
    },
    async 'share-native'() {
      try { await navigator.share({ text: $('#share-text').value }); } catch (e) { /* partage annulé */ }
    },
    'share-copy'() { copyText($('#share-text').value); },

    'set-format'(el) { db.settings.nameFormat = el.dataset.value; save(); render(); },
    'custom-remove'(el) {
      const key = el.dataset.list;
      db.settings[key] = db.settings[key].filter((v) => v !== el.dataset.value);
      save();
      render();
    },
    export() { exportData(); },
    import() { $('#import-file').click(); },
    async wipe() {
      const ok = await confirmDialog({
        title: 'Tout effacer ?',
        text: `${plural(db.children.length, 'enfant')} et ${plural(db.entries.length, 'bobo')} seront supprimés de ce téléphone. Sans sauvegarde exportée, c’est définitif.`,
        ok: 'Tout effacer', danger: true,
      });
      if (!ok) return;
      db = normalize({});
      save();
      render();
      toast('Données effacées');
    },
  };

  const inputs = {
    'day-date'(el) { if (isDate(el.value)) { setDate(el.value); render(); } },
    'child-q'(el) { ui.childQuery = el.value; $('#child-list').innerHTML = childListHTML(); },
    'pick-q'(el) { renderPickResults(el.value); },
    'entry-time'(el) { $$('.care-time[data-synced]').forEach((i) => { i.value = el.value; }); },
    'care-time'(el) { el.removeAttribute('data-synced'); },
    'share-text'() { syncShareLink(); },
    'set-animator'(el) { db.settings.animator = el.value.trim(); save(); },
    'set-structure'(el) { db.settings.structure = el.value.trim(); save(); },
    'import-file'(el) { if (el.files && el.files[0]) importData(el.files[0]); el.value = ''; },
  };

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (fn) fn(el, ev);
  });
  document.addEventListener('input', (ev) => {
    const key = ev.target.dataset && ev.target.dataset.onInput;
    if (key && inputs[key]) inputs[key](ev.target);
  });
  document.addEventListener('change', (ev) => {
    const key = ev.target.dataset && ev.target.dataset.onChange;
    if (key && inputs[key]) inputs[key](ev.target);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && sheetStack.length && !$('.dialog-back')) actions['sheet-close']();
  });

  // À la réouverture de l'appli un autre jour, on revient sur « aujourd'hui ».
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !ui.followToday || ui.date === todayISO() || sheetStack.length) return;
    setDate(todayISO());
    render();
  });

  renderShell();
  render();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
})();
