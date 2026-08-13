import AdvisorPanelInner from './panels/AdvisorPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useAuthStore } from '@/stores/authStore';
import { useWarehouseStore } from '@/stores/warehouseStore';

export default function AdvisorPanel() {
  const orders = useOrderStore((s) => s.orders);
  const warehouseStock = useWarehouseStore((s) => s.stock);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const onAddOrder = useOrderStore((s) => s.addOrder);
  return (
    <AdvisorPanelInner
      onAddOrder={onAddOrder}
      activeUser={activeUser!}
      orders={orders}
      warehouseStock={warehouseStock}
    />
  );
}
