/**
 * Converts an image File into a base64 data URL, resized to at most
 * 256×256 px (preserving aspect ratio) and re-encoded as JPEG.
 * Throws a descriptive Error on unsupported file types or canvas failures.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Unsupported image type "${file.type}". Please upload a JPEG, PNG, GIF, or WebP.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the image file.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the image.'));
      img.onload = () => {
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const w = Math.round(img.width  * ratio);
        const h = Math.round(img.height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported.')); return; }
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        if (!dataUrl || dataUrl === 'data:,') {
          reject(new Error('Could not encode the image.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
