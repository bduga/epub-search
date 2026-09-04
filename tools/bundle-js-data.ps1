$sourcesJson = Get-Content -Path "C:\Users\duga\projects\epub-search\data\sources.json" -Raw -Encoding UTF8
$sourcesJs = "window.EPUB_SOURCES = $sourcesJson;"
Set-Content -Path "C:\Users\duga\projects\epub-search\data\sources.js" -Value $sourcesJs -Encoding UTF8

$entriesJson = Get-Content -Path "C:\Users\duga\projects\epub-search\data\index-entries.json" -Raw -Encoding UTF8
$entriesJs = "window.EPUB_ENTRIES = $entriesJson;"
Set-Content -Path "C:\Users\duga\projects\epub-search\data\index-entries.js" -Value $entriesJs -Encoding UTF8
Write-Output "Generated companion js files for seamless file:// execution"
