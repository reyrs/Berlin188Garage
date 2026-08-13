import AdvisorDashboardInner from './panels/AdvisorDashboard';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import type { Order } from '@shared/types';

export default function AdvisorDashboard() {
  const orders = useOrderStore((s) => s.orders);
  const users = useAuthStore((s) => s.staffDirectory);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const showNotification = useUIStore((s) => s.showNotification);
  const store = useOrderStore;
  return (
    <AdvisorDashboardInner
      orders={orders}
      users={users}
      activeUser={activeUser!}
      onApproveServiceItem={(orderId: string, itemId: string) =>
        store.getState().approveServiceItem(orderId, itemId, activeUser?.name)}
      onRejectServiceItem={(orderId: string, itemId: string) =>
        store.getState().rejectServiceItem(orderId, itemId, activeUser?.name)}
      onConfirmPayment={store.getState().confirmPayment}
      onConfirmDPPayment={store.getState().confirmDPPayment}
      onUpdateOrderStatus={(orderId: string, status: Order['status'], description: string) =>
        store.getState().updateOrderStatus(orderId, status, description, activeUser?.name)}
      onUpdateOrder={store.getState().updateOrder}
      onAddFinding={store.getState().addFinding}
      onSendSPK={store.getState().sendSPK}
      onIssueInvoice={(orderId: string) => store.getState().issueInvoice(orderId, activeUser?.name)}
      onDeleteOrder={store.getState().deleteOrder}
      onReturnFindingToGudang={(orderId: string, findingId: string) =>
        store.getState().returnFindingToGudang(orderId, findingId, activeUser?.name)}
      onNotify={showNotification}
    />
  );
}
