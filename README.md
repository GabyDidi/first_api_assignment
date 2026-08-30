# FlyRank AI — Backend Track: Task API

A simple CRUD API for managing tasks, built with Express and backed by a SQLite database.

## Why SQLite?

SQLite was chosen because it's a single file with zero setup — no separate database server to install or run. It's perfect for a small project like this, and it still teaches the real skills (SQL, persistence, parameterized queries) that scale up to bigger databases like PostgreSQL later.

## Where the database lives

The database is a single file, `tasks.db`, created automatically the first time the server runs. It sits in the project root, right next to `first_assignment.js`.

## How to run it

1. Clone this repo
2. Run `npm install`
3. Run `node first_assignment.js`
4. The server starts on `http://localhost:3000`, and `tasks.db` is created automatically with 3 seeded example tasks.

## Endpoints

- `GET /tasks` — list all tasks
- `GET /tasks/:id` — get one task
- `POST /tasks` — create a task (`{ "title": "..." }`)
- `PUT /tasks/:id` — update a task (`{ "title": "...", "done": true }`)
- `DELETE /tasks/:id` — delete a task

## Exploring the database directly

Opened `tasks.db` in DB Browser for SQLite and ran:

```sql
SELECT * FROM tasks;
```

This returned all 3 seeded tasks, matching exactly what the live API returns from `GET /tasks` — proof that the API and the database file are reading from the same source of truth.

![DB Browser screenshot](./db-browser-screenshot.png)