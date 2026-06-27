$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$bun = Join-Path $env:LOCALAPPDATA "nvm4w\nodejs\bun.cmd"
if (-not (Test-Path $bun)) {
  $bun = "bun"
}

Write-Host "Starting API on http://localhost:8787"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "Set-Location -LiteralPath '$repo\apps\api'; & '$bun' run dev"
)

Write-Host "Starting Web on http://localhost:5173"
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "Set-Location -LiteralPath '$repo\apps\web'; & '$bun' run dev"
)