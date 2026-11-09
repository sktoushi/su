# incrementStash.ps1
# Add a stash to the repository groups in the current all.json schema.
# Usage: .\config\incrementStash.ps1 -StashName "stash10" -GitHubUser "needacounto"
# Mapping: repositories10x = base/x2/x3/x10; repositories3x = base/x2/x3;
#          repositories2x = base/x2; repositories = base.

param(
    [Parameter(Mandatory=$true)]
    [string]$StashName,
    
    [Parameter(Mandatory=$true)]
    [string]$GitHubUser
)

# Extract the number from stash name
if ($StashName -notmatch '^stash(\d+)$') {
    Write-Error "Invalid stash name. Must be in format 'stash<number>' (e.g., stash8)"
    exit 1
}

$StashNum = $Matches[1]
$ErrorActionPreference = 'Stop'

# Validate direct PowerShell calls as well as calls through the Bash wrapper.
if ($GitHubUser -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$') {
    throw "Invalid GitHub username: $GitHubUser"
}

# Resolve paths from the script, not from the shell's current directory.
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'all.json') -PathType Leaf) {
    $configDir = $PSScriptRoot
    $projectRoot = if ((Split-Path -Leaf $PSScriptRoot) -ieq 'config') {
        Split-Path -Parent $PSScriptRoot
    } else {
        $PSScriptRoot
    }
} elseif (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'config/all.json') -PathType Leaf) {
    $configDir = Join-Path $PSScriptRoot 'config'
    $projectRoot = $PSScriptRoot
} else {
    throw "Cannot find all.json beside the script or in its config/ directory."
}

Write-Host "Creating new stash configuration for: $StashName" -ForegroundColor Green
Write-Host "GitHub username: $GitHubUser"
Write-Host "Stash number: $StashNum"
Write-Host ""

# Define the derived variable names
$StashStarting = "${StashName}Starting"
$StashEnding = "${StashName}Ending"
$StashEighty = "${StashName}EightyPercent"
$StashNinety = "${StashName}NinetyPercent"

# Initialize values
$StartingValue = "1"
$EndingValue = "10"
$EightyValue = "8"
$NinetyValue = "9"

Write-Host "Will create the following variables:"
Write-Host "  $StashStarting = $StartingValue"
Write-Host "  $StashEnding = $EndingValue"
Write-Host "  $StashEighty = $EightyValue"
Write-Host "  $StashNinety = $NinetyValue"
Write-Host ""

# JSON mutation helper: validate before backing up and writing.
function Update-JsonFile {
    param(
        [string]$FilePath,
        [scriptblock]$UpdateScript,
        [switch]$Required
    )

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        if ($Required) { throw "Required configuration file not found: $FilePath" }
        Write-Warning "File not found; skipping: $FilePath"
        return $false
    }

    $json = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8 | ConvertFrom-Json
    & $UpdateScript $json
    Copy-Item -LiteralPath $FilePath -Destination "$FilePath.backup" -Force
    $json | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $FilePath -Encoding UTF8
    Write-Host "  OK Updated $FilePath" -ForegroundColor Green
    return $true
}

# Add only missing repository entries. Never reset counts on an existing stash.
function Add-RepositoryEntry {
    param(
        [object]$Group,
        [string]$Name,
        [switch]$Images
    )

    if ($null -ne $Group.PSObject.Properties[$Name]) {
        Write-Host "  SKIP Existing entry: $Name"
        return
    }

    $entry = [ordered]@{
        username = $GitHubUser
        issueStartNumber = 1
        probabilityBooster = 3
        issueEndNumber = [int]$EndingValue
    }
    if ($Images) { $entry['images'] = $true }
    $Group | Add-Member -NotePropertyName $Name -NotePropertyValue ([PSCustomObject]$entry)
    Write-Host "  ADD $Name"
}

# 1. Update config/values.json
Write-Host "Step 1: Updating config/values.json..."
$valuesPath = Join-Path $configDir 'values.json'
Update-JsonFile -FilePath $valuesPath -UpdateScript {
    param($json)
    if ($null -eq $json.PSObject.Properties['base'] -or $null -eq $json.base) {
        throw "Invalid values.json: missing base object"
    }
    $base = $json.base

    # Unlike the old script, this is not anchored to stash7. It works for stash10+.
    $newValues = [ordered]@{}
    $newValues[$StashStarting] = $StartingValue
    $newValues[$StashEighty] = $EightyValue
    $newValues[$StashNinety] = $NinetyValue
    $newValues[$StashEnding] = $EndingValue
    foreach ($key in $newValues.Keys) {
        if ($null -eq $base.PSObject.Properties[$key]) {
            $base | Add-Member -NotePropertyName $key -NotePropertyValue $newValues[$key]
        }
    }

    $formulaProperty = $base.PSObject.Properties['progressCurrentValueFormula']
    $formula = if ($null -ne $formulaProperty) { [string]$formulaProperty.Value } else { '' }
    $escapedName = [regex]::Escape($StashEnding)
    if ($formula -notmatch "(?<![A-Za-z0-9_])$escapedName(?![A-Za-z0-9_])") {
        $formula = if ([string]::IsNullOrWhiteSpace($formula)) { $StashEnding } else { "$formula + $StashEnding" }
        if ($null -eq $formulaProperty) {
            $base | Add-Member -NotePropertyName 'progressCurrentValueFormula' -NotePropertyValue $formula
        } else {
            $formulaProperty.Value = $formula
        }
    }

    $csvUrl = "skyway-$StashName.csv"
    $recentProperty = $base.PSObject.Properties['recent5Settings']
    $settings = @()
    if ($null -ne $recentProperty -and $null -ne $recentProperty.Value) {
        $settings = @($recentProperty.Value)
    }
    $exists = @($settings | Where-Object { $_.csvUrl -eq $csvUrl }).Count -gt 0
    if (-not $exists) {
        $settings += [PSCustomObject]@{ csvUrl = $csvUrl }
        if ($null -eq $recentProperty) {
            $base | Add-Member -NotePropertyName 'recent5Settings' -NotePropertyValue $settings
        } else {
            $recentProperty.Value = $settings
        }
    }
}

# 2. Update config/all.json
Write-Host "Step 2: Updating config/all.json..."
$allPath = Join-Path $configDir 'all.json'
Update-JsonFile -FilePath $allPath -Required -UpdateScript {
    param($json)

    # Each group's name denotes the highest supported variant, not a multiplier
    # to apply to issueEndNumber. All new variants start at 1..10.
    $groupVariants = [ordered]@{
        repositories10x = @('', 'x2', 'x3', 'x10')
        repositories3x  = @('', 'x2', 'x3')
        repositories2x  = @('', 'x2')
        repositories    = @('')
    }

    # Fail without overwriting all.json if the expected schema is absent.
    foreach ($groupName in $groupVariants.Keys) {
        if ($null -eq $json.PSObject.Properties[$groupName] -or
            $null -eq $json.PSObject.Properties[$groupName].Value) {
            throw "Invalid all.json schema: missing '$groupName'"
        }
    }

    foreach ($groupName in $groupVariants.Keys) {
        $group = $json.PSObject.Properties[$groupName].Value
        foreach ($suffix in $groupVariants[$groupName]) {
            $entryName = "$StashName$suffix"
            if ($suffix -eq '') {
                Add-RepositoryEntry -Group $group -Name $entryName -Images
            } else {
                Add-RepositoryEntry -Group $group -Name $entryName
            }
        }
    }
}

# 3. Update config/allrecent100.json
Write-Host "Step 3: Updating config/allrecent100.json..."
$allrecent100Path = Join-Path $configDir 'allrecent100.json'
Update-JsonFile -FilePath $allrecent100Path -UpdateScript {
    param($json)
    $repoConfig = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = 890
    }
    if ($json.repositories -and $null -eq $json.repositories.PSObject.Properties[$StashName]) {
        $json.repositories | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig)
    }
}

# 4. Update config/allrecent.json
Write-Host "Step 4: Updating config/allrecent.json..."
$allrecentPath = Join-Path $configDir 'allrecent.json'
Update-JsonFile -FilePath $allrecentPath -UpdateScript {
    param($json)
    $repoConfig = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = 890
    }
    if ($json.repositories -and $null -eq $json.repositories.PSObject.Properties[$StashName]) {
        $json.repositories | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig)
    }
}

# 5. Create HTML files
Write-Host "Step 5: Creating HTML files..."

$htmlContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Random GitHub Issue Redirect</title>
</head>
<body>
    <script>
        function getUrlParam(name) {
            const params = new URLSearchParams(window.location.search);
            return params.get(name);
        }
        const max = parseInt(getUrlParam("max"), 10);
        if (!isNaN(max) && max >= 1) {
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            const issueNumber = (array[0] % max) + 1;
            window.location.replace(`https://github.com/GITHUB_USER/STASH_NAME/issues/${issueNumber}`);
        } else {
            document.body.innerHTML = `<h2>Missing or invalid "max" parameter.</h2><p>Example:</p><pre>?max=500</pre>`;
        }
    </script>
</body>
</html>
'@

$htmlContent = $htmlContent.Replace('GITHUB_USER', $GitHubUser).Replace('STASH_NAME', $StashName)
$redirectHtmlPath = Join-Path $projectRoot "$GitHubUser-$StashName.html"
Set-Content -LiteralPath $redirectHtmlPath -Value $htmlContent -Encoding UTF8
Write-Host "  OK Created $GitHubUser-$StashName.html" -ForegroundColor Green

# Read the common template
$templatePath = Join-Path $projectRoot 'common/stash-images-template.html'
$imagesHtmlPath = Join-Path $projectRoot "$StashName-images.html"
if (Test-Path -LiteralPath $templatePath -PathType Leaf) {
    $imagesHtmlContent = Get-Content $templatePath -Raw -Encoding UTF8
    
    # Replace placeholders
    $githubPrefix = "https://github.com/$GitHubUser/$StashName/blob/main/"
    $imagesArray = "[]"  # Empty array - user will populate later
    
    $imagesHtmlContent = $imagesHtmlContent.Replace('GITHUB_PREFIX_PLACEHOLDER', $githubPrefix)
    $imagesHtmlContent = $imagesHtmlContent.Replace('IMAGES_ARRAY_PLACEHOLDER', $imagesArray)
    
    Set-Content -LiteralPath $imagesHtmlPath -Value $imagesHtmlContent -Encoding UTF8
    Write-Host "  OK Created $StashName-images.html (using common template)" -ForegroundColor Green
} else {
    Write-Host "  WARNING Template not found at $templatePath, creating basic version" -ForegroundColor Yellow
    
    # Fallback to inline template
    $imagesHtmlContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1">
    <title>Random Image Redirect</title>
</head>
<body>
    <p>Redirecting...</p>
    <script>
        const prefix = "GITHUB_PREFIX";
        const images = [];
        if (!images || images.length === 0) {
            window.location.replace("https://www.google.com/search?sca_esv=98b7ef604edf4258&sxsrf=APpeQntVCOgbpIadcrbRZh-HGsFc757VIw:1783144662562&udm=2&fbs=ABfTbFVyMZGZf1hfvX9uKjN_-G8c4u0nXx4bEIpwm1lnNH832SMIiTl3t-JZ4hGJOxPbHYQR84vEJkyW62ul7Q3Bkhu9i-p_ALr7slx3OYYzZdb8If6UlQdzA3eae6DyEgB_K-Oo1DvwvNqNRv3gdbsoRfWHVTF95OvL34AXg7os5ZtnLg-hyVSE-sxRQ5Br450XBMGBoSj7SjsaRwd0OfiTicAThWwJFQ&q=lc300+white&sa=X&ved=2ahUKEwjgscfBq7iVAxVLkK8BHQydGc4QtKgLegQIFhAB&biw=1920&bih=911&dpr=1");
        } else {
            const randomImage = images[Math.floor(Math.random() * images.length)];
            window.location.replace(prefix + encodeURIComponent(randomImage));
        }
    </script>
</body>
</html>
'@
    
    $githubPrefix = "https://github.com/$GitHubUser/$StashName/blob/main/"
    $imagesHtmlContent = $imagesHtmlContent.Replace('GITHUB_PREFIX', $githubPrefix)
    
    Set-Content -LiteralPath $imagesHtmlPath -Value $imagesHtmlContent -Encoding UTF8
    Write-Host "  OK Created $StashName-images.html (fallback)" -ForegroundColor Green
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Script completed successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created/updated:"
Write-Host "  - config\values.json"
Write-Host "  - config\all.json (repositories10x / repositories3x / repositories2x / repositories)"
Write-Host "  - config\allrecent100.json"
Write-Host "  - config\allrecent.json"
Write-Host "  - $GitHubUser-$StashName.html"
Write-Host "  - $StashName-images.html"
Write-Host ""
Write-Host "Backup files created with .backup extension"
Write-Host ""

# Made with Claude Code
