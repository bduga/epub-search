<#
.SYNOPSIS
    Source Catalog Management CLI for EPUB Documentation Search.

.DESCRIPTION
    Easily add, remove, or list document sources in data/sources.json, and
    automatically re-index the search engine.

.PARAMETER List
    Displays a formatted table of all registered document sources.

.PARAMETER Add
    Adds or updates a document source in the catalog and triggers re-indexing.

.PARAMETER Remove
    Removes a document source by ID and triggers re-indexing.

.PARAMETER Id
    Unique identifier for the document source (e.g. 'epub-33', 'my-custom-guide').

.PARAMETER Title
    Human-readable title of the publication or specification.

.PARAMETER Url
    Canonical URL to the document (e.g. 'https://www.w3.org/TR/epub-33/').

.PARAMETER Type
    Document type/status: 'Recommendation', 'Candidate Standard', 'Working Draft', 'Note', 'Draft Note', 'Report', or 'Legacy'.

.PARAMETER Category
    Subject category: 'Authoring', 'A11y', 'Reading Systems', 'Annotations', 'Audio | Media', or 'EPUB General'.

.PARAMETER Publisher
    Publisher group: 'PMWG', 'PubCG', 'EPUB3 WG', 'IDPF', or custom.

.PARAMETER Version
    Specification version string (e.g. '3.3', '1.2').

.PARAMETER Description
    Short summary description of the document.

.PARAMETER NoReindex
    Skip automatic re-indexing after adding or removing.

.EXAMPLE
    # List all sources:
    .\tools\manage-sources.ps1 -List

    # Add a new source:
    .\tools\manage-sources.ps1 -Add -Id "epub-my-guide" -Title "Custom EPUB Guide" -Url "https://example.org/epub-guide/" -Type "Note" -Category "Authoring" -Publisher "PubCG"

    # Remove a source:
    .\tools\manage-sources.ps1 -Remove -Id "epub-my-guide"
#>

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [switch]$List,
    [switch]$Add,
    [switch]$Remove,
    [string]$Id,
    [string]$Title,
    [string]$Url,
    [string]$Type = "Note",
    [string]$Category = "EPUB General",
    [string]$Publisher = "PMWG",
    [string]$Version = "",
    [string]$Description = "",
    [switch]$NoReindex,
    [switch]$NativePS
)

# If Node.js is available on PATH and -NativePS is not specified, delegate to cross-platform tools/manage-sources.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -and (-not $NativePS)) {
    $jsScript = Join-Path $PSScriptRoot "manage-sources.js"
    $nodeArgs = @($jsScript)
    if ($List) { $nodeArgs += "--list" }
    if ($Add) {
        $nodeArgs += "--add"; $nodeArgs += "--id"; $nodeArgs += $Id; $nodeArgs += "--title"; $nodeArgs += $Title; $nodeArgs += "--url"; $nodeArgs += $Url
        if ($Type) { $nodeArgs += "--type"; $nodeArgs += $Type }
        if ($Category) { $nodeArgs += "--category"; $nodeArgs += $Category }
        if ($Publisher) { $nodeArgs += "--publisher"; $nodeArgs += $Publisher }
        if ($Version) { $nodeArgs += "--version"; $nodeArgs += $Version }
        if ($Description) { $nodeArgs += "--description"; $nodeArgs += $Description }
    }
    if ($Remove) { $nodeArgs += "--remove"; $nodeArgs += "--id"; $nodeArgs += $Id }
    if ($NoReindex) { $nodeArgs += "--no-reindex" }
    & node @nodeArgs
    exit $LASTEXITCODE
}

$dataPath = Join-Path $ProjectRoot "data"
$sourcesJsonPath = Join-Path $dataPath "sources.json"
$cachePath = Join-Path $dataPath "cache"

if (-not (Test-Path $sourcesJsonPath)) {
    Write-Error "Cannot find sources catalog at: $sourcesJsonPath"
    exit 1
}

$sources = Get-Content -Path $sourcesJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
$sourcesList = [System.Collections.Generic.List[PSCustomObject]]::new()
foreach ($s in $sources) { $sourcesList.Add($s) }

# 1. Action: List Sources
if ($List -or (-not $Add -and -not $Remove)) {
    Write-Output "`n========================================================"
    Write-Output " Registered EPUB Document Sources ($($sourcesList.Count))"
    Write-Output "========================================================`n"

    $sourcesList | Select-Object id, title, type, category, publisher, version | Format-Table -AutoSize
    Write-Output "To add a source:    .\tools\manage-sources.ps1 -Add -Id <id> -Title <title> -Url <url>"
    Write-Output "To remove a source: .\tools\manage-sources.ps1 -Remove -Id <id>"
    Write-Output "To re-index all:    .\tools\reindex.ps1`n"
    exit 0
}

# 2. Action: Remove Source
if ($Remove) {
    if (-not $Id) {
        Write-Error "Please specify the -Id of the document source to remove."
        exit 1
    }

    $existing = $sourcesList | Where-Object { $_.id -eq $Id }
    if (-not $existing) {
        Write-Warning "Source ID '$Id' not found in catalog."
        exit 0
    }

    $filtered = $sourcesList | Where-Object { $_.id -ne $Id }
    $json = $filtered | ConvertTo-Json -Depth 5
    Set-Content -Path $sourcesJsonPath -Value $json -Encoding UTF8
    Write-Output "Successfully removed '$Id' from sources.json."

    # Remove cached HTML file if exists
    $cacheFile = Join-Path $cachePath "$Id.html"
    if (Test-Path $cacheFile) {
        Remove-Item -Path $cacheFile -Force | Out-Null
        Write-Output "Removed cached HTML: $cacheFile"
    }

    if (-not $NoReindex) {
        Write-Output "Triggering automatic re-indexing..."
        & (Join-Path $PSScriptRoot "reindex.ps1") -ProjectRoot $ProjectRoot
    }
    exit 0
}

# 3. Action: Add / Update Source
if ($Add) {
    if (-not $Id) { Write-Error "Please provide -Id (e.g. 'epub-tts-11')"; exit 1 }
    if (-not $Title) { Write-Error "Please provide -Title"; exit 1 }
    if (-not $Url) { Write-Error "Please provide -Url (e.g. 'https://www.w3.org/TR/...')"; exit 1 }

    $newObj = [PSCustomObject]@{
        id = $Id.Trim()
        title = $Title.Trim()
        url = $Url.Trim()
        type = $Type.Trim()
        publisher = $Publisher.Trim()
        category = $Category.Trim()
        version = $Version.Trim()
        description = $Description.Trim()
    }

    $foundIndex = -1
    for ($i = 0; $i -lt $sourcesList.Count; $i++) {
        if ($sourcesList[$i].id -eq $Id) {
            $foundIndex = $i
            break
        }
    }

    if ($foundIndex -ge 0) {
        $sourcesList[$foundIndex] = $newObj
        Write-Output "Updated existing source '$Id'."
    } else {
        $sourcesList.Add($newObj)
        Write-Output "Added new source '$Id'."
    }

    $json = $sourcesList | ConvertTo-Json -Depth 5
    Set-Content -Path $sourcesJsonPath -Value $json -Encoding UTF8
    Write-Output "Updated $sourcesJsonPath."

    if (-not $NoReindex) {
        Write-Output "Triggering re-indexing for source '$Id'..."
        & (Join-Path $PSScriptRoot "reindex.ps1") -ProjectRoot $ProjectRoot -SourceId $Id
    }
    exit 0
}
