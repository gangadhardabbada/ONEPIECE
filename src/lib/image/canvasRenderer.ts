import { calculateCoverCrop } from './coverCrop';

export interface RenderOptions {
  width?: number;
  height?: number;
}

export async function renderFrame(
  sourceImage: HTMLImageElement,
  options: RenderOptions = {}
): Promise<Blob> {
  const width = options.width || 1080;
  const height = options.height || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // 1. Draw Background (Charcoal)
  ctx.fillStyle = '#111111'; // Charcoal / near-black
  ctx.fillRect(0, 0, width, height);

  // 2. Calculate and Draw Cropped Photo
  const padding = 60; // 60px padding for the frame
  const photoX = padding;
  const photoY = padding;
  const photoWidth = width - (padding * 2);
  const photoHeight = height - (padding * 2) - 100; // Leave extra space at bottom for text

  const crop = calculateCoverCrop(
    sourceImage.width,
    sourceImage.height,
    photoWidth,
    photoHeight
  );

  ctx.save();
  // Optional: subtle rounded corners for the photo
  ctx.beginPath();
  ctx.roundRect(photoX, photoY, photoWidth, photoHeight, 8);
  ctx.clip();
  
  ctx.drawImage(
    sourceImage,
    crop.sx, crop.sy, crop.sWidth, crop.sHeight,
    photoX, photoY, photoWidth, photoHeight
  );
  
  // Optional: Image overlay/tint for the event vibe if needed, but requirements say "photo stays front and center"
  
  ctx.restore();

  // 3. Draw Frame / Signal Branding Graphics
  // Draw yellow signal lines at the top
  ctx.strokeStyle = '#FDE047'; // High contrast yellow
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(photoX, 20);
  ctx.lineTo(photoX + 150, 20);
  ctx.stroke();
  
  ctx.fillStyle = '#FDE047';
  ctx.fillRect(photoX + 155, 17, 6, 6);
  ctx.fillRect(photoX + 165, 17, 6, 6);

  // Warm orange accent line at the bottom
  ctx.strokeStyle = '#EA580C'; // Warm orange
  ctx.beginPath();
  ctx.moveTo(width - padding - 150, height - 20);
  ctx.lineTo(width - padding, height - 20);
  ctx.stroke();

  // Controlled pink small signal dots on the right side
  ctx.fillStyle = '#EC4899';
  ctx.fillRect(width - 25, photoY, 4, 4);
  ctx.fillRect(width - 25, photoY + 15, 4, 4);
  ctx.fillRect(width - 25, photoY + 30, 4, 4);

  // 4. Draw Typography
  ctx.fillStyle = '#F9FAFB'; // Off-white
  
  // Title: HH GOA '26
  ctx.font = 'bold 36px "Inter", -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText("HH GOA '26", photoX, photoY + photoHeight + 20);

  // Positioning for the next line
  ctx.font = '500 20px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#9CA3AF'; // Subtitle gray
  ctx.fillText("LESS NOISE. MORE SIGNAL.", photoX, photoY + photoHeight + 65);

  // Bottom right details
  ctx.textAlign = 'right';
  ctx.fillStyle = '#F9FAFB';
  ctx.font = 'bold 20px "Inter", -apple-system, sans-serif';
  ctx.fillText("28—31 OCT · GOA", width - padding, photoY + photoHeight + 20);

  // Hashtag
  ctx.fillStyle = '#FDE047'; // Yellow
  ctx.font = '500 18px "Inter", -apple-system, sans-serif';
  ctx.fillText("#FrameInGoa", width - padding, photoY + photoHeight + 65);
  
  // Add some subtle geometry (crosshairs)
  ctx.strokeStyle = '#374151'; // faint gray
  ctx.lineWidth = 1;
  const drawCrosshair = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  };
  
  drawCrosshair(padding / 2, padding / 2);
  drawCrosshair(width - padding / 2, padding / 2);
  drawCrosshair(padding / 2, height - padding / 2);
  drawCrosshair(width - padding / 2, height - padding / 2);

  // 5. Export to PNG Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob failed'));
      }
    }, 'image/png', 1.0);
  });
}
