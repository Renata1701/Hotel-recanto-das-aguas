$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here "..\..")

& (Join-Path $here "sync-redirect.ps1")

$htdocs = Join-Path $here "htdocs"
$zip = Join-Path $here "sitema-hotel-upload.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $htdocs "*") -DestinationPath $zip -Force

Write-Host "ZIP: $zip"
