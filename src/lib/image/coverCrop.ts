export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let finalWidth = sourceWidth;
  let finalHeight = sourceHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceRatio > targetRatio) {
    // Source is wider than target, crop horizontally
    finalWidth = sourceHeight * targetRatio;
    offsetX = (sourceWidth - finalWidth) / 2;
  } else {
    // Source is taller than target, crop vertically
    finalHeight = sourceWidth / targetRatio;
    offsetY = (sourceHeight - finalHeight) / 2;
  }

  return {
    sx: offsetX,
    sy: offsetY,
    sWidth: finalWidth,
    sHeight: finalHeight,
    dx: 0,
    dy: 0,
    dWidth: targetWidth,
    dHeight: targetHeight
  };
}
