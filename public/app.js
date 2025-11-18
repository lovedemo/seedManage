const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const serviceNameEl = document.getElementById('serviceName');
const cardTemplate = document.getElementById('cardTemplate');
const searchButton = document.getElementById('searchButton');

const formatNumber = (value) => {
  if (value === null || value === undefined) return '未知';
  const number = Number(value);
  if (Number.isNaN(number)) return '未知';
  if (number > 1000) {
    return `${number.toLocaleString()} (${Math.round((number / 1000) * 10) / 10}K)`;
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

const renderResults = (items = [], meta = {}) => {
  resultsEl.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'status';
    empty.textContent = '未找到匹配的结果，请尝试更换关键字。';
    resultsEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = cardTemplate.content.cloneNode(true);
    const article = card.querySelector('.result-card');
    const titleEl = card.querySelector('.card-title');
    const badgeEl = card.querySelector('.card-badge');
    const metaEl = card.querySelector('.card-meta');
    const actionEl = card.querySelector('.card-action');

    titleEl.textContent = item.title || '未命名资源';
    badgeEl.textContent = item.category || (meta.mode === 'magnet' ? '磁力链接' : '未知类别');

    const metaEntries = [];

    if (item.sizeLabel || item.size) {
      metaEntries.push(['大小', item.sizeLabel || `${item.size} B`]);
    }

    if (item.seeders !== null || item.leechers !== null) {
      const seeders = item.seeders !== null ? formatNumber(item.seeders) : '未知';
      const leechers = item.leechers !== null ? formatNumber(item.leechers) : '未知';
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

    metaEntries.push(['来源', item.source || (meta.fallbackUsed ? '本地数据' : '远程服务')]);

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
        setTimeout(() => setStatus(''), 2000);
      } catch (error) {
        window.open(magnet, '_blank');
      }
    });

    fragment.appendChild(card);
  });

  resultsEl.appendChild(fragment);
};

const updateFooterInfo = async () => {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('无法获取服务信息');
    const data = await response.json();
    serviceNameEl.textContent = data.remoteEndpoint || '未配置';
  } catch (error) {
    serviceNameEl.textContent = '未知服务';
  }
};

const performSearch = async (query) => {
  setStatus('正在搜索，请稍候…');
  resultsEl.innerHTML = '';
  searchButton.disabled = true;
  input.setAttribute('aria-busy', 'true');

  try {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || '搜索失败，请稍后再试。');
    }

    const data = await response.json();
    renderResults(data.results, data.meta || {});

    if (data.meta?.fallbackUsed && data.meta?.remoteError) {
      setStatus(`远程服务不可用，已使用本地数据。(${data.meta.remoteError})`, 'error');
    } else if (data.meta?.mode === 'magnet') {
      setStatus('已生成磁力卡片，可复制链接');
    } else if (data.results?.length) {
      setStatus(`共获取 ${data.results.length} 条结果。`);
    } else {
      setStatus('未找到结果。', 'error');
    }
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    searchButton.disabled = false;
    input.removeAttribute('aria-busy');
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  performSearch(query);
});

updateFooterInfo();
