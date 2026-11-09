#!/usr/bin/env bash
# incrementStash.sh - Bash wrapper for incrementStash.ps1
# Usage: ./config/incrementStash.sh <stash_name> <github_username>
# Example: ./config/incrementStash.sh stash10 needacounto
# Creates base/x2/x3/x10 entries as appropriate for each all.json group.

set -euo pipefail

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <stash_name> <github_username>" >&2
    echo "Example: $0 stash10 needacounto" >&2
    exit 1
fi

STASH_NAME="$1"
GITHUB_USER="$2"

if ! [[ "$STASH_NAME" =~ ^stash[0-9]+$ ]]; then
    echo "Error: Invalid stash name. Expected stash<number>, e.g. stash10" >&2
    exit 1
fi

if ! [[ "$GITHUB_USER" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$ ]] || [ "${#GITHUB_USER}" -gt 39 ]; then
    echo "Error: Invalid GitHub username: $GITHUB_USER" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PS_SCRIPT="$SCRIPT_DIR/incrementStash.ps1"

if [ ! -f "$PS_SCRIPT" ]; then
    echo "Error: PowerShell script not found: $PS_SCRIPT" >&2
    exit 1
fi

echo "Creating stash configuration..."
echo "Stash Name: $STASH_NAME"
echo "GitHub User: $GITHUB_USER"
echo

if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PS_SCRIPT" -StashName "$STASH_NAME" -GitHubUser "$GITHUB_USER"
elif command -v powershell >/dev/null 2>&1; then
    powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PS_SCRIPT" -StashName "$STASH_NAME" -GitHubUser "$GITHUB_USER"
else
    echo "Error: PowerShell not found. Install PowerShell Core (pwsh)." >&2
    echo "  Windows: winget install Microsoft.PowerShell" >&2
    echo "  Linux: https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-linux" >&2
    echo "  macOS: brew install --cask powershell" >&2
    exit 1
fi

echo
echo "Done! The PowerShell script has completed."
