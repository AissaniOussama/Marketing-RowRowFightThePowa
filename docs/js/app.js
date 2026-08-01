/* ============ STATE ============ */
let CONTENT = null;
let CATEGORIES = [], DAY_INFO = {}, NOTES = {}, CARDS = [], QUIZ = [];
let learned = new Set();
let activeUser = null;
let currentTab = 'day1';
let quizIdx = 0, quizScore = 0, quizOrder = [], quizAnswered = false;

/* ============ USER / PROGRESS ============ */
async function refreshUserButton() {
  const label = document.getElementById('user-btn-label');
  label.textContent = activeUser ? activeUser.name : 'Profil wählen';
}

async function loadProgressForActiveUser() {
  if (!activeUser) { learned = new Set(); renderProgress(); return; }
  const ids = await Api.getProgress(activeUser.id);
  learned = new Set(ids);
  renderProgress();
}

async function toggleLearned(id, val) {
  if (!activeUser) { openUserModal(); return; }
  if (val) learned.add(id); else learned.delete(id);
  await Api.setLearned(activeUser.id, id, val);
  renderProgress();
  document.querySelectorAll(`[data-id="${id}"]`).forEach((el) => el.classList.toggle('learned', val));
}

function renderProgress() {
  const total = CARDS.length, done = learned.size;
  document.getElementById('progress-text').textContent = `${done} / ${total} gelernt`;
  document.getElementById('progress-pct').textContent = Math.round((total ? done / total : 0) * 100) + '%';
  document.getElementById('progress-fill').style.width = (total ? (done / total * 100) : 0) + '%';
}

/* ============ USER MODAL ============ */
function openUserModal() {
  renderUserList();
  document.getElementById('user-modal-backdrop').classList.add('show');
}
function closeUserModal() {
  document.getElementById('user-modal-backdrop').classList.remove('show');
}

async function renderUserList() {
  const list = document.getElementById('user-list');
  list.innerHTML = '<p class="muted-note">Lade Profile…</p>';
  const users = await Api.listUsers();
  list.innerHTML = '';
  if (users.length === 0) {
    list.innerHTML = '<p class="muted-note">Noch keine Profile — leg unten eins an.</p>';
  }
  users.forEach((u) => {
    const btn = document.createElement('button');
    btn.className = 'user-row' + (activeUser && activeUser.id === u.id ? ' active' : '');
    btn.type = 'button';
    btn.innerHTML = `<span>${u.name}</span>${activeUser && activeUser.id === u.id ? '<span class="user-row__tag">Aktiv</span>' : ''}`;
    btn.addEventListener('click', async () => {
      activeUser = u;
      Api.setActiveUser(u);
      closeUserModal();
      await refreshUserButton();
      await loadProgressForActiveUser();
      setTab(currentTab);
    });
    list.appendChild(btn);
  });
}

/* ============ RENDER CONTENT ============ */
function fmtAnswer(a) {
  if (Array.isArray(a)) return `<ul>${a.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  return `<p style="margin:0">${a}</p>`;
}

const TAG_LABEL = { top: 'Sehr klausurrelevant', wichtig: 'Wichtig', knifflig: 'Knifflig' };

function cardEl(c) {
  const div = document.createElement('div');
  div.className = 'flashcard' + (learned.has(c.id) ? ' learned' : '');
  div.setAttribute('data-id', c.id);
  const tagHtml = c.tag ? `<span class="tag ${c.tag}">${TAG_LABEL[c.tag]}</span>` : '';
  div.innerHTML = `
    <div class="flashcard-inner">
      <div class="face front">
        ${tagHtml}
        <div class="q-text">${c.q}</div>
        <div class="hint">Klicken zum Umdrehen →</div>
      </div>
      <div class="face back">
        <div class="a-text">${fmtAnswer(c.a)}</div>
        <div class="learn-actions">
          <button class="no">↺ Nochmal</button>
          <button class="yes">✓ Weiß ich</button>
        </div>
      </div>
    </div>`;
  div.querySelector('.flashcard-inner').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    div.classList.toggle('flipped');
  });
  div.querySelector('.yes').addEventListener('click', (e) => { e.stopPropagation(); toggleLearned(c.id, true); });
  div.querySelector('.no').addEventListener('click', (e) => { e.stopPropagation(); toggleLearned(c.id, false); });
  return div;
}

function renderCategory(catId, container, filterMode) {
  const cat = CATEGORIES.find((c) => c.id === catId);
  let cards = CARDS.filter((c) => c.cat === catId);
  if (filterMode === 'open') cards = cards.filter((c) => !learned.has(c.id));
  if (filterMode === 'flagged') cards = cards.filter((c) => c.tag);

  const head = document.createElement('div');
  head.className = 'cat-head';
  head.innerHTML = `<h2>${cat.name}</h2><span class="cat-count">${cards.length} Karten</span>`;
  container.appendChild(head);

  if (NOTES[catId]) {
    const note = document.createElement('div');
    note.className = 'note';
    note.innerHTML = `<b>Notiz aus der Vorlesung</b>${NOTES[catId]}`;
    container.appendChild(note);
  }

  const grid = document.createElement('div');
  grid.className = 'grid';
  cards.forEach((c, i) => {
    const el = cardEl(c);
    el.style.animationDelay = `${Math.min(i, 12) * 35}ms`;
    grid.appendChild(el);
  });
  container.appendChild(grid);
  if (cards.length === 0) {
    grid.innerHTML = `<p class="muted-note">Alles in dieser Kategorie schon gelernt.</p>`;
  }
}

function filterRowHtml(filterMode) {
  return `
    <button class="chip ${filterMode === 'all' ? 'active' : ''}" data-f="all">Alle Karten</button>
    <button class="chip ${filterMode === 'open' ? 'active' : ''}" data-f="open">Nur offene</button>
    <button class="chip ${filterMode === 'flagged' ? 'active' : ''}" data-f="flagged">Nur markierte</button>
  `;
}

function renderDay(dayNum, filterMode) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  const info = DAY_INFO[dayNum];
  const plan = document.createElement('div');
  plan.className = 'day-plan';
  plan.innerHTML = `<div class="num">${dayNum}</div><div><h3>${info.title}</h3><p>${info.desc}</p></div>`;
  main.appendChild(plan);

  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filterRow.innerHTML = filterRowHtml(filterMode);
  main.appendChild(filterRow);
  filterRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => renderDay(dayNum, chip.getAttribute('data-f')));
  });

  CATEGORIES.filter((c) => c.day === dayNum).forEach((c) => renderCategory(c.id, main, filterMode));
}

function renderAll(filterMode) {
  const main = document.getElementById('main');
  main.innerHTML = '';
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filterRow.style.marginTop = '4px';
  filterRow.innerHTML = filterRowHtml(filterMode);
  main.appendChild(filterRow);
  filterRow.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => renderAll(chip.getAttribute('data-f')));
  });
  CATEGORIES.forEach((c) => renderCategory(c.id, main, filterMode));
}

/* ============ QUIZ ============ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function startQuiz() {
  quizOrder = shuffle(QUIZ.map((_, i) => i));
  quizIdx = 0; quizScore = 0;
  renderQuiz();
}
function renderQuiz() {
  const main = document.getElementById('main');
  main.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'quiz-shell';

  if (quizIdx >= quizOrder.length) {
    const pct = Math.round((quizScore / quizOrder.length) * 100);
    const verdict = pct >= 80 ? 'Stark — du bist bereit.' : pct >= 60 ? 'Solide. Nochmal die roten Themen anschauen.' : 'Zurück zu den Karteikarten der wackligen Bereiche.';
    shell.innerHTML = `
      <div class="quiz-result">
        <p class="quiz-result__eyebrow">Ergebnis</p>
        <div class="big">${quizScore} / ${quizOrder.length}</div>
        <p class="muted-note">${verdict}</p>
        <button class="quiz-restart" id="quiz-again">Nochmal durchspielen</button>
      </div>`;
    main.appendChild(shell);
    document.getElementById('quiz-again').addEventListener('click', startQuiz);
    return;
  }

  const q = QUIZ[quizOrder[quizIdx]];
  quizAnswered = false;
  shell.innerHTML = `
    <div class="quiz-progress"><span>Frage ${quizIdx + 1} / ${quizOrder.length}</span><span>Score: ${quizScore}</span></div>
    <div class="quiz-q">${q.q}</div>
    <div id="quiz-opts"></div>
    <div class="quiz-explain" id="quiz-explain">${q.explain}</div>
    <button class="quiz-next" id="quiz-next">Nächste Frage →</button>
  `;
  main.appendChild(shell);
  const optsWrap = shell.querySelector('#quiz-opts');
  q.opts.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => {
      if (quizAnswered) return;
      quizAnswered = true;
      const correct = i === q.correct;
      if (correct) quizScore++;
      [...optsWrap.children].forEach((b, bi) => {
        b.disabled = true;
        if (bi === q.correct) b.classList.add('correct');
        else if (bi === i) b.classList.add('wrong');
      });
      shell.querySelector('#quiz-explain').classList.add('show');
      shell.querySelector('#quiz-next').classList.add('show');
      shell.querySelector('.quiz-progress').innerHTML = `<span>Frage ${quizIdx + 1} / ${quizOrder.length}</span><span>Score: ${quizScore}</span>`;
    });
    optsWrap.appendChild(btn);
  });
  shell.querySelector('#quiz-next').addEventListener('click', () => { quizIdx++; renderQuiz(); });
}

/* ============ TABS ============ */
function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.getAttribute('data-tab') === tab));
  if (tab === 'day1') renderDay(1, 'all');
  else if (tab === 'day2') renderDay(2, 'all');
  else if (tab === 'day3') renderDay(3, 'all');
  else if (tab === 'all') renderAll('all');
  else if (tab === 'quiz') startQuiz();
}

function buildTabs() {
  const bar = document.getElementById('tabbar');
  const tabs = [
    { id: 'day1', label: 'Tag 1 · Fundament' },
    { id: 'day2', label: 'Tag 2 · Konsument & Innovation' },
    { id: 'day3', label: 'Tag 3 · Preis, Vertrieb & Review' },
    { id: 'all', label: 'Alle Karten' },
    { id: 'quiz', label: 'Quiz' },
  ];
  tabs.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('data-tab', t.id);
    btn.textContent = t.label;
    btn.addEventListener('click', () => setTab(t.id));
    bar.appendChild(btn);
  });
}

/* ============ INIT ============ */
async function init() {
  await Api.init();
  document.getElementById('mode-indicator').textContent = Api.isOnline()
    ? 'Server verbunden — Fortschritt wird synchronisiert.'
    : 'Kein Server erreicht — Fortschritt bleibt lokal in diesem Browser.';

  CONTENT = await Api.getContent();
  CATEGORIES = CONTENT.CATEGORIES; DAY_INFO = CONTENT.DAY_INFO; NOTES = CONTENT.NOTES;
  CARDS = CONTENT.CARDS; QUIZ = CONTENT.QUIZ;
  document.getElementById('progress-text').textContent = `0 / ${CARDS.length} gelernt`;

  buildTabs();

  activeUser = Api.getActiveUser();
  await refreshUserButton();
  await loadProgressForActiveUser();

  document.getElementById('user-btn').addEventListener('click', openUserModal);
  document.getElementById('modal-close').addEventListener('click', closeUserModal);
  document.getElementById('user-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'user-modal-backdrop') closeUserModal();
  });
  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-user-name');
    const name = input.value.trim();
    if (!name) return;
    const user = await Api.createUser(name);
    input.value = '';
    activeUser = user;
    Api.setActiveUser(user);
    closeUserModal();
    await refreshUserButton();
    await loadProgressForActiveUser();
    setTab(currentTab);
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (!activeUser) { openUserModal(); return; }
    if (!confirm('Wirklich den gesamten Lernfortschritt dieses Profils zurücksetzen?')) return;
    await Api.resetProgress(activeUser.id);
    learned = new Set();
    renderProgress();
    setTab(currentTab);
  });

  if (!activeUser) openUserModal();
  setTab('day1');
}

init();
