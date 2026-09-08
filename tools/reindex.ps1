<#
.SYNOPSIS
    Automated Crawler & Re-Indexing Pipeline for EPUB Documentation Search Engine.

.DESCRIPTION
    Ingests all official EPUB specifications from data/sources.json, extracts deep
    semantic sections, headings, anchors, summaries, and keyword vocabulary terms,
    and updates data/index-entries.json, data/index-entries.js, data/sources.js,
    and data/sources.csv.

.PARAMETER RefreshCache
    Forces re-downloading fresh HTML from external W3C URLs instead of using data/cache/.

.PARAMETER SourceId
    Re-index only a specific document source ID instead of all sources.

.EXAMPLE
    .\tools\reindex.ps1
    .\tools\reindex.ps1 -RefreshCache
    .\tools\reindex.ps1 -SourceId epub-33
#>

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [switch]$RefreshCache,
    [string]$SourceId = "",
    [int]$MaxPerDoc = 0,
    [switch]$NativePS
)

# If Node.js is available on PATH and -NativePS is not specified, delegate to cross-platform tools/reindex.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -and (-not $NativePS)) {
    $jsScript = Join-Path $PSScriptRoot "reindex.js"
    $nodeArgs = @($jsScript)
    if ($RefreshCache) { $nodeArgs += "--refresh" }
    if ($SourceId) { $nodeArgs += "--source"; $nodeArgs += $SourceId }
    & node @nodeArgs
    exit $LASTEXITCODE
}

$startTime = [System.Diagnostics.Stopwatch]::StartNew()

$dataPath = Join-Path $ProjectRoot "data"
$cachePath = Join-Path $dataPath "cache"
$sourcesJsonPath = Join-Path $dataPath "sources.json"
$entriesJsonPath = Join-Path $dataPath "index-entries.json"
$sourcesJsPath = Join-Path $dataPath "sources.js"
$entriesJsPath = Join-Path $dataPath "index-entries.js"
$sourcesCsvPath = Join-Path $dataPath "sources.csv"

if (-not (Test-Path $cachePath)) {
    New-Item -ItemType Directory -Path $cachePath -Force | Out-Null
}

if (-not (Test-Path $sourcesJsonPath)) {
    Write-Error "Cannot find sources catalog at: $sourcesJsonPath"
    exit 1
}

$sources = Get-Content -Path $sourcesJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($SourceId) {
    $sources = @($sources | Where-Object { $_.id -eq $SourceId })
    if ($sources.Count -eq 0) {
        Write-Error "Source ID '$SourceId' not found in sources.json"
        exit 1
    }
}

Write-Output "`n========================================================"
Write-Output " EPUB Documentation Crawler & Automated Indexer"
Write-Output " Target Sources: $($sources.Count)"
Write-Output " Cache Mode:     $(if ($RefreshCache) { 'Refresh (Re-downloading)' } else { 'Enabled (data/cache/)' })"
Write-Output "========================================================`n"

function Clean-HtmlText([string]$text) {
    if (-not $text) { return "" }
    $t = $text -replace '<[^>]+>', ' '
    $t = $t -replace '&nbsp;', ' ' -replace '&amp;', '&' -replace '&lt;', '<' -replace '&gt;', '>' -replace '&quot;', '"' -replace '&#039;', "'"
    $t = $t -replace '\s+', ' '
    return $t.Trim()
}

# Stopwords to filter out from keyword extraction
$stopWords = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@("the", "and", "for", "with", "this", "that", "from", "each", "must", "should", "may",
  "can", "not", "have", "has", "are", "were", "been", "will", "would", "which", "when",
  "what", "where", "into", "than", "more", "also", "some", "such", "only", "about",
  "div", "span", "true", "false", "http", "https", "null", "string", "number", "none",
  "see", "note", "section", "appendix", "table", "example", "using", "used", "defined") | ForEach-Object { $stopWords.Add($_) | Out-Null }

# Canonical RFC 2119 requirement keywords
$validRfc2119 = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
@("MAY", "MUST", "MUST NOT", "OPTIONAL", "RECOMMENDED", "REQUIRED", "SHOULD", "SHOULD NOT") | ForEach-Object { $validRfc2119.Add($_) | Out-Null }

$allEntries = [System.Collections.Generic.List[PSCustomObject]]::new()
$processedSources = 0
$totalExtracted = 0

for ($sIdx = 0; $sIdx -lt $sources.Count; $sIdx++) {
    $src = $sources[$sIdx]
    $processedSources++
    $cacheFile = Join-Path $cachePath "$($src.id).html"

    Write-Host "[$($sIdx + 1)/$($sources.Count)] " -NoNewline -ForegroundColor Cyan
    Write-Host "$($src.id) " -NoNewline -ForegroundColor White
    Write-Host "($($src.type))" -ForegroundColor Gray

    $html = ""
    $needsDownload = $RefreshCache -or (-not (Test-Path $cacheFile))

    if ($needsDownload) {
        try {
            Write-Host "    Downloading $($src.url)... " -NoNewline -ForegroundColor Yellow
            $req = [System.Net.HttpWebRequest]::Create($src.url)
            $req.UserAgent = "EPUB-Search-Indexer/1.0 (+https://github.com/duga/epub-search)"
            $req.Timeout = 25000
            $resp = $req.GetResponse()
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $html = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $resp.Close()

            Set-Content -Path $cacheFile -Value $html -Encoding UTF8
            Write-Host "OK ($([Math]::Round($html.Length / 1024, 1)) KB)" -ForegroundColor Green
        } catch {
            Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
            if (Test-Path $cacheFile) {
                Write-Host "    Using existing cache file fallback." -ForegroundColor DarkYellow
                $html = Get-Content -Path $cacheFile -Raw -Encoding UTF8
            } else {
                continue
            }
        }
    } else {
        $html = Get-Content -Path $cacheFile -Raw -Encoding UTF8
        Write-Host "    Loaded from cache ($([Math]::Round($html.Length / 1024, 1)) KB)" -ForegroundColor DarkGray
    }

    if (-not $html) { continue }

    # Parse sections from HTML
    # Matches <section id="..."> or <div class="section" id="...">
    $secMatches = [regex]::Matches($html, '(?si)<(?:section|div\b[^>]*class="[^"]*section[^"]*")\b[^>]*\bid="([^"]+)"[^>]*>(.*?)(?=(?:<(?:section|div\b[^>]*class="[^"]*section[^"]*")\b[^>]*\bid=)|(?:<footer\b)|(?:</body>)|$)')

    $srcExtracted = 0
    $seenAnchors = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    foreach ($m in $secMatches) {
        $secId = $m.Groups[1].Value.Trim()
        $secContent = $m.Groups[2].Value

        if ($seenAnchors.Contains($secId)) { continue }

        # Filter out administrative boilerplate
        if ($secId -match '^(?:abstract|sotd|status|toc|table-of-contents|references|normative-references|informative-references|acknowledgments|acknowledgements|change-log|changes|index|index-of-terms|index-terms|terms-index|privacy|security-considerations|privacy-considerations)$') {
            continue
        }

        # Extract heading
        $hMatch = [regex]::Match($secContent, '(?si)<h[1-6]\b[^>]*>(.*?)</h[1-6]>')
        if (-not $hMatch.Success) { continue }

        $rawHeading = Clean-HtmlText $hMatch.Groups[1].Value
        if ($rawHeading.Length -lt 2) { continue }

        # Filter out headings that are just boilerplate
        if ($rawHeading -match '^(Table of Contents|References|Normative References|Informative References|Acknowledgments|Changes|Index|Status of This Document)$') {
            continue
        }

        # Parse section number if any
        $secNumber = ""
        $cleanTitle = $rawHeading
        if ($rawHeading -match '^(\d+(\.\d+)*)\s+(.*)$') {
            $secNumber = "Section $($Matches[1])"
            $cleanTitle = $Matches[3]
        } elseif ($rawHeading -match '^(Appendix\s+[A-Z](\.\d+)*)\s+(.*)$') {
            $secNumber = $Matches[1]
            $cleanTitle = $Matches[3]
        }

        # Extract summary paragraph
        $summary = ""
        $pMatches = [regex]::Matches($secContent, '(?si)<p\b[^>]*>(.*?)</p>')
        foreach ($pm in $pMatches) {
            $cleanP = Clean-HtmlText $pm.Groups[1].Value
            # Avoid boilerplate paragraphs
            if ($cleanP.Length -gt 35 -and -not ($cleanP -match '^(This section is non-normative|Status of this document|Copyright|All Rights Reserved)')) {
                $summary = $cleanP
                break
            }
        }

        if (-not $summary) {
            $summary = "$cleanTitle in official $($src.title)."
        } elseif ($summary.Length -gt 240) {
            $summary = $summary.Substring(0, 237) + "..."
        }

        # Extract keywords: definitions (<dfn>), code (<code>), and distinct title terms
        $kwMatches = [regex]::Matches($secContent, '(?si)<(?:dfn|code|var|span\b[^>]*class="[^"]*(?:attribute|property|element)[^"]*")\b[^>]*>(.*?)</(?:dfn|code|var|span)>')
        $keywords = [System.Collections.Generic.List[string]]::new()

        # Add distinct title words
        $titleWords = $cleanTitle -replace '[^\w\-\:]', ' ' -split '\s+'
        foreach ($tw in $titleWords) {
            $twLower = $tw.ToLower()
            if ($twLower.Length -ge 3 -and -not $stopWords.Contains($twLower) -and -not $keywords.Contains($twLower)) {
                $keywords.Add($twLower)
            }
        }

        foreach ($km in $kwMatches) {
            $kw = Clean-HtmlText $km.Groups[1].Value
            $kwLower = $kw.ToLower()
            if ($kw.Length -ge 3 -and $kw.Length -le 35 -and -not $stopWords.Contains($kwLower)) {
                if (-not $keywords.Contains($kw)) {
                    $keywords.Add($kw)
                    if ($keywords.Count -ge 8) { break }
                }
            }
        }

        # Extract RFC 2119 requirement keywords (strictly elements with class="rfc2119")
        $rfcMatches = [regex]::Matches($secContent, '(?si)<([a-z0-9]+)\b[^>]*class="[^"]*\brfc2119\b[^"]*"[^>]*>(.*?)</\1>')
        $rfcSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($rm in $rfcMatches) {
            $t = (Clean-HtmlText $rm.Groups[2].Value).ToUpper()
            if ($validRfc2119.Contains($t)) {
                $rfcSet.Add($t) | Out-Null
            }
        }
        $rfcTerms = @($rfcSet | Sort-Object)

        $baseUrl = $src.url.TrimEnd('/')
        $anchorUrl = "$baseUrl/#$secId"

        $entry = [PSCustomObject]@{
            id = "$($src.id)-$secId"
            sourceId = $src.id
            title = $cleanTitle
            section = if ($secNumber) { $secNumber } else { "Section" }
            anchor = "#$secId"
            url = $anchorUrl
            category = $src.category
            type = $src.type
            publisher = $src.publisher
            keywords = @($keywords)
            rfc2119 = @($rfcTerms)
            summary = $summary
        }

        $allEntries.Add($entry)
        $seenAnchors.Add($secId) | Out-Null
        $srcExtracted++

        if ($MaxPerDoc -gt 0 -and $srcExtracted -ge $MaxPerDoc) { break }
    }

    Write-Host "    -> Extracted $srcExtracted deep sections." -ForegroundColor Green
    $totalExtracted += $srcExtracted
}

# If we were doing a partial re-index of a single source, merge with remaining existing entries
if ($SourceId -and (Test-Path $entriesJsonPath)) {
    Write-Output "`nMerging updated entries for $SourceId with existing catalog..."
    $existing = Get-Content -Path $entriesJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $kept = $existing | Where-Object { $_.sourceId -ne $SourceId }
    $merged = [System.Collections.Generic.List[PSCustomObject]]::new()
    foreach ($item in $kept) { $merged.Add($item) }
    foreach ($item in $allEntries) { $merged.Add($item) }
    $allEntries = $merged
}

Write-Output "`nWriting generated index files..."

# 1. Save data/index-entries.json
$entriesJson = $allEntries | ConvertTo-Json -Depth 10
Set-Content -Path $entriesJsonPath -Value $entriesJson -Encoding UTF8
$entryCount = $allEntries.Count
Write-Output "  [OK] data/index-entries.json ($entryCount deep entries)"

# 2. Save data/index-entries.js (companion for file:// execution)
$entriesJs = "window.EPUB_ENTRIES = " + $entriesJson + ";"
Set-Content -Path $entriesJsPath -Value $entriesJs -Encoding UTF8
Write-Output "  [OK] data/index-entries.js"

# 3. Save data/sources.js (companion for file:// execution)
$fullSources = Get-Content -Path $sourcesJsonPath -Raw -Encoding UTF8
$sourcesJs = "window.EPUB_SOURCES = " + $fullSources + ";"
Set-Content -Path $sourcesJsPath -Value $sourcesJs -Encoding UTF8
Write-Output "  [OK] data/sources.js"

# 4. Save data/sources.csv (clean formatted CSV)
$fullSourcesObj = $fullSources | ConvertFrom-Json
$csvList = $fullSourcesObj | ForEach-Object {
    [PSCustomObject]@{
        id = $_.id
        title = $_.title
        url = $_.url
        type = $_.type
        publisher = $_.publisher
        category = $_.category
        version = $_.version
        description = $_.description
    }
}
$csvList | Export-Csv -Path $sourcesCsvPath -NoTypeInformation -Encoding UTF8
$csvCount = $csvList.Count
Write-Output "  [OK] data/sources.csv ($csvCount sources)"

$elapsed = $startTime.Elapsed.TotalSeconds
Write-Output "`n========================================================"
Write-Output " Re-Indexing Complete in $([Math]::Round($elapsed, 2)) seconds"
Write-Output " Indexed Documents:  $($fullSourcesObj.Count)"
Write-Output " Indexed Sections:   $($allEntries.Count)"
Write-Output "========================================================`n"
