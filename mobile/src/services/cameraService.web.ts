/**
 * Camera service — web implementation.
 * Uses <input type="file" capture="environment"> for mobile web camera access.
 * Falls back to file picker when camera is not available.
 */

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
}

export async function requestPermissions(): Promise<boolean> {
  // On web, permissions are handled by the browser when the user interacts
  return true;
}

function createFileInput(capture: boolean): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (capture) {
    input.setAttribute('capture', 'environment');
  }
  input.style.display = 'none';
  document.body.appendChild(input);
  return input;
}

function fileToPhotoResult(file: File): Promise<PhotoResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        uri: url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function pickFile(capture: boolean): Promise<PhotoResult | null> {
  return new Promise((resolve) => {
    const input = createFileInput(capture);

    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);

      if (!file) {
        resolve(null);
        return;
      }

      try {
        const result = await fileToPhotoResult(file);
        resolve(result);
      } catch {
        resolve(null);
      }
    };

    // Handle cancel (user closes the dialog without selecting)
    input.addEventListener('cancel', () => {
      document.body.removeChild(input);
      resolve(null);
    });

    input.click();
  });
}

export async function takePhoto(): Promise<PhotoResult | null> {
  return pickFile(true);
}

export async function pickFromGallery(): Promise<PhotoResult | null> {
  return pickFile(false);
}
