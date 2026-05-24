import client from './client';
import * as FileSystem from 'expo-file-system';

export interface FileUploadResponse {
  id: number;
  file_name: string;
  file_path: string;
  content_type: string;
  file_size: number;
}

export const filesApi = {
  /** Upload an image file */
  uploadImage: async (fileUri: string, mimeType: string, fileName: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await client.post<FileUploadResponse>('/api/files/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /** Upload a voice note */
  uploadVoiceNote: async (fileUri: string, mimeType: string, fileName: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await client.post<FileUploadResponse>('/api/files/voice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /** General file upload (PDFs etc) */
  uploadFile: async (fileUri: string, mimeType: string, fileName: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await client.post<FileUploadResponse>('/api/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
