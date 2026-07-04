#!/bin/bash

# incrementStash.sh
# Bash wrapper script that invokes the PowerShell script
# Usage: ./config/incrementStash.sh <stash_name> <github_username>
# Example: ./config/incrementStash.sh stash8 sktoushi

set -e

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <stash_name> <github_username>"
    echo "Example: $0 stash8 sktoushi"
    exit 1
fi

STASH_NAME="$1"
GITHUB_USER="$2"

# Validate stash number
if ! [[ "$STASH_NAME" =~ ^stash[0-9]+$ ]]; then
    echo "Error: Invalid stash name. Must be in format 'stash<number>' (e.g., stash8)"
    exit 1
fi

echo "Invoking PowerShell script to create stash configuration..."
echo "Stash Name: $STASH_NAME"
echo "GitHub User: $GITHUB_USER"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Invoke PowerShell script from the same directory
# Use pwsh if available (PowerShell Core), otherwise use powershell (Windows PowerShell)
# Add -ExecutionPolicy Bypass to allow script execution
if command -v pwsh &> /dev/null; then
    pwsh -ExecutionPolicy Bypass -File "$SCRIPT_DIR/incrementStash.ps1" -StashName "$STASH_NAME" -GitHubUser "$GITHUB_USER"
elif command -v powershell &> /dev/null; then
    powershell -ExecutionPolicy Bypass -File "$SCRIPT_DIR/incrementStash.ps1" -StashName "$STASH_NAME" -GitHubUser "$GITHUB_USER"
else
    echo "Error: PowerShell not found. Please install PowerShell."
    echo ""
    echo "Install PowerShell Core:"
    echo "  Windows: winget install Microsoft.PowerShell"
    echo "  Linux: https://docs.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-linux"
    echo "  macOS: brew install --cask powershell"
    exit 1
fi

echo ""
echo "Done! The PowerShell script has completed."

# Made with Bob
