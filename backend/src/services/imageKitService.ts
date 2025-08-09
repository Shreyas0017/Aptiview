import ImageKit from 'imagekit';

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

if (!publicKey || !privateKey || !urlEndpoint) {
  // Don't throw on import; throw when used to allow local/dev fallback if desired
  console.warn('[ImageKit] Missing configuration. Ensure IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT are set.');
}

export const imagekit = new ImageKit({
  publicKey: publicKey || '',
  privateKey: privateKey || '',
  urlEndpoint: urlEndpoint || '',
});

const sanitizeBase64 = (data: string) => data.replace(/^data:[^;]+;base64,/, '');

export async function uploadBase64Image(params: {
  base64Data: string;
  fileName: string;
  folder?: string;
}): Promise<any> {
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit not configured');
  }

  const { base64Data, fileName, folder = '/aptiview/screenshots' } = params;
  const file = sanitizeBase64(base64Data);

  const res = await imagekit.upload({
    file, // base64 string without prefix
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return res;
}

export async function uploadBuffer(params: {
  buffer: Buffer;
  fileName: string;
  folder?: string;
  mimeType?: string;
}): Promise<any> {
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit not configured');
  }

  const { buffer, fileName, folder = '/aptiview/recordings' } = params;
  const res = await imagekit.upload({
    file: buffer,
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return res;
}

export async function uploadResume(params: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string; // e.g., application/pdf
}): Promise<string> {
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error('ImageKit not configured');
  }
  const { buffer, fileName } = params;
  const res = await imagekit.upload({
    file: buffer,
    fileName,
    folder: '/aptiview/resumes',
    useUniqueFileName: true,
  });
  return res.url as string;
}
