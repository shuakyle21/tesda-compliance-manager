/**
 * Overview filters — school, scholarship program, qualification.
 *
 * A plain GET form: the filters live in the URL (`/overview?program=TWSP`), so
 * a filtered view can be bookmarked or shared and needs no client JavaScript.
 * The route parses them with `parseOverviewFilters`, which only accepts values
 * offered here; every section of the page then reads the same filtered set.
 */

import Link from 'next/link';
import { Icon } from '@/shared/ui/Icon';
import { hasActiveFilters, type OverviewFilterOptions, type OverviewFilters as Filters } from '@/modules/batches/domain/overview';

function Field({ name, label, value, all, options }: {
  name: string;
  label: string;
  value: string | null;
  all: string;
  options: { value: string; label: string }[];
}) {
  const id = `overview-filter-${name}`;
  return (
    <div className="overview-filter-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} className="input" defaultValue={value ?? ''}>
        <option value="">{all}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

export function OverviewFilters({ filters, options }: { filters: Filters; options: OverviewFilterOptions }) {
  const same = (value: string) => ({ value, label: value });
  return (
    // Keyed on the applied values so the selects reset to the URL after "Clear filters".
    <form key={JSON.stringify(filters)} method="get" action="/overview" className="filters overview-filters" role="search" aria-label="Filter overview">
      <Field name="school" label="School" value={filters.school} all="All schools"
        options={options.schools.map((school) => ({ value: school.code, label: school.name }))} />
      <Field name="program" label="Scholarship program" value={filters.program} all="All programs" options={options.programs.map(same)} />
      <Field name="qualification" label="Qualification" value={filters.qualification} all="All qualifications" options={options.qualifications.map(same)} />
      <button type="submit" className="btn secondary"><Icon name="filter" size={14} />Apply filters</button>
      {hasActiveFilters(filters) && <Link href="/overview" className="dash-link">Clear filters</Link>}
    </form>
  );
}
