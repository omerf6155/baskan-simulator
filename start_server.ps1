$conn = Get-NetTCPConnection -LocalPort 5055 -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 600

$targetDir = "C:\Users\Victus\OneDrive\Desktop\Yapay Zeka & Projeler\Baskan_Simulator"
$cmd = "powershell.exe -WindowStyle Hidden -Command ""Set-Location '$targetDir'; & 'C:\Users\Victus\.local\bin\uv.exe' run python server.py"""

$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
    CommandLine = $cmd
    CurrentDirectory = $targetDir
}
Write-Output "Return: $($res.ReturnValue), ProcessId: $($res.ProcessId)"
