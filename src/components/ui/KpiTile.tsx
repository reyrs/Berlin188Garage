import type { ComponentType } from 'react';
import type { KpiTone } from '../../lib/design';
import IconTile from './IconTile';

interface KpiTileProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: ComponentType<{ className?: string; weight?: string }>;
  tone: KpiTone;
}

export default function KpiTile({ label, value, sublabel, icon, tone }: KpiTileProps) {
  return (
    <div className="card-instrument p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{label}</span>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div className="space-y-0.5">
        <div className="text-lg sm:text-xl font-bold text-black font-sans tabular-nums">{value}</div>
        {sublabel && (
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}
