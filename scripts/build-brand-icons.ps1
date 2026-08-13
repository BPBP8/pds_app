param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\assets\images')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$size = 1024
$orange = [System.Drawing.ColorTranslator]::FromHtml('#D85331')
$warmWhite = [System.Drawing.ColorTranslator]::FromHtml('#FFF8F3')
$transparent = [System.Drawing.Color]::Transparent

function New-IconBitmap {
  param(
    [System.Drawing.Color]$Background,
    [System.Drawing.Color]$Mark,
    [string]$Path
  )

  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $bodyPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $humpPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $questionPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $questionPen = [System.Drawing.Pen]::new($Mark, 48)
  $markBrush = [System.Drawing.SolidBrush]::new($Mark)
  $cutoutBrush = [System.Drawing.SolidBrush]::new($Background)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear($Background)

    $questionPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $questionPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $questionPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # A friendly, unmistakable camera body with a single raised top section.
    $bodyPath.AddArc(158, 314, 156, 156, 180, 90)
    $bodyPath.AddLine(236, 314, 788, 314)
    $bodyPath.AddArc(710, 314, 156, 156, 270, 90)
    $bodyPath.AddLine(866, 392, 866, 650)
    $bodyPath.AddArc(710, 572, 156, 156, 0, 90)
    $bodyPath.AddLine(788, 728, 236, 728)
    $bodyPath.AddArc(158, 572, 156, 156, 90, 90)
    $bodyPath.AddLine(158, 650, 158, 392)
    $bodyPath.CloseFigure()
    $graphics.FillPath($markBrush, $bodyPath)

    $humpPath.AddArc(276, 250, 84, 84, 180, 90)
    $humpPath.AddLine(318, 250, 454, 250)
    $humpPath.AddArc(412, 250, 84, 84, 270, 90)
    $humpPath.AddLine(496, 292, 496, 356)
    $humpPath.AddLine(276, 356, 276, 292)
    $humpPath.CloseFigure()
    $graphics.FillPath($markBrush, $humpPath)

    # Punch out the lens and one small status light. SourceCopy is required for
    # the transparent Android and splash foreground assets.
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.FillEllipse($cutoutBrush, 349, 356, 326, 326)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver

    # The question mark lives inside the lens: camera first, “拍点啥” second.
    $questionPath.StartFigure()
    $questionPath.AddBezier(431, 466, 431, 420, 471, 394, 517, 394)
    $questionPath.AddBezier(517, 394, 571, 394, 603, 428, 603, 472)
    $questionPath.AddBezier(603, 472, 603, 508, 581, 528, 551, 544)
    $questionPath.AddBezier(551, 544, 523, 560, 513, 576, 513, 602)
    $graphics.DrawPath($questionPen, $questionPath)
    $graphics.FillEllipse($markBrush, 486, 626, 54, 54)

    $directory = Split-Path -Parent $Path
    [System.IO.Directory]::CreateDirectory($directory) | Out-Null
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $cutoutBrush.Dispose()
    $markBrush.Dispose()
    $questionPen.Dispose()
    $questionPath.Dispose()
    $humpPath.Dispose()
    $bodyPath.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$output = [System.IO.Path]::GetFullPath($OutputDirectory)
New-IconBitmap -Background $orange -Mark $warmWhite -Path (Join-Path $output 'icon-pds.png')
New-IconBitmap -Background $transparent -Mark $warmWhite -Path (Join-Path $output 'android-icon-pds.png')
New-IconBitmap -Background $transparent -Mark $orange -Path (Join-Path $output 'splash-icon-pds.png')

Write-Host "Brand icons generated in $output"
