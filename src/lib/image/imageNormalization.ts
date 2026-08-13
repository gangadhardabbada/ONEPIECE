import heic2any from 'heic2any';

export async function normalizeImageFile(file: File): Promise<Blob> {
  const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
  
  if (isHeic) {
    try {
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      return Array.isArray(converted) ? converted[0] : converted;
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to process HEIC image.');
    }
  }
  
  return file;
}

export function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
