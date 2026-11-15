'use client';

import { Icon } from '@/shared/ui/Icon';
import { pluralize } from '@/shared/text';

interface ReportToolbarProps {
  active: 'egace' | 'employment';
  onActiveChange: (active: 'egace' | 'employment') => void;
  isMulti: boolean;
  schoolCount: number;
  rowCount: number;
  asOf: string | null;
  onExport: () => void;
}

export function ReportToolbar({ active, onActiveChange, isMulti, schoolCount, rowCount, asOf, onExport }: ReportToolbarProps) {
  return (
    <div className="report-toolbar">
      <div className="report-seg" role="tablist">
        <button className={'report-seg-btn' + (active === 'egace' ? ' active' : '')} onClick={() => onActiveChange('egace')}>
          <Icon name="certificate" size={13} />
          EGACE Outcomes
        </button>
        <button className={'report-seg-btn' + (active === 'employment' ? ' active' : '')} onClick={() => onActiveChange('employment')}>
          <Icon name="briefcase" size={13} />
          Employment Report
        </button>
      </div>
      <div className="report-toolbar-meta">
        <span>
          {isMulti ? schoolCount + ' schools · ' : ''}
          {rowCount} {pluralize(rowCount)}
          {asOf ? ` · as of ${asOf}` : ''}
        </span>
        <button className="btn secondary" onClick={onExport}>
          <Icon name="download" size={14} />
          Export to Excel (T2MIS)
        </button>
      </div>
    </div>
  );
}

export default ReportToolbar;
