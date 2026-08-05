import type { ComponentType } from 'react';
import { KPI_TONE, type KpiTone } from '../../lib/design';

interface IconTileProps {
  icon: ComponentType<{ className?: string; weight?: string }>;
  tone: KpiTone;
}

export default function IconTile({ icon: Icon, tone }: IconTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
      <Icon className="w-4 h-4" weight="duotone" />
    </div>
  );
}
