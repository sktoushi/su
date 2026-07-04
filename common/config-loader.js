/**
 * Config Loader Utility
 * Centralized configuration loading with caching and validation
 * 
 * Features:
 * - In-memory caching with TTL
 * - Schema validation
 * - Error handling and fallbacks
 * - Cache invalidation
 * - Batch loading
 * 
 * Usage:
 *   <script src="common/config-loader.js"></script>
 *   
 *   // Load a single config
 *   const allConfig = await ConfigLoader.load('all');
 *   
 *   // Load multiple configs
 *   const configs = await ConfigLoader.loadMultiple(['all', 'values']);
 *   
 *   // Clear cache
 *   ConfigLoader.clearCache('all');
 */

(function(global) {
  'use strict';

  const ConfigLoader = {
    // Configuration
    CONFIG_BASE_PATH: 'config/',
    CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour default
    
    // Cache storage
    _cache: new Map(),
    _cacheTimestamps: new Map(),
    
    // Known config files and their schemas
    _configSchemas: {
      'all': {
        file: 'all.json',
        requiredFields: ['repositories3x'],
        optionalFields: ['repositories', 'repositories2x', 'formulas', 'skyway']
      },
      'allrecent': {
        file: 'allrecent.json',
        requiredFields: ['repositories'],
        optionalFields: []
      },
      'allrecent100': {
        file: 'allrecent100.json',
        requiredFields: ['repositories'],
        optionalFields: []
      },
      'values': {
        file: 'values.json',
        requiredFields: ['base'],
        optionalFields: []
      }
    },

    /**
     * Load a configuration file
     * @param {string} configName - Name of config (e.g., 'all', 'values')
     * @param {Object} options - Loading options
     * @param {boolean} options.skipCache - Skip cache and force reload
     * @param {number} options.cacheTTL - Custom cache TTL in milliseconds
     * @param {boolean} options.validate - Validate against schema (default: true)
     * @returns {Promise<Object>} Parsed configuration object
     */
    async load(configName, options = {}) {
      const {
        skipCache = false,
        cacheTTL = this.CACHE_TTL_MS,
        validate = true
      } = options;

      // Check cache first
      if (!skipCache && this._isCacheValid(configName, cacheTTL)) {
        return this._cache.get(configName);
      }

      try {
        // Get schema info
        const schema = this._configSchemas[configName];
        if (!schema) {
          throw new Error(`Unknown config: ${configName}. Known configs: ${Object.keys(this._configSchemas).join(', ')}`);
        }

        // Fetch the config file
        const url = this.CONFIG_BASE_PATH + schema.file;
        const response = await fetch(url, {
          cache: skipCache ? 'no-store' : 'default'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const config = await response.json();

        // Validate if requested
        if (validate) {
          this._validateConfig(configName, config, schema);
        }

        // Cache the result
        this._cache.set(configName, config);
        this._cacheTimestamps.set(configName, Date.now());

        return config;
      } catch (error) {
        console.error(`ConfigLoader: Failed to load ${configName}:`, error);
        
        // Return cached version if available, even if expired
        if (this._cache.has(configName)) {
          console.warn(`ConfigLoader: Returning stale cache for ${configName}`);
          return this._cache.get(configName);
        }
        
        throw error;
      }
    },

    /**
     * Load multiple configuration files in parallel
     * @param {Array<string>} configNames - Array of config names
     * @param {Object} options - Loading options (applied to all)
     * @returns {Promise<Object>} Object with config names as keys
     */
    async loadMultiple(configNames, options = {}) {
      const promises = configNames.map(name => 
        this.load(name, options)
          .then(config => ({ name, config, error: null }))
          .catch(error => ({ name, config: null, error }))
      );

      const results = await Promise.all(promises);
      
      const configs = {};
      const errors = [];

      for (const result of results) {
        if (result.error) {
          errors.push({ name: result.name, error: result.error });
        } else {
          configs[result.name] = result.config;
        }
      }

      if (errors.length > 0) {
        console.warn('ConfigLoader: Some configs failed to load:', errors);
      }

      return configs;
    },

    /**
     * Preload configurations (useful for performance)
     * @param {Array<string>} configNames - Configs to preload
     * @returns {Promise<void>}
     */
    async preload(configNames) {
      try {
        await this.loadMultiple(configNames);
      } catch (error) {
        console.warn('ConfigLoader: Preload failed:', error);
      }
    },

    /**
     * Check if cached config is still valid
     * @param {string} configName - Config name
     * @param {number} ttl - Time to live in milliseconds
     * @returns {boolean}
     */
    _isCacheValid(configName, ttl) {
      if (!this._cache.has(configName)) {
        return false;
      }

      const timestamp = this._cacheTimestamps.get(configName);
      if (!timestamp) {
        return false;
      }

      return (Date.now() - timestamp) < ttl;
    },

    /**
     * Validate configuration against schema
     * @param {string} configName - Config name
     * @param {Object} config - Config object to validate
     * @param {Object} schema - Schema definition
     * @throws {Error} If validation fails
     */
    _validateConfig(configName, config, schema) {
      if (!config || typeof config !== 'object') {
        throw new Error(`Invalid config: ${configName} is not an object`);
      }

      // Check required fields
      for (const field of schema.requiredFields) {
        if (!(field in config)) {
          throw new Error(`Invalid config: ${configName} missing required field "${field}"`);
        }
      }

      // Validate specific structures
      if (configName === 'all') {
        this._validateAllConfig(config);
      } else if (configName === 'values') {
        this._validateValuesConfig(config);
      }
    },

    /**
     * Validate all.json structure
     * @param {Object} config - Config object
     */
    _validateAllConfig(config) {
      const repoSections = ['repositories', 'repositories2x', 'repositories3x'];
      
      for (const section of repoSections) {
        if (config[section]) {
          if (typeof config[section] !== 'object') {
            throw new Error(`Invalid all.json: ${section} must be an object`);
          }

          // Validate each repository
          for (const [repoName, repoData] of Object.entries(config[section])) {
            if (!repoData.username) {
              throw new Error(`Invalid all.json: ${section}.${repoName} missing username`);
            }
            if (!Number.isFinite(repoData.issueStartNumber)) {
              throw new Error(`Invalid all.json: ${section}.${repoName} missing or invalid issueStartNumber`);
            }
            if (!Number.isFinite(repoData.issueEndNumber)) {
              throw new Error(`Invalid all.json: ${section}.${repoName} missing or invalid issueEndNumber`);
            }
          }
        }
      }
    },

    /**
     * Validate values.json structure
     * @param {Object} config - Config object
     */
    _validateValuesConfig(config) {
      if (!config.base || typeof config.base !== 'object') {
        throw new Error('Invalid values.json: base must be an object');
      }

      // Check for common required fields
      const commonFields = ['progressCurrentValueFormula', 'progressTargetValueFormula'];
      for (const field of commonFields) {
        if (!(field in config.base)) {
          console.warn(`values.json: Missing common field "${field}"`);
        }
      }
    },

    /**
     * Clear cache for a specific config or all configs
     * @param {string} [configName] - Config name to clear, or undefined for all
     */
    clearCache(configName) {
      if (configName) {
        this._cache.delete(configName);
        this._cacheTimestamps.delete(configName);
      } else {
        this._cache.clear();
        this._cacheTimestamps.clear();
      }
    },

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
      const stats = {
        size: this._cache.size,
        configs: []
      };

      for (const [name, timestamp] of this._cacheTimestamps.entries()) {
        const age = Date.now() - timestamp;
        stats.configs.push({
          name,
          age,
          ageMinutes: Math.round(age / 60000),
          valid: age < this.CACHE_TTL_MS
        });
      }

      return stats;
    },

    /**
     * Register a custom config schema
     * @param {string} configName - Config name
     * @param {Object} schema - Schema definition
     */
    registerSchema(configName, schema) {
      if (!schema.file) {
        throw new Error('Schema must have a file property');
      }
      if (!Array.isArray(schema.requiredFields)) {
        schema.requiredFields = [];
      }
      if (!Array.isArray(schema.optionalFields)) {
        schema.optionalFields = [];
      }

      this._configSchemas[configName] = schema;
    },

    /**
     * Get list of registered config names
     * @returns {Array<string>}
     */
    getRegisteredConfigs() {
      return Object.keys(this._configSchemas);
    },

    /**
     * Helper: Get repository data from all.json
     * @param {string} repoName - Repository name
     * @param {string} [section='repositories3x'] - Section to search
     * @returns {Promise<Object|null>} Repository data or null
     */
    async getRepository(repoName, section = 'repositories3x') {
      const config = await this.load('all');
      return config[section]?.[repoName] || null;
    },

    /**
     * Helper: Get all repositories from a section
     * @param {string} [section='repositories3x'] - Section name
     * @returns {Promise<Object>} Repositories object
     */
    async getRepositories(section = 'repositories3x') {
      const config = await this.load('all');
      return config[section] || {};
    },

    /**
     * Helper: Get value from values.json
     * @param {string} key - Key in base object
     * @returns {Promise<any>} Value or undefined
     */
    async getValue(key) {
      const config = await this.load('values');
      return config.base?.[key];
    },

    /**
     * Helper: Get all values from values.json
     * @returns {Promise<Object>} Base values object
     */
    async getValues() {
      const config = await this.load('values');
      return config.base || {};
    }
  };

  // Export to global scope
  global.ConfigLoader = ConfigLoader;

})(typeof window !== 'undefined' ? window : global);

// Made with Bob
