"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagekit = void 0;
exports.uploadBase64Image = uploadBase64Image;
exports.uploadBuffer = uploadBuffer;
exports.uploadResume = uploadResume;
const imagekit_1 = __importDefault(require("imagekit"));
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
if (!publicKey || !privateKey || !urlEndpoint) {
    // Don't throw on import; throw when used to allow local/dev fallback if desired
    console.warn('[ImageKit] Missing configuration. Ensure IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT are set.');
}
exports.imagekit = new imagekit_1.default({
    publicKey: publicKey || '',
    privateKey: privateKey || '',
    urlEndpoint: urlEndpoint || '',
});
const sanitizeBase64 = (data) => data.replace(/^data:[^;]+;base64,/, '');
async function uploadBase64Image(params) {
    if (!publicKey || !privateKey || !urlEndpoint) {
        throw new Error('ImageKit not configured');
    }
    const { base64Data, fileName, folder = '/aptiview/screenshots' } = params;
    const file = sanitizeBase64(base64Data);
    const res = await exports.imagekit.upload({
        file, // base64 string without prefix
        fileName,
        folder,
        useUniqueFileName: true,
    });
    return res;
}
async function uploadBuffer(params) {
    if (!publicKey || !privateKey || !urlEndpoint) {
        throw new Error('ImageKit not configured');
    }
    const { buffer, fileName, folder = '/aptiview/recordings' } = params;
    const res = await exports.imagekit.upload({
        file: buffer,
        fileName,
        folder,
        useUniqueFileName: true,
    });
    return res;
}
async function uploadResume(params) {
    if (!publicKey || !privateKey || !urlEndpoint) {
        throw new Error('ImageKit not configured');
    }
    const { buffer, fileName } = params;
    const res = await exports.imagekit.upload({
        file: buffer,
        fileName,
        folder: '/aptiview/resumes',
        useUniqueFileName: true,
    });
    return res.url;
}
