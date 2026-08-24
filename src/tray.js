import { spawn } from 'child_process';

export function startSystray() {
  if (process.platform !== 'win32') return;

  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class WinUtil {
    public const int GWL_EXSTYLE       = -20;
    public const int WS_EX_APPWINDOW   = 0x00040000;
    public const int WS_EX_TOOLWINDOW  = 0x00000080;
    public const uint EVENT_SYSTEM_MINIMIZESTART = 0x0016;
    public const uint WINEVENT_OUTOFCONTEXT      = 0x0000;

    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int n);
    [DllImport("user32.dll")] public static extern int  GetWindowLong(IntPtr hWnd, int n);
    [DllImport("user32.dll")] public static extern int  SetWindowLong(IntPtr hWnd, int n, int v);

    public delegate void WinEventDelegate(
        IntPtr hook, uint evt, IntPtr hwnd,
        int obj, int child, uint thread, uint time);

    [DllImport("user32.dll")]
    public static extern IntPtr SetWinEventHook(
        uint eMin, uint eMax, IntPtr mod,
        WinEventDelegate proc,
        uint pid, uint tid, uint flags);

    [DllImport("user32.dll")]
    public static extern bool UnhookWinEvent(IntPtr hook);
}
"@

# Naik 2 level: PS -> node.exe -> cmd.exe
function Get-AncestorHwnd {
    $pid1 = (Get-CimInstance Win32_Process -Filter "ProcessId = $PID").ParentProcessId
    $pid2 = (Get-CimInstance Win32_Process -Filter "ProcessId = $pid1").ParentProcessId
    try { return (Get-Process -Id $pid2 -ErrorAction Stop).MainWindowHandle } catch { return [IntPtr]::Zero }
}

$cmdHwnd = Get-AncestorHwnd

function Hide-ToTray {
    if ($cmdHwnd -eq [IntPtr]::Zero) { return }
    # Hapus dari taskbar: tambah TOOLWINDOW, hapus APPWINDOW
    $ex = [WinUtil]::GetWindowLong($cmdHwnd, [WinUtil]::GWL_EXSTYLE)
    $ex = ($ex -bor [WinUtil]::WS_EX_TOOLWINDOW) -band (-bnot [WinUtil]::WS_EX_APPWINDOW)
    [WinUtil]::SetWindowLong($cmdHwnd, [WinUtil]::GWL_EXSTYLE, $ex) | Out-Null
    [WinUtil]::ShowWindow($cmdHwnd, 0) | Out-Null  # SW_HIDE
}

function Show-FromTray {
    if ($cmdHwnd -eq [IntPtr]::Zero) { return }
    # Kembalikan ke taskbar: hapus TOOLWINDOW, tambah APPWINDOW
    $ex = [WinUtil]::GetWindowLong($cmdHwnd, [WinUtil]::GWL_EXSTYLE)
    $ex = ($ex -band (-bnot [WinUtil]::WS_EX_TOOLWINDOW)) -bor [WinUtil]::WS_EX_APPWINDOW
    [WinUtil]::SetWindowLong($cmdHwnd, [WinUtil]::GWL_EXSTYLE, $ex) | Out-Null
    [WinUtil]::ShowWindow($cmdHwnd, 9) | Out-Null  # SW_RESTORE
}

# ── Tray Icon ────────────────────────────────────────────────────────
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon   = [System.Drawing.SystemIcons]::Application
$notify.Text   = "BuktiDukung Helper"
$notify.Visible = $true

$menu     = New-Object System.Windows.Forms.ContextMenu
$mDash    = New-Object System.Windows.Forms.MenuItem("Buka Dashboard")
$mShow    = New-Object System.Windows.Forms.MenuItem("Tampilkan Terminal")
$mExit    = New-Object System.Windows.Forms.MenuItem("Keluar")

$mDash.add_Click({ Start-Process "http://localhost:3000" })
$mShow.add_Click({ Show-FromTray })
$mExit.add_Click({
    $notify.Visible = $false
    $nodePid = $env:APP_NODE_PID
    if ($nodePid) { Stop-Process -Id $nodePid -Force -ErrorAction SilentlyContinue }
    [System.Windows.Forms.Application]::Exit()
})

$menu.MenuItems.Add($mDash) | Out-Null
$menu.MenuItems.Add($mShow) | Out-Null
$menu.MenuItems.Add($mExit) | Out-Null
$notify.ContextMenu = $menu
$notify.add_DoubleClick({ Start-Process "http://localhost:3000" })

# ── Auto-hide setelah 3 detik ────────────────────────────────────────
$t = New-Object System.Windows.Forms.Timer
$t.Interval = 3000
$t.add_Tick({
    $t.Stop()
    Hide-ToTray
})
$t.Start()

# ── Hook minimize button -> hide to tray ────────────────────────────
$hookDelegate = [WinUtil+WinEventDelegate] {
    param($hook, $evt, $hwnd, $obj, $child, $thread, $time)
    if ($hwnd -eq $cmdHwnd) {
        $delay = New-Object System.Windows.Forms.Timer
        $delay.Interval = 50
        $delay.add_Tick({ $delay.Stop(); Hide-ToTray })
        $delay.Start()
    }
}

$hHook = [WinUtil]::SetWinEventHook(
    [WinUtil]::EVENT_SYSTEM_MINIMIZESTART,
    [WinUtil]::EVENT_SYSTEM_MINIMIZESTART,
    [IntPtr]::Zero,
    $hookDelegate,
    0, 0,
    [WinUtil]::WINEVENT_OUTOFCONTEXT
)

[System.Windows.Forms.Application]::Run()
[WinUtil]::UnhookWinEvent($hHook) | Out-Null
`;

  const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, APP_NODE_PID: process.pid.toString() },
  });

  child.unref();
}
