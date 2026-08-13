import WarehousePanelInner from './panels/WarehousePanel';
import { useOrderStore } from '@/stores/orderStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function WarehousePanel() {
  const orders = useOrderStore((s) => s.orders);
  const warehouseStock = useWarehouseStore((s) => s.stock);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const showNotification = useUIStore((s) => s.showNotification);
  const updateServiceItems = useOrderStore((s) => s.updateServiceItems);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const updateOrder = useOrderStore((s) => s.updateOrder);
  const adjustStock = useWarehouseStore((s) => s.adjustStock);
  const updateMarketplaceLink = useWarehouseStore((s) => s.updateMarketplaceLink);
  return (
    <WarehousePanelInner
      orders={orders}
      warehouseStock={warehouseStock}
      activeUser={activeUser!}
      onUpdateServiceItems={updateServiceItems}
      onUpdateOrderStatus={updateOrderStatus}
      onUpdateOrder={updateOrder}
      onUpdateStock={adjustStock}
      onUpdateMarketplaceLink={updateMarketplaceLink}
      onNotify={showNotification}
    />
  );
}
