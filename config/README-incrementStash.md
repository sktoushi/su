# incrementStash - Automated Stash Repository Setup

A cross-platform automation tool that creates new stash repositories following the stash7 pattern. Includes both a bash wrapper script (`incrementStash.sh`) and a PowerShell script (`incrementStash.ps1`) for maximum compatibility.

## Quick Start

### Using Bash (Recommended - Cross-platform)
```bash
./config/incrementStash.sh stash8 sktoushi
```

### Using PowerShell Directly
```powershell
.\config\incrementStash.ps1 -StashName "stash8" -GitHubUser "sktoushi"
```

**Note**: The bash wrapper automatically handles PowerShell execution policies and cross-platform compatibility.

## What It Does

The script automatically:

✅ **Updates JSON Configuration Files**
- `config\values.json` - Adds stash variables, updates progressCurrentValueFormula, adds CSV reference
- `config\all.json` - Adds entries to repositories, repositories2x, repositories3x (including x2 and x3 variants)
- `config\allrecent100.json` - Adds repository entry with issueEndNumber = 890
- `config\allrecent.json` - Adds repository entry with issueEndNumber = 890

✅ **Creates HTML Files**
- `{username}-{stash}.html` - Random issue redirect page
- `{stash}-images.html` - Random image redirect page

✅ **Creates Backup Files**
- All modified JSON files get `.backup` extensions before changes

✅ **Initializes Values Correctly**
- `stash{N}Starting` = 1
- `stash{N}Ending` = 10
- `stash{N}EightyPercent` = 8
- `stash{N}NinetyPercent` = 9
- `stash{N}x2` issueEndNumber = 10
- `stash{N}x3` issueEndNumber = 10

## Files

### Main Scripts
- **incrementStash.sh** - Bash wrapper script (recommended entry point)
  - Cross-platform compatible (Windows, Linux, macOS)
  - Automatically detects and uses available PowerShell (pwsh or powershell)
  - Handles execution policy bypass
  - Validates input parameters
  - Provides helpful error messages
  
- **incrementStash.ps1** - PowerShell script (core implementation)
  - Performs all JSON updates and file creation
  - Can be called directly or via bash wrapper
  - Requires PowerShell 5.1+ or PowerShell Core

### This Documentation
- **README-incrementStash.md** - This file

## Usage Examples

### Using Bash Wrapper (Recommended)

From workspace root:
```bash
./config/incrementStash.sh stash8 sktoushi
```

From config directory:
```bash
cd config
./incrementStash.sh stash8 sktoushi
```

Create stash9 for different user:
```bash
./config/incrementStash.sh stash9 mdr19ganseki95cf
```

### Using PowerShell Directly

From workspace root:
```powershell
.\config\incrementStash.ps1 -StashName "stash8" -GitHubUser "sktoushi"
```

From config directory:
```powershell
cd config
.\incrementStash.ps1 -StashName "stash10" -GitHubUser "sktoushi"
```

With execution policy bypass (if needed):
```powershell
powershell -ExecutionPolicy Bypass -File .\config\incrementStash.ps1 -StashName "stash8" -GitHubUser "sktoushi"
```

## Requirements

### For Bash Wrapper (incrementStash.sh)
- **Bash** - Available on Linux, macOS, Windows (Git Bash, WSL, Cygwin)
- **PowerShell** - One of the following:
  - PowerShell Core (`pwsh`) - Preferred, cross-platform
  - Windows PowerShell (`powershell`) - Windows only, version 5.1+

### For Direct PowerShell Usage (incrementStash.ps1)
- **Windows PowerShell 5.1+** (included with Windows 10/11)
- **PowerShell Core 7+** (cross-platform, recommended)

### Installation

**PowerShell Core** (recommended for all platforms):
- Windows: `winget install Microsoft.PowerShell`
- Linux: See [Microsoft Docs](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-linux)
- macOS: `brew install --cask powershell`

## How It Works

### Bash Wrapper Flow (incrementStash.sh)
1. **Argument Validation**
   - Checks for exactly 2 arguments (stash name and GitHub username)
   - Validates stash name format (must be `stash` followed by a number)
   - Provides usage examples on error

2. **PowerShell Detection**
   - Checks for `pwsh` (PowerShell Core) first
   - Falls back to `powershell` (Windows PowerShell)
   - Provides installation instructions if neither found

3. **Script Invocation**
   - Locates the PowerShell script in the same directory
   - Passes parameters to PowerShell script
   - Uses `-ExecutionPolicy Bypass` to avoid permission issues

### PowerShell Script Flow (incrementStash.ps1)
1. **Validation**
   - Validates stash name format
   - Extracts the stash number for variable naming

2. **JSON Updates**
   - Uses PowerShell's native JSON handling
   - Reads existing JSON files
   - Adds new stash entries in the correct positions
   - Maintains proper JSON structure and formatting
   - Writes back with UTF-8 encoding

3. **HTML Generation**
   - Creates issue redirect page with cryptographically secure random numbers
   - Creates image redirect page with auto-refresh

4. **Backup Creation**
   - Creates `.backup` copies before modifying any file

## Configuration Details

### JSON Structure

#### config\values.json
Adds four new variables in the `base` section:
```json
{
  "base": {
    "stash8EightyPercent": "8",
    "stash8NinetyPercent": "9",
    "stash8Ending": "10",
    "stash8Starting": "1"
  }
}
```

Also updates:
- `progressCurrentValueFormula` - Appends `+ stash8Ending`
- `recent5Settings` - Adds `{"csvUrl": "skyway-stash8.csv"}`

#### config\all.json
Adds repository entries to three sections:
- `repositories` - Base repository
- `repositories2x` - 2x variant (includes stash8x2)
- `repositories3x` - 3x variant (includes stash8x2 and stash8x3)

Each entry includes:
```json
{
  "username": "sktoushi",
  "images": true,
  "issueStartNumber": 1,
  "issueEndNumber": 10,
  "probabilityBooster": 3
}
```

#### config\allrecent100.json & config\allrecent.json
Adds repository entry:
```json
{
  "username": "sktoushi",
  "issueStartNumber": 1,
  "issueEndNumber": 890
}
```

### HTML Files

#### {username}-{stash}.html
Random issue redirect page that:
- Accepts a `max` URL parameter
- Generates a cryptographically secure random number
- Redirects to a random GitHub issue

Example: `sktoushi-stash8.html?max=100`

#### {stash}-images.html
Random image redirect page that:
- Redirects to a random image from the repository
- Uses a placeholder image list (update with actual images)
- Auto-refreshes after 1 second

## Troubleshooting

### Bash Wrapper Issues

#### "PowerShell not found"
The bash wrapper couldn't find PowerShell. Install it:
- **Windows**: PowerShell is included by default. If missing, run `winget install Microsoft.PowerShell`
- **Linux**: Follow [Microsoft's installation guide](https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-linux)
- **macOS**: Run `brew install --cask powershell`

#### "Invalid stash name" Error
Ensure the stash name follows the format `stash<number>`:
```bash
# ✅ Correct
./config/incrementStash.sh stash8 sktoushi

# ❌ Wrong
./config/incrementStash.sh stash sktoushi      # Missing number
./config/incrementStash.sh 8 sktoushi          # Missing "stash" prefix
./config/incrementStash.sh stash-8 sktoushi    # Invalid format
```

#### "Usage" Error
Provide both required arguments:
```bash
./config/incrementStash.sh <stash_name> <github_username>
```

### PowerShell Issues

#### Execution Policy Error
If running PowerShell directly and you see:
```
File cannot be loaded because running scripts is disabled on this system
```

**Solution 1**: Use the bash wrapper (automatically handles this)
```bash
./config/incrementStash.sh stash8 sktoushi
```

**Solution 2**: Use `-ExecutionPolicy Bypass` flag
```powershell
powershell -ExecutionPolicy Bypass -File .\config\incrementStash.ps1 -StashName "stash8" -GitHubUser "sktoushi"
```

**Solution 3**: Set execution policy permanently (run as Administrator)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### File Issues

#### File Not Found Errors
Ensure you're running from the correct location:

From workspace root:
```bash
./config/incrementStash.sh stash8 sktoushi
```

From config directory:
```bash
cd config
./incrementStash.sh stash8 sktoushi
```

#### JSON Parse Errors
If JSON files are corrupted:
1. Check the error message for the specific file
2. Restore from `.backup` files (created before modification)
3. Fix any JSON syntax errors manually
4. Run the script again

#### Permission Denied (Bash)
Make the bash script executable:
```bash
chmod +x config/incrementStash.sh
```

### Platform-Specific Issues

#### Windows Git Bash
If using Git Bash on Windows, ensure PowerShell is in your PATH:
```bash
which powershell  # Should show path to powershell.exe
which pwsh        # Should show path to pwsh.exe (if PowerShell Core installed)
```

#### WSL (Windows Subsystem for Linux)
Install PowerShell Core in WSL:
```bash
# Ubuntu/Debian
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install -y powershell
```

#### macOS
Ensure PowerShell Core is installed:
```bash
brew install --cask powershell
```

## Pattern Followed

This script follows the exact pattern established by stash7:

### Variable Naming
- `stash{N}Starting`, `stash{N}Ending`
- `stash{N}EightyPercent`, `stash{N}NinetyPercent`

### JSON Structure
- Placement after stash7 entries
- Same property order and formatting
- Consistent probability boosters

### File Naming
- `{username}-{stash}.html`
- `{stash}-images.html`
- `skyway-{stash}.csv` reference (in values.json)

### URL Patterns
- GitHub issue URLs
- GitHub blob URLs for images
- Stash randomizer URLs (referenced in CSV)

## Next Steps After Running

1. **Review Changes**
   - Check the updated JSON files
   - Verify all entries are correct

2. **Update Image List**
   - Edit `{stash}-images.html`
   - Replace `["placeholder.jpg"]` with actual image filenames

3. **Update Ending Values**
   - As the repository grows, update ending values in `config\values.json`
   - Update `stash{N}EightyPercent` and `stash{N}NinetyPercent` accordingly

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add stash8 configuration"
   git push
   ```

## Safety Features

- ✅ **Backup files** - Creates `.backup` before modifying
- ✅ **Validation** - Checks stash name format
- ✅ **Error handling** - Provides clear error messages
- ✅ **Idempotent** - Safe to run multiple times (uses `-Force` on Add-Member)
- ✅ **UTF-8 encoding** - Ensures proper character encoding

## Output Example

### Bash Wrapper Output
```
Invoking PowerShell script to create stash configuration...
Stash Name: stash8
GitHub User: sktoushi

Creating new stash configuration for: stash8
GitHub username: sktoushi
Stash number: 8

Will create the following variables:
  stash8Starting = 1
  stash8Ending = 10
  stash8EightyPercent = 8
  stash8NinetyPercent = 9

Step 1: Updating config/values.json...
  OK Updated config\values.json
Step 2: Updating config/all.json...
  OK Updated config\all.json
Step 3: Updating config/allrecent100.json...
  OK Updated config\allrecent100.json
Step 4: Updating config/allrecent.json...
  OK Updated config\allrecent.json
Step 5: Creating HTML files...
  OK Created sktoushi-stash8.html
  OK Created stash8-images.html

===========================================
Script completed successfully!
===========================================

Files created/updated:
  - config\values.json
  - config\all.json
  - config\allrecent100.json
  - config\allrecent.json
  - sktoushi-stash8.html
  - stash8-images.html

Backup files created with .backup extension

Done! The PowerShell script has completed.
```

## Technical Details

### Bash Script (incrementStash.sh)
- **Shell**: Bash (compatible with bash 3.2+)
- **Error Handling**: Uses `set -e` to exit on errors
- **Path Resolution**: Uses `BASH_SOURCE` to locate script directory
- **PowerShell Detection**: Checks for `pwsh` first, then `powershell`
- **Parameter Passing**: Properly quotes arguments to handle spaces
- **Validation**: Regex pattern matching for stash name format

### PowerShell Script (incrementStash.ps1)
- **Version**: Tested on PowerShell 5.1 and PowerShell Core 7+
- **JSON Handling**:
  - Uses `ConvertFrom-Json` and `ConvertTo-Json`
  - Depth set to 100 to handle nested structures
  - Preserves property order with `[ordered]@{}`
- **String Handling**:
  - Uses single-quoted here-strings (`@'...'@`) for HTML to avoid parsing issues
  - Uses `.Replace()` method for placeholder substitution
- **File Operations**: UTF-8 encoding for all file operations
- **Random Numbers**: Uses `System.Security.Cryptography.RNGCryptoServiceProvider` for secure randomization

## License

This script is part of the stash repository management system.

## Support

For issues or questions:
1. Check this README
2. Review the backup files
3. Verify PowerShell version
4. Check file permissions

## Advantages of Using the Bash Wrapper

1. **Cross-Platform**: Works on Windows, Linux, and macOS
2. **Automatic PowerShell Detection**: Finds and uses the best available PowerShell
3. **Execution Policy Handling**: Automatically bypasses execution policy restrictions
4. **Better Error Messages**: Provides clear, actionable error messages
5. **Simpler Syntax**: Easier to remember and type than PowerShell commands
6. **Consistent Interface**: Same command works across all platforms

## Script Compatibility Matrix

| Platform | Bash Wrapper | PowerShell Direct | Recommended |
|----------|--------------|-------------------|-------------|
| Windows 10/11 | ✅ (Git Bash, WSL) | ✅ | Bash Wrapper |
| Windows (PowerShell only) | ❌ | ✅ | PowerShell |
| Linux | ✅ | ✅ (with pwsh) | Bash Wrapper |
| macOS | ✅ | ✅ (with pwsh) | Bash Wrapper |
| CI/CD (GitHub Actions) | ✅ | ✅ | Bash Wrapper |

---

**Last Updated**: 2026-07-04
**Version**: 1.1
**Author**: Bob (AI Assistant)
**Scripts**: incrementStash.sh (bash wrapper) + incrementStash.ps1 (PowerShell core)