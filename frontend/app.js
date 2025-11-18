const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const cardTemplate = document.getElementById('cardTemplate');
const searchButton = document.getElementById('searchButton');
const adapterSelect = document.getElementById('adapterSelect');
const adapterDescriptionEl = document.getElementById('adapterDescription');
const footerAdapterNameEl = document.getElementById('footerAdapterName');
const footerAdapterEndpointEl = document.getElementById('footerAdapterEndpoint');

const STORAGE_KEYS = {
  adapter: 'magnetPreferredAdapter',
  apiBase: 'magnetApiBase'
};

const detectDefaultApiBase = () => {
  const { origin } = window.location;
  if (origin.includes('5173') || origin.includes('localhost')) {
    return 'http://localhost:3001';
  }
  return origin;
};

const API_BASE = (() => {
  const stored = localStorage.getItem(STORAGE_KEYS.apiBase);
  return stored || detectDefaultApiBase();
})();

const state = {
  adapters: [],
  selectedAdapterId: localStorage.getItem(STORAGE_KEYS.adapter) || ''
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return '未知';
  const number = Number(value);
  if (Number.isNaN(number)) return '未知';
  if (number >= 10000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return '未知';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const setStatus = (message, variant = 'info') => {
  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.classList.remove('error');
    return;
  }

  statusEl.hidden = false;
  statusEl.textContent = message;

  if (variant === 'error') {
    statusEl.classList.add('error');
  } else {
    statusEl.classList.remove('error');
  }
};

const getAdapterById = (id) => state.adapters.find((adapter) => adapter.id === id) || null;

const formatEndpointLabel = (adapter) => {
  if (!adapter) return '数据源：未知';
  if (!adapter.endpoint) {
    return '数据源：未提供';
  }
  if (adapter.endpoint === 'local-data') {
    return '数据源：本地示例数据';
  }
  return adapter.endpoint.startsWith('http') ? `数据源：${adapter.endpoint}` : `数据源：${adapter.endpoint}`;
};

const updateAdapterDetails = () => {
  const adapter = getAdapterById(state.selectedAdapterId);
  if (!adapter) {
    adapterDescriptionEl.textContent = '暂无可用的适配器，请检查后端服务状态。';
    footerAdapterNameEl.textContent = '未加载';
    footerAdapterEndpointEl.textContent = `后端 API：${API_BASE}`;
    return;
  }

  adapterDescriptionEl.textContent = adapter.description || '该适配器没有提供描述。';
  footerAdapterNameEl.textContent = adapter.name;
  footerAdapterEndpointEl.textContent = formatEndpointLabel(adapter);
};

const populateAdapters = (adapters, defaultId) => {
  state.adapters = adapters;
  adapterSelect.innerHTML = '';

  adapters.forEach((adapter) => {
    const option = document.createElement('option');
    option.value = adapter.id;
    let label = adapter.name;
    if (adapter.default) label += '（默认）';
    if (adapter.fallback) label += '（备用）';
    option.textContent = label;
    adapterSelect.appendChild(option);
  });

  let candidate = state.selectedAdapterId;
  if (!candidate || !getAdapterById(candidate)) {
    candidate = defaultId || (adapters[0]?.id ?? '');
  }

  if (candidate && getAdapterById(candidate)) {
    state.selectedAdapterId = candidate;
    adapterSelect.value = candidate;
  } else if (adapters.length > 0) {
    state.selectedAdapterId = adapters[0].id;
    adapterSelect.value = adapters[0].id;
  } else {
    state.selectedAdapterId = '';
  }

  if (state.selectedAdapterId) {
    localStorage.setItem(STORAGE_KEYS.adapter, state.selectedAdapterId);
  }

  updateAdapterDetails();
};

const fetchAdapters = async () => {
  adapterSelect.disabled = true;
  try {
    const response = await fetch(`${API_BASE}/api/adapters`);
    if (!response.ok) {
      throw new Error(`后端返回状态 ${response.status}`);
    }
    const data = await response.json();
    populateAdapters(data.adapters ?? [], data.defaultAdapter);
  } catch (error) {
    setStatus(`无法获取适配器列表：${error.message}`, 'error');
    state.adapters = [];
    updateAdapterDetails();
  } finally {
    adapterSelect.disabled = state.adapters.length === 0;
  }
};

const renderResults = (items = [], meta = {}) => {
  resultsEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'status';
    empty.textContent = '未找到匹配的结果，请尝试更换关键字。';
    resultsEl.appendChild(empty);
    return;
  }

  const adapterLabel = meta.fallbackUsed
    ? `${meta.fallbackAdapterName || meta.fallbackAdapter || '备用适配器'}（回退）`
    : meta.adapterName || meta.adapter || '未知适配器';

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = cardTemplate.content.cloneNode(true);
    const titleEl = card.querySelector('.card-title');
    const badgeEl = card.querySelector('.card-badge');
    const metaEl = card.querySelector('.card-meta');
    const actionEl = card.querySelector('.card-action');

    titleEl.textContent = item.title || '未命名资源';
    badgeEl.textContent = item.category || (meta.mode === 'magnet' ? '磁力链接' : adapterLabel);

    const metaEntries = [];

    if (item.sizeLabel || item.size) {
      metaEntries.push(['大小', item.sizeLabel || `${item.size} B`]);
    }

    const hasSeederInfo = item.seeders !== null && item.seeders !== undefined;
    const hasLeecherInfo = item.leechers !== null && item.leechers !== undefined;
    if (hasSeederInfo || hasLeecherInfo) {
      const seeders = hasSeederInfo ? formatNumber(item.seeders) : '未知';
      const leechers = hasLeecherInfo ? formatNumber(item.leechers) : '未知';
      metaEntries.push(['做种 / 下载', `${seeders} / ${leechers}`]);
    }

    if (item.infoHash) {
      metaEntries.push(['Info Hash', item.infoHash]);
    }

    if (item.uploaded) {
      metaEntries.push(['更新时间', formatDate(item.uploaded)]);
    }

    if (Array.isArray(item.trackers) && item.trackers.length) {
      metaEntries.push(['Trackers', item.trackers.slice(0, 3).join('\n')]);
    }

    const sourceLabel = item.source || adapterLabel;
    metaEntries.push(['数据源', sourceLabel]);

    metaEl.innerHTML = '';

    metaEntries.forEach(([label, value]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      metaEl.appendChild(dt);
      metaEl.appendChild(dd);
    });

    actionEl.href = item.magnet || '#';
    actionEl.dataset.magnet = item.magnet || '';
    actionEl.textContent = '复制磁力链接';
    actionEl.addEventListener('click', async (event) => {
      event.preventDefault();
      const { magnet } = event.currentTarget.dataset;
      if (!magnet) return;
      try {
        await navigator.clipboard.writeText(magnet);
        setStatus('磁力链接已复制到剪贴板。');
        setTimeout(() => setStatus(''), 1800);
      } catch (error) {
        window.open(magnet, '_blank');
      }
    });

    fragment.appendChild(card);
  });

  resultsEl.appendChild(fragment);
};

const performSearch = async (query) => {
  setStatus('正在搜索，请稍候…');
  resultsEl.innerHTML = '';
  searchButton.disabled = true;
  input.setAttribute('aria-busy', 'true');

  try {
    const params = new URLSearchParams({ q: query });
    if (state.selectedAdapterId) {
      params.set('adapter', state.selectedAdapterId);
    }

    const response = await fetch(`${API_BASE}/api/search?${params.toString()}`);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || '搜索失败，请稍后再试。');
    }

    const data = await response.json();
    const meta = data.meta || {};

    if (meta.adapter && getAdapterById(meta.adapter) && state.selectedAdapterId !== meta.adapter) {
      state.selectedAdapterId = meta.adapter;
      adapterSelect.value = meta.adapter;
      localStorage.setItem(STORAGE_KEYS.adapter, meta.adapter);
      updateAdapterDetails();
    }

    renderResults(data.results, meta);

    if (meta.mode === 'magnet') {
      setStatus('已生成磁力卡片，可复制链接');
      return;
    }

    const adapterLabel = meta.adapterName || meta.adapter || '当前适配器';

    if (Array.isArray(data.results) && data.results.length > 0) {
      let message = `使用 ${adapterLabel} 获取 ${data.results.length} 条结果。`;

      if (meta.fallbackUsed) {
        message += ` 已回退至 ${meta.fallbackAdapterName || meta.fallbackAdapter || '备用适配器'}。`;
      }

      if (meta.adapterError && !meta.fallbackUsed) {
        message += `（适配器提示：${meta.adapterError}）`;
        setStatus(message, 'error');
      } else if (meta.fallbackAdapterError) {
        message += `（备用适配器提示：${meta.fallbackAdapterError}）`;
        setStatus(message, 'error');
      } else {
        setStatus(message);
      }
    } else {
      const reason = meta.adapterError || '未找到结果。';
      setStatus(reason, 'error');
    }
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    searchButton.disabled = false;
    input.removeAttribute('aria-busy');
  }
};

adapterSelect.addEventListener('change', (event) => {
  const value = event.target.value;
  state.selectedAdapterId = value;
  localStorage.setItem(STORAGE_KEYS.adapter, value);
  updateAdapterDetails();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  performSearch(query);
});

fetchAdapters();

console.info('[magnet-search] 当前后端 API 地址：%s', API_BASE);
console.info('[magnet-search] 如需更换后端地址，可执行 localStorage.setItem("%s", "http://localhost:3001") 后刷新页面。', STORAGE_KEYS.apiBase);
