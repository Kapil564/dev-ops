# PowerShell Load Test Script for StockPulse HPA
param(
    [string]$Url = "http://localhost:8000/health",
    [int]$Requests = 500
)

Write-Host "Sending $Requests requests to $Url to trigger HPA..." -ForegroundColor Cyan

for ($i = 1; $i -le $Requests; $i++) {
    try {
        $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    } catch {
        # ignore transient timeouts under heavy load
    }
    if ($i % 50 -eq 0) {
        Write-Host "Sent $i of $Requests requests..." -ForegroundColor Green
    }
}

Write-Host "Load test completed successfully!" -ForegroundColor Green
