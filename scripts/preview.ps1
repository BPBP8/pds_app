[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Find-Application {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Names
    )

    foreach ($name in $Names) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }

    throw "Required command was not found: $($Names -join ', '). Install Node.js LTS and try again."
}

function Test-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $listener = New-Object System.Net.Sockets.TcpListener(
        [System.Net.IPAddress]::Loopback,
        $Port
    )

    try {
        $listener.Start()
        return $true
    }
    catch {
        return $false
    }
    finally {
        $listener.Stop()
    }
}

try {
    $projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
    Set-Location -LiteralPath $projectRoot

    Write-Host ''
    Write-Host '========================================' -ForegroundColor DarkGray
    Write-Host '  PDS App - One-click Web Launcher' -ForegroundColor Cyan
    Write-Host '========================================' -ForegroundColor DarkGray

    $nodeCommand = Find-Application -Names @('node.exe', 'node')
    $npmCommand = Find-Application -Names @('npm.cmd', 'npm')
    $nodeVersion = (& $nodeCommand --version).Trim()
    Write-Host "[1/4] Node.js ready: $nodeVersion" -ForegroundColor Green

    $lockFile = Join-Path $projectRoot 'package-lock.json'
    $manifestFile = Join-Path $projectRoot 'package.json'
    $dependencySource = if (Test-Path -LiteralPath $lockFile) { $lockFile } else { $manifestFile }
    $dependencyHash = (Get-FileHash -LiteralPath $dependencySource -Algorithm SHA256).Hash
    $dependencyStamp = Join-Path $projectRoot 'node_modules\.pds-dependencies.sha256'
    $expoPackage = Join-Path $projectRoot 'node_modules\expo\package.json'
    $localExpo = Join-Path $projectRoot 'node_modules\.bin\expo.cmd'
    $installedHash = if (Test-Path -LiteralPath $dependencyStamp) {
        (Get-Content -LiteralPath $dependencyStamp -Raw).Trim()
    }
    else {
        ''
    }

    $needsInstall = -not (Test-Path -LiteralPath $expoPackage) -or $installedHash -ne $dependencyHash

    if ((Test-Path -LiteralPath $expoPackage) -and [string]::IsNullOrWhiteSpace($installedHash)) {
        & $npmCommand ls --depth=0 --silent *> $null
        if ($LASTEXITCODE -eq 0) {
            $needsInstall = $false
            if (-not $DryRun) {
                Set-Content -LiteralPath $dependencyStamp -Value $dependencyHash -Encoding ASCII
            }
        }
    }

    if ($needsInstall) {
        if ($DryRun) {
            Write-Host '[2/4] Dependencies would be installed or refreshed.' -ForegroundColor Yellow
        }
        else {
            Write-Host '[2/4] Installing project dependencies (first launch may take a few minutes)...' -ForegroundColor Yellow
            & $npmCommand install --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed with exit code $LASTEXITCODE."
            }

            Set-Content -LiteralPath $dependencyStamp -Value $dependencyHash -Encoding ASCII
            Write-Host '[2/4] Dependencies ready.' -ForegroundColor Green
        }
    }
    else {
        Write-Host '[2/4] Dependencies already up to date.' -ForegroundColor Green
    }

    $port = $null
    foreach ($candidate in 8765..8775) {
        if (Test-PortAvailable -Port $candidate) {
            $port = $candidate
            break
        }
    }

    if ($null -eq $port) {
        throw 'No free preview port was found between 8765 and 8775.'
    }

    if (-not (Test-Path -LiteralPath $localExpo)) {
        throw 'The local Expo launcher is missing. Delete node_modules and run this launcher again.'
    }

    $previewOutput = Join-Path $projectRoot '.preview-dist'
    $serverScript = Join-Path $projectRoot 'scripts\static-preview.cjs'
    $previewUrl = "http://127.0.0.1:$port/shoot"

    if ($DryRun) {
        Write-Host "[3/4] Would build a clean static web preview." -ForegroundColor Yellow
        Write-Host "[4/4] Would serve $previewUrl" -ForegroundColor Yellow
        Write-Host 'Dry run complete.' -ForegroundColor Green
        exit 0
    }

    Write-Host '[3/4] Building a clean web preview...' -ForegroundColor Cyan
    & $localExpo export --platform web --output-dir $previewOutput --clear --max-workers 4
    if ($LASTEXITCODE -ne 0) {
        throw "Expo export failed with exit code $LASTEXITCODE."
    }

    if (-not (Test-Path -LiteralPath $serverScript)) {
        throw 'The static preview server script is missing.'
    }

    Write-Host "[4/4] Preview ready at $previewUrl" -ForegroundColor Green
    Write-Host 'The browser will open automatically. Press Ctrl+C here to stop.' -ForegroundColor DarkGray
    Write-Host ''

    $browserJob = $null
    if (-not $NoBrowser) {
        $browserJob = Start-Job -ScriptBlock {
            param($Url)

            foreach ($attempt in 1..120) {
                try {
                    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1 | Out-Null
                    Start-Process $Url
                    return
                }
                catch {
                    Start-Sleep -Milliseconds 500
                }
            }
        } -ArgumentList $previewUrl
    }

    $serverExitCode = 1
    try {
        & $nodeCommand $serverScript $previewOutput $port
        $serverExitCode = $LASTEXITCODE
    }
    finally {
        if ($browserJob) {
            if ($browserJob.State -eq 'Running') {
                Stop-Job -Job $browserJob -ErrorAction SilentlyContinue
            }
            Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue
        }
    }

    if ($serverExitCode -ne 0 -and $serverExitCode -ne 130) {
        throw "Preview server stopped with exit code $serverExitCode."
    }
}
catch {
    Write-Host ''
    Write-Host "Launch failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
