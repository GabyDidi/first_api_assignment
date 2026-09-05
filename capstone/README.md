# 10x Solution: Book Reading List

Auto-imports a book catalog via scraper, lets authenticated users build their own personal reading list.

## Concepts implemented
| Concept | Where it lives |
|---|---|
| API endpoints | server.js — /books, /auth/*, /my-list |
| Database | PostgreSQL, dockerized |
| Authentication | Supabase Auth, requireAuth middleware |
| Web scraping (swap) | ../scraper — imports books.json |
| Containerized stack (swap) | docker-compose.yml |

## How to run
1. Copy `docker-compose.example.yml` to `docker-compose.yml`, fill in your Supabase values
2. `docker compose up --build`
3. `node import-books.js` (one time, to seed the catalog)
4. API live at http://localhost:3000

## 10x claim
Manually browsing a catalog to build a reading list takes ~15 minutes; auto-importing takes ~10 seconds.