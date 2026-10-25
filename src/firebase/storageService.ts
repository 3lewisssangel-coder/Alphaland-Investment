import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export interface UploadOptions {
  customName?: string;
  timeoutMs?: number;
  onProgress?: (percent: number) => void;
}

/**
 * Uploads an image file to Firebase Storage.
 * Wrapped in strict try/catch/finally with timeout watchdog to prevent hanging.
 * 
 * @param folder 'deposit-proofs' | 'admin-qr'
 * @param file File to upload
 * @param options Upload options including progress callback and timeout
 */
export async function uploadImageToStorage(
  folder: 'deposit-proofs' | 'admin-qr',
  file: File,
  options?: UploadOptions
): Promise<string> {
  const timestamp = Date.now();
  const safeName = options?.customName || `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const filePath = `${folder}/${safeName}`;
  const timeoutMs = options?.timeoutMs || 10000; // 10 second timeout

  console.log(`[Storage] Starting upload to ${filePath} (${(file.size / 1024).toFixed(1)} KB)...`);

  let storageRef;
  try {
    storageRef = ref(storage, filePath);
  } catch (refError) {
    console.error('Upload error creating storage reference:', refError);
    // Fall back to compressed Data URL
    return await readFileAsCompressedDataUrl(file);
  }

  // Attempt Firebase Storage upload with timeout protection
  try {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    // Track progress if requested
    if (options?.onProgress) {
      uploadTask.on('state_changed', (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        options.onProgress?.(progress);
      });
    }

    // Timeout watchdog promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        try {
          uploadTask.cancel();
        } catch (_) {}
        reject(new Error(`Storage upload timed out after ${timeoutMs / 1000}s. Check network or storage rules.`));
      }, timeoutMs);

      // Clean up timer when upload completes
      uploadTask.then(
        () => clearTimeout(timer),
        () => clearTimeout(timer)
      );
    });

    // Race upload vs timeout
    const snapshot = await Promise.race([uploadTask, timeoutPromise]);
    console.log('[Storage] File uploaded to storage successfully. Fetching download URL...');

    // Download URL with timeout
    const downloadUrlPromise = getDownloadURL(snapshot.ref);
    const urlTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out fetching download URL from Firebase Storage.')), 6000)
    );

    const downloadUrl = await Promise.race([downloadUrlPromise, urlTimeout]);
    console.log('[Storage] Received public download URL:', downloadUrl);
    return downloadUrl;
  } catch (storageError: any) {
    console.error('Upload error:', storageError);

    // Identify specific Firebase Storage error codes
    let reason = storageError?.message || 'Unknown storage error';
    if (storageError?.code) {
      switch (storageError.code) {
        case 'storage/unauthorized':
          reason = 'Permission denied. User does not have access to upload to this bucket path.';
          break;
        case 'storage/canceled':
          reason = 'Upload was canceled.';
          break;
        case 'storage/quota-exceeded':
          reason = 'Storage quota exceeded on Firebase project.';
          break;
        case 'storage/retry-limit-exceeded':
          reason = 'Maximum retry limit exceeded. Please check network connection.';
          break;
        case 'storage/invalid-checksum':
          reason = 'File checksum mismatch.';
          break;
        default:
          reason = `Storage error (${storageError.code}): ${storageError.message}`;
      }
    }
    console.warn(`[Storage] Firebase Storage direct upload failed (${reason}). Falling back to compressed image Data URL.`);

    // Graceful fallback: Read file as high-quality compressed Base64 Data URL so the app NEVER hangs or breaks
    try {
      const fallbackDataUrl = await readFileAsCompressedDataUrl(file);
      console.log('[Storage] Fallback Data URL generated successfully.');
      return fallbackDataUrl;
    } catch (fallbackError) {
      console.error('Upload error in data URL fallback:', fallbackError);
      throw new Error(`Failed to process image: ${storageError?.message || 'Storage error'}`);
    }
  }
}

/**
 * Reads a File into a compressed image Data URL for reliable storage
 */
export function readFileAsCompressedDataUrl(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        reject(new Error('Empty file content'));
        return;
      }

      // If it's an SVG or already small, return directly
      if (file.type === 'image/svg+xml' || file.size < 80000) {
        resolve(result);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
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
            resolve(result);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (_) {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = (err) => {
      console.error('FileReader error:', err);
      reject(new Error('Failed to read selected image file.'));
    };
    reader.readAsDataURL(file);
  });
}
