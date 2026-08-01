/* Talks to the backend when reachable; otherwise degrades to per-browser
   localStorage so the same UI keeps working on static hosting (e.g. GitHub
   Pages) without a server behind it. */
const Api = (() => {
  const BASE = window.LERNSPRINT_API_BASE || '';
  const ACTIVE_KEY = 'lernsprint-active-user';
  const LOCAL_USERS_KEY = 'lernsprint-local-users';
  let online = false;

  async function init() {
    try {
      const res = await fetch(`${BASE}/api/health`, { cache: 'no-store' });
      online = res.ok;
    } catch (e) {
      online = false;
    }
    return online;
  }

  function isOnline() { return online; }

  function readLocalUsers() {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || []; }
    catch (e) { return []; }
  }
  function writeLocalUsers(list) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  }

  async function listUsers() {
    if (online) {
      const res = await fetch(`${BASE}/api/users`);
      return res.json();
    }
    return readLocalUsers();
  }

  async function createUser(name) {
    if (online) {
      const res = await fetch(`${BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Fehler beim Anlegen.');
      return res.json();
    }
    const list = readLocalUsers();
    const existing = list.find((u) => u.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const user = { id: `local-${Date.now()}`, name };
    list.push(user);
    writeLocalUsers(list);
    return user;
  }

  function getActiveUser() {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY)); }
    catch (e) { return null; }
  }
  function setActiveUser(user) {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(user));
  }
  function clearActiveUser() {
    localStorage.removeItem(ACTIVE_KEY);
  }

  function progressKey(userId) { return `lernsprint-progress-${userId}`; }

  async function getProgress(userId) {
    if (online) {
      const res = await fetch(`${BASE}/api/progress/${userId}`);
      return res.json();
    }
    try { return JSON.parse(localStorage.getItem(progressKey(userId))) || []; }
    catch (e) { return []; }
  }

  async function setLearned(userId, cardId, learned) {
    if (online) {
      await fetch(`${BASE}/api/progress/${userId}/${cardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learned }),
      });
      return;
    }
    const ids = new Set(JSON.parse(localStorage.getItem(progressKey(userId)) || '[]'));
    if (learned) ids.add(cardId); else ids.delete(cardId);
    localStorage.setItem(progressKey(userId), JSON.stringify([...ids]));
  }

  async function resetProgress(userId) {
    if (online) {
      await fetch(`${BASE}/api/progress/${userId}/reset`, { method: 'POST' });
      return;
    }
    localStorage.removeItem(progressKey(userId));
  }

  async function getContent() {
    const res = await fetch('content.json', { cache: 'no-store' });
    return res.json();
  }

  return {
    init, isOnline, listUsers, createUser,
    getActiveUser, setActiveUser, clearActiveUser,
    getProgress, setLearned, resetProgress, getContent,
  };
})();
