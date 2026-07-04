/**
 * Skyway Scheduler Utilities
 * Common functions used across skyway-scheduler files
 * 
 * Usage:
 *   <script src="common/skyway-scheduler-utils.js"></script>
 */

(function(global) {
  'use strict';

  const SkywayUtils = {
    
    /* ===== Cryptographic Random ===== */
    _rndBuf: new Uint32Array(1),
    
    /**
     * Generate a cryptographically secure random float between 0 and 1
     * @returns {number} Random float in range [0, 1)
     */
    secureRandomFloat01() {
      crypto.getRandomValues(this._rndBuf);
      return this._rndBuf[0] / 4294967296;
    },

    /* ===== Hashing ===== */
    
    /**
     * FNV-1a hash function (32-bit) returning hex string
     * @param {string} str - String to hash
     * @returns {string} 8-character hex hash
     */
    fnv1aHex(str) {
      let h = 0x811c9dc5 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      return ('00000000' + h.toString(16)).slice(-8);
    },

    /**
     * Convert byte array to hex string
     * @param {Uint8Array} bytes - Byte array
     * @returns {string} Hex string
     */
    hexFromBytes(bytes) {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /* ===== IndexedDB Helpers ===== */
    
    /**
     * Open an IndexedDB database
     * @param {string} dbName - Database name
     * @param {number} dbVersion - Database version
     * @param {Function} onUpgrade - Upgrade callback (db, event)
     * @returns {Promise<IDBDatabase>}
     */
    openDB(dbName, dbVersion, onUpgrade) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVersion);
        req.onupgradeneeded = (e) => {
          if (onUpgrade) onUpgrade(e.target.result, e);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * Get all records from a store
     * @param {IDBDatabase} db - Database instance
     * @param {string} storeName - Store name
     * @returns {Promise<Array>}
     */
    getAllFromStore(db, storeName) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * Get one record from a store
     * @param {IDBDatabase} db - Database instance
     * @param {string} storeName - Store name
     * @param {any} key - Record key
     * @returns {Promise<any>}
     */
    getOneFromStore(db, storeName, key) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },

    /**
     * Put multiple records into a store
     * @param {IDBDatabase} db - Database instance
     * @param {string} storeName - Store name
     * @param {Array} records - Records to put
     * @returns {Promise<boolean>}
     */
    putManyToStore(db, storeName, records) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        records.forEach(rec => store.put(rec));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    },

    /**
     * Get value from meta store
     * @param {IDBDatabase} db - Database instance
     * @param {string} metaStoreName - Meta store name
     * @param {string} key - Key to get
     * @returns {Promise<any>}
     */
    metaGet(db, metaStoreName, key) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(metaStoreName, 'readonly');
        const st = tx.objectStore(metaStoreName);
        const r = st.get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    },

    /**
     * Set value in meta store
     * @param {IDBDatabase} db - Database instance
     * @param {string} metaStoreName - Meta store name
     * @param {string} key - Key to set
     * @param {any} value - Value to set
     * @returns {Promise<boolean>}
     */
    metaSet(db, metaStoreName, key, value) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(metaStoreName, 'readwrite');
        const st = tx.objectStore(metaStoreName);
        const r = st.put(value, key);
        r.onsuccess = () => resolve(true);
        r.onerror = () => reject(r.error);
      });
    },

    /* ===== Weighted Choice ===== */
    
    /**
     * Choose an item from a weighted list
     * Items should have baseWeight and delta properties
     * @param {Array} items - Items with weights
     * @returns {any} Chosen item
     */
    chooseWeighted(items) {
      let total = 0;
      for (const it of items) {
        const base = Number(it.baseWeight || 0) || 0;
        const dlt = Number(it.delta || 0) || 0;
        const w = Math.max(0, base + dlt);
        it.effectiveWeight = w;
        total += w;
      }
      
      if (total <= 0) {
        // Fallback to base weights only
        total = items.reduce((s, it) => s + (Number(it.baseWeight || 0) || 0), 0) || 1;
        let threshold = this.secureRandomFloat01() * total;
        let acc = 0;
        for (const it of items) {
          acc += (Number(it.baseWeight || 0) || 0);
          if (threshold < acc) return it;
        }
        return items[0];
      }
      
      let threshold = this.secureRandomFloat01() * total;
      let acc = 0;
      for (const it of items) {
        acc += it.effectiveWeight;
        if (threshold < acc) return it;
      }
      return items[0];
    },

    /* ===== Download Functions ===== */
    
    /**
     * Download data as JSON file
     * @param {string} filename - Filename
     * @param {Object} obj - Object to download
     */
    downloadJSON(filename, obj) {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    /**
     * Download text as file
     * @param {string} filename - Filename
     * @param {string} text - Text content
     */
    downloadText(filename, text) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    /**
     * Download current HTML page
     * @param {string} filename - Filename
     */
    downloadHTML(filename) {
      try {
        const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Download HTML failed:', e);
      }
    },

    /* ===== Date/Time Formatting ===== */
    
    /**
     * Format current date/time as YYYYMMDD-HHMM
     * @returns {string} Formatted timestamp
     */
    fmtDateStamp() {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    },

    /* ===== URL Validation ===== */
    
    /**
     * Check if string is a valid HTTP(S) URL
     * @param {string} str - String to check
     * @returns {boolean}
     */
    isValidHttpUrl(str) {
      try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },

    /**
     * Extract domain from URL
     * @param {string} url - URL string
     * @returns {string} Domain or empty string
     */
    domainOf(url) {
      try {
        return new URL(url).hostname || '';
      } catch {
        return '';
      }
    },

    /* ===== Math Utilities ===== */
    
    /**
     * Clamp value between min and max
     * @param {number} x - Value to clamp
     * @param {number} lo - Minimum
     * @param {number} hi - Maximum
     * @returns {number}
     */
    clamp(x, lo, hi) {
      return Math.max(lo, Math.min(hi, x));
    },

    /* ===== JSON Parsing ===== */
    
    /**
     * Safely parse JSON with fallback cleanup
     * @param {string} raw - Raw JSON string
     * @returns {Object} Parsed object or {items: []}
     */
    safeParseSeed(raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Try cleaning trailing commas and comments
        const cleaned = raw.replace(/,\s*([\]}])/g, '$1').replace(/\/\/.*$/gm, '');
        try {
          return JSON.parse(cleaned);
        } catch {
          return { items: [] };
        }
      }
    },

    /**
     * Create canonical string representation of seed for hashing
     * @param {Object} seed - Seed object with items array
     * @returns {string} Canonical JSON string
     */
    canonicalSeedString(seed) {
      const items = Array.isArray(seed?.items) ? seed.items.slice() : [];
      items.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
      const canon = {
        items: items.map(it => ({
          url: String(it.url || ''),
          probabilityWeight: Number(it.probabilityWeight || 0)
        }))
      };
      return JSON.stringify(canon);
    }
  };

  // Export to global scope
  global.SkywayUtils = SkywayUtils;

})(typeof window !== 'undefined' ? window : global);

// Made with Bob
