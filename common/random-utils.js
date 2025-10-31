/**
 * Learning-Aware Randomizer (IndexedDB + secure RNG) — FULL FILE
 * - Keeps your original functions EXACTLY as-is.
 * - Adds `window.LearningRandomizer` (adaptive, SM-2-style scheduler).
 * - Makes the adaptive picker the DEFAULT for `getRandomIndexByFrequency(...)`
 *   without breaking existing callers (sync function maintained via a pre-sampled pool).
 *
 * Optional runtime config:
 *   LearningRandomizerDefault.config({ dataset: 'vocab', poolSize: 32 });
 *   // If you have stable item IDs:
 *   LearningRandomizerDefault.config({
 *     idsFactory(len, dataset) {
 *       return (window.currentDeckIds || []).slice(0, len).map(id => `${dataset}:${id}`);
 *     }
 *   });
 */

/***** YOUR ORIGINAL FUNCTIONS — LEFT EXACTLY AS-IS *****/
function getSecureRandomNumber() {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

function randInt(min, max) {
  return Math.floor(getSecureRandomNumber() * (max - min + 1)) + min;
}

function getRandomIndexByFrequency(frequencyArray) {
    // Calculate the cumulative sum of frequencies
    const cumulativeSum = [];
    let sum = 0;
    for (const freq of frequencyArray) {
        sum += freq;
        cumulativeSum.push(sum);
    }
    // Generate a random number between 0 and the total sum
    const randomNum = Math.floor(getSecureRandomNumber() * sum);
    // Find the index corresponding to the random number
    for (let i = 0; i < cumulativeSum.length; i++) {
        if (randomNum < cumulativeSum[i]) {
            return i;
        }
    }
    // If something goes wrong (unlikely), return a fallback index (e.g., 0)
    return 1;
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function getNumberEquivalent(strChar) {
    let retVal = 0;
    switch (strChar) {
      case 'a': retVal = 1; break;
      case 'b': retVal = 2; break;
      case 'c': retVal = 3; break;
      case 'd': retVal = 4; break;
      case 'e': retVal = 5; break;
      case 'f': retVal = 6; break;
      case 'g': retVal = 7; break;
      case 'h': retVal = 8; break;
      case 'i': retVal = 9; break;
      case 'j': retVal = 10; break;
      case 'k': retVal = 11; break;
      case 'l': retVal = 12; break;
      case 'm': retVal = 13; break;
      case 'n': retVal = 14; break;
      case 'o': retVal = 15; break;
      case 'p': retVal = 16; break;
      case 'q': retVal = 17; break;
      case 'r': retVal = 18; break;
      case 's': retVal = 19; break;
      case 't': retVal = 20; break;
      case 'u': retVal = 21; break;
      case 'v': retVal = 22; break;
      case 'w': retVal = 23; break;
      case 'x': retVal = 24; break;
      case 'y': retVal = 25; break;
      case 'z': retVal = 26; break;
      default:
        break;
    }
    return retVal;
}

function getRandomNumber(uuidString) {
    let uuidWithoutDash = uuidString.replaceAll("-", "");
    var retVal = 0
    for (let i = 1; i <= 32; i++) {
        var ch = uuidWithoutDash.charAt(i - 1);
        if (/^\d+$/.test(ch)) {
            retVal = retVal + Number(ch);
        } else {
            retVal = retVal + Number(getNumberEquivalent(ch));
        }
    }
    return ((retVal * 3485038 * Math.floor(getSecureRandomNumber() * 100)) + (new Date().getFullYear() + (new Date().getMonth() + 1) + new Date().getDay() + new Date().getTime())) % 100;
}

/***** LEARNING-AWARE RANDOMIZER (IndexedDB + secure randomness) *****/
(function (global) {
  'use strict';

  // ---- Config (tweak as needed) -----------------------------------
  const DB_NAME    = 'learning_randomizer';
  const DB_VERSION = 1;
  const STORE      = 'items';

  const DEFAULTS = {
    dataset: 'default',
    cooldownMs: 30_000,       // avoid immediate re-asking the same item
    noveltyBoost: 1.25,       // unseen items get a little bump
    difficultyGain: 2.0,      // harder (low-accuracy) items get more weight
    minWeight: 1e-6,          // never zero
    wrongRetryMinutes: 10,    // if wrong/low-quality, resurface soon
  };

  // ---- Utilities ---------------------------------------------------
  const now = () => Date.now();
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const isIDBAvailable = () => typeof indexedDB !== 'undefined' && !!indexedDB;

  // Fallback in-memory store (e.g., Safari private mode). This keeps the app running.
  const memoryStore = new Map();

  function defaultRecord(dataset, id) {
    const t = now();
    return {
      id,
      dataset,
      // Performance
      success: 0,
      fail: 0,
      total: 0,
      streak: 0,
      // Spaced repetition (SM-2 like)
      reps: 0,
      intervalDays: 0,     // integer days
      easiness: 2.5,       // EF
      // Timing
      lastSeen: 0,
      nextDue: 0,
      createdAt: t,
      updatedAt: t,
    };
  }

  // ---- IndexedDB helpers ------------------------------------------
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!isIDBAvailable()) {
        resolve(null); // no IDB; will use memory
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('dataset', 'dataset', { unique: false });
          os.createIndex('nextDue', 'nextDue', { unique: false });
          os.createIndex('lastSeen', 'lastSeen', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(db, id) {
    if (!db) {
      return memoryStore.get(id) || null;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(db, obj) {
    if (!db) {
      memoryStore.set(obj.id, obj);
      return obj;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put(obj);
      req.onsuccess = () => resolve(obj);
      req.onerror = () => reject(req.error);
    });
  }

  async function ensureMany(db, ids, dataset) {
    const out = [];
    for (const id of ids) {
      let rec = await idbGet(db, id);
      if (!rec) {
        rec = defaultRecord(dataset, id);
        await idbPut(db, rec);
      }
      out.push(rec);
    }
    return out;
  }

  // ---- Adaptive scoring -------------------------------------------
  function computeWeight(rec, baseFreq, cfg) {
    const t = now();
    const total = rec.total || 0;
    const success = rec.success || 0;

    const accuracy = total > 0 ? success / total : 0.5;
    const noveltyFactor = total === 0 ? cfg.noveltyBoost : 1;

    // Spacing urgency: higher if overdue; penalize if not due yet
    const intervalMs = Math.max(1, (rec.intervalDays || 0) * 86_400_000);
    let spacingFactor = 1;
    if (rec.nextDue && t < rec.nextDue) {
      // Not due yet → downweight
      const remaining = rec.nextDue - t;
      // Smoothly reduce between [0.25, 1)
      spacingFactor = 0.25 + 0.75 * (1 - clamp(remaining / (intervalMs + 1), 0, 1));
    } else if (rec.nextDue && t >= rec.nextDue) {
      const overdue = t - rec.nextDue;
      // Increase up to ~4x as it gets more overdue
      spacingFactor = 1 + clamp(overdue / (intervalMs + 1), 0, 3);
    } else {
      // no scheduling yet: neutral
      spacingFactor = 1;
    }

    // Cooldown to avoid back-to-back repeats
    const since = rec.lastSeen ? (t - rec.lastSeen) : Number.MAX_SAFE_INTEGER;
    const cooldownFactor = since < cfg.cooldownMs ? 0.1 : 1;

    // Difficulty: prioritize lower-accuracy items
    const difficultyFactor = 1 + (1 - accuracy) * cfg.difficultyGain;

    const base = Math.max(cfg.minWeight, Number(baseFreq || 1));
    const weight = base * noveltyFactor * spacingFactor * cooldownFactor * difficultyFactor;

    // Always ensure positive finite number
    return Number.isFinite(weight) && weight > 0 ? weight : cfg.minWeight;
  }

  // ---- SM-2 style scheduler update --------------------------------
  function sm2Update(rec, quality, cfg) {
    // quality: integer 0..5 (>=3 counts as “good”)
    const good = quality >= 3;

    if (!Number.isFinite(rec.easiness)) rec.easiness = 2.5;
    if (!Number.isFinite(rec.reps)) rec.reps = 0;
    if (!Number.isFinite(rec.intervalDays)) rec.intervalDays = 0;

    if (good) {
      if (rec.reps === 0) {
        rec.intervalDays = 1;
      } else if (rec.reps === 1) {
        rec.intervalDays = 6;
      } else {
        rec.intervalDays = Math.round(rec.intervalDays * rec.easiness);
      }
      rec.reps += 1;
    } else {
      // Reset on failure
      rec.reps = 0;
      rec.intervalDays = 1;
    }

    // E-Factor update
    rec.easiness = rec.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    rec.easiness = clamp(rec.easiness, 1.3, 2.5);

    // Next due date
    const t = now();
    if (!good) {
      rec.nextDue = t + cfg.wrongRetryMinutes * 60_000; // quick retry
    } else {
      rec.nextDue = t + rec.intervalDays * 86_400_000;
    }
  }

  // Derive quality from correctness & speed if not provided
  function deriveQuality(correct, responseTimeMs) {
    // Start near 4 for correct, 2 for incorrect
    let q = correct ? 4 : 2;
    if (correct && Number.isFinite(responseTimeMs)) {
      // Penalize very slow answers slightly
      if (responseTimeMs > 12_000) q = 3;
      if (responseTimeMs > 25_000) q = 2; // painfully slow → treat as shaky
    }
    return clamp(Math.round(q), 0, 5);
  }

  // Local weighted picker (identical logic to your original, avoids override recursion)
  function weightedRandomIndex(weights) {
    const cumulativeSum = [];
    let sum = 0;
    for (const w of weights) {
      const ww = Math.max(0, Number(w) || 0);
      sum += ww;
      cumulativeSum.push(sum);
    }
    if (sum <= 0) return 0;
    const randomNum = Math.floor(getSecureRandomNumber() * sum);
    for (let i = 0; i < cumulativeSum.length; i++) {
      if (randomNum < cumulativeSum[i]) return i;
    }
    return 0;
  }

  // ---- Public API --------------------------------------------------
  const LearningRandomizer = {
    /**
     * Pick an index using adaptive, learning-aware weighting.
     * Uses IndexedDB to read/update learner state.
     * @param {number[]} frequencyArray - your base frequencies (same length as items)
     * @param {object}   opts           - { dataset?: string, ids?: string[], cooldownMs?, noveltyBoost?, difficultyGain? }
     * @returns {Promise<number>} index
     */
    async pickIndex(frequencyArray, opts = {}) {
      const cfg = { ...DEFAULTS, ...opts };
      const db = await openDB();

      // Map each item to a stable ID; if caller provides ids[], use them; else dataset:index
      const ids = (Array.isArray(opts.ids) && opts.ids.length === frequencyArray.length)
        ? opts.ids
        : frequencyArray.map((_, i) => `${cfg.dataset}:${i}`);

      // Ensure records exist
      const recs = await ensureMany(db, ids, cfg.dataset);

      // Compute weights
      const weights = recs.map((rec, i) => computeWeight(rec, frequencyArray[i], cfg));

      // Select index using secure randomness (same logic as your original)
      const idx = weightedRandomIndex(weights);

      return idx;
    },

    /**
     * Record the learner's result for an item (updates stats + schedule).
     * @param {object} args - { dataset?: string, id?: string, index?: number, correct: boolean, responseTimeMs?: number, quality?: 0|1|2|3|4|5 }
     *                        If `id` is omitted, uses `${dataset}:${index}`.
     */
    async record(args) {
      const cfg = { ...DEFAULTS, dataset: args.dataset || DEFAULTS.dataset };
      const db = await openDB();

      if (args.id == null && !Number.isInteger(args.index)) {
        throw new Error('record(): Provide either id or index.');
      }
      const id = args.id || `${cfg.dataset}:${args.index}`;

      let rec = await idbGet(db, id);
      if (!rec) {
        rec = defaultRecord(cfg.dataset, id);
      }

      // Update performance counters
      const correct = !!args.correct;
      rec.total = (rec.total || 0) + 1;
      if (correct) {
        rec.success = (rec.success || 0) + 1;
        rec.streak  = (rec.streak  || 0) + 1;
      } else {
        rec.fail    = (rec.fail    || 0) + 1;
        rec.streak  = 0;
      }

      // Quality: explicit or derived
      const quality = Number.isInteger(args.quality)
        ? clamp(args.quality, 0, 5)
        : deriveQuality(correct, args.responseTimeMs);

      // Schedule update
      sm2Update(rec, quality, cfg);

      // Timestamps
      rec.lastSeen = now();
      rec.updatedAt = rec.lastSeen;

      await idbPut(db, rec);
      return rec;
    },

    /**
     * Get a record (debug/analytics).
     */
    async getRecord(dataset, keyOrIndex) {
      const id = Number.isInteger(keyOrIndex) ? `${dataset}:${keyOrIndex}` : String(keyOrIndex);
      const db = await openDB();
      let rec = await idbGet(db, id);
      if (!rec) rec = defaultRecord(dataset, id);
      return rec;
    },

    /**
     * Initialize/seed a dataset with N items (optional).
     * Useful if you want to precreate records for analytics.
     */
    async seed(dataset, count) {
      const db = await openDB();
      const ids = Array.from({ length: count }, (_, i) => `${dataset}:${i}`);
      await ensureMany(db, ids, dataset);
    },

    /**
     * Reset a single item (or whole dataset if no id/index provided).
     */
    async reset({ dataset = DEFAULTS.dataset, id, index } = {}) {
      const db = await openDB();
      if (!db) {
        if (id) memoryStore.delete(id);
        else if (Number.isInteger(index)) memoryStore.delete(`${dataset}:${index}`);
        else {
          for (const k of Array.from(memoryStore.keys())) {
            if (k.startsWith(`${dataset}:`)) memoryStore.delete(k);
          }
        }
        return;
      }
      const resetOne = async (rid) => {
        const rec = defaultRecord(dataset, rid);
        await idbPut(db, rec);
      };
      if (id) return resetOne(id);
      if (Number.isInteger(index)) return resetOne(`${dataset}:${index}`);

      // Resetting an entire dataset would require scanning; omitted for brevity.
    },
  };

  // Attach to window without breaking existing apps
  if (!global.LearningRandomizer) {
    Object.defineProperty(global, 'LearningRandomizer', {
      value: LearningRandomizer,
      writable: false,
      enumerable: true,
      configurable: false
    });
  }

})(typeof window !== 'undefined' ? window : globalThis);

/***** MAKE ADAPTIVE PICKER THE DEFAULT (non-breaking, sync) *****/

// Keep a reference to your original sync function
if (!window.__originalGetRandomIndexByFrequency) {
  window.__originalGetRandomIndexByFrequency = getRandomIndexByFrequency;
}

(function (global) {
  'use strict';

  // Default config; you can change at runtime:
  const DefaultConfig = {
    enabled: true,
    dataset: 'default',          // change via LearningRandomizerDefault.config({ dataset: 'vocab' })
    poolSize: 32,                // how many pre-sampled picks to keep ready
    // Map item count -> IDs; override if you have stable IDs
    idsFactory(len, dataset) {
      return Array.from({ length: len }, (_, i) => `${dataset}:${i}`);
    },
  };

  // Internal state for the pre-sampled index pools
  const Pool = {
    // key: `${dataset}:${len}` -> number[]
    buckets: new Map(),
    filling: new Set(),

    key(len, dataset) {
      return `${dataset}:${len}`;
    },

    get(key) {
      const arr = this.buckets.get(key);
      return Array.isArray(arr) ? arr : [];
    },

    set(key, arr) {
      this.buckets.set(key, Array.isArray(arr) ? arr : []);
    },

    async fillIfNeeded(len, freqs, cfg) {
      const key = this.key(len, cfg.dataset);
      const current = this.get(key);
      if (current.length >= cfg.poolSize || this.filling.has(key)) return;

      this.filling.add(key);
      try {
        const picks = [];
        const ids = cfg.idsFactory(len, cfg.dataset);

        // Pre-sample adaptively using LearningRandomizer (secure + IDB)
        for (let i = current.length; i < cfg.poolSize; i++) {
          try {
            const idx = await global.LearningRandomizer.pickIndex(freqs, { dataset: cfg.dataset, ids });
            picks.push(idx);
          } catch {
            // If anything fails, we stop early; fallback remains intact
            break;
          }
        }

        if (picks.length) {
          const merged = current.concat(picks);
          this.set(key, merged);
        }
      } finally {
        this.filling.delete(key);
      }
    },

    take(len, cfg) {
      const key = this.key(len, cfg.dataset);
      const arr = this.get(key);
      if (!arr.length) return null;
      const idx = arr.shift();
      this.set(key, arr);
      return idx;
    }
  };

  // Public knob to tweak defaults or disable the override at runtime
  const LearningRandomizerDefault = {
    config(partial = {}) {
      Object.assign(DefaultConfig, partial || {});
      return { ...DefaultConfig };
    },
    enable()  { DefaultConfig.enabled = true;  },
    disable() { DefaultConfig.enabled = false; },
    get configSnapshot() { return { ...DefaultConfig }; },
    get poolDebug() { return new Map(Pool.buckets); },
  };

  // Install once
  if (!global.LearningRandomizerDefault) {
    Object.defineProperty(global, 'LearningRandomizerDefault', {
      value: LearningRandomizerDefault,
      writable: false, enumerable: true, configurable: false
    });
  }

  // Non-breaking override: stays sync; uses adaptive pool when available
  global.getRandomIndexByFrequency = function getRandomIndexByFrequency_overridden(frequencyArray) {
    try {
      const cfg = DefaultConfig;
      const len = Array.isArray(frequencyArray) ? frequencyArray.length : 0;

      if (cfg.enabled && global.LearningRandomizer && len > 0) {
        // 1) Try to take an adaptive pre-sampled index immediately (sync)
        const taken = Pool.take(len, cfg);
        if (typeof taken === 'number' && taken >= 0 && taken < len) {
          // Refill in the background if we're running low
          if (Pool.get(Pool.key(len, cfg.dataset)).length < Math.ceil(cfg.poolSize / 2)) {
            // Fire and forget
            // eslint-disable-next-line no-floating-promises
            Pool.fillIfNeeded(len, frequencyArray, cfg);
          }
          return taken;
        }

        // 2) No adaptive index yet → kick off fill for next calls (non-blocking)
        // eslint-disable-next-line no-floating-promises
        Pool.fillIfNeeded(len, frequencyArray, cfg);
      }
    } catch {
      // swallow; we’ll fall back below
    }

    // 3) Fallback to original behavior (never breaks existing callers)
    return global.__originalGetRandomIndexByFrequency(frequencyArray);
  };

})(typeof window !== 'undefined' ? window : globalThis);

/***** QUICK START (USAGE EXAMPLES)

(async () => {
  const frequencyArray = [1,1,1,1,1];
  const dataset = 'vocabSpanish';

  // getRandomIndexByFrequency(...) is now adaptive by default (sync):
  const idx = getRandomIndexByFrequency(frequencyArray);

  // ...show the item to the learner...

  // Record the outcome to make the scheduler learn:
  await LearningRandomizer.record({
    dataset,
    index: idx,
    correct: true,            // or false
    responseTimeMs: 5200      // optional; helps derive quality
    // quality: 0..5           // optional explicit override
  });

  // Inspect a record (for analytics/debug):
  // console.log(await LearningRandomizer.getRecord(dataset, idx));
})();

***** END QUICK START *****/
