import { PeriodFilter as PeriodFilterType, PERIOD_LABEL } from '../metrics';

interface PeriodFilterProps {
  value: PeriodFilterType;
  onChange: (period: PeriodFilterType) => void;
  options: PeriodFilterType[];
}

// Shared pill button-group for the period selector — replaces the two
// near-duplicate inline versions that used to live in ManagerPanel and
// FinanceReportPanel (different local types, same markup). Each caller
// passes the subset of PeriodFilter values relevant to it via `options`.
export default function PeriodFilter({ value, onChange, options }: PeriodFilterProps) {
  return (
    <div className="flex gap-1.5 bg-gray-100 dark:bg-[#22252c] p-1 rounded-xl">
      {options.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
            value === p
              ? 'bg-white dark:bg-[#1a1d23] text-berlin-navy shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {PERIOD_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
