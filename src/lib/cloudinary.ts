/**
 * Cloudinary Upload Helper
 * Handles uploading item photos, store photos, payment/delivery proof images
 */
export async function uploadToCloudinary(file: File | Blob, folder = 'sales_mgmt'): Promise<{ url: string; publicId?: string }> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'sales_preset';

  // If Cloudinary preset is configured and reachable
  if (cloudName && cloudName !== 'demo') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          url: data.secure_url || data.url,
          publicId: data.public_id,
        };
      }
    } catch (err) {
      console.warn('Direct Cloudinary upload failed, falling back to local base64 preview:', err);
    }
  }

  // Fallback: Convert file to Base64 Data URL for instant, zero-config local display
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result as string,
        publicId: `mock_${Date.now()}`,
      });
    };
    reader.readAsDataURL(file);
  });
}
