require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.json());
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

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      price_gbp NUMERIC,
      product_url TEXT UNIQUE,
      description TEXT
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM books');
  if (parseInt(rows[0].count) === 0) {
    await pool.query(
      'INSERT INTO books (title, price_gbp, product_url, description) VALUES ($1, $2, $3, $4)',
      ['Test Book', 9.99, 'https://example.com/test-book', 'A placeholder book to prove the pipeline works.']
    );
  }
    await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_list (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id INTEGER NOT NULL REFERENCES books(id),
      added_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, book_id)
    )
  `);
}

app.get('/books', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM books');
  res.json(rows);
});
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data.user);
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: "Invalid login credentials" });
  res.status(200).json({ access_token: data.session.access_token });
});

app.get('/my-list', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT books.* FROM reading_list
     JOIN books ON books.id = reading_list.book_id
     WHERE reading_list.user_id = $1`,
    [req.user.id]
  );
  res.json(rows);
});

app.post('/my-list', requireAuth, async (req, res) => {
  const { book_id } = req.body;
  if (!book_id) return res.status(400).json({ error: "book_id is required" });
  const { rows } = await pool.query(
    `INSERT INTO reading_list (user_id, book_id) VALUES ($1, $2)
     ON CONFLICT (user_id, book_id) DO NOTHING RETURNING *`,
    [req.user.id, book_id]
  );
  res.status(201).json(rows[0] || { message: "Already in your list" });
});

setupDatabase().then(() => {
  app.listen(3000, () => console.log('Capstone server running on port 3000'));
});