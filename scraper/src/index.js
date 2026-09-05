const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const crypto = require("crypto");
const { z } = require("zod");

const TARGET_BASE = "https://books.toscrape.com";
const CACHE_DIR = path.join(__dirname, "..", "cache");
const OUTPUT_DIR = path.join(__dirname, "..", "output");

let stats = { fetched: 0, cacheHits: 0, failedPages: 0 };

async function fetchPage(url, cacheFileName, allowRetry = true) {
  const cachePath = path.join(CACHE_DIR, cacheFileName);
  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, "utf-8");
    console.log(`CACHE HIT: ${cacheFileName} (${html.length} bytes)`);
    stats.cacheHits++;
    return { html, wasCached: true };
  }

  console.log(`FETCH: ${url}`);
  let response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": "FlyRankInternshipA9/1.0 (+https://github.com/GabyDidi/first_api_assignment)" },
      signal: AbortSignal.timeout(5000)
    });
  } catch (err) {
    if (allowRetry) {
      console.log(`  timeout/network error, retrying once...`);
      await sleep(1000);
      return fetchPage(url, cacheFileName, false);
    }
    throw new Error(`Network error fetching ${url}: ${err.message}`);
  }

  if (response.status >= 500 && allowRetry) {
    console.log(`  got ${response.status}, retrying once...`);
    await sleep(1000);
    return fetchPage(url, cacheFileName, false);
  }

  if (response.status !== 200) {
    throw new Error(`Failed to fetch ${url}: status ${response.status}`);
  }

  const html = await response.text();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, html);
  console.log(`FETCH: ${cacheFileName} (${html.length} bytes)`);
  stats.fetched++;
  return { html, wasCached: false };
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function discoverCataloguePages() {
  const bookUrls = new Set();
  let pageNum = 1;
  let pageUrl = `${TARGET_BASE}/catalogue/page-1.html`;
  while (pageNum <= 3) {
    const cacheFileName = `catalogue-page-${pageNum}.html`;
    const { html, wasCached } = await fetchPage(pageUrl, cacheFileName);
    if (!wasCached) await sleep(500);
    const $ = cheerio.load(html);
    $("h3 a").each((i, el) => {
      const href = $(el).attr("href");
      bookUrls.add(new URL(href, pageUrl).href);
    });
    const nextLink = $(".next a").attr("href");
    if (!nextLink || pageNum === 3) break;
    pageUrl = new URL(nextLink, pageUrl).href;
    pageNum++;
  }
  return [...bookUrls];
}

function safeCacheName(url) {
  const hash = crypto.createHash("md5").update(url).digest("hex");
  return `detail-${hash}.html`;
}

async function extractBook(url, sourcePage) {
  const cacheFileName = safeCacheName(url);
  const { html, wasCached } = await fetchPage(url, cacheFileName);
  if (!wasCached) await sleep(500);
  const $ = cheerio.load(html);
  const main = $(".product_main");
  const title = main.find("h1").text().trim();
  const priceText = main.find(".price_color").first().text().trim();
  const availabilityText = main.find(".availability").text().trim().replace(/\s+/g, " ");
  const ratingClass = main.find(".star-rating").attr("class") || "";
  const ratingText = ratingClass.replace("star-rating", "").trim();
  const descriptionEl = $("#product_description").next("p");
  const description = descriptionEl.length ? descriptionEl.text().trim() : null;
  return {
    title, product_url: url, price_text: priceText, availability_text: availabilityText,
    rating_text: ratingText, description, source_page: sourcePage, fetched_at: new Date().toISOString()
  };
}

const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_gbp: z.number().positive(),
  price_text: z.string(),
  availability_text: z.string(),
  rating_text: z.string(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string()
});

function normalizeRecord(raw) {
  const priceMatch = raw.price_text.match(/[\d.]+/);
  const price_gbp = priceMatch ? parseFloat(priceMatch[0]) : NaN;
  return {
    title: raw.title, product_url: raw.product_url, price_gbp, price_text: raw.price_text,
    availability_text: raw.availability_text, rating_text: raw.rating_text,
    description: raw.description, source_page: raw.source_page, fetched_at: raw.fetched_at
  };
}

function validateRecords(rawRecords) {
  const seen = new Set();
  const validRecords = [];
  const errors = [];
  for (const raw of rawRecords) {
    if (seen.has(raw.product_url)) continue;
    seen.add(raw.product_url);
    const normalized = normalizeRecord(raw);
    const result = BookSchema.safeParse(normalized);
    if (result.success) validRecords.push(result.data);
    else errors.push({ product_url: raw.product_url, reason: result.error.issues.map(i => i.message).join("; ") });
  }
  return { validRecords, errors };
}

async function main() {
  const startTime = Date.now();
  console.log("Scraper starting...");

  const bookUrls = await discoverCataloguePages();
  console.log(`discovered=${bookUrls.length}`);

  // TEMPORARY: uncomment this line to test failure handling with a fake URL
  // bookUrls.push(`${TARGET_BASE}/catalogue/this-book-does-not-exist_9999/index.html`);

  const rawRecords = [];
  for (const url of bookUrls) {
    try {
      const record = await extractBook(url, `${TARGET_BASE}/catalogue/page-1.html`);
      rawRecords.push(record);
    } catch (err) {
      console.log(`  FAILED: ${url} — ${err.message}`);
      stats.failedPages++;
    }
  }
  console.log(`detail_pages=${rawRecords.length}`);

  const { validRecords, errors } = validateRecords(rawRecords);
  console.log(`valid=${validRecords.length} invalid=${errors.length}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "books.json"), JSON.stringify(validRecords, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, "errors.json"), JSON.stringify(errors, null, 2));

  const runReport = {
    start_time: new Date(startTime).toISOString(),
    duration_ms: Date.now() - startTime,
    pages_fetched: stats.fetched,
    cache_hits: stats.cacheHits,
    valid_records: validRecords.length,
    invalid_records: errors.length,
    failed_pages: stats.failedPages
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, "run-report.json"), JSON.stringify(runReport, null, 2));
  console.log("Run report:", JSON.stringify(runReport, null, 2));
}

main();