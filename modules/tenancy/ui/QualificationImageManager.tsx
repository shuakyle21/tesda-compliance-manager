'use client';

/**
 * Qualification header-image manager — one card per national qualification.
 *
 * Client island for the file preview and the landscape check, which needs the
 * decoded image's natural size and so can only run in the browser. Type and
 * size are re-checked by the server and enforced by the bucket itself.
 */

import { useActionState, useEffect, useId, useState, type ChangeEvent } from 'react';
import { Icon, type IconName } from '@/shared/ui/Icon';
import {
  IDLE_QUALIFICATION_IMAGE_STATE,
  QUALIFICATION_IMAGE_TYPES,
  REJECTION_COPY,
  WARNING_COPY,
  checkImageDimensions,
  checkImageFile,
  type QualificationImageAction,
  type QualificationImageFormState,
  type QualificationImageRejection,
  type QualificationImageWarning,
} from '@/modules/tenancy/domain/qualificationImage';

export interface QualificationImageItem {
  id: string;
  code: string;
  title: string;
  sector: string | null;
  imageUrl: string | null;
}

type Banner = { icon: IconName; tone: string; text: string };

function bannerFor(state: QualificationImageFormState, id: string): Banner | null {
  switch (state.status) {
    case 'saved':
      return state.qualificationId === id ? { icon: 'check', tone: 'success', text: 'Header image saved.' } : null;
    case 'removed':
      return state.qualificationId === id
        ? { icon: 'check', tone: 'success', text: 'Header image removed. Batches now show the plain header.' }
        : null;
    case 'rejected':
      return state.qualificationId === id ? { icon: 'alert-triangle', tone: 'critical', text: REJECTION_COPY[state.reason] } : null;
    case 'denied':
      return { icon: 'alert-circle', tone: 'critical', text: 'You do not have permission to change qualification images.' };
    case 'unconfigured':
      return { icon: 'alert-circle', tone: 'critical', text: 'Qualification records are not available here, so nothing was saved.' };
    case 'failed':
      return { icon: 'refresh', tone: 'critical', text: 'Something went wrong and nothing was saved. Try again in a moment.' };
    case 'idle':
      return null;
  }
}

type Selection = {
  previewUrl: string;
  rejection: QualificationImageRejection | null;
  warnings: QualificationImageWarning[];
  size: string;
};

function ImagePreview({ url, title, unsaved }: { url: string | null; title: string; unsaved: boolean }) {
  return (
    <div className="qimg-preview">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed / blob URLs; next/image would need remotePatterns for every signed host
        <img src={url} alt={`Header image for ${title}`} />
      ) : (
        <div className="qimg-empty">
          <Icon name="photo" size={20} />
          <span>No header image</span>
        </div>
      )}
      {unsaved && <span className="qimg-tag">Preview, not saved</span>}
    </div>
  );
}

function SelectionMessages({ selection }: { selection: Selection }) {
  return (
    <>
      <div className="qimg-hint">{selection.size}</div>
      {selection.rejection && (
        <div className="qimg-msg critical">
          <Icon name="alert-triangle" size={13} />
          {REJECTION_COPY[selection.rejection]}
        </div>
      )}
      {selection.warnings.map((w) => (
        <div key={w} className="qimg-msg warning">
          <Icon name="info-circle" size={13} />
          {WARNING_COPY[w]}
        </div>
      ))}
    </>
  );
}

function QualificationImageCard({ item, action }: { item: QualificationImageItem; action: QualificationImageAction }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [formKey, setFormKey] = useState(0);
  const clearSelection = () => {
    setSelection(null);
    setFormKey((k) => k + 1);
  };
  // A successful save clears the picked file, so the card shows the stored image.
  const [state, formAction, pending] = useActionState<QualificationImageFormState, FormData>(async (previous, formData) => {
    const next = await action(previous, formData);
    if (next.status === 'saved' || next.status === 'removed') clearSelection();
    return next;
  }, IDLE_QUALIFICATION_IMAGE_STATE);
  const inputId = useId();
  const banner = bannerFor(state, item.id);

  // Release the object URL when the selection changes or the card unmounts.
  useEffect(() => () => { if (selection) URL.revokeObjectURL(selection.previewUrl); }, [selection]);

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelection(null);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const size = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const fileCheck = checkImageFile({ mimeType: file.type, size: file.size });
    if (!fileCheck.ok) {
      setSelection({ previewUrl, rejection: fileCheck.reason, warnings: [], size });
      return;
    }
    const probe = new Image();
    probe.onload = () => {
      const dims = checkImageDimensions(probe.naturalWidth, probe.naturalHeight);
      setSelection({
        previewUrl,
        rejection: dims.ok ? null : dims.reason,
        warnings: dims.ok ? dims.warnings : [],
        size: `${size} · ${probe.naturalWidth} × ${probe.naturalHeight}`,
      });
    };
    probe.onerror = () => setSelection({ previewUrl, rejection: 'type', warnings: [], size });
    probe.src = previewUrl;
  }

  const canSave = selection !== null && selection.rejection === null && !pending;

  return (
    <article className="qimg-card">
      <ImagePreview url={selection?.previewUrl ?? item.imageUrl} title={item.title} unsaved={selection !== null} />

      <div className="qimg-body">
        <div className="qimg-title">{item.title}</div>
        <div className="qimg-meta">
          {item.code}
          {item.sector ? ` · ${item.sector}` : ''}
        </div>

        {banner && (
          <div className={`banner${banner.tone ? ` ${banner.tone}` : ''}`} role="status" aria-live="polite">
            <Icon name={banner.icon} size={16} />
            <span className="grow">{banner.text}</span>
          </div>
        )}

        <form key={formKey} action={formAction} className="qimg-form">
          <input type="hidden" name="qualificationId" value={item.id} />
          <label htmlFor={inputId} className="qimg-label">
            {item.imageUrl ? 'Replace image' : 'Upload image'}
          </label>
          <input
            id={inputId}
            name="image"
            type="file"
            accept={QUALIFICATION_IMAGE_TYPES.join(',')}
            onChange={onPick}
            className="qimg-input"
          />
          {selection && <SelectionMessages selection={selection} />}
          <div className="qimg-actions">
            <button type="submit" name="intent" value="upload" className={`btn primary sm${pending ? ' loading' : ''}`} disabled={!canSave}>
              <Icon name="upload" size={12} />
              Save image
            </button>
            {selection && (
              <button type="button" className="btn secondary sm" onClick={clearSelection}>
                Cancel
              </button>
            )}
            {item.imageUrl && !selection && (
              <button type="submit" name="intent" value="remove" className="btn secondary sm" disabled={pending} formNoValidate>
                <Icon name="trash" size={12} />
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </article>
  );
}

export function QualificationImageManager({
  qualifications,
  action,
}: {
  qualifications: QualificationImageItem[];
  action: QualificationImageAction;
}) {
  return (
    <div className="qimg-grid">
      {qualifications.map((q) => (
        <QualificationImageCard key={q.id} item={q} action={action} />
      ))}
    </div>
  );
}
