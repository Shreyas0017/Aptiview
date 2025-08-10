"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResumeSummary = getResumeSummary;
// Use dynamic import for node-fetch (ESM)
let fetch;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const openai_1 = __importDefault(require("openai"));
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
async function getResumeSummary(url) {
    if (!fetch) {
        fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
    }
    try {
        if (!url)
            return undefined;
        const now = Date.now();
        const hit = cache.get(url);
        if (hit && now - hit.ts < CACHE_TTL_MS)
            return hit.summary;
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`Failed to fetch resume: ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        // Try PDF parse; if fails, fallback to plain text (unlikely)
        let text = '';
        try {
            const parsed = await (0, pdf_parse_1.default)(buffer);
            text = parsed.text || '';
        }
        catch (e) {
            // Fallback: naive extract as UTF-8
            text = buffer.toString('utf8');
        }
        // Trim to keep prompt size reasonable
        const trimmed = text.replace(/\s+/g, ' ').slice(0, 20000);
        if (!trimmed || trimmed.length < 200) {
            // Too short to be useful; skip summarization
            return undefined;
        }
        const prompt = `Summarize the following candidate resume into a concise, structured brief suitable for an interviewer. Include: headline (role/years), key skills, notable experience highlights, education, and certifications. Keep under 180 words.

RESUME TEXT:
${trimmed}`;
        const resp = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 400,
        });
        const summary = resp.choices[0]?.message?.content?.trim();
        if (summary) {
            cache.set(url, { summary, ts: now });
            return summary;
        }
        return undefined;
    }
    catch (e) {
        console.warn('Resume summary failed:', e);
        return undefined;
    }
}
