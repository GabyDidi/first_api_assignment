require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importBooks() {
  const books = JSON.parse(fs.readFileSync('./books.json', 'utf-8'));

  for (const book of books) {
    await pool.query(
      `INSERT INTO books (title, price_gbp, product_url, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_url) DO NOTHING`,
      [book.title, book.price_gbp, book.product_url, book.description]
    );
  }

  console.log(`Imported ${books.length} books (duplicates skipped).`);
  await pool.end();
}

importBooks();