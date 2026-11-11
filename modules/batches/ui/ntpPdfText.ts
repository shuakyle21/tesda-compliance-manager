// Browser-only: reads the text of an NTP PDF on the user's device. The file is never uploaded.
import { EVIDENCE_MAX_BYTES } from '@/modules/documents/domain/evidencePath';
import type { NtpReadResult } from '@/modules/batches/domain/rqm';

const MAX_PAGES = 50;

export async function readPdfText(file: File): Promise<NtpReadResult> {
  const isPdf = file.type ? file.type.toLowerCase() === 'application/pdf' : /\.pdf$/i.test(file.name);
  if (!isPdf) return { ok: false, reason: 'not-pdf' };
  if (file.size > EVIDENCE_MAX_BYTES) return { ok: false, reason: 'too-large' };

  let task: { destroy: () => Promise<void>; promise: Promise<unknown> } | null = null;
  try {
    // Dynamic import keeps pdf.js out of every page's first-load JS.
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    task = loading;
    const pdf = await loading.promise;
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    const text = pages.join('\n');
    return text.trim() ? { ok: true, text } : { ok: false, reason: 'no-text' };
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    await task?.destroy().catch(() => {});
  }
}
