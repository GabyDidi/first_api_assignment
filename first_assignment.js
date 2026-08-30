const express = require('express');
const app = express()
const Database = require('better-sqlite3');   


const db = new Database('tasks.db');   // This opens or creates the file

// This is to create the table if it doesn't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT 0
  )
`);

// NEW — only add example tasks if the table is currently empty
const count = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
if (count === 0) {
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Buy milk', 0);
  insert.run('Finish FlyRank assignment', 0);
  insert.run('Sleep before 12am', 0);
}


let tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Finish FlyRank assignment", done: false }
];
let nextId = 3;

app.use(express.json()); // lets your server read JSON sent by the client

app.get('/tasks', (req, res) => {
  const allTasks = db.prepare('SELECT * FROM tasks').all();
  res.json(allTasks);
});

app.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.post('/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  const result = insert.run(title, 0);
  const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const title = req.body.title !== undefined ? req.body.title : existing.title;
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : existing.done;

  db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done, req.params.id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.delete('/tasks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Task not found" });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});


app.get('/hello', (req, res) => {
    res.json({ message: "Hello, from my first server :D"});
});

app.get('/aboutme', (req, res) => {
  res.json({ name: "Divine", mytrack: "Backend AI Engineering" });
});


app.listen(3000, () => console.log('Server is running on port 3000'));