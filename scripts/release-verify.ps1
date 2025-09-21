param(
  [string]$Url = "https://coderrvrse.github.io/fc-barcelona-kids/",
  [string]$ExpectCss = "styles/main.css?v=23.1",
  [string]$ExpectJs  = "scripts/main.js?v=23.1",
  [string]$SwPath    = "sw.js",
  [string]$ExpectSwVersion = "CACHE_VERSION=v23.1"
)

Write-Host "🔎 Fetch home…" -ForegroundColor Cyan
$home = Invoke-WebRequest -Uri $Url -UseBasicParsing
if ($home.StatusCode -ne 200) { throw "Home not 200" }

# Check version-tagged assets present
if ($home.Content -notmatch [Regex]::Escape($ExpectCss)) { throw "CSS version tag missing: $ExpectCss" }
if ($home.Content -notmatch [Regex]::Escape($ExpectJs))  { throw "JS version tag missing:  $ExpectJs" }

Write-Host "🔎 Fetch SW…" -ForegroundColor Cyan
$sw = Invoke-WebRequest -Uri ($Url + $SwPath) -UseBasicParsing
if ($sw.StatusCode -ne 200) { throw "SW not 200" }
if ($sw.Content -notmatch [Regex]::Escape($ExpectSwVersion)) { throw "SW version mismatch; expected $ExpectSwVersion" }

Write-Host "✅ Versioned assets + SW version OK" -ForegroundColor Green

# Basic link check on same-origin href/src
$links = ([regex]::Matches($home.Content, '(href|src)=\"([^\"#]+)\"')) | % { $_.Groups[2].Value } |
         ? { $_ -notmatch '^https?://' } | % { ($_ -replace '^\./','') }
$errors = @()
foreach ($l in $links) {
  $u = if ($l.StartsWith("/")) { $Url.TrimEnd("/") + $l } else { $Url + $l }
  try {
    $r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 20
    if ($r.StatusCode -ge 400) { $errors += "$u -> $($r.StatusCode)" }
  } catch { $errors += "$u -> exception: $($_.Exception.Message)" }
}
if ($errors.Count -gt 0) {
  Write-Host "❌ Link issues:`n$($errors -join "`n")" -ForegroundColor Red
  throw "Link check failed"
}

Write-Host "✅ Link check passed" -ForegroundColor Green
Write-Host "🎉 v23.1 verification complete." -ForegroundColor Green