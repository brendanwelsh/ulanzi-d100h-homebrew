# keysender.ps1 - long-lived Windows key/media injector for the D100H Mirror plugin.
#
# app.js spawns this once and streams one command per line on stdin, so the
# native input is replayed with low latency (no per-press process spawn):
#
#   chord|11 43      -> press a chord of virtual-key codes (hex), e.g. Ctrl+C
#   chord|af         -> a single key, e.g. Volume Up
#   text|Hello{ENTER} -> type text via SendKeys (already escaped by app.js)
#
# Codes are Windows Virtual-Key codes. Media/volume/arrow/nav keys are flagged
# as "extended" so Windows routes them correctly.

$ErrorActionPreference = 'SilentlyContinue'

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class KB {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@
Add-Type -AssemblyName System.Windows.Forms

# Virtual-key codes that must carry KEYEVENTF_EXTENDEDKEY (media, volume,
# browser, arrows, and the insert/delete/home/end/page nav cluster).
$ext = @(0xA6,0xA7,0xA8,0xA9,0xAA,0xAB,0xAC,0xAD,0xAE,0xAF,
         0xB0,0xB1,0xB2,0xB3,0xB4,0xB5,0xB6,0xB7,
         0x21,0x22,0x23,0x24,0x25,0x26,0x27,0x28,0x2D,0x2E)

$KEYUP   = 0x2
$EXTENDED = 0x1

function Send-Chord([string]$codes) {
  $vks = @()
  foreach ($c in ($codes -split '\s+')) { if ($c) { $vks += [int]("0x$c") } }
  if ($vks.Count -eq 0) { return }
  # press in order...
  foreach ($v in $vks) {
    $flag = 0; if ($ext -contains $v) { $flag = $EXTENDED }
    [KB]::keybd_event([byte]$v, 0, $flag, [UIntPtr]::Zero)
  }
  # ...release in reverse
  for ($i = $vks.Count - 1; $i -ge 0; $i--) {
    $v = $vks[$i]
    $flag = $KEYUP; if ($ext -contains $v) { $flag = $KEYUP -bor $EXTENDED }
    [KB]::keybd_event([byte]$v, 0, $flag, [UIntPtr]::Zero)
  }
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }   # stdin closed -> plugin is gone, exit
  if (-not $line.Trim()) { continue }
  $idx = $line.IndexOf('|')
  if ($idx -lt 0) { continue }
  $cmd = $line.Substring(0, $idx)
  $arg = $line.Substring($idx + 1)
  switch ($cmd) {
    'chord' { Send-Chord $arg }
    'text'  { if ($arg) { [System.Windows.Forms.SendKeys]::SendWait($arg) } }
  }
}
