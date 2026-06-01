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
const paginationEl = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const currentPageEl = document.getElementById('currentPage');
const totalPagesEl = document.getElementById('totalPages');
const totalPagesValueEl = document.getElementById('totalPagesValue');
const pageInput = document.getElementById('pageInput');
const goToPageBtn = document.getElementById('goToPageBtn');

// Collections DOM elements
const collectionsSection = document.getElementById('collectionsSection');
const collectionsListView = document.getElementById('collectionsListView');
const collectionDetailView = document.getElementById('collectionDetailView');
const collectionsListEl = document.getElementById('collectionsList');
const collectionsStatusEl = document.getElementById('collectionsStatus');
const createCollectionBtn = document.getElementById('createCollectionBtn');
const addItemBtn = document.getElementById('addItemBtn');
const importCSVBtn = document.getElementById('importCSVBtn');
const backToCollectionsBtn = document.getElementById('backToCollectionsBtn');
const deleteCollectionBtn = document.getElementById('deleteCollectionBtn');
const collectionDetailTitle = document.getElementById('collectionDetailTitle');
const collectionDetailMeta = document.getElementById('collectionDetailMeta');
const collectionSearchInput = document.getElementById('collectionSearchInput');
const collectionStarFilter = document.getElementById('collectionStarFilter');
const collectionItemsEl = document.getElementById('collectionItems');
const collectionDetailStatusEl = document.getElementById('collectionDetailStatus');
const collectionPaginationEl = document.getElementById('collectionPagination');
const collPrevPageBtn = document.getElementById('collPrevPageBtn');
const collNextPageBtn = document.getElementById('collNextPageBtn');
const collCurrentPageEl = document.getElementById('collCurrentPage');
const collTotalPagesEl = document.getElementById('collTotalPages');

const batchActionsBar = document.getElementById('batchActionsBar');
const selectedCountText = document.getElementById('selectedCountText');
const batchDeleteBtn = document.getElementById('batchDeleteBtn');
const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');

const addItemModal = document.getElementById('addItemModal');
const closeModalBtn = document.querySelector('.close-modal-btn');
const modalTabs = document.querySelectorAll('.modal-tab');
const modalTabContents = document.querySelectorAll('.modal-tab-content');
const singleAddForm = document.getElementById('singleAddForm');
const batchAddForm = document.getElementById('batchAddForm');

const collectionCardTemplate = document.getElementById('collectionCardTemplate');
const collectionItemTemplate = document.getElementById('collectionItemTemplate');
const keywordSearchResultTemplate = document.getElementById('keywordSearchResultTemplate');

const viewSections = {
  home: homeSection,
  history: historySection,
  collections: collectionsSection
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

const searchState = {
  currentQuery: '',
  currentPage: 1,
  meta: {}
};

const viewState = {
  current: 'home'
};

const historyState = {
  items: [],
  isLoading: false,
  needsRefresh: true
};

const collectionsState = {
  items: [],
  currentCollection: null,
  currentCollectionId: null,
  isLoading: false,
  needsRefresh: true,
  detailPage: 1,
  detailPageSize: 20,
  searchQuery: '',
  starFilter: false,
  selectedMagnets: new Set(),
  keywordSearchResults: {}
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

const setCollectionsStatus = (message, variant = 'info') => {
  if (!collectionsStatusEl) return;
  if (!message) {
    collectionsStatusEl.hidden = true;
    collectionsStatusEl.textContent = '';
    collectionsStatusEl.classList.remove('error');
    return;
  }
  collectionsStatusEl.hidden = false;
  collectionsStatusEl.textContent = message;
  if (variant === 'error') {
    collectionsStatusEl.classList.add('error');
  } else {
    collectionsStatusEl.classList.remove('error');
  }
};

const setCollectionDetailStatus = (message, variant = 'info') => {
  if (!collectionDetailStatusEl) return;
  if (!message) {
    collectionDetailStatusEl.hidden = true;
    collectionDetailStatusEl.textContent = '';
    collectionDetailStatusEl.classList.remove('error');
    return;
  }
  collectionDetailStatusEl.hidden = false;
  collectionDetailStatusEl.textContent = message;
  if (variant === 'error') {
    collectionDetailStatusEl.classList.add('error');
  } else {
    collectionDetailStatusEl.classList.remove('error');
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

const updatePaginationUI = (meta = {}) => {
  const hasPagination = meta.currentPage !== undefined && meta.currentPage !== null;
  
  if (!hasPagination) {
    // Show pagination controls with fallback mode (only page input)
    paginationEl.hidden = false;
    // Hide the navigation controls, show only the page input
    const controls = paginationEl.querySelector('.pagination-controls');
    const inputContainer = paginationEl.querySelector('.page-input-container');
    if (controls) controls.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'flex';
    return;
  }

  paginationEl.hidden = false;
  
  // Show both navigation controls and page input
  const controls = paginationEl.querySelector('.pagination-controls');
  const inputContainer = paginationEl.querySelector('.page-input-container');
  if (controls) controls.style.display = 'flex';
  if (inputContainer) inputContainer.style.display = 'flex';
  
  // Update current page display
  currentPageEl.textContent = meta.currentPage;
  pageInput.value = meta.currentPage;
  
  // Update navigation buttons
  prevPageBtn.disabled = !meta.hasPrevPage;
  nextPageBtn.disabled = !meta.hasNextPage;
  
  // Update total pages display if available
  if (meta.totalPages && meta.totalPages > 0) {
    totalPagesEl.hidden = false;
    totalPagesValueEl.textContent = meta.totalPages;
    pageInput.max = meta.totalPages;
  } else {
    totalPagesEl.hidden = true;
    pageInput.removeAttribute('max');
  }
};

const renderResults = (items = [], meta = {}) => {
  resultsEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'status';
    empty.textContent = '未找到匹配的结果，请尝试更换关键字。';
    resultsEl.appendChild(empty);
    paginationEl.hidden = true;
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
    const openEl = card.querySelector('.card-open')

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
    openEl.href = item.magnet || '#';
    actionEl.dataset.magnet = item.magnet || '';
    openEl.dataset.magnet = item.magnet || '';
    actionEl.textContent = '复制磁力链接';
    openEl.textContent = '打开';
    
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

    openEl.addEventListener('click', async (event) => {
      event.preventDefault();
      const { magnet } = event.currentTarget.dataset;
      if (!magnet) return;
      window.open(magnet, '_blank');
    });

    fragment.appendChild(card);
  });

  resultsEl.appendChild(fragment);
  
  // Update pagination UI
  updatePaginationUI(meta);
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
    const deleteBtn = card.querySelector('.history-card__delete');

    if (cardEl) {
      cardEl.dataset.expanded = 'false';
      cardEl.dataset.id = entry?.id || '';
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

        const actionContainerEl = document.createElement('div');
        actionContainerEl.className = 'history-result__actions';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'history-result__action';
        copyBtn.textContent = '复制';
        copyBtn.dataset.magnet = result?.magnet || '';
        if (!result?.magnet) {
          copyBtn.disabled = true;
          copyBtn.textContent = '无磁链';
        }

        copyBtn.addEventListener('click', async () => {
          const { magnet } = copyBtn.dataset;
          if (!magnet) return;
          try {
            await navigator.clipboard.writeText(magnet);
            setHistoryStatus('磁力链接已复制到剪贴板。');
            setTimeout(() => setHistoryStatus(''), 1800);
          } catch (error) {
            window.open(magnet, '_blank');
          }
        });

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'history-result__action history-result__action--open';
        openBtn.textContent = '打开';
        openBtn.dataset.magnet = result?.magnet || '';
        if (!result?.magnet) {
          openBtn.disabled = true;
        }

        openBtn.addEventListener('click', async () => {
          const { magnet } = openBtn.dataset;
          if (!magnet) return;
          window.open(magnet, '_blank');
        });

        actionContainerEl.appendChild(copyBtn);
        actionContainerEl.appendChild(openBtn);

        itemEl.appendChild(indexEl);
        itemEl.appendChild(contentEl);
        itemEl.appendChild(actionContainerEl);
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

    if (deleteBtn && cardEl) {
      deleteBtn.addEventListener('click', async () => {
        const historyId = cardEl.dataset.id;
        if (!historyId) {
          setHistoryStatus('无法删除：历史记录ID缺失', 'error');
          return;
        }

        if (!confirm('确定要删除这条历史记录吗？')) {
          return;
        }

        try {
          const response = await fetch(`${API_BASE}/api/history?id=${encodeURIComponent(historyId)}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `删除失败，状态码：${response.status}`);
          }

          setHistoryStatus('历史记录已删除');
          setTimeout(() => setHistoryStatus(''), 1800);
          
          // 重新加载历史记录
          requestHistoryRefresh();
        } catch (error) {
          setHistoryStatus(`删除失败：${error.message}`, 'error');
        }
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
      section.style.display = 'block'
    } else {
      section.style.display = 'none'
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

  if (view === 'collections') {
    // Show list view, hide detail view
    collectionsListView.style.display = 'block';
    collectionDetailView.style.display = 'none';
    if (collectionsState.needsRefresh) {
      loadCollections({ force: true });
    } else if (collectionsState.items.length) {
      renderCollections(collectionsState.items);
      setCollectionsStatus('');
    } else {
      renderCollections([]);
      setCollectionsStatus('暂无收藏集。');
    }
  }
};

const performSearch = async (query, page = 1) => {
  setStatus('正在搜索，请稍候…');
  resultsEl.innerHTML = '';
  searchButton.disabled = true;
  input.setAttribute('aria-busy', 'true');

  try {
    const params = new URLSearchParams({ q: query });
    if (state.selectedAdapterId) {
      params.set('adapter', state.selectedAdapterId);
    }
    if (page > 1) {
      params.set('page', page.toString());
    }

    const response = await fetch(`${API_BASE}/api/search?${params.toString()}`);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || '搜索失败，请稍后再试。');
    }

    const data = await response.json();
    const meta = data.meta || {};

    // Update search state
    searchState.currentQuery = query;
    searchState.currentPage = page;
    searchState.meta = meta;

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

// ============= COLLECTIONS FUNCTIONS =============

const loadCollections = async ({ force = false } = {}) => {
  if (collectionsState.isLoading) return;
  if (!force && !collectionsState.needsRefresh) return;

  collectionsState.isLoading = true;
  collectionsState.needsRefresh = false;
  setCollectionsStatus('正在加载收藏集…');

  try {
    const response = await fetch(`${API_BASE}/api/collections`);
    if (!response.ok) {
      throw new Error(`后端返回状态 ${response.status}`);
    }
    const data = await response.json();
    const items = Array.isArray(data.collections) ? data.collections : [];
    collectionsState.items = items;
    renderCollections(items);
    if (!items.length) {
      setCollectionsStatus('暂无收藏集。新建一个吧！');
    } else {
      setCollectionsStatus('');
    }
  } catch (error) {
    setCollectionsStatus(`无法加载收藏集：${error.message}`, 'error');
  } finally {
    collectionsState.isLoading = false;
    if (collectionsState.needsRefresh) {
      loadCollections({ force: true });
    }
  }
};

const renderCollections = (items = []) => {
  if (!collectionsListEl || !collectionCardTemplate) return;
  collectionsListEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'collections-panel__subtitle';
    empty.textContent = '暂无收藏集。';
    collectionsListEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((collection) => {
    const card = collectionCardTemplate.content.cloneNode(true);
    const article = card.querySelector('.collection-card');
    const nameEl = card.querySelector('.collection-card__name');
    const metaEl = card.querySelector('.collection-card__meta');
    const openBtn = card.querySelector('.collection-card__open');
    const deleteBtn = card.querySelector('.collection-card__delete');

    if (article) {
      article.dataset.id = collection.id || '';
    }
    if (nameEl) {
      nameEl.textContent = collection.name || '未命名收藏集';
    }
    if (metaEl) {
      const count = collection.itemCount || 0;
      const date = formatDateTime(collection.createdAt);
      metaEl.textContent = `${count} 个条目 · 创建于 ${date}`;
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        openCollectionDetail(collection.id);
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`确定要删除收藏集「${collection.name}」吗？`)) return;
        try {
          const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(collection.id)}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `删除失败，状态码：${response.status}`);
          }
          setCollectionsStatus('收藏集已删除');
          setTimeout(() => setCollectionsStatus(''), 1800);
          collectionsState.needsRefresh = true;
          loadCollections({ force: true });
        } catch (error) {
          setCollectionsStatus(`删除失败：${error.message}`, 'error');
        }
      });
    }

    fragment.appendChild(card);
  });

  collectionsListEl.appendChild(fragment);
};

const openCollectionDetail = async (id) => {
  collectionsState.currentCollectionId = id;
  collectionsState.detailPage = 1;
  collectionsState.searchQuery = '';
  collectionsState.starFilter = false;
  collectionsState.selectedMagnets.clear();
  updateBatchActionsBar();
  
  collectionSearchInput.value = '';
  collectionStarFilter.checked = false;

  collectionsListView.style.display = 'none';
  collectionDetailView.style.display = 'block';

  await loadCollectionDetail();
};

const loadCollectionDetail = async () => {
  const id = collectionsState.currentCollectionId;
  if (!id) return;

  setCollectionDetailStatus('正在加载…');
  collectionItemsEl.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(id)}`);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `加载失败，状态码：${response.status}`);
    }
    const data = await response.json();
    collectionsState.currentCollection = data;

    // Update header
    if (collectionDetailTitle) {
      collectionDetailTitle.textContent = data.meta?.name || '收藏集';
    }
    if (collectionDetailMeta) {
      const count = data.meta?.itemCount || 0;
      const date = formatDateTime(data.meta?.createdAt);
      collectionDetailMeta.textContent = `${count} 个条目 · 创建于 ${date}`;
    }

    // Filter and paginate
    let items = Array.isArray(data.items) ? data.items : [];

    // Apply search filter
    if (collectionsState.searchQuery) {
      const q = collectionsState.searchQuery.toLowerCase();
      items = items.filter(item => {
        return (item.title && item.title.toLowerCase().includes(q)) ||
               (item.keywords && item.keywords.toLowerCase().includes(q)) ||
               (item.remarks && item.remarks.toLowerCase().includes(q));
      });
    }

    // Apply starred filter
    if (collectionsState.starFilter) {
      items = items.filter(item => item.starred);
    }

    // Sort by addedAt descending
    items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    // Paginate
    const pageSize = collectionsState.detailPageSize;
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(collectionsState.detailPage, totalPages);
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    // Render items
    renderCollectionItems(pageItems, items);

    // Update pagination
    collCurrentPageEl.textContent = page;
    collTotalPagesEl.textContent = totalPages;
    collPrevPageBtn.disabled = page <= 1;
    collNextPageBtn.disabled = page >= totalPages;
    collectionPaginationEl.hidden = totalPages <= 1;

    setCollectionDetailStatus('');
  } catch (error) {
    setCollectionDetailStatus(`加载失败：${error.message}`, 'error');
  }
};

const renderCollectionItems = (items = [], allFilteredItems = []) => {
  collectionItemsEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'status';
    empty.textContent = '没有找到匹配的条目。';
    collectionItemsEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const card = collectionItemTemplate.content.cloneNode(true);
    const article = card.querySelector('.collection-item-card');
    const checkbox = card.querySelector('.collection-item__checkbox');
    const titleEl = card.querySelector('.collection-item__title');
    const starBtn = card.querySelector('.collection-item__star');
    const keywordsEl = card.querySelector('.collection-item__keywords');
    const remarksEl = card.querySelector('.collection-item__remarks');
    const metaEl = card.querySelector('.card-meta');
    const actionEl = card.querySelector('.card-action');
    const openEl = card.querySelector('.card-open');

    // Selection logic
    if (checkbox) {
      checkbox.checked = collectionsState.selectedMagnets.has(item.magnet);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          collectionsState.selectedMagnets.add(item.magnet);
        } else {
          collectionsState.selectedMagnets.delete(item.magnet);
        }
        updateBatchActionsBar();
      });
    }

    // Title
    titleEl.textContent = item.title || item.remarks || '未命名条目';
    titleEl.title = item.title || item.remarks || '未命名条目';

    // Star button
    if (starBtn) {
      starBtn.textContent = item.starred ? '⭐' : '☆';
      starBtn.dataset.starred = item.starred ? 'true' : 'false';
      starBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Toggle star - for now just update UI since we don't have a toggle API
        // In a full implementation, we'd call the backend to update
        const newStarred = !(starBtn.dataset.starred === 'true');
        starBtn.textContent = newStarred ? '⭐' : '☆';
        starBtn.dataset.starred = newStarred ? 'true' : 'false';
        if (article) article.dataset.starred = newStarred ? 'true' : 'false';
        setCollectionDetailStatus('星标状态已更新（本地）');
        setTimeout(() => setCollectionDetailStatus(''), 1500);
      });
    }

    // Keywords - clickable for search
    if (keywordsEl && item.keywords) {
      const keywords = item.keywords.split(',').map(k => k.trim()).filter(Boolean);
      if (keywords.length) {
        const keywordFragment = document.createDocumentFragment();
        keywords.forEach(keyword => {
          const chip = document.createElement('span');
          chip.className = 'keyword-chip';
          chip.textContent = keyword;
          chip.title = `搜索: ${keyword}`;
          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            performKeywordSearch(keyword, article);
          });
          keywordFragment.appendChild(chip);
        });
        keywordsEl.appendChild(keywordFragment);
      } else {
        keywordsEl.style.display = 'none';
      }
    } else {
      keywordsEl.style.display = 'none';
    }

    // Remarks
    if (remarksEl && item.remarks) {
      remarksEl.textContent = item.remarks;
    } else {
      remarksEl.style.display = 'none';
    }

    // Meta info
    if (metaEl) {
      metaEl.innerHTML = '';
      if (item.addedAt) {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = '添加时间';
        dd.textContent = formatDateTime(item.addedAt);
        metaEl.appendChild(dt);
        metaEl.appendChild(dd);
      }
    }

    // Action buttons
    if (actionEl && item.magnet) {
      actionEl.dataset.magnet = item.magnet;
      actionEl.addEventListener('click', async (event) => {
        event.preventDefault();
        const { magnet } = event.currentTarget.dataset;
        if (!magnet) return;
        try {
          await navigator.clipboard.writeText(magnet);
          setCollectionDetailStatus('磁力链接已复制到剪贴板。');
          setTimeout(() => setCollectionDetailStatus(''), 1800);
        } catch (error) {
          window.open(magnet, '_blank');
        }
      });
    }

    if (openEl && item.magnet) {
      openEl.dataset.magnet = item.magnet;
      openEl.addEventListener('click', (event) => {
        event.preventDefault();
        const { magnet } = event.currentTarget.dataset;
        if (!magnet) return;
        window.open(magnet, '_blank');
      });
    }

    fragment.appendChild(card);
  });

  collectionItemsEl.appendChild(fragment);
};

const updateBatchActionsBar = () => {
  const count = collectionsState.selectedMagnets.size;
  if (count > 0) {
    batchActionsBar.hidden = false;
    selectedCountText.textContent = `已选择 ${count} 项`;
  } else {
    batchActionsBar.hidden = true;
  }
};

const openAddItemModal = () => {
  addItemModal.hidden = false;
  // Reset tabs
  modalTabs.forEach(t => t.classList.remove('is-active'));
  modalTabs[0].classList.add('is-active');
  modalTabContents.forEach(c => c.hidden = true);
  modalTabContents[0].hidden = false;
  // Reset forms
  singleAddForm.reset();
  batchAddForm.reset();
};

const closeAddItemModal = () => {
  addItemModal.hidden = true;
};

const performBatchDelete = async () => {
  const magnets = Array.from(collectionsState.selectedMagnets);
  if (magnets.length === 0) return;

  if (!confirm(`确定要删除选中的 ${magnets.length} 个条目吗？`)) return;

  setCollectionDetailStatus(`正在删除 ${magnets.length} 个条目…`);

  try {
    const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(collectionsState.currentCollectionId)}/items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnets })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || '批量删除失败');
    }

    setCollectionDetailStatus(`成功删除 ${magnets.length} 个条目`);
    setTimeout(() => setCollectionDetailStatus(''), 2000);
    
    collectionsState.selectedMagnets.clear();
    updateBatchActionsBar();
    loadCollectionDetail();
  } catch (error) {
    setCollectionDetailStatus(`删除失败：${error.message}`, 'error');
  }
};
const performKeywordSearch = async (keyword, anchorElement) => {
  // Use the search adapter but WITHOUT saving to history
  setCollectionDetailStatus(`正在搜索: ${keyword}…`);

  try {
    const params = new URLSearchParams({ q: keyword });
    if (state.selectedAdapterId) {
      params.set('adapter', state.selectedAdapterId);
    }
    const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(collectionsState.currentCollectionId)}/search?${params.toString()}`);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || '搜索失败');
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    const meta = data.meta || {};

    // Show results in a dropdown under the anchorElement (the row)
    showKeywordSearchInDropdown(keyword, results, meta, anchorElement);
    setCollectionDetailStatus('');
  } catch (error) {
    setCollectionDetailStatus(`搜索失败：${error.message}`, 'error');
  }
};

const showKeywordSearchInDropdown = (keyword, results = [], meta = {}, anchorElement) => {
  // Remove existing dropdowns in this collection view
  const existingDropdowns = collectionItemsEl.querySelectorAll('.item-dropdown-results');
  existingDropdowns.forEach(d => d.remove());

  const dropdown = document.createElement('div');
  dropdown.className = 'item-dropdown-results';

  // Header
  const header = document.createElement('div');
  header.className = 'item-dropdown-results__header';
  header.innerHTML = `
    <h4>搜索结果: "${keyword}" <small>(${results.length} 条来自 ${meta.adapterName || '适配器'})</small></h4>
    <button type="button" class="item-dropdown-results__close" title="关闭">×</button>
  `;

  header.querySelector('.item-dropdown-results__close').addEventListener('click', () => dropdown.remove());

  dropdown.appendChild(header);

  // Results List
  const resultsList = document.createElement('div');
  resultsList.className = 'dropdown-results-list';

  if (!results.length) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'status';
    emptyEl.textContent = '未找到匹配的结果。';
    resultsList.appendChild(emptyEl);
  } else {
    const fragment = document.createDocumentFragment();
    results.forEach(result => {
      const card = keywordSearchResultTemplate.content.cloneNode(true);
      const titleEl = card.querySelector('.card-title');
      const badgeEl = card.querySelector('.card-badge');
      const metaEl = card.querySelector('.card-meta');
      const actionEl = card.querySelector('.card-action');
      const openEl = card.querySelector('.card-open');

      titleEl.textContent = result.title || '未命名资源';
      badgeEl.textContent = result.category || meta.adapterName || '搜索结果';

      const metaEntries = [];
      if (result.sizeLabel || result.size) {
        metaEntries.push(['大小', result.sizeLabel || `${result.size} B`]);
      }
      const hasSeederInfo = result.seeders !== null && result.seeders !== undefined;
      const hasLeecherInfo = result.leechers !== null && result.leechers !== undefined;
      if (hasSeederInfo || hasLeecherInfo) {
        const seeders = hasSeederInfo ? formatNumber(result.seeders) : '未知';
        const leechers = hasLeecherInfo ? formatNumber(result.leechers) : '未知';
        metaEntries.push(['做种 / 下载', `${seeders} / ${leechers}`]);
      }
      
      metaEl.innerHTML = '';
      metaEntries.forEach(([label, value]) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = label;
        dd.textContent = value;
        metaEl.appendChild(dt);
        metaEl.appendChild(dd);
      });

      if (actionEl && result.magnet) {
        actionEl.dataset.magnet = result.magnet;
        actionEl.addEventListener('click', async (event) => {
          event.preventDefault();
          const { magnet } = event.currentTarget.dataset;
          if (!magnet) return;
          try {
            await navigator.clipboard.writeText(magnet);
            setCollectionDetailStatus('磁力链接已复制到剪贴板。');
            setTimeout(() => setCollectionDetailStatus(''), 1800);
          } catch (error) {
            window.open(magnet, '_blank');
          }
        });
      }

      if (openEl && result.magnet) {
        openEl.dataset.magnet = result.magnet;
        openEl.addEventListener('click', (event) => {
          event.preventDefault();
          const { magnet } = event.currentTarget.dataset;
          if (!magnet) return;
          window.open(magnet, '_blank');
        });
      }

      fragment.appendChild(card);
    });
    resultsList.appendChild(fragment);
  }

  dropdown.appendChild(resultsList);
  
  // Insert the dropdown immediately after the anchorElement (the row)
  anchorElement.after(dropdown);
  
  // Scroll into view if needed
  dropdown.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

const showKeywordSearchResults = (keyword, results = [], meta = {}) => {
  // Legacy function - kept for compatibility if needed, but we now use dropdown
  console.warn('showKeywordSearchResults is deprecated, use showKeywordSearchInDropdown');
};

// ============= EVENT LISTENERS =============

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
  // Reset to page 1 for new searches
  performSearch(query, 1);
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

// Pagination event listeners
if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (searchState.currentQuery && searchState.currentPage > 1) {
      performSearch(searchState.currentQuery, searchState.currentPage - 1);
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    if (searchState.currentQuery && searchState.meta.hasNextPage) {
      performSearch(searchState.currentQuery, searchState.currentPage + 1);
    }
  });
}

if (goToPageBtn) {
  goToPageBtn.addEventListener('click', () => {
    if (!searchState.currentQuery) return;
    
    const targetPage = parseInt(pageInput.value, 10);
    if (isNaN(targetPage) || targetPage < 1) {
      setStatus('请输入有效的页码（大于0的整数）', 'error');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    
    // If we know total pages, validate the target page
    if (searchState.meta.totalPages && targetPage > searchState.meta.totalPages) {
      setStatus(`页码不能超过总页数 ${searchState.meta.totalPages}`, 'error');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    
    // Don't search if we're already on this page
    if (targetPage === searchState.currentPage) {
      setStatus(`当前已经是第 ${targetPage} 页`, 'error');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    
    performSearch(searchState.currentQuery, targetPage);
  });
}

// Allow Enter key in page input
if (pageInput) {
  pageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      goToPageBtn.click();
    }
  });
}

// ============= COLLECTIONS EVENT LISTENERS =============

// Create new collection
if (createCollectionBtn) {
  createCollectionBtn.addEventListener('click', async () => {
    const name = prompt('请输入新收藏集名称：');
    if (!name || !name.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '创建失败');
      }
      setCollectionsStatus('收藏集已创建');
      setTimeout(() => setCollectionsStatus(''), 1800);
      collectionsState.needsRefresh = true;
      loadCollections({ force: true });
    } catch (error) {
      setCollectionsStatus(`创建失败：${error.message}`, 'error');
    }
  });
}

// Import CSV
if (importCSVBtn) {
  importCSVBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      let text;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch (e) {
        text = new TextDecoder('gbk').decode(buffer);
      }
      const utf8Blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const utf8File = new File([utf8Blob], file.name, { type: 'text/csv' });

      const id = collectionsState.currentCollectionId;
      const formData = new FormData();
      formData.append('file', utf8File);

      let url = `${API_BASE}/api/collections`;
      let statusFn = setCollectionsStatus;
      
      if (id) {
        url = `${API_BASE}/api/collections/${encodeURIComponent(id)}/import`;
        statusFn = setCollectionDetailStatus;
      } else {
        const name = prompt('请输入收藏集名称（留空使用文件名）：') || file.name.replace(/\.csv$/i, '') || '导入的集合';
        formData.append('name', name.trim());
      }

      statusFn('正在导入CSV…');

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || '导入失败');
        }
        const data = await response.json();
        statusFn(`已成功导入 ${data.count || data.collection?.itemCount || 0} 个条目`);
        setTimeout(() => statusFn(''), 3000);
        
        if (id) {
          loadCollectionDetail();
        } else {
          collectionsState.needsRefresh = true;
          loadCollections({ force: true });
        }
      } catch (error) {
        statusFn(`导入失败：${error.message}`, 'error');
      }
    });
    input.click();
  });
}

// Back to collections list
if (backToCollectionsBtn) {
  backToCollectionsBtn.addEventListener('click', () => {
    collectionsListView.style.display = 'block';
    collectionDetailView.style.display = 'none';
    collectionsState.currentCollectionId = null;
    collectionsState.currentCollection = null;
    collectionItemsEl.innerHTML = '';
    setCollectionDetailStatus('');
  });
}

// Delete current collection from detail view
if (deleteCollectionBtn) {
  deleteCollectionBtn.addEventListener('click', async () => {
    const id = collectionsState.currentCollectionId;
    if (!id) return;
    const name = collectionsState.currentCollection?.meta?.name || '此收藏集';
    if (!confirm(`确定要删除「${name}」吗？`)) return;

    try {
      const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '删除失败');
      }
      // Go back to list
      backToCollectionsBtn.click();
      setCollectionsStatus('收藏集已删除');
      setTimeout(() => setCollectionsStatus(''), 1800);
      collectionsState.needsRefresh = true;
      loadCollections({ force: true });
    } catch (error) {
      setCollectionDetailStatus(`删除失败：${error.message}`, 'error');
    }
  });
}

// Search within collection
if (collectionSearchInput) {
  let searchTimeout;
  collectionSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      collectionsState.searchQuery = collectionSearchInput.value.trim();
      collectionsState.detailPage = 1;
      loadCollectionDetail();
    }, 300);
  });
}

// Star filter
if (collectionStarFilter) {
  collectionStarFilter.addEventListener('change', () => {
    collectionsState.starFilter = collectionStarFilter.checked;
    collectionsState.detailPage = 1;
    loadCollectionDetail();
  });
}

// Collection pagination
if (collPrevPageBtn) {
  collPrevPageBtn.addEventListener('click', () => {
    if (collectionsState.detailPage > 1) {
      collectionsState.detailPage--;
      loadCollectionDetail();
    }
  });
}

if (collNextPageBtn) {
  collNextPageBtn.addEventListener('click', () => {
    collectionsState.detailPage++;
    loadCollectionDetail();
  });
}

// Add item modal event listeners
if (addItemBtn) {
  addItemBtn.addEventListener('click', openAddItemModal);
}

if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeAddItemModal);
}

addItemModal.addEventListener('click', (e) => {
  if (e.target === addItemModal) closeAddItemModal();
});

modalTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    modalTabs.forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    const target = tab.dataset.tab;
    modalTabContents.forEach(c => {
      c.hidden = c.id !== `${target}Tab`;
    });
  });
});

singleAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(singleAddForm);
  const data = Object.fromEntries(formData.entries());
  
  if (!data.magnet || !data.magnet.trim()) return;
  
  const id = collectionsState.currentCollectionId;
  if (!id) return;

  try {
    const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(id)}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || '添加失败');
    }
    
    closeAddItemModal();
    loadCollectionDetail();
    setCollectionDetailStatus('条目已添加');
    setTimeout(() => setCollectionDetailStatus(''), 2000);
  } catch (error) {
    alert(`添加失败：${error.message}`);
  }
});

batchAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(batchAddForm);
  const magnetsRaw = formData.get('magnets');
  if (!magnetsRaw) return;
  
  const magnets = magnetsRaw.split('\n')
    .map(m => m.trim())
    .filter(m => m.startsWith('magnet:?'));
  
  if (magnets.length === 0) {
    alert('请提供有效的磁力链接。');
    return;
  }
  
  const items = magnets.map(m => ({ magnet: m }));
  const id = collectionsState.currentCollectionId;
  if (!id) return;

  try {
    const response = await fetch(`${API_BASE}/api/collections/${encodeURIComponent(id)}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || '批量添加失败');
    }
    
    closeAddItemModal();
    loadCollectionDetail();
    setCollectionDetailStatus(`已成功添加 ${magnets.length} 个条目`);
    setTimeout(() => setCollectionDetailStatus(''), 3000);
  } catch (error) {
    alert(`批量添加失败：${error.message}`);
  }
});

// Batch actions
if (batchDeleteBtn) {
  batchDeleteBtn.addEventListener('click', performBatchDelete);
}

if (cancelSelectionBtn) {
  cancelSelectionBtn.addEventListener('click', () => {
    collectionsState.selectedMagnets.clear();
    updateBatchActionsBar();
    loadCollectionDetail();
  });
}

setView('home');
fetchAdapters();

console.info('[magnet-search] 当前后端 API 地址：%s', API_BASE);
console.info('[magnet-search] 如需更换后端地址，可执行 localStorage.setItem("%s", "http://localhost:3001") 后刷新页面。', STORAGE_KEYS.apiBase);
