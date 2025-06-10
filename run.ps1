# run.ps1 
param(
  [string]$DeviceIP
)

if (-not $DeviceIP) {
  Write-Error "Manjka parameter DeviceIP. Zaženi: .\run.ps1 -DeviceIP 192.168.1.42"
  exit 1
}

$env:DEVICE_IP = $DeviceIP


Write-Host "Nato zaženem apk_installer..."
docker compose up --build -d


$apkPath = Join-Path $PSScriptRoot "apk_output\app-release.apk"
Write-Host "Čakam na APK v $apkPath ..."
while (-not (Test-Path $apkPath)) {
  Start-Sleep -Seconds 2
}

# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
#.\run.ps1 -DeviceIP 192.168.1.42
Write-Host "Povezujem se na napravo $DeviceIP..."
adb connect "$DeviceIP`:5555" | Out-Null
Start-Sleep -Seconds 5

Write-Host "Seznam naprav:"
adb devices

Write-Host "Odstranjujem morebitno prejšnjo instanco aplikacije..."
adb -s "$DeviceIP`:5555" uninstall com.example.mobile_app | Out-Null

Write-Host "Instaliram APK..."
adb -s "$DeviceIP`:5555" install -r $apkPath

Write-Host "Odklapljam napravo..."
adb disconnect "$DeviceIP`:5555"

Write-Host "Namestitev končana. Veselo testiranje!"
