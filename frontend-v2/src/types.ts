export interface Adapter {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  default?: boolean;
  fallback?: boolean;
}

export interface SearchResult {
  title: string;
  magnet: string;
  size?: number;
  sizeLabel?: string;
  seeders?: number;
  leechers?: number;
  uploaded?: string;
  category?: string;
  infoHash?: string;
  source?: string;
}

export interface SearchMeta {
  adapter?: string;
  adapterName?: string;
  currentPage?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  fallbackUsed?: boolean;
  fallbackAdapter?: string;
  fallbackAdapterName?: string;
  mode?: 'search' | 'magnet';
}

export interface SearchResponse {
  results: SearchResult[];
  meta: SearchMeta;
}

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: string;
  adapter: string;
  adapterName: string;
  resultsCount: number;
  results: SearchResult[];
}

export interface Collection {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem extends SearchResult {
  keywords?: string[];
  remarks?: string;
  starred?: boolean;
  addedAt: string;
}
