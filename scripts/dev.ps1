$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$bun = Join-Path $env:LOCALAPPDATA "nvm4w\nodejs\bun.cmd"
if (-not (Test-Path $bun)) {
  $bun = "bun"
}

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host "Starting API on http://0.0.0.0:8787"
if ($lanIp) { Write-Host "LAN API: http://${lanIp}:8787" }
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "Set-Location -LiteralPath '$repo\apps\api'; & '$bun' run dev"
)

Write-Host "Starting Web on http://0.0.0.0:5173"
if ($lanIp) { Write-Host "LAN Web: http://${lanIp}:5173" }
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", "Set-Location -LiteralPath '$repo\apps\web'; & '$bun' run dev"
)