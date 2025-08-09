import path from 'path';
import { promises as fs } from 'fs';
import { uploadBase64Image, uploadBuffer } from './imageKitService';

export const saveBase64Screenshot = async (
  base64Data: string,
  interviewId: string
): Promise<string> => {
  try {
    // Upload to ImageKit instead of local disk
    const fileName = `${interviewId}-${Date.now()}.png`;
    const upload = await uploadBase64Image({
      base64Data,
      fileName,
      folder: '/aptiview/screenshots'
    });
    return upload.url;
  } catch (error) {
    console.error('Error saving screenshot:', error);
    throw error;
  }
};

export const saveAudioRecording = async (
  audioBuffer: Buffer,
  mimeType: string,
  interviewId: string
): Promise<string> => {
  try {
    // Determine file extension based on mime type
    let extension = '.wav'; // default
    if (mimeType?.includes('mp3')) extension = '.mp3';
    else if (mimeType?.includes('m4a')) extension = '.m4a';
    else if (mimeType?.includes('ogg')) extension = '.ogg';
    else if (mimeType?.includes('webm')) extension = '.webm';

    const fileName = `${interviewId}-${Date.now()}${extension}`;
    const upload = await uploadBuffer({
      buffer: audioBuffer,
      fileName,
      folder: '/aptiview/recordings',
      mimeType
    });
    return upload.url;
  } catch (error) {
    console.error('Error saving audio recording:', error);
    throw error;
  }
};

export const getFileUrl = (relativePath: string): string => {
  // When using ImageKit, URLs are absolute already
  if (relativePath.startsWith('http')) return relativePath;
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:4000';
  return `${baseUrl}${relativePath}`;
};

export const deleteFile = async (relativePath: string): Promise<void> => {
  try {
    // No-op for ImageKit (could implement delete via imagekit.deleteFile if fileId stored)
    if (!relativePath.startsWith('http')) {
      const fullPath = path.join(__dirname, '../../', relativePath);
      await fs.unlink(fullPath).catch(() => {});
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    // Don't throw error for file deletion failures
  }
};
