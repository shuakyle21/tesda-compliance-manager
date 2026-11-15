'use client';

/**
 * OVERLAY — Import records (FR-10), opened from the Sidebar's Operations group.
 *
 * Importing is not available yet: the real importer, `importLearnersCsv` in
 * `modules/import-export/data/learnerImport.ts`, is not wired to this modal
 * (TES-49). Until it is, the modal says so and nothing can be uploaded or
 * saved from here. It deliberately holds no sample files or fake results.
 */

import { useEffect } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { EmptyState } from '@/shared/ui/EmptyState';

interface ImportCsvModalProps {
  onClose: () => void;
}

export function ImportCsvModal({ onClose }: ImportCsvModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Import records">
        <div className="modal-head">
          <h3>Import records</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <EmptyState
            iconName="info-circle"
            heading="Importing T2MIS or BSRS files isn't available yet."
            sub="Nothing can be uploaded or saved from this screen."
          />
        </div>

        <div className="modal-foot">
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" className="btn secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>
  );
}
