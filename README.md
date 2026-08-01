# Lernsprint

3-Tage-Karteikarten-Sprint für die Marketing-Klausur. 141 Karten, 25 Quizfragen, sortiert nach Tag/Thema — mit einfachen (login-losen) Nutzerprofilen, damit mehrere Leute ihren eigenen Lernfortschritt speichern können.

## Repo-Struktur

```
docs/                 statisches Frontend (das ist auch der GitHub-Pages-Ordner)
  index.html
  css/style.css
  js/{config,api,app}.js
  content.json        einzige Quelle für Karten/Quiz/Kategorien — wird von Frontend UND Backend gelesen
backend/
  server.js           Express-API (Users, Progress, Content)
  db.js                SQLite-Setup (better-sqlite3)
  Dockerfile
docker-compose.yml
```

## Lokal per Docker starten (empfohlen)

```bash
docker compose up -d --build
```

Läuft dann komplett unter `http://localhost:3000` — Frontend **und** Backend aus einem Container, SQLite-Datei liegt in einem Docker-Volume (`lernsprint-data`), übersteht also Neustarts/Rebuilds.

Stoppen: `docker compose down` (Daten bleiben im Volume erhalten, `docker compose down -v` löscht sie).

## User & Karteikarten — wie die Logik funktioniert

- Kein Login, kein Passwort. Klick auf den Profil-Button oben rechts → Namen eingeben → fertig. Das ist ein `users`-Eintrag in SQLite (`id`, `name`).
- Jede Karteikarte ist ein Objekt `{id, cat, q, a, tag?}` aus `docs/content.json`. Ob eine Karte gelernt ist, ist **nicht** Teil der Karte selbst, sondern ein separater `progress`-Eintrag pro (User, Karte) mit `learned: true/false` — genau die "entspannte" Trennung von Inhalt und Lernstatus.
- API: `GET/POST /api/users`, `GET/PUT/POST /api/progress/:userId[/...]`, `GET /api/content`.

## Hosting-Optionen — und die eine Einschränkung

GitHub Pages kann **nur statische Dateien** ausliefern, kein Docker/Backend. Deshalb zwei Modi, automatisch erkannt:

1. **Mit Backend erreichbar** (z. B. via `docker compose up` auf deinem eigenen Server/VPS): volle Funktion, Profile + Fortschritt liegen serverseitig in SQLite, geräteübergreifend nutzbar.
2. **Kein Backend erreichbar** (z. B. GitHub Pages ohne eigenen Server dahinter): die App merkt das automatisch (`/api/health` Timeout) und fällt zurück auf `localStorage` — Profile/Fortschritt bleiben dann nur in diesem einen Browser, aber alles bleibt sonst identisch nutzbar.

### GitHub Pages aktivieren (nur Frontend, Modus 2)
Repo-Einstellungen → Pages → "Deploy from a branch" → Branch `main`, Ordner `/docs` → Save. Fertig, kein weiterer Schritt nötig.

### Falls du zusätzlich einen echten Server für Modus 1 betreibst
`docs/js/config.js` → `LERNSPRINT_API_BASE` auf die URL deines gehosteten Backends setzen (z. B. `https://dein-server.tld`), dann committen. GitHub Pages liefert dann das Frontend, dein Docker-Host die Daten.

## Hinweis zum Design

Das Hero-Bild in der ursprünglichen PDF (Gurren-Lagann-Mecha-Artwork + Team-Dai-Gurren-Logo) ist urheberrechtlich geschütztes Anime-Material — das wurde bewusst **nicht** übernommen. Stattdessen: eigenständige CSS/SVG-Grafik im gleichen Spirit (Himmel, Glut, rotierender Bohrer-Tunnel, roter Diagonal-Slash), keine fremden Assets.
