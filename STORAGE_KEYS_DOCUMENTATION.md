# Storage Keys Documentation

## Overview
This document describes the storage key naming conventions used across the three HTML file series to prevent database and localStorage collisions.

## File Series

### 1. allv{number}.html Series (allv1.html - allv26.html)
**Purpose**: Original series  
**Storage Keys**:
- **localStorage**: `"repo_randomizer_memory_v1"`
- **IndexedDB**: `'repoRandomizerDB_v1'`
- **IndexedDB (override)**: `'issueEndOverrideDB_v1'`
- **Fallback localStorage**: `"repo_randomizer_memory_v1_fallback"`

### 2. allv-2x-{number}.html Series (allv-2x-1.html - allv-2x-26.html)
**Purpose**: 2x variant series  
**Storage Keys**:
- **localStorage**: `"repo_randomizer_memory_v2x"`
- **IndexedDB**: `'repoRandomizerDB_v2x'`
- **IndexedDB (override)**: `'issueEndOverrideDB_v2x'`
- **Fallback localStorage**: `"repo_randomizer_memory_v2x_fallback"`

### 3. allv-3x-{number}.html Series (allv-3x-2.html - allv-3x-26.html)
**Purpose**: 3x variant series  
**Storage Keys**:
- **localStorage**: `"repo_randomizer_memory_v3x"`
- **IndexedDB**: `'repoRandomizerDB_v3x'`
- **IndexedDB (override)**: `'issueEndOverrideDB_v3x'`
- **Fallback localStorage**: `"repo_randomizer_memory_v3x_fallback"`

## Key Naming Convention

### Pattern
- **Base series**: Uses `v1` suffix
- **2x series**: Uses `v2x` suffix
- **3x series**: Uses `v3x` suffix

### Storage Types
1. **localStorage (STORAGE_KEY)**: Used for simple key-value storage with session decay
2. **IndexedDB (DB_NAME)**: Used for structured data storage with issue tracking
3. **IndexedDB Override (IDB_NAME)**: Used for issue end number overrides
4. **Fallback localStorage (STORAGE_KEY_FALLBACK)**: Used when IndexedDB is unavailable

## Files Using Each Storage Type

### localStorage Only (STORAGE_KEY)
- **v1 series**: allv1.html, allv2.html
- **v2x series**: allv-2x-1.html, allv-2x-2.html
- **v3x series**: allv-3x-2.html

### IndexedDB (DB_NAME) + Fallback
- **v1 series**: allv3.html, allv11.html
- **v2x series**: allv-2x-3.html, allv-2x-11.html
- **v3x series**: allv-3x-3.html, allv-3x-11.html

### IndexedDB Override (IDB_NAME)
- **v1 series**: allv8.html, allv10.html, allv25.html
- **v2x series**: allv-2x-8.html, allv-2x-10.html, allv-2x-25.html
- **v3x series**: allv-3x-8.html, allv-3x-10.html, allv-3x-25.html

## Collision Prevention

### Why Different Keys?
Each series operates independently and maintains its own:
- Visit history
- Session decay tracking
- Issue selection patterns
- Configuration overrides

Using distinct storage keys ensures:
1. **Data Isolation**: Each series maintains separate state
2. **No Cross-Contamination**: Changes in one series don't affect others
3. **Independent Testing**: Series can be tested without interference
4. **Clear Debugging**: Issues can be traced to specific series

## Maintenance Guidelines

### Adding New Files
When creating new files in any series:
1. Identify which series the file belongs to (v1, v2x, or v3x)
2. Use the appropriate suffix for all storage keys
3. Verify no collisions with existing keys

### Modifying Storage Keys
If storage keys need to be changed:
1. Update all files in the same series consistently
2. Document the change in this file
3. Consider migration strategy for existing user data

## Verification
Last verified: 2026-06-19

All storage keys have been verified to be unique across the three series with no collisions.