Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path "$PSScriptRoot\assets" -Force | Out-Null

function New-Font($size, $style = 'Regular') { New-Object System.Drawing.Font('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel) }
function Draw-PageIcon($graphics, $x, $y, $size) {
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $navy = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 36, 62), [Math]::Max(2, $size / 24))
  $blue = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(23, 104, 229), [Math]::Max(2, $size / 28))
  $graphics.FillRectangle($white, $x, $y, $size * .78, $size)
  $graphics.DrawRectangle($navy, $x, $y, $size * .78, $size)
  foreach ($ratio in @(.3, .5, .7)) { $graphics.DrawLine($blue, $x + $size * .17, $y + $size * $ratio, $x + $size * .61, $y + $size * $ratio) }
  $white.Dispose(); $navy.Dispose(); $blue.Dispose()
}

$navy = [System.Drawing.Color]::FromArgb(16, 36, 62)
$blue = [System.Drawing.Color]::FromArgb(23, 104, 229)
$muted = [System.Drawing.Color]::FromArgb(102, 116, 138)
$paper = [System.Drawing.Color]::FromArgb(247, 249, 252)
$teal = [System.Drawing.Color]::FromArgb(15, 118, 110)

$promo = New-Object System.Drawing.Bitmap(440, 280)
$graphics = [System.Drawing.Graphics]::FromImage($promo); $graphics.SmoothingMode = 'AntiAlias'; $graphics.Clear($paper)
Draw-PageIcon $graphics 42 51 74
$display = New-Font 32 'Bold'; $body = New-Font 16; $utility = New-Font 11 'Bold'
$graphics.DrawString('PAGE CAPTURE', $utility, (New-Object System.Drawing.SolidBrush($blue)), 145, 55)
$graphics.DrawString('Every page.', $display, (New-Object System.Drawing.SolidBrush($navy)), 141, 82)
$graphics.DrawString('Already captured.', $display, (New-Object System.Drawing.SolidBrush($blue)), 141, 120)
$graphics.DrawString('Local records for licensing applications', $body, (New-Object System.Drawing.SolidBrush($muted)), 43, 218)
$promo.Save("$PSScriptRoot\assets\small-promo-440x280.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $promo.Dispose(); $display.Dispose(); $body.Dispose(); $utility.Dispose()

function Make-Screenshot($filename, $complete) {
  $bitmap = New-Object System.Drawing.Bitmap(1280, 800)
  $g = [System.Drawing.Graphics]::FromImage($bitmap); $g.SmoothingMode = 'AntiAlias'; $g.Clear($paper)
  $title = New-Font 44 'Bold'; $bodyFont = New-Font 20; $small = New-Font 14 'Bold'; $head = New-Font 24 'Bold'
  $headline = if ($complete) { "Review the record`nbefore you close it." } else { "Capture while the application`nmoves forward." }
  $subhead = if ($complete) { 'Thumbnails, outcomes, and individual removal keep every test understandable.' } else { 'Page Capture saves locally before recognized Next and Continue actions.' }
  $g.DrawString($headline, $title, (New-Object System.Drawing.SolidBrush($navy)), 70, 75)
  $g.DrawString($subhead, $bodyFont, (New-Object System.Drawing.SolidBrush($muted)), 74, 200)
  $px = 760; $py = 55
  $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $px, $py, 420, 690)
  $g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 220, 231), 2)), $px, $py, 420, 690)
  Draw-PageIcon $g ($px + 25) ($py + 25) 43
  $g.DrawString('APPLICATION RECORD', $small, (New-Object System.Drawing.SolidBrush($blue)), $px + 85, $py + 26)
  $g.DrawString('Page Capture', $head, (New-Object System.Drawing.SolidBrush($navy)), $px + 84, $py + 45)
  if ($complete) {
    $g.DrawString('TEST COMPLETE', $small, (New-Object System.Drawing.SolidBrush($blue)), $px + 145, $py + 150)
    $g.DrawString('Utah RN test', $head, (New-Object System.Drawing.SolidBrush($navy)), $px + 130, $py + 185)
    for ($i = 0; $i -lt 3; $i++) {
      $bx = $px + 45 + $i * 110; $g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(216, 224, 233), 1)), $bx, $py + 245, 100, 75)
      $g.DrawString(@('8', '1', '0')[$i], $head, (New-Object System.Drawing.SolidBrush($navy)), $bx + 38, $py + 254)
      $g.DrawString(@('SAVED', 'SKIPPED', 'REVIEW')[$i], $small, (New-Object System.Drawing.SolidBrush($muted)), $bx + 15, $py + 290)
    }
    $labels = @('Education history', 'Employment history', 'Attestation')
    for ($i = 0; $i -lt 3; $i++) { $yy = $py + 350 + $i * 70; $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 252))), $px + 35, $yy, 350, 55); $g.DrawString('Saved', $small, (New-Object System.Drawing.SolidBrush($teal)), $px + 50, $yy + 18); $g.DrawString($labels[$i], $bodyFont, (New-Object System.Drawing.SolidBrush($navy)), $px + 120, $yy + 12) }
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($blue)), $px + 35, $py + 590, 350, 48); $g.DrawString('Open screenshots', $bodyFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $px + 132, $py + 600)
  } else {
    $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(232, 247, 244))), $px + 30, $py + 110, 360, 80)
    $g.DrawString('CAPTURING', $small, (New-Object System.Drawing.SolidBrush($teal)), $px + 50, $py + 125); $g.DrawString('Utah RN test', $bodyFont, (New-Object System.Drawing.SolidBrush($navy)), $px + 50, $py + 150); $g.DrawString('4', $title, (New-Object System.Drawing.SolidBrush($teal)), $px + 335, $py + 118)
    $labels = @('Personal information', 'Education history', 'Employment history', 'License details')
    for ($i = 0; $i -lt 4; $i++) { $yy = $py + 225 + $i * 75; $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 252))), $px + 35, $yy, 350, 60); $g.DrawString('Saved', $small, (New-Object System.Drawing.SolidBrush($teal)), $px + 50, $yy + 20); $g.DrawString($labels[$i], $bodyFont, (New-Object System.Drawing.SolidBrush($navy)), $px + 120, $yy + 14) }
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($blue)), $px + 35, $py + 570, 350, 48); $g.DrawString('Finish test', $bodyFont, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), $px + 155, $py + 580)
  }
  $bitmap.Save("$PSScriptRoot\assets\$filename", [System.Drawing.Imaging.ImageFormat]::Png)
  $title.Dispose(); $bodyFont.Dispose(); $small.Dispose(); $head.Dispose(); $g.Dispose(); $bitmap.Dispose()
}

Make-Screenshot 'screenshot-capturing-1280x800.png' $false
Make-Screenshot 'screenshot-complete-1280x800.png' $true
