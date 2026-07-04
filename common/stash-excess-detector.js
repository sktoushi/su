/**
 * Stash Excess Detector Utility
 *
 * Retrieves the last three repositories from repositories3x and checks if
 * (firstField × 1) + (secondField × 2) + (thirdField × 3) > 4500
 *
 * Dependencies:
 *   - common/config-loader.js (optional, will fallback to direct fetch)
 *
 * Usage:
 *   <script src="common/config-loader.js"></script> <!-- optional -->
 *   <script src="common/stash-excess-detector.js"></script>
 *
 *   // In your code:
 *   StashExcessDetector.checkAndAlert();
 *
 *   // Or get the result without alert:
 *   const result = await StashExcessDetector.check();
 *   if (result.exceeds) {
 *     console.log(`Total: ${result.total}, Formula: ${result.formula}`);
 *   }
 */

(function(global) {
  'use strict';

  const StashExcessDetector = {
    THRESHOLD: 4500,
    CONFIG_PATH: 'config/all.json',

    /**
     * Fetch and parse the config file
     * Uses ConfigLoader if available, otherwise falls back to direct fetch
     * @returns {Promise<Object>} The parsed config object
     */
    async fetchConfig() {
      try {
        // Use ConfigLoader if available (with caching benefits)
        if (global.ConfigLoader) {
          return await global.ConfigLoader.load('all');
        }
        
        // Fallback to direct fetch
        const response = await fetch(this.CONFIG_PATH);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error('StashExcessDetector: Failed to load config:', error);
        throw error;
      }
    },

    /**
     * Get the last three repositories from repositories3x
     * @param {Object} config - The config object
     * @returns {Array<{name: string, value: number}>} Array of last three repos with their issueEndNumber
     */
    getLastThreeRepos(config) {
      const repos3x = config.repositories3x || {};
      const repoKeys = Object.keys(repos3x);
      
      if (repoKeys.length < 3) {
        throw new Error('repositories3x must have at least 3 repositories');
      }
      
      // Get last three repository keys
      const lastThree = repoKeys.slice(-3);
      
      return lastThree.map(key => ({
        name: key,
        value: Number(repos3x[key].issueEndNumber) || 0
      }));
    },

    /**
     * Calculate the weighted sum: (first × 1) + (second × 2) + (third × 3)
     * @param {Array<{name: string, value: number}>} repos - Array of three repos
     * @returns {Object} Calculation result
     */
    calculate(repos) {
      if (repos.length !== 3) {
        throw new Error('Expected exactly 3 repositories');
      }

      const [first, second, third] = repos;
      const total = (first.value * 1) + (second.value * 2) + (third.value * 3);
      const formula = `(${first.value} × 1) + (${second.value} × 2) + (${third.value} × 3) = ${total}`;
      const exceeds = total > this.THRESHOLD;

      return {
        repos,
        total,
        formula,
        exceeds,
        threshold: this.THRESHOLD
      };
    },

    /**
     * Check if the last three repos exceed the threshold
     * @returns {Promise<Object>} Result object with exceeds, total, formula, etc.
     */
    async check() {
      try {
        const config = await this.fetchConfig();
        const repos = this.getLastThreeRepos(config);
        return this.calculate(repos);
      } catch (error) {
        console.error('StashExcessDetector: Check failed:', error);
        return {
          error: error.message,
          exceeds: false,
          total: 0,
          formula: 'Error calculating',
          repos: []
        };
      }
    },

    /**
     * Check and display an alert if threshold is exceeded
     * @returns {Promise<Object>} Result object
     */
    async checkAndAlert() {
      const result = await this.check();
      
      if (result.exceeds) {
        const message = 
          `⚠️ WARNING: Stash values exceed threshold!\n\n` +
          `Formula: ${result.formula}\n` +
          `Threshold: ${result.threshold}\n\n` +
          `Repositories:\n` +
          result.repos.map((r, i) => `  ${i + 1}. ${r.name}: ${r.value}`).join('\n');
        
        alert(message);
      }
      
      return result;
    }
  };

  // Export to global scope
  global.StashExcessDetector = StashExcessDetector;

})(typeof window !== 'undefined' ? window : global);

// Made with Bob
