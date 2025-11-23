const http = require('http');
const fs = require('fs');
const path = require('path');

// Sample data for testing
const sampleResults = [
  {
    title: "Ubuntu 24.04 LTS Desktop",
    size: 5368709120,
    seeders: 350,
    leechers: 24,
    magnet: "magnet:?xt=urn:btih:1111111111111111111111111111111111111111&dn=ubuntu-24.04&tr=udp%3A%2F%2Ftracker.example.org%3A6969",
    uploaded: "2023-06-17T10:15:00.000Z",
    infoHash: "1111111111111111111111111111111111111111",
    category: "Software",
    source: "mock-server"
  },
  {
    title: "Creative Commons Nature Documentary Collection",
    size: 2147483648,
    seeders: 120,
    leechers: 8,
    magnet: "magnet:?xt=urn:btih:2222222222222222222222222222222222222222&dn=cc-nature-doc&tr=udp%3A%2F%2Ftracker.example.org%3A1337",
    uploaded: "2023-08-05T08:00:00.000Z",
    infoHash: "2222222222222222222222222222222222222222",
    category: "Video",
    source: "mock-server"
  },
  {
    title: "Public Domain Classic Literature Collection",
    size: 1073741824,
    seeders: 58,
    leechers: 4,
    magnet: "magnet:?xt=urn:btih:3333333333333333333333333333333333333333&dn=classic-books&tr=udp%3A%2F%2Ftracker.example.org%3A8080",
    uploaded: "2022-11-02T14:30:00.000Z",
    infoHash: "3333333333333333333333333333333333333333",
    category: "Books",
    source: "mock-server"
  },
  {
    title: "Open Source Software Collection",
    size: 3221225472,
    seeders: 89,
    leechers: 12,
    magnet: "magnet:?xt=urn:btih:4444444444444444444444444444444444444444&dn=open-source-collection&tr=udp%3A%2F%2Ftracker.example.org%3A6969",
    uploaded: "2023-01-15T09:30:00.000Z",
    infoHash: "4444444444444444444444444444444444444444",
    category: "Software",
    source: "mock-server"
  },
  {
    title: "Educational Video Collection",
    size: 4294967296,
    seeders: 156,
    leechers: 23,
    magnet: "magnet:?xt=urn:btih:5555555555555555555555555555555555555555&dn=educational-videos&tr=udp%3A%2F%2Ftracker.example.org%3A6969",
    uploaded: "2023-03-22T14:45:00.000Z",
    infoHash: "5555555555555555555555555555555555555555",
    category: "Video",
    source: "mock-server"
  }
];

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:3001`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        time: new Date().toISOString(),
        defaultAdapter: 'sample',
        adapters: [
          {
            id: 'sample',
            name: '本地示例数据',
            description: '使用仓库内置示例结果进行匹配',
            endpoint: 'local-data',
            default: true,
            fallback: false
          }
        ]
      }));
    } else if (pathname === '/api/adapters') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        adapters: [
          {
            id: 'sample',
            name: '本地示例数据',
            description: '使用仓库内置示例结果进行匹配',
            endpoint: 'local-data',
            default: true,
            fallback: false
          }
        ],
        defaultAdapter: 'sample'
      }));
    } else if (pathname === '/api/search') {
      const query = url.searchParams.get('q');
      const page = parseInt(url.searchParams.get('page')) || 1;
      
      if (!query) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '请提供搜索关键字或磁力链接。' }));
        return;
      }

      // Handle magnet links
      if (query.toLowerCase().startsWith('magnet:?')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          query: query,
          results: [{
            title: '磁力链接解析结果',
            magnet: query,
            infoHash: 'DEMOHASH123456789',
            category: '磁力链接',
            source: 'magnet-parser'
          }],
          meta: {
            mode: 'magnet',
            resultCount: 1,
            currentPage: 1
          }
        }));
        return;
      }

      // Simulate pagination
      const pageSize = 2;
      const filteredResults = sampleResults.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase())
      );
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = filteredResults.slice(startIndex, endIndex);
      
      const hasNextPage = endIndex < filteredResults.length;
      const hasPrevPage = page > 1;

      // For queries that contain "no-page", return without pagination metadata (fallback case)
      const isFallbackCase = query.toLowerCase().includes('no-page');
      
      const meta = {
        mode: 'search',
        adapter: 'sample',
        adapterName: '本地示例数据',
        adapterDescription: '使用仓库内置示例结果进行匹配',
        adapterEndpoint: 'local-data',
        resultCount: paginatedResults.length
      };
      
      if (!isFallbackCase) {
        meta.currentPage = page;
        meta.hasPrevPage = hasPrevPage;
        meta.hasNextPage = hasNextPage;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        query: query,
        results: paginatedResults,
        meta: meta
      }));
    } else if (pathname === '/api/history') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        history: []
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
  console.log('📡 API endpoints:');
  console.log('   GET /api/health');
  console.log('   GET /api/adapters');
  console.log('   GET /api/search?q=keyword&page=1');
  console.log('   GET /api/history');
});