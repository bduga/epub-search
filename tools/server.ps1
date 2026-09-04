param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [int]$Port = 8080
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Output "HTTP server listening at $prefix (serving: $ProjectRoot)"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response

    $localPath = $req.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($localPath)) { $localPath = "index.html" }
    $localPath = $localPath -replace '/', '\'
    $filePath = Join-Path $ProjectRoot $localPath

    if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = "text/plain"
        if ($ext -eq ".html") { $contentType = "text/html; charset=utf-8" }
        elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
        elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
        elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
        elseif ($ext -eq ".csv") { $contentType = "text/csv; charset=utf-8" }

        $res.ContentType = $contentType
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.Close()
}
