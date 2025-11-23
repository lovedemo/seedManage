const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const cardTemplate = document.getElementById('cardTemplate');
const historyCardTemplate = document.getElementById('historyCardTemplate');
const searchButton = document.getElementById('searchButton');
const adapterSelect = document.getElementById('adapterSelect');
const adapterDescriptionEl = document.getElementById('adapterDescription');
const footerAdapterNameEl = document.getElementById('footerAdapterName');
const footerAdapterEndpointEl = document.getElementById('footerAdapterEndpoint');
const navTabs = document.querySelectorAll('[data-view]');
const homeSection = document.getElementById('homeSection');
const historySection = document.getElementById('historySection');
const historyListEl = document.getElementById('historyList');
const historyStatusEl = document.getElementById('historyStatus');
const historyRefreshButton = document.getElementById('historyRefreshButton');

const viewSections = {
  home: homeSection,
  history: historySection
};

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

const viewState = {
  current: 'home'
};

const historyState = {
  items: [],
  isLoading: false,
  needsRefresh: true
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

const formatDateTime = (value) => {
  if (!value) return '未知时间';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

const setHistoryStatus = (message, variant = 'info') => {
  if (!historyStatusEl) return;
  if (!message) {
    historyStatusEl.hidden = true;
    historyStatusEl.textContent = '';
    historyStatusEl.classList.remove('error');
    return;
  }

  historyStatusEl.hidden = false;
  historyStatusEl.textContent = message;

  if (variant === 'error') {
    historyStatusEl.classList.add('error');
  } else {
    historyStatusEl.classList.remove('error');
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

const getHistoryAdapterLabel = (meta = {}) => {
  if (!meta) return '未知适配器';
  if (meta.fallbackUsed) {
    return `${meta.fallbackAdapterName || meta.fallbackAdapter || '备用适配器'}（回退）`;
  }
  return meta.adapterName || meta.adapter || '未知适配器';
};

const formatHistoryResultMeta = (result = {}) => {
  const parts = [];

  if (result.sizeLabel) {
    parts.push(result.sizeLabel);
  } else if (result.size) {
    parts.push(`${result.size} B`);
  }

  const hasSeederInfo = result.seeders !== null && result.seeders !== undefined;
  const hasLeecherInfo = result.leechers !== null && result.leechers !== undefined;
  if (hasSeederInfo || hasLeecherInfo) {
    const seeders = hasSeederInfo ? formatNumber(result.seeders) : '未知';
    const leechers = hasLeecherInfo ? formatNumber(result.leechers) : '未知';
    parts.push(`做种/下载 ${seeders}/${leechers}`);
  }

  if (result.category) {
    parts.push(result.category);
  }

  if (result.source) {
    parts.push(result.source);
  }

  return parts.join(' · ');
};

const renderHistory = (items = []) => {
  if (!historyListEl || !historyCardTemplate) return;

  historyListEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'history-panel__subtitle';
    empty.textContent = '暂无历史记录。';
    historyListEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((entry) => {
    const card = historyCardTemplate.content.cloneNode(true);
    const cardEl = card.querySelector('.history-card');
    const queryEl = card.querySelector('.history-card__query');
    const metaEl = card.querySelector('.history-card__meta');
    const emptyEl = card.querySelector('.history-card__empty');
    const resultsContainer = card.querySelector('.history-card__results');
    const toggleBtn = card.querySelector('.history-card__toggle');

    if (cardEl) {
      cardEl.dataset.expanded = 'false';
    }

    if (queryEl) {
      queryEl.textContent = entry?.query || '（未提供搜索词）';
    }

    if (metaEl) {
      const createdLabel = formatDateTime(entry?.createdAt);
      const adapterLabel = getHistoryAdapterLabel(entry?.meta);
      const modeLabel = (entry?.meta?.mode || entry?.mode) === 'magnet' ? '磁链解析' : '关键词搜索';
      const countLabel = `${Array.isArray(entry?.results) ? entry.results.length : 0} 条结果`;
      const summary = [createdLabel, adapterLabel, modeLabel, countLabel].filter(Boolean).join(' • ');
      metaEl.textContent = summary;
    }

    const results = Array.isArray(entry?.results) ? entry.results : [];
    if (emptyEl) {
      emptyEl.hidden = results.length > 0;
    }

    if (resultsContainer && results.length) {
      results.forEach((result, index) => {
        const itemEl = document.createElement('li');
        itemEl.className = 'history-result';

        const indexEl = document.createElement('span');
        indexEl.className = 'history-result__index';
        indexEl.textContent = String(index + 1).padStart(2, '0');

        const contentEl = document.createElement('div');
        contentEl.className = 'history-result__content';

        const titleEl = document.createElement('p');
        titleEl.className = 'history-result__title';
        titleEl.textContent = result?.title || '未命名资源';

        const metaInfoEl = document.createElement('p');
        metaInfoEl.className = 'history-result__meta';
        metaInfoEl.textContent = formatHistoryResultMeta(result) || '暂无额外信息';

        contentEl.appendChild(titleEl);
        contentEl.appendChild(metaInfoEl);

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'history-result__action';
        actionBtn.textContent = '复制';
        actionBtn.dataset.magnet = result?.magnet || '';
        if (!result?.magnet) {
          actionBtn.disabled = true;
          actionBtn.textContent = '无磁链';
        }

        actionBtn.addEventListener('click', async () => {
          const { magnet } = actionBtn.dataset;
          if (!magnet) return;
          try {
            await navigator.clipboard.writeText(magnet);
            setHistoryStatus('磁力链接已复制到剪贴板。');
            setTimeout(() => setHistoryStatus(''), 1800);
          } catch (error) {
            window.open(magnet, '_blank');
          }
        });

        itemEl.appendChild(indexEl);
        itemEl.appendChild(contentEl);
        itemEl.appendChild(actionBtn);
        resultsContainer.appendChild(itemEl);
      });
    }

    if (toggleBtn && cardEl) {
      toggleBtn.addEventListener('click', () => {
        const expanded = cardEl.dataset.expanded === 'true';
        const nextState = !expanded;
        cardEl.dataset.expanded = String(nextState);
        toggleBtn.textContent = nextState ? '收起' : '展开';
      });
    }

    fragment.appendChild(card);
  });

  historyListEl.appendChild(fragment);
};

const loadHistory = async ({ force = false } = {}) => {
  if (!historyListEl || !historyCardTemplate) return;
  if (historyState.isLoading) return;
  if (!force && !historyState.needsRefresh) {
    return;
  }

  historyState.isLoading = true;
  historyState.needsRefresh = false;
  setHistoryStatus('正在加载历史记录…');
  if (historyRefreshButton) {
    historyRefreshButton.disabled = true;
  }

  try {
    const response = await fetch(`${API_BASE}/api/history`);
    if (!response.ok) {
      throw new Error(`后端返回状态 ${response.status}`);
    }
    const data = await response.json();
    const items = Array.isArray(data.history) ? data.history : [];
    historyState.items = items;
    renderHistory(items);
    if (!items.length) {
      setHistoryStatus('暂无历史记录。');
    } else {
      setHistoryStatus('');
    }
  } catch (error) {
    setHistoryStatus(`无法加载历史记录：${error.message}`, 'error');
  } finally {
    historyState.isLoading = false;
    if (historyRefreshButton) {
      historyRefreshButton.disabled = false;
    }
    if (historyState.needsRefresh) {
      loadHistory({ force: true });
    }
  }
};

const requestHistoryRefresh = () => {
  historyState.needsRefresh = true;
  if (viewState.current === 'history' && !historyState.isLoading) {
    loadHistory({ force: true });
  }
};

const setView = (view) => {
  if (!viewSections[view]) {
    return;
  }

  viewState.current = view;

  navTabs.forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  });

  Object.entries(viewSections).forEach(([key, section]) => {
    if (!section) return;
    if (key === view) {
      section.removeAttribute('hidden');
    } else {
      section.setAttribute('hidden', 'true');
    }
  });

  if (view === 'history') {
    if (historyState.needsRefresh) {
      loadHistory({ force: true });
    } else if (historyState.items.length) {
      renderHistory(historyState.items);
      setHistoryStatus('');
    } else {
      renderHistory([]);
      setHistoryStatus('暂无历史记录。');
    }
  }
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
    requestHistoryRefresh();

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

navTabs.forEach((tab) => {
  tab.addEventListener('click', (event) => {
    const { view } = event.currentTarget.dataset;
    setView(view || 'home');
  });
});

if (historyRefreshButton) {
  historyRefreshButton.addEventListener('click', () => {
    historyState.needsRefresh = true;
    loadHistory({ force: true });
  });
}

setView('home');
fetchAdapters();

console.info('[magnet-search] 当前后端 API 地址：%s', API_BASE);
console.info('[magnet-search] 如需更换后端地址，可执行 localStorage.setItem("%s", "http://localhost:3001") 后刷新页面。', STORAGE_KEYS.apiBase);
