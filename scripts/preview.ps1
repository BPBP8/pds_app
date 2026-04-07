# Expo Reliable Preview

$port = 8081
Write-Host ">>> Checking port $port..." -ForegroundColor Gray

$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($process) {
    Write-Host ">>> Found existing process ($process) on port $port. Terminating..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host ">>> Starting Expo Web Preview..." -ForegroundColor Cyan
Write-Host ">>> Press Ctrl+C in this terminal to stop the server." -ForegroundColor Gray
npx expo start --web
