import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';
import nodeFetch from 'node-fetch';

dotenv.config();

const fetcher = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : nodeFetch;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MAGNET_SEARCH_ENDPOINT = process.env.MAGNET_SEARCH_ENDPOINT || 'https://apibay.org/q.php';
const STATIC_DIR = path.join(__dirname, '../public');
const SAMPLE_DATA_FILE = path.join(__dirname, '../data/sampleResults.json');

let cachedSampleData = null;

app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(STATIC_DIR));

const BASE_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.tiny-vps.com:6969/announce'
];

function decodeLabel(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch (error) {
    return value;
  }
}

function formatSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

function parseMagnet(magnetLink) {
  try {
    const url = new URL(magnetLink.trim());
    if (url.protocol !== 'magnet:') {
      throw new Error('Unsupported magnet protocol');
    }

    const params = url.searchParams;
    const displayName = decodeLabel(params.get('dn')) || 'Magnet Link';
    const trackers = params.getAll('tr').map(decodeLabel);
    const xt = params.get('xt') || '';
    const infoHash = xt.split(':').pop()?.toUpperCase() || null;

    return {
      title: displayName,
      magnet: magnetLink,
      infoHash,
      trackers,
      seeders: null,
      leechers: null,
      size: null,
      sizeLabel: null,
      uploaded: null,
      category: 'Direct Magnet',
      source: 'magnet-link'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid magnet link';
    throw new Error(`Invalid magnet link: ${message}`);
  }
}

async function getSampleData() {
  if (!cachedSampleData) {
    const content = await readFile(SAMPLE_DATA_FILE, 'utf8');
    cachedSampleData = JSON.parse(content);
  }
  return cachedSampleData;
}

async function searchSampleData(term) {
  const dataset = await getSampleData();
  const lowered = term.toLowerCase();
  return dataset
    .filter((item) => item.title.toLowerCase().includes(lowered))
    .map((item) => ({
      ...item,
      sizeLabel: typeof item.size === 'number' ? formatSize(item.size) : null
    }));
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetcher(resource, { ...rest, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildMagnetFromRemote(item) {
  const infoHash = item.info_hash || item.infoHash || '';
  const title = item.name || item.title || 'Unknown item';

  const magnetTrackers = BASE_TRACKERS.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join('');
  const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${magnetTrackers}`;

  const size = Number(item.size);
  const uploaded = item.added ? new Date(Number(item.added) * 1000).toISOString() : null;
  const seeders = Number(item.seeders) || 0;
  const leechers = Number(item.leechers) || 0;

  return {
    title,
    magnet,
    infoHash,
    trackers: BASE_TRACKERS,
    size: Number.isFinite(size) ? size : null,
    sizeLabel: Number.isFinite(size) ? formatSize(size) : null,
    seeders,
    leechers,
    uploaded,
    category: item.category === '0' ? 'Other' : item.category || 'Unknown',
    source: item.source || 'remote'
  };
}

async function searchRemote(term) {
  const url = new URL(MAGNET_SEARCH_ENDPOINT);
  url.searchParams.set('q', term);
  url.searchParams.set('cat', '0');

  const response = await fetchWithTimeout(url, {
    headers: {
      'User-Agent': 'local-magnet-search/1.0 (+https://example.local)'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remote service error: ${response.status} ${response.statusText} - ${text}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    throw new Error('Unexpected remote response format');
  }

  return payload
    .filter((item) => item && item.info_hash && item.name)
    .map((item) => buildMagnetFromRemote(item));
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    remoteEndpoint: MAGNET_SEARCH_ENDPOINT,
    port: PORT
  });
});

app.get('/api/search', async (req, res) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const query = rawQuery.trim();

  if (!query) {
    return res.status(400).json({ error: '请提供搜索关键字或磁力链接。' });
  }

  try {
    if (query.startsWith('magnet:?')) {
      const magnetCard = parseMagnet(query);
      return res.json({
        query,
        results: [magnetCard],
        meta: {
          mode: 'magnet',
          remoteUsed: false,
          fallbackUsed: false
        }
      });
    }

    let remoteResults = [];
    let remoteError = null;
    let remoteSucceeded = false;

    try {
      remoteResults = await searchRemote(query);
      remoteSucceeded = true;
    } catch (error) {
      remoteError = error instanceof Error ? error.message : '未知错误';
    }

    let results = remoteResults;
    let fallbackUsed = false;

    if (results.length === 0) {
      results = await searchSampleData(query);
      fallbackUsed = true;
    }

    res.json({
      query,
      results,
      meta: {
        mode: 'search',
        remoteUsed: remoteSucceeded,
        remoteReturnedResults: remoteResults.length,
        fallbackUsed,
        remoteEndpoint: MAGNET_SEARCH_ENDPOINT,
        remoteError
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器发生未知错误。';
    res.status(500).json({ error: message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(STATIC_DIR, 'index.html'));
  }
  return next();
});

app.listen(PORT, () => {
  console.log(`Local magnet search service is running at http://localhost:${PORT}`);
});
