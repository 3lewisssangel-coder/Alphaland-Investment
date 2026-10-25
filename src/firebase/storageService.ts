import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads an image file to Firebase Storage.
 * Falls back to high-fidelity Base64 Data URL if Storage fails or is blocked.
 * 
 * @param folder 'deposit-proofs' | 'admin-qr'
 * @param file File to upload
 * @param customName Optional custom filename
 */
export async function uploadImageToStorage(
  folder: 'deposit-proofs' | 'admin-qr',
  file: File,
  customName?: string
): Promise<string> {
  const timestamp = Date.now();
  const safeName = customName || `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const filePath = `${folder}/${safeName}`;

  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (storageError) {
    console.warn(`Direct Firebase Storage upload for ${filePath} encountered issue, using optimized Data URL fallback:`, storageError);
    // Reliable fallback: read and compress image to base64 Data URL
    return await readFileAsCompressedDataUrl(file);
  }
}

/**
 * Reads a File into a compressed image Data URL for reliable storage
 */
export function readFileAsCompressedDataUrl(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
