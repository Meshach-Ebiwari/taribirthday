import axios from 'axios';

export interface Photo {
  id: string;
  created_at: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  thumbnail_url: string | null;
  resource_type: 'image' | 'video';
  guest_first_name: string;
  guest_last_name: string;
  width: number | null;
  height: number | null;
  duration: number | null;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.106:4000',
  timeout: 120000, // 2 minutes for large uploads
});

export async function uploadMedia(
  file: File,
  firstName: string,
  lastName: string,
  onProgress?: (pct: number) => void
): Promise<Photo> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('firstName', firstName);
  formData.append('lastName', lastName);

  const response = await apiClient.post<Photo>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(pct);
      }
    },
  });

  return response.data;
}

export async function getPhotos(): Promise<Photo[]> {
  const response = await apiClient.get<Photo[]>('/api/photos');
  return response.data;
}

export default apiClient;
