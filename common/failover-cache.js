/**
 * Failover Cache Utility
 * 
 * Provides instant fallback URLs when network/page loading is slow.
 * - Pre-caches 2 backup URLs for instant failover
 * - Automatic cache refresh when depleted
 * - Reasonable cache limits with auto-reset
 * - Works with any URL generation function
 * 
 * Usage:
 *   const cache = new FailoverCache('myPageId', () => generateMyURL());
 *   const url = await cache.getURL(); // Returns cached or fresh URL
 */

class FailoverCache {
  constructor(cacheId, urlGenerator, options = {}) {
    this.cacheId = cacheId;
    this.urlGenerator = urlGenerator;
    
    // Configuration
    this.cacheSize = options.cacheSize || 2; // Number of backup URLs
    this.maxTotalCached = options.maxTotalCached || 50; // Max URLs before reset
    this.resetThreshold = options.resetThreshold || 100; // Reset after N iterations
    
    // IndexedDB settings
    this.dbName = 'failover_cache_v1';
    this.dbVersion = 1;
    this.storeName = 'caches';
    
    // Timeout for slow loads
    this.slowLoadTimeout = options.slowLoadTimeout || 3000; // 3 seconds
  }

  /**
   * Open IndexedDB connection
   */
  async openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get cache data from IndexedDB
   */
  async getCache() {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(this.cacheId);
        
        req.onsuccess = () => {
          const data = req.result || {
            urls: [],
            totalGenerated: 0,
            lastReset: Date.now()
          };
          resolve(data);
        };
        
        req.onerror = () => resolve({
          urls: [],
          totalGenerated: 0,
          lastReset: Date.now()
        });
      });
    } catch (e) {
      return {
        urls: [],
        totalGenerated: 0,
        lastReset: Date.now()
      };
    }
  }

  /**
   * Save cache data to IndexedDB
   */
  async saveCache(data) {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(data, this.cacheId);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); // Fail silently
      });
    } catch (e) {
      // Fail silently
    }
  }

  /**
   * Generate and cache new URLs
   */
  async refillCache(cache) {
    cache.urls = cache.urls.slice(0, this.cacheSize);
    const needed = this.cacheSize - cache.urls.length;
    
    for (let i = 0; i < needed; i++) {
      try {
        const url = await this.urlGenerator();
        if (url && typeof url === 'string') {
          cache.urls.push(url);
          cache.totalGenerated++;
        }
      } catch (e) {
        console.error('Failed to generate URL:', e);
      }
    }
    
    return cache;
  }

  /**
   * Take one already-cached URL without waiting for a refill.
   */
  async takeCachedURLOnly() {
    const cache = await this.getCache();
    if (!cache.urls.length) {
      return null;
    }

    const url = cache.urls.shift();
    await this.saveCache(cache);

    if (cache.urls.length < this.cacheSize) {
      this.backgroundRefill();
    }

    return url;
  }

  /**
   * Check if cache needs reset (to keep browser lean)
   */
  shouldReset(cache) {
    // Reset if the cache has generated more URLs than this page should retain over time
    if (cache.totalGenerated >= this.maxTotalCached) {
      return true;
    }

    // Reset if too many iterations
    if (cache.totalGenerated >= this.resetThreshold) {
      return true;
    }
    
    // Reset if cache is too old (7 days)
    const age = Date.now() - cache.lastReset;
    if (age > 7 * 24 * 60 * 60 * 1000) {
      return true;
    }
    
    return false;
  }

  /**
   * Reset cache to keep browser lean
   */
  resetCache() {
    return {
      urls: [],
      totalGenerated: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Get a URL (from cache or generate new)
   * This is the main public method
   */
  async getURL() {
    try {
      let cache = await this.getCache();
      
      // Check if reset needed
      if (this.shouldReset(cache)) {
        console.log(`[FailoverCache] Resetting cache for ${this.cacheId}`);
        cache = this.resetCache();
      }
      
      // If cache is empty, refill it
      if (cache.urls.length === 0) {
        console.log(`[FailoverCache] Refilling cache for ${this.cacheId}`);
        cache = await this.refillCache(cache);
      }
      
      // Get URL from cache
      const url = cache.urls.shift();
      
      // Save updated cache
      await this.saveCache(cache);
      
      // Trigger background refill if cache is low
      if (cache.urls.length < this.cacheSize) {
        this.backgroundRefill();
      }
      
      return url;
      
    } catch (e) {
      console.error('[FailoverCache] Error:', e);
      // Fallback: generate URL directly
      return await this.urlGenerator();
    }
  }

  /**
   * Get a URL with a time budget. If IndexedDB or generation is slow,
   * try an already-cached URL before falling back to direct generation.
   */
  async getURLWithTimeout(timeoutMs) {
    const waitMs = Number.isFinite(Number(timeoutMs))
      ? Math.max(0, Number(timeoutMs))
      : this.slowLoadTimeout;

    if (waitMs <= 0) {
      return await this.getURL();
    }

    let timer = null;
    try {
      return await Promise.race([
        this.getURL(),
        new Promise((resolve, reject) => {
          timer = setTimeout(async () => {
            try {
              console.warn(`[FailoverCache] Timed out for ${this.cacheId}; using cached fallback`);
              resolve(await this.takeCachedURLOnly() || await this.urlGenerator());
            } catch (e) {
              reject(e);
            }
          }, waitMs);
        })
      ]);
    } finally {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Background refill (non-blocking)
   */
  async backgroundRefill() {
    try {
      let cache = await this.getCache();
      cache = await this.refillCache(cache);
      await this.saveCache(cache);
      console.log(`[FailoverCache] Background refill complete for ${this.cacheId}`);
    } catch (e) {
      console.error('[FailoverCache] Background refill failed:', e);
    }
  }

  /**
   * Pre-warm cache (call this on page load if you want)
   */
  async prewarm() {
    try {
      let cache = await this.getCache();
      
      if (cache.urls.length < this.cacheSize) {
        cache = await this.refillCache(cache);
        await this.saveCache(cache);
        console.log(`[FailoverCache] Pre-warmed cache for ${this.cacheId}`);
      }
    } catch (e) {
      console.error('[FailoverCache] Pre-warm failed:', e);
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  async getStats() {
    const cache = await this.getCache();
    return {
      cacheId: this.cacheId,
      cachedURLs: cache.urls.length,
      totalGenerated: cache.totalGenerated,
      lastReset: new Date(cache.lastReset).toISOString(),
      age: Math.floor((Date.now() - cache.lastReset) / 1000 / 60 / 60) + ' hours'
    };
  }

  /**
   * Clear cache (for debugging/testing)
   */
  async clear() {
    const cache = this.resetCache();
    await this.saveCache(cache);
    console.log(`[FailoverCache] Cleared cache for ${this.cacheId}`);
  }

  /**
   * Shared redirect helper for scheduler pages.
   */
  static redirect(cacheId, urlGenerator, options = {}) {
    const cache = new FailoverCache(cacheId, urlGenerator, {
      cacheSize: 2,
      maxTotalCached: 30,
      resetThreshold: 50,
      ...options
    });

    cache.prewarm().catch(e => console.error('Prewarm failed:', e));

    const redirect = options.redirect || function (target) {
      try {
        window.location.replace(target);
      } catch (e) {
        window.location.href = target;
      }
    };

    const onTarget = options.onTarget;
    const timeoutMs = options.slowLoadTimeout || cache.slowLoadTimeout;

    (async function () {
      let target = null;
      try {
        target = await cache.getURLWithTimeout(timeoutMs);
      } catch (e) {
        console.error('Failover failed, using direct generation:', e);
        target = await urlGenerator();
      }

      if (typeof onTarget === 'function') {
        try {
          onTarget(target);
        } catch (e) {}
      }

      redirect(target);
    })();

    return cache;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FailoverCache;
}

// Made with Bob
