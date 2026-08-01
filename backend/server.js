const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const CONTENT = JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'content.json'), 'utf8'));
const VALID_CARD_IDS = new Set(CONTENT.CARDS.map((c) => c.id));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/content', (req, res) => res.json(CONTENT));

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name FROM users ORDER BY name COLLATE NOCASE').all();
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const name = (req.body && req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name fehlt.' });
  if (name.length > 40) return res.status(400).json({ error: 'Name zu lang.' });
  try {
    const info = db.prepare('INSERT INTO users (name) VALUES (?)').run(name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      const existing = db.prepare('SELECT id, name FROM users WHERE name = ?').get(name);
      return res.status(200).json(existing);
    }
    res.status(500).json({ error: 'Konnte User nicht anlegen.' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.status(204).end();
});

app.get('/api/progress/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  const rows = db.prepare('SELECT card_id, learned FROM progress WHERE user_id = ? AND learned = 1').all(userId);
  res.json(rows.map((r) => r.card_id));
});

app.put('/api/progress/:userId/:cardId', (req, res) => {
  const userId = Number(req.params.userId);
  const cardId = Number(req.params.cardId);
  const learned = !!(req.body && req.body.learned);
  if (!VALID_CARD_IDS.has(cardId)) return res.status(400).json({ error: 'Unbekannte Karte.' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User existiert nicht.' });

  db.prepare(`
    INSERT INTO progress (user_id, card_id, learned, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, card_id) DO UPDATE SET learned = excluded.learned, updated_at = excluded.updated_at
  `).run(userId, cardId, learned ? 1 : 0);

  res.json({ cardId, learned });
});

app.post('/api/progress/:userId/reset', (req, res) => {
  const userId = Number(req.params.userId);
  db.prepare('DELETE FROM progress WHERE user_id = ?').run(userId);
  res.status(204).end();
});

app.use(express.static(DOCS_DIR));

app.listen(PORT, () => {
  console.log(`Lernsprint backend läuft auf Port ${PORT}`);
});
