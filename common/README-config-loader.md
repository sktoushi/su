# Config Loader Utility

Centralized configuration loading system with caching, validation, and error handling.

## Features

✅ **In-Memory Caching** - Reduces network requests and improves performance  
✅ **Schema Validation** - Ensures config files have required structure  
✅ **Error Handling** - Graceful fallbacks and detailed error messages  
✅ **Batch Loading** - Load multiple configs in parallel  
✅ **Helper Methods** - Convenient shortcuts for common operations  
✅ **Cache Management** - Control cache TTL and invalidation  
✅ **Extensible** - Register custom config schemas

## Quick Start

### Basic Usage

```html
<script src="common/config-loader.js"></script>
<script>
  // Load a single config
  const allConfig = await ConfigLoader.load('all');
  console.log(allConfig.repositories3x);
  
  // Load multiple configs
  const configs = await ConfigLoader.loadMultiple(['all', 'values']);
  console.log(configs.all, configs.values);
</script>
```

### Helper Methods

```javascript
// Get a specific repository
const stash7 = await ConfigLoader.getRepository('stash7');
console.log(stash7.issueEndNumber);

// Get all repositories from a section
const repos = await ConfigLoader.getRepositories('repositories3x');

// Get a specific value
const ending = await ConfigLoader.getValue('stash7Ending');

// Get all values
const values = await ConfigLoader.getValues();
```

## API Reference

### Core Methods

#### `load(configName, options)`

Load a configuration file.

**Parameters:**
- `configName` (string) - Name of config: `'all'`, `'values'`, `'allrecent'`, `'allrecent100'`
- `options` (object, optional):
  - `skipCache` (boolean) - Skip cache and force reload (default: `false`)
  - `cacheTTL` (number) - Custom cache TTL in milliseconds (default: `3600000` = 1 hour)
  - `validate` (boolean) - Validate against schema (default: `true`)

**Returns:** `Promise<Object>` - Parsed configuration object

**Example:**
```javascript
// Basic load
const config = await ConfigLoader.load('all');

// Force reload (skip cache)
const fresh = await ConfigLoader.load('all', { skipCache: true });

// Custom cache TTL (10 minutes)
const config = await ConfigLoader.load('all', { cacheTTL: 600000 });

// Skip validation
const config = await ConfigLoader.load('all', { validate: false });
```

#### `loadMultiple(configNames, options)`

Load multiple configuration files in parallel.

**Parameters:**
- `configNames` (Array<string>) - Array of config names
- `options` (object, optional) - Same options as `load()`

**Returns:** `Promise<Object>` - Object with config names as keys

**Example:**
```javascript
const configs = await ConfigLoader.loadMultiple(['all', 'values', 'allrecent']);
console.log(configs.all);
console.log(configs.values);
console.log(configs.allrecent);
```

#### `preload(configNames)`

Preload configurations for better performance. Useful for loading configs before they're needed.

**Parameters:**
- `configNames` (Array<string>) - Configs to preload

**Returns:** `Promise<void>`

**Example:**
```javascript
// Preload on page load
document.addEventListener('DOMContentLoaded', async () => {
  await ConfigLoader.preload(['all', 'values']);
  // Configs are now cached
});
```

### Helper Methods

#### `getRepository(repoName, section)`

Get repository data from all.json.

**Parameters:**
- `repoName` (string) - Repository name
- `section` (string, optional) - Section to search (default: `'repositories3x'`)

**Returns:** `Promise<Object|null>` - Repository data or null if not found

**Example:**
```javascript
const stash7 = await ConfigLoader.getRepository('stash7');
console.log(stash7.username, stash7.issueEndNumber);

// Search in different section
const repo = await ConfigLoader.getRepository('stash7', 'repositories2x');
```

#### `getRepositories(section)`

Get all repositories from a section.

**Parameters:**
- `section` (string, optional) - Section name (default: `'repositories3x'`)

**Returns:** `Promise<Object>` - Repositories object

**Example:**
```javascript
const repos = await ConfigLoader.getRepositories('repositories3x');
for (const [name, data] of Object.entries(repos)) {
  console.log(name, data.issueEndNumber);
}
```

#### `getValue(key)`

Get a value from values.json base object.

**Parameters:**
- `key` (string) - Key in base object

**Returns:** `Promise<any>` - Value or undefined

**Example:**
```javascript
const ending = await ConfigLoader.getValue('stash7Ending');
const formula = await ConfigLoader.getValue('progressCurrentValueFormula');
```

#### `getValues()`

Get all values from values.json base object.

**Returns:** `Promise<Object>` - Base values object

**Example:**
```javascript
const values = await ConfigLoader.getValues();
console.log(values.stash7Ending);
console.log(values.progressCurrentValueFormula);
```

### Cache Management

#### `clearCache(configName)`

Clear cache for a specific config or all configs.

**Parameters:**
- `configName` (string, optional) - Config name to clear, or undefined for all

**Example:**
```javascript
// Clear specific config
ConfigLoader.clearCache('all');

// Clear all cache
ConfigLoader.clearCache();
```

#### `getCacheStats()`

Get cache statistics.

**Returns:** `Object` - Cache stats with size and config details

**Example:**
```javascript
const stats = ConfigLoader.getCacheStats();
console.log(`Cached configs: ${stats.size}`);
stats.configs.forEach(c => {
  console.log(`${c.name}: ${c.ageMinutes} minutes old, valid: ${c.valid}`);
});
```

### Advanced Methods

#### `registerSchema(configName, schema)`

Register a custom config schema.

**Parameters:**
- `configName` (string) - Config name
- `schema` (object):
  - `file` (string, required) - Filename
  - `requiredFields` (Array<string>) - Required top-level fields
  - `optionalFields` (Array<string>) - Optional fields

**Example:**
```javascript
ConfigLoader.registerSchema('custom', {
  file: 'custom-config.json',
  requiredFields: ['data'],
  optionalFields: ['metadata']
});

// Now you can load it
const custom = await ConfigLoader.load('custom');
```

#### `getRegisteredConfigs()`

Get list of registered config names.

**Returns:** `Array<string>` - Array of config names

**Example:**
```javascript
const configs = ConfigLoader.getRegisteredConfigs();
console.log('Available configs:', configs);
// Output: ['all', 'allrecent', 'allrecent100', 'values']
```

## Configuration

### Default Settings

```javascript
CONFIG_BASE_PATH: 'config/'     // Base path for config files
CACHE_TTL_MS: 300000           // 5 minutes cache TTL
```

### Registered Configs

| Config Name | File | Required Fields | Description |
|-------------|------|-----------------|-------------|
| `all` | `all.json` | `repositories3x` | Main repository configuration |
| `allrecent` | `allrecent.json` | `repositories` | Recent repositories |
| `allrecent100` | `allrecent100.json` | `repositories` | Recent 100 repositories |
| `values` | `values.json` | `base` | Configuration values |

## Validation

The config loader validates configurations against schemas:

### all.json Validation

- Checks for `repositories`, `repositories2x`, `repositories3x` sections
- Validates each repository has:
  - `username` (string)
  - `issueStartNumber` (number)
  - `issueEndNumber` (number)

### values.json Validation

- Checks for `base` object
- Warns if missing common fields like `progressCurrentValueFormula`

## Error Handling

The config loader provides graceful error handling:

```javascript
try {
  const config = await ConfigLoader.load('all');
} catch (error) {
  console.error('Failed to load config:', error);
  // Config loader will return stale cache if available
}
```

**Fallback Behavior:**
1. If fetch fails and cache exists (even if expired), returns cached version
2. If no cache exists, throws error
3. Logs warnings for validation issues but doesn't block loading

## Performance Tips

### 1. Preload Configs

```javascript
// Load configs early
await ConfigLoader.preload(['all', 'values']);

// Later usage is instant (from cache)
const config = await ConfigLoader.load('all'); // Fast!
```

### 2. Use Helper Methods

```javascript
// Instead of:
const config = await ConfigLoader.load('all');
const repo = config.repositories3x.stash7;

// Use helper:
const repo = await ConfigLoader.getRepository('stash7'); // Cached!
```

### 3. Batch Loading

```javascript
// Instead of:
const all = await ConfigLoader.load('all');
const values = await ConfigLoader.load('values');

// Load in parallel:
const configs = await ConfigLoader.loadMultiple(['all', 'values']); // Faster!
```

### 4. Adjust Cache TTL

```javascript
// For frequently changing configs
const config = await ConfigLoader.load('all', { cacheTTL: 60000 }); // 1 minute

// For stable configs
const config = await ConfigLoader.load('values', { cacheTTL: 3600000 }); // 1 hour
```

## Integration Examples

### With Stash Excess Detector

```javascript
// stash-excess-detector.js automatically uses ConfigLoader if available
<script src="common/config-loader.js"></script>
<script src="common/stash-excess-detector.js"></script>
<script>
  // Detector will use cached config from ConfigLoader
  await StashExcessDetector.checkAndAlert();
</script>
```

### With allv~ Files

```javascript
<script src="common/config-loader.js"></script>
<script>
  // Load config with caching
  const cfg = await ConfigLoader.load('all');
  const repos = cfg.repositories || {};
  
  // Rest of allv logic...
</script>
```

### With allconfigurator

```javascript
<script src="common/config-loader.js"></script>
<script>
  // Load and edit config
  const config = await ConfigLoader.load('all');
  
  // Make changes...
  
  // Clear cache after saving
  ConfigLoader.clearCache('all');
</script>
```

## Demo

Open `config-loader-demo.html` in your browser to see interactive examples of all features.

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `fetch` API
- Requires `Promise` support
- Requires `Map` support

## License

Part of the stash repository management system.

---

**Version:** 1.0  
**Last Updated:** 2026-07-04  
**Author:** Bob (AI Assistant)