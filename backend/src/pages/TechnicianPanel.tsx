import TechnicianPanelInner from './panels/TechnicianPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';

export default function TechnicianPanel() {
  const orders = useOrderStore((s) => s.orders);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  return (
    <TechnicianPanelInner
      orders={orders}
      activeUser={activeUser!}
    />
  );
}
