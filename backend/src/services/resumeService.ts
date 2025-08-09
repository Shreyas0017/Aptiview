// Use dynamic import for node-fetch (ESM)
let fetch: typeof import('node-fetch').default;
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const cache = new Map<string, { summary: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getResumeSummary(url?: string): Promise<string | undefined> {
  if (!fetch) {
    fetch = (await import('node-fetch')).default;
  }
  try {
    if (!url) return undefined;
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && now - hit.ts < CACHE_TTL_MS) return hit.summary;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch resume: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Try PDF parse; if fails, fallback to plain text (unlikely)
    let text = '';
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
    } catch (e) {
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
  } catch (e) {
    console.warn('Resume summary failed:', e);
    return undefined;
  }
}
