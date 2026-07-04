#!/usr/bin/env python3
"""
Batch apply failover cache to skyway-scheduler files 5-62
"""
import re
import os

# Pattern 1: Simple uniform random (like scheduler4, 5)
PATTERN1_SEARCH = r'(function go\(\)\{[\s\S]*?document\.addEventListener\("DOMContentLoaded", go\);)'
PATTERN1_REPLACE = '''// ===== FAILOVER CACHE INTEGRATION =====
    function generateTargetURL() {
      const fallback = "https://sktoushi.github.io/su/allrecent100.html";
      const list = Array.from(new Set(URLS.filter(Boolean))); // de-dup and sanitize
      return list.length ? list[randIndex(list.length)] : fallback;
    }

    // Initialize failover cache
    const failoverCache = new FailoverCache(
      'CACHE_ID_PLACEHOLDER',
      generateTargetURL,
      {
        cacheSize: 2,
        maxTotalCached: 30,
        resetThreshold: 50
      }
    );

    // Pre-warm cache
    failoverCache.prewarm().catch(e => console.error('Prewarm failed:', e));

    async function go(){
      try {
        // Get URL from cache (instant if available)
        const target = await failoverCache.getURL();

        // Show the chosen link (helps if redirects are blocked)
        const a = document.getElementById("chosen");
        if (a){ a.textContent = target; a.href = target; }

        // Redirect now
        try { window.location.replace(target); }
        catch { window.location.assign(target); }
      } catch (e) {
        console.error('Failover failed, using direct generation:', e);
        // Ultimate fallback
        const target = generateTargetURL();
        const a = document.getElementById("chosen");
        if (a){ a.textContent = target; a.href = target; }
        try { window.location.replace(target); }
        catch { window.location.assign(target); }
      }
    }

    document.addEventListener("DOMContentLoaded", go);'''

# Pattern 2: Very simple redirect (like scheduler10)
PATTERN2_SEARCH = r'(<script>\s*// Array of destinations[\s\S]*?window\.location\.href = randomLink;[\s\S]*?</script>)'
PATTERN2_REPLACE = '''<script>
        // Array of destinations
        const links = [
            "https://m.youtube.com/shorts"
        ];

        // ===== FAILOVER CACHE INTEGRATION =====
        function generateTargetURL() {
          return links[Math.floor(Math.random() * links.length)];
        }

        // Initialize failover cache
        const failoverCache = new FailoverCache(
          'CACHE_ID_PLACEHOLDER',
          generateTargetURL,
          {
            cacheSize: 2,
            maxTotalCached: 30,
            resetThreshold: 50
          }
        );

        // Pre-warm and redirect
        failoverCache.prewarm().catch(e => console.error('Prewarm failed:', e));
        
        (async function() {
          try {
            const randomLink = await failoverCache.getURL();
            window.location.href = randomLink;
          } catch (e) {
            console.error('Failover failed:', e);
            const randomLink = generateTargetURL();
            window.location.href = randomLink;
          }
        })();
    </script>'''

def add_script_tag(content):
    """Add failover-cache.js script tag if not present"""
    if 'failover-cache.js' in content:
        return content
    
    # Find the first script tag and add before it
    pattern = r'(<script src="common/skyway-scheduler-utils\.js"></script>)'
    replacement = r'<script src="common/failover-cache.js"></script>\n  \1'
    return re.sub(pattern, replacement, content, count=1)

def process_file(filename, file_number):
    """Process a single skyway-scheduler file"""
    filepath = filename
    
    if not os.path.exists(filepath):
        print(f"⚠️  {filename} not found, skipping")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already has failover cache
    if 'FailoverCache' in content:
        print(f"✓ {filename} already has failover cache, skipping")
        return True
    
    original_content = content
    cache_id = f'skyway-scheduler{file_number}'
    
    # Add script tag
    content = add_script_tag(content)
    
    # Try Pattern 1 (uniform random with go() function)
    if 'function go()' in content and 'const URLS = [' in content:
        content = re.sub(
            r'function go\(\)\{',
            PATTERN1_REPLACE.replace('CACHE_ID_PLACEHOLDER', cache_id).split('async function go(){')[0] + '\n\n    async function go(){',
            content,
            count=1
        )
        # Remove old go() implementation
        content = re.sub(
            r'function go\(\)\{[^}]*const fallback[^}]*\}',
            '',
            content
        )
    
    # Try Pattern 2 (very simple redirect)
    elif 'const links = [' in content and 'window.location.href = randomLink' in content:
        content = re.sub(
            PATTERN2_SEARCH,
            PATTERN2_REPLACE.replace('CACHE_ID_PLACEHOLDER', cache_id),
            content,
            flags=re.DOTALL
        )
    
    # If content changed, write it back
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {filename} updated with failover cache")
        return True
    else:
        print(f"⚠️  {filename} - no pattern matched, needs manual review")
        return False

def main():
    """Process all skyway-scheduler files from 5 to 62"""
    print("Starting batch failover cache application...")
    print("=" * 60)
    
    success_count = 0
    skip_count = 0
    fail_count = 0
    
    for i in range(5, 63):
        filename = f'skyway-scheduler{i}.html'
        result = process_file(filename, i)
        
        if result:
            success_count += 1
        elif os.path.exists(filename):
            fail_count += 1
        else:
            skip_count += 1
    
    print("=" * 60)
    print(f"✅ Successfully updated: {success_count}")
    print(f"⚠️  Needs manual review: {fail_count}")
    print(f"⚠️  Files not found: {skip_count}")
    print(f"📊 Total processed: {success_count + fail_count + skip_count}")

if __name__ == '__main__':
    main()

# Made with Bob
