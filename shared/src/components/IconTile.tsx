import type { Icon } from '@phosphor-icons/react';
import { KPI_TONE, type KpiTone } from '../design';

interface IconTileProps {
  icon: Icon;
  tone: KpiTone;
}

export default function IconTile({ icon: IconComp, tone }: IconTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
      <IconComp className="w-4 h-4" weight="duotone" />
    </div>
  );
}
