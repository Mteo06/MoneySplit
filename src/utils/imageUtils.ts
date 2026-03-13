/**
 * Compresses and resizes an image File to a Base64 string.
 * Uses a canvas to resize + compress, keeping file size small enough
 * to store directly in Firestore (well under the 1MB document limit).
 *
 * @param file        The image File from an <input type="file">
 * @param maxWidth    Max width of the output image (default 800px)
 * @param maxHeight   Max height of the output image (default 800px)
 * @param quality     JPEG quality 0–1 (default 0.75)
 * @returns           Base64 data URL string (e.g. "data:image/jpeg;base64,...")
 */
export function compressImageToBase64(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratioW = maxWidth / width;
          const ratioH = maxHeight / height;
          const ratio = Math.min(ratioW, ratioH);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Specialized compressor for avatar/profile pictures.
 * Crops to a square and resizes to 200×200px.
 */
export function compressAvatarToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }

        // Center-crop to square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
