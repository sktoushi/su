# incrementStash.ps1
# Script to add a new stash repository following the stash7 pattern
# Usage: .\config\incrementStash.ps1 -StashName "stash8" -GitHubUser "sktoushi"

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

# Function to update JSON files
function Update-JsonFile {
    param(
        [string]$FilePath,
        [scriptblock]$UpdateScript
    )
    
    if (Test-Path $FilePath) {
        Copy-Item $FilePath "$FilePath.backup" -Force
        $json = Get-Content $FilePath -Raw -Encoding UTF8 | ConvertFrom-Json
        & $UpdateScript $json
        $json | ConvertTo-Json -Depth 100 | Set-Content $FilePath -Encoding UTF8
        Write-Host "  OK Updated $FilePath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  WARNING $FilePath not found" -ForegroundColor Yellow
        return $false
    }
}

# 1. Update config/values.json
Write-Host "Step 1: Updating config/values.json..."
$valuesPath = if (Test-Path "values.json") { "values.json" } else { "config\values.json" }
Update-JsonFile -FilePath $valuesPath -UpdateScript {
    param($json)
    $baseKeys = $json.base.PSObject.Properties.Name
    $newBase = [ordered]@{}
    foreach ($key in $baseKeys) {
        $newBase[$key] = $json.base.$key
        if ($key -eq "stash7Ending") {
            $newBase[$StashEighty] = $EightyValue
            $newBase[$StashNinety] = $NinetyValue
            $newBase[$StashEnding] = $EndingValue
        }
        if ($key -eq "stash7Starting") {
            $newBase[$StashStarting] = $StartingValue
        }
    }
    $json.base = [PSCustomObject]$newBase
    if ($json.base.progressCurrentValueFormula -notlike "*$StashEnding*") {
        $json.base.progressCurrentValueFormula = $json.base.progressCurrentValueFormula + " + $StashEnding"
    }
    $csvUrl = "skyway-$StashName.csv"
    $exists = $false
    foreach ($setting in $json.base.recent5Settings) {
        if ($setting.csvUrl -eq $csvUrl) {
            $exists = $true
            break
        }
    }
    if (-not $exists) {
        $json.base.recent5Settings += @{csvUrl = $csvUrl}
    }
}

# 2. Update config/all.json
Write-Host "Step 2: Updating config/all.json..."
$allPath = if (Test-Path "all.json") { "all.json" } else { "config\all.json" }
Update-JsonFile -FilePath $allPath -UpdateScript {
    param($json)
    $repoConfig = @{
        username = $GitHubUser
        images = $true
        issueStartNumber = 1
        issueEndNumber = [int]$EndingValue
        probabilityBooster = 3
    }
    $repoConfigX2 = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = [int]$EndingValue
        probabilityBooster = 3
    }
    $repoConfigX3 = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = [int]$EndingValue
        probabilityBooster = 3
    }
    if ($json.repositories3x) {
        $json.repositories3x | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig) -Force
        $json.repositories3x | Add-Member -NotePropertyName "${StashName}x2" -NotePropertyValue ([PSCustomObject]$repoConfigX2) -Force
        $json.repositories3x | Add-Member -NotePropertyName "${StashName}x3" -NotePropertyValue ([PSCustomObject]$repoConfigX3) -Force
    }
    if ($json.repositories2x) {
        $json.repositories2x | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig) -Force
        $json.repositories2x | Add-Member -NotePropertyName "${StashName}x2" -NotePropertyValue ([PSCustomObject]$repoConfigX2) -Force
    }
    if ($json.repositories) {
        $json.repositories | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig) -Force
    }
}

# 3. Update config/allrecent100.json
Write-Host "Step 3: Updating config/allrecent100.json..."
$allrecent100Path = if (Test-Path "allrecent100.json") { "allrecent100.json" } else { "config\allrecent100.json" }
Update-JsonFile -FilePath $allrecent100Path -UpdateScript {
    param($json)
    $repoConfig = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = 890
    }
    if ($json.repositories) {
        $json.repositories | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig) -Force
    }
}

# 4. Update config/allrecent.json
Write-Host "Step 4: Updating config/allrecent.json..."
$allrecentPath = if (Test-Path "allrecent.json") { "allrecent.json" } else { "config\allrecent.json" }
Update-JsonFile -FilePath $allrecentPath -UpdateScript {
    param($json)
    $repoConfig = @{
        username = $GitHubUser
        issueStartNumber = 1
        issueEndNumber = 890
    }
    if ($json.repositories) {
        $json.repositories | Add-Member -NotePropertyName $StashName -NotePropertyValue ([PSCustomObject]$repoConfig) -Force
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
Set-Content -Path "$GitHubUser-$StashName.html" -Value $htmlContent -Encoding UTF8
Write-Host "  OK Created $GitHubUser-$StashName.html" -ForegroundColor Green

# Read the common template
$templatePath = if (Test-Path "..\common\stash-images-template.html") { "..\common\stash-images-template.html" } elseif (Test-Path "common\stash-images-template.html") { "common\stash-images-template.html" } else { $null }
if (Test-Path $templatePath) {
    $imagesHtmlContent = Get-Content $templatePath -Raw -Encoding UTF8
    
    # Replace placeholders
    $githubPrefix = "https://github.com/$GitHubUser/$StashName/blob/main/"
    $imagesArray = "[]"  # Empty array - user will populate later
    
    $imagesHtmlContent = $imagesHtmlContent.Replace('GITHUB_PREFIX_PLACEHOLDER', $githubPrefix)
    $imagesHtmlContent = $imagesHtmlContent.Replace('IMAGES_ARRAY_PLACEHOLDER', $imagesArray)
    
    Set-Content -Path "$StashName-images.html" -Value $imagesHtmlContent -Encoding UTF8
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
    
    Set-Content -Path "$StashName-images.html" -Value $imagesHtmlContent -Encoding UTF8
    Write-Host "  OK Created $StashName-images.html (fallback)" -ForegroundColor Green
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Script completed successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created/updated:"
Write-Host "  - config\values.json"
Write-Host "  - config\all.json"
Write-Host "  - config\allrecent100.json"
Write-Host "  - config\allrecent.json"
Write-Host "  - $GitHubUser-$StashName.html"
Write-Host "  - $StashName-images.html"
Write-Host ""
Write-Host "Backup files created with .backup extension"
Write-Host ""

# Made with Bob
