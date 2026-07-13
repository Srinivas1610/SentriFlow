# SentriFlow Simulation & Stress-Test Suite Startup Script
# Automatically builds the C++ native extension and launches the FastAPI benchmark server.

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  SENTRIFLOW TRANSACTION SIMULATOR & BENCHMARK  " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we are in the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# 1. Compile C++ hot-loop evaluator
Write-Host "[1/2] Checking compiler environment and building C++ native extension..." -ForegroundColor Yellow
python app/native/compile.py

# Check if DLL was created
$nativeDir = Join-Path $scriptDir "app\native"
$dllPath = Join-Path $nativeDir "evaluator.dll"

Write-Host ""
if (Test-Path $dllPath) {
    Write-Host "[SUCCESS] C++ native hot-loop extension compiled at $dllPath" -ForegroundColor Green
    Write-Host "[INFO] Engine Mode: C++ Native Acceleration" -ForegroundColor Green
} else {
    Write-Host "[FALLBACK] C++ compiler not available or compilation failed." -ForegroundColor Magenta
    Write-Host "[INFO] Engine Mode: Optimized NumPy/Polars Vectorization" -ForegroundColor Magenta
}
Write-Host ""

# 2. Launch FastAPI web server
Write-Host "[2/2] Launching SentriFlow Benchmark API Server..." -ForegroundColor Yellow
Write-Host "Starting Uvicorn dev server on http://localhost:8000" -ForegroundColor Gray
Write-Host "To monitor live 1M test stream, make a GET request to http://localhost:8000/api/bench/stream" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate the benchmark server." -ForegroundColor DarkGray
Write-Host ""

# Run Uvicorn
python app/main.py
