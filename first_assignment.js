require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);


const swaggerUi = require('swagger-ui-express');
const openapiDoc = require('./openapi.json');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = data.user;
  next();
} 

const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM tasks');
  if (parseInt(rows[0].count) === 0) {
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Buy milk', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Finish FlyRank assignment', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Sleep before 12am', false]);
  }
}

app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});

app.get('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
  res.json(rows[0]);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, false]
  );
  res.status(201).json(rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (existingRows.length === 0) return res.status(404).json({ error: "Task not found" });
  const existing = existingRows[0];

  const title = req.body.title !== undefined ? req.body.title : existing.title;
  const done = req.body.done !== undefined ? req.body.done : existing.done;

  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [title, done, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.status(204).send();
});

app.get('/hello', (req, res) => {
  res.json({ message: "Hello, from my first server :D" });
});

app.get('/aboutme', (req, res) => {
  res.json({ name: "Divine", mytrack: "Backend AI Engineering" });
});

// Stage 1: Sign up
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json(data.user);
});

// Stage 1: Log in
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: "Invalid login credentials" });

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
});

// Stage 2: Public route
app.get('/public/info', (req, res) => {
  res.status(200).json({ message: "Welcome stranger! This info is public." });
});

// Stage 2 + 3: Protected route with real verification
app.get('/protected/profile', requireAuth, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at
  });
});

app.get('/protected/dashboard', requireAuth, (req, res) => {
  res.status(200).json({ message: `Welcome to your dashboard, ${req.user.email}` });
});

app.post('/auth/logout', requireAuth, async (req, res) => {
  await supabase.auth.signOut();
  res.status(204).send();
});

setupDatabase().then(() => {
  app.listen(3000, () => console.log('Server running and connected to Supabase'));
});