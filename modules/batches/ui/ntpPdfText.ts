// Browser-only: reads the text of an NTP PDF on the user's device. Whether the file is then stored is up to the caller.
import { EVIDENCE_MAX_BYTES } from '@/modules/documents/domain/evidencePath';
import { joinPdfTextItems, type NtpReadResult, type PdfTextPiece } from '@/modules/batches/domain/rqm';

const MAX_PAGES = 50;

export async function readPdfText(file: File): Promise<NtpReadResult> {
  // Browsers often leave the type empty or generic; pdf.js rejects non-PDF bytes ('unreadable').
  const isPdf = file.type.toLowerCase() === 'application/pdf' || /\.pdf$/i.test(file.name);
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
      const pieces: PdfTextPiece[] = [];
      for (const item of content.items) {
        if (!('str' in item)) continue; // marked-content items carry no text
        pieces.push({ str: item.str, x: item.transform[4], y: item.transform[5], width: item.width, height: item.height, hasEOL: item.hasEOL });
      }
      pages.push(joinPdfTextItems(pieces));
    }
    const text = pages.join('\n');
    if (!text.trim()) return { ok: false, reason: 'no-text' };
    return pdf.numPages > MAX_PAGES ? { ok: true, text, truncated: true } : { ok: true, text };
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    await task?.destroy().catch(() => {});
  }
}
