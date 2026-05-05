interface CacheItem {
    data: any;
    expiry: number;
  }
  
  // Our temporary memory bank
  const cache = new Map<string, CacheItem>();
  
  export const setCache = (key: string, data: any, ttlSeconds: number) => {
    const expiry = Date.now() + ttlSeconds * 1000;
    cache.set(key, { data, expiry });
  };
  
  export const getCache = (key: string) => {
    const item = cache.get(key);
    if (!item) return null;
  
    // If the time limit passed, delete it and return nothing
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
  
    return item.data;
  };
  
  // We will use this later to delete old cache when a new review/booking is made
  export const clearCachePrefix = (prefix: string) => {
    for (const key of cache.keys()) {
      if (key.includes(prefix)) {
        cache.delete(key);
      }
    }
  };