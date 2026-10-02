# PORTFOLIO - instalacny skript (spustaj cez NAHOD.bat)
$ErrorActionPreference = "Continue"
$host.ui.RawUI.WindowTitle = "PORTFOLIO - instalacia"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PORTFOLIO - hotovy projekt (Android)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1/5] Vytvaram platformne priecinky (android)..." -ForegroundColor Yellow
flutter create . --platforms android
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA pri flutter create" -ForegroundColor Red; pause; exit 1 }

Write-Host "`n[2/5] Aktivujem ikony..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "icons\mipmap-mdpi"    "android\app\src\main\res\"
Copy-Item -Recurse -Force "icons\mipmap-hdpi"    "android\app\src\main\res\"
Copy-Item -Recurse -Force "icons\mipmap-xhdpi"   "android\app\src\main\res\"
Copy-Item -Recurse -Force "icons\mipmap-xxhdpi"  "android\app\src\main\res\"
Copy-Item -Recurse -Force "icons\mipmap-xxxhdpi" "android\app\src\main\res\"

Write-Host "[3/5] Upravujem AndroidManifest (nazov + INTERNET pre release)..." -ForegroundColor Yellow
$man = "android\app\src\main\AndroidManifest.xml"
$c = Get-Content $man -Raw -Encoding UTF8
# nazov appky
$c = $c -replace 'android:label="[^"]*"', 'android:label="Portfolio"'
# INTERNET permission (debug ju ma automaticky, release nie!)
if ($c -notmatch "android.permission.INTERNET") {
    $c = $c -replace "<application", "<uses-permission android:name=`"android.permission.INTERNET`"/>`n`n    <application"
}
Set-Content $man $c -Encoding UTF8 -NoNewline

Write-Host "[4/5] Stahujem balicky (pub get)..." -ForegroundColor Yellow
flutter pub get
if ($LASTEXITCODE -ne 0) { Write-Host "CHYBA pri pub get" -ForegroundColor Red; pause; exit 1 }

Write-Host "`n[5/5] Hotovo!" -ForegroundColor Green
Write-Host "`nSpustenie na telefone (debug):" -ForegroundColor White
Write-Host "    flutter run -d RZCX30D3ERM" -ForegroundColor Cyan
Write-Host "`nVytvorenie instalacneho APK (release):" -ForegroundColor White
Write-Host "    flutter build apk --release" -ForegroundColor Cyan
Write-Host "    (APK najdes v build\app\outputs\flutter-apk\app-release.apk)" -ForegroundColor Gray
Write-Host "`n"
pause
