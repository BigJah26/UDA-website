/* ============================================================
   UDA website script (shared by every page)
   ============================================================ */

// Live data links from Duke (hosted on Render).
// Leave a link empty ('') to keep showing the placeholder content.
const API = {
  clans: 'https://ido-bot.onrender.com/leaderboard',
  players: 'https://ido-bot.onrender.com/players',
  tournaments: 'https://ido-bot.onrender.com/tournaments',
  pastResults: 'https://ido-bot.onrender.com/past-results'
};

// Placeholder standings shown until the links above are filled in.
const SAMPLE = {
  clans: [
    { name: 'Clan One', score: 0 },
    { name: 'Clan Two', score: 0 },
    { name: 'Clan Three', score: 0 },
    { name: 'Clan Four', score: 0 },
    { name: 'Clan Five', score: 0 }
  ],
  players: [
    { name: 'Player One', score: 2150 },
    { name: 'Player Two', score: 2030 },
    { name: 'Player Three', score: 1925 },
    { name: 'Player Four', score: 1810 },
    { name: 'Player Five', score: 1760 }
  ]
};

const LABELS = {
  clans: { name: 'Clan', score: 'Banner Points' },
  players: { name: 'Player', score: 'Rating' }
};

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/* ---------- Shared page setup ---------- */

document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

// Highlight the current page in the nav
const page = document.body.dataset.page;
document.querySelectorAll('.links a').forEach(a => {
  if (a.dataset.page === page) a.classList.add('active');
});

// Mobile menu
const links = document.querySelector('.links');
document.querySelector('.menu-btn')?.addEventListener('click', () => links.classList.toggle('open'));
links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// Fade sections in as they scroll into view
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Button click animation ---------- */

function playClick(el, e) {
  const r = el.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.left = (e.clientX ? e.clientX - r.left : r.width / 2) + 'px';
  dot.style.top = (e.clientY ? e.clientY - r.top : r.height / 2) + 'px';
  el.appendChild(dot);
  el.classList.remove('clicked'); void el.offsetWidth; el.classList.add('clicked');
  setTimeout(() => { dot.remove(); el.classList.remove('clicked'); }, 600);
}

const CLICK_DELAY = 380; // milliseconds to wait so the animation is visible
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', e => {
    if (reduceMotion || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    playClick(btn, e);
    const href = btn.getAttribute('href');
    setTimeout(() => {
      if (href.startsWith('#')) {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      } else if (btn.target === '_blank') {
        window.open(href, '_blank', 'noopener');
      } else {
        window.location.href = href;
      }
    }, CLICK_DELAY);
  });
});

/* ---------- Data helpers ---------- */

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function getStandings(board) {
  if (!API[board]) return { rows: SAMPLE[board], live: false };
  try {
    const rows = await getJSON(API[board]);
    return { rows: rows.sort((a, b) => b.score - a.score), live: true };
  } catch (e) {
    return { rows: SAMPLE[board], live: false, failed: true };
  }
}

// Tournament format from Duke:
// [{ "name": "Autumn Clan Cup", "date": "2026-11-08", "type": "Clan Cup", "description": "Best of 3." }]
async function getTournaments() {
  if (!API.tournaments) return [];
  try {
    const events = await getJSON(API.tournaments);
    if (!Array.isArray(events)) return [];
    return events.sort((x, y) => String(x.date).localeCompare(String(y.date)));
  } catch (e) {
    return [];
  }
}

function eventCard(ev) {
  const [, m, d] = String(ev.date || '').split('-');
  const card = document.createElement('div');
  card.className = 'card event';
  card.innerHTML = `<div class="date"><div class="m"></div><div class="d"></div></div>
    <div><span class="tag"></span><h3></h3><p></p></div>`;
  card.querySelector('.m').textContent = MONTHS[Number(m) - 1] || 'TBA';
  card.querySelector('.d').textContent = d || '--';
  const tag = card.querySelector('.tag');
  if (ev.type) tag.textContent = ev.type; else tag.remove();
  card.querySelector('h3').textContent = ev.name || 'Tournament';
  card.querySelector('p').textContent = ev.description || '';
  return card;
}

/* ---------- Leaderboard page ---------- */

const boardBody = document.getElementById('board-body');
if (boardBody) {
  async function loadBoard(board) {
    document.getElementById('col-name').textContent = LABELS[board].name;
    document.getElementById('col-score').textContent = LABELS[board].score;
    const note = document.getElementById('board-note');
    const { rows, live, failed } = await getStandings(board);

    boardBody.innerHTML = '';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const cls = i < 3 ? 'r' + (i + 1) : '';
      tr.innerHTML = `<td class="rank ${cls}">#${i + 1}</td><td></td><td class="score">${Number(r.score).toLocaleString()}</td>`;
      tr.children[1].textContent = r.name;
      boardBody.appendChild(tr);
    });

    if (live) note.textContent = 'Live standings.';
    else if (failed) note.textContent = 'Live data unavailable right now. Showing placeholder data.';
    else if (board === 'clans') note.textContent = 'The season has not started yet. No Banner Points have been awarded.';
    else note.textContent = 'Sample data shown. Live standings coming soon.';
  }

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', e => {
      playClick(tab, e);
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadBoard(tab.dataset.board);
    });
  });

  loadBoard('clans');
}

/* ---------- Tournaments page ---------- */

const tournamentList = document.getElementById('tournament-list');
if (tournamentList) {
  getTournaments().then(events => {
    if (events.length === 0) return;
    events.forEach(ev => tournamentList.appendChild(eventCard(ev)));
    document.getElementById('tournament-empty').style.display = 'none';
  });
}

/* ---------- Past results (from Duke's /past-results) ----------
   Expected format (the site sorts newest first):
   [{ "name": "Autumn Clan Cup", "date": "2026-11-08", "type": "Clan Cup",
      "champion": "Blue Fire", "runner_up": "Leviathans", "score": "3-1",
      "notes": "Championship Final" }]
   Also accepts "winner" for champion, "runnerUp", "final_score",
   and "description" in place of "notes". */

async function getPastResults() {
  if (!API.pastResults) return [];
  try {
    const rows = await getJSON(API.pastResults);
    if (!Array.isArray(rows)) return [];
    return rows.sort((x, y) => String(y.date).localeCompare(String(x.date)));
  } catch (e) {
    console.error('Failed to fetch past results:', e);
    return [];
  }
}

function resultCard(r) {
  const champion = r.champion || r.winner || r.champion_clan || 'TBD';
  const runnerUp = r.runner_up || r.runnerUp || r.runner_up_clan || '';
  const score = r.score || r.final_score || r.finalScore || '';
  const notes = r.notes || r.description || '';
  const [, m, d] = String(r.date || '').split('-');

  const card = document.createElement('div');
  card.className = 'card event';
  card.innerHTML = `<div class="date"><div class="m"></div><div class="d"></div></div>
    <div style="flex: 1;">
      <span class="tag"></span><h3></h3>
      <p class="notes"></p>
      <p class="result-line"><span>&#127942; Champion:</span> <strong class="champ"></strong></p>
      <p class="result-line runner"><span>&#129352; Runner-up:</span> <strong class="ru"></strong></p>
      <p class="result-line scoreline"><span>&#9876;&#65039; Final score:</span> <strong class="sc"></strong></p>
    </div>`;
  card.querySelector('.m').textContent = MONTHS[Number(m) - 1] || 'DONE';
  card.querySelector('.d').textContent = d || '--';
  card.querySelector('.tag').textContent = r.type || 'Concluded';
  card.querySelector('h3').textContent = r.name || 'Tournament';
  if (notes) card.querySelector('.notes').textContent = notes; else card.querySelector('.notes').remove();
  card.querySelector('.champ').textContent = champion;
  if (runnerUp) card.querySelector('.ru').textContent = runnerUp; else card.querySelector('.runner').remove();
  if (score) card.querySelector('.sc').textContent = score; else card.querySelector('.scoreline').remove();
  return card;
}

const pastList = document.getElementById('past-results-list');
if (pastList) {
  getPastResults().then(results => {
    if (results.length === 0) return;
    results.forEach(r => pastList.appendChild(resultCard(r)));
    document.getElementById('past-results-empty').style.display = 'none';
  });
}

/* ---------- Home page previews ---------- */

const topClans = document.getElementById('preview-clans');
if (topClans) {
  getStandings('clans').then(({ rows, live }) => {
    if (!live) return; // keep the "season hasn't started" message
    topClans.innerHTML = '';
    rows.slice(0, 3).forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'mini-row';
      row.innerHTML = `<span class="pos r${i + 1}">#${i + 1}</span><span class="who"></span><span class="pts">${Number(r.score).toLocaleString()}</span>`;
      row.querySelector('.who').textContent = r.name;
      topClans.appendChild(row);
    });
  });
}

const nextEvent = document.getElementById('preview-event');
if (nextEvent) {
  getTournaments().then(events => {
    if (events.length === 0) return;
    nextEvent.innerHTML = '';
    const card = eventCard(events[0]);
    card.classList.remove('card');
    card.style.padding = '0';
    nextEvent.appendChild(card);
  });
}
