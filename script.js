/* ============================================================
   UDA website script (shared by every page)
   ============================================================ */

// Herald (Banner Points and duelist rankings) runs on Railway.
// Paste Herald's Railway address here, with no slash at the end.
const HERALD = 'https://web-production-cc302.up.railway.app';

// Duke (tournaments) runs on Render.
const DUKE = 'https://ido-bot.onrender.com';

const API = {
  clans: HERALD.includes('YOUR-HERALD') ? '' : HERALD + '/leaderboard',
  players: HERALD.includes('YOUR-HERALD') ? '' : HERALD + '/players',
  tournaments: DUKE + '/tournaments',
  pastResults: DUKE + '/past-results'
};

// Shown until Herald is connected.
const SAMPLE = {
  clans: [],
  players: []
};

const LABELS = {
  clans: { name: 'Clan', score: 'Banner Points' },
  players: { name: 'Duelist', score: 'Wins' }
};

const EMPTY_TEXT = {
  clans: 'No Banner Points have been awarded yet.',
  players: 'No fights have been recorded yet.'
};

// Clan roles end in '//' in Discord. Never show that on the website.
function cleanName(name) {
  return String(name || '').replace(/\s*\/\/\s*$/, '').trim();
}

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
    // Finished tournaments belong in Past Results, not Upcoming
    return events
      .filter(ev => String(ev.status || '').toLowerCase() !== 'completed')
      .sort((x, y) => String(x.date).localeCompare(String(y.date)));
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
  const open = String(ev.status || '').toLowerCase() === 'open';
  if (ev.type || open) tag.textContent = open ? `Open now${ev.type ? ' · ' + ev.type : ''}` : ev.type; else tag.remove();
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
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="3" class="empty-row"></td>';
      tr.firstChild.textContent = EMPTY_TEXT[board];
      boardBody.appendChild(tr);
    }
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      const cls = i < 3 ? 'r' + (i + 1) : '';
      tr.innerHTML = `<td class="rank ${cls}">#${i + 1}</td><td><span class="who"></span><span class="sub"></span></td><td class="score"></td>`;
      tr.querySelector('.who').textContent = board === 'clans' ? cleanName(r.name) : r.name;
      if (board === 'players') {
        // Duelists: wins in the score column, record and clan under the name
        tr.querySelector('.score').textContent = Number(r.wins ?? r.score).toLocaleString();
        const bits = [];
        if (r.wins != null && r.losses != null) bits.push(`${r.wins}W ${r.losses}L`);
        if (r.clan) bits.push(cleanName(r.clan));
        tr.querySelector('.sub').textContent = bits.join(' · ');
      } else {
        tr.querySelector('.score').textContent = Number(r.score).toLocaleString();
        tr.querySelector('.sub').remove();
      }
      boardBody.appendChild(tr);
    });

    if (live) note.textContent = 'Live standings from Herald.';
    else if (failed) note.textContent = 'Live data is unavailable right now. Please check back soon.';
    else note.textContent = EMPTY_TEXT[board];
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
  const champion = cleanName(r.champion || r.winner || r.champion_clan) || 'TBD';
  const runnerUp = cleanName(r.runner_up || r.runnerUp || r.runner_up_clan);
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
      row.querySelector('.who').textContent = cleanName(r.name);
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
