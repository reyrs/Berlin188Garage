import SettingsPanelInner from './panels/SettingsPanel';
import { useAuthStore } from '@/stores/authStore';
import { ALL_TABS } from '@/lib/tabs';

export default function SettingsPanel() {
  const staffUsers = useAuthStore((s) => s.staffDirectory);
  const onlineStaffIds = useAuthStore((s) => s.onlineStaffIds);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const updateSpecialization = useAuthStore((s) => s.updateSpecialization);
  const tabs = ALL_TABS.map((t) => ({ id: t.id, label: t.label, roles: t.roles }));
  return (
    <SettingsPanelInner
      staffUsers={staffUsers}
      onlineStaffIds={onlineStaffIds}
      tabs={tabs}
      activeUser={activeUser!}
      onUpdateSpecialization={updateSpecialization}
    />
  );
}
