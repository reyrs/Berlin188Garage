import TechnicianPanelInner from './panels/TechnicianPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import type { Order } from '@shared/types';

export default function TechnicianPanel() {
  const orders = useOrderStore((s) => s.orders);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const showNotification = useUIStore((s) => s.showNotification);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const addFinding = useOrderStore((s) => s.addFinding);
  const updateServiceItems = useOrderStore((s) => s.updateServiceItems);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  return (
    <TechnicianPanelInner
      orders={orders}
      activeUser={activeUser!}
      onUpdateOrderStatus={(orderId: string, status: Order['status'], description: string) =>
        updateOrderStatus(orderId, status, description, activeUser?.name)}
      onAddFinding={addFinding}
      onUpdateServiceItems={updateServiceItems}
      onUpdateOrder={updateOrder}
      onNotify={showNotification}
    />
  );
}
