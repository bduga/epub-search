param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$dataPath = Join-Path $ProjectRoot "data"
$sourcesJsonPath = Join-Path $dataPath "sources.json"
$sourcesJsPath = Join-Path $dataPath "sources.js"
$entriesJsonPath = Join-Path $dataPath "index-entries.json"
$entriesJsPath = Join-Path $dataPath "index-entries.js"

if (Test-Path $sourcesJsonPath) {
    $sourcesJson = Get-Content -Path $sourcesJsonPath -Raw -Encoding UTF8
    $sourcesJs = "window.EPUB_SOURCES = $sourcesJson;"
    Set-Content -Path $sourcesJsPath -Value $sourcesJs -Encoding UTF8
}

if (Test-Path $entriesJsonPath) {
    $entriesJson = Get-Content -Path $entriesJsonPath -Raw -Encoding UTF8
    $entriesJs = "window.EPUB_ENTRIES = $entriesJson;"
    Set-Content -Path $entriesJsPath -Value $entriesJs -Encoding UTF8
}

Write-Output "Generated companion js files for seamless file:// execution in: $dataPath"
