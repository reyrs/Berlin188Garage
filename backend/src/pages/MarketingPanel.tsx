import MarketingPanelInner from './panels/MarketingPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useContentStore } from '@/stores/warehouseStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export default function MarketingPanel() {
  const orders = useOrderStore((s) => s.orders);
  const portfolioItems = useContentStore((s) => s.portfolioItems);
  const activeUser = useAuthStore((s) => s.activeStaffUser);
  const showNotification = useUIStore((s) => s.showNotification);
  const addItem = useContentStore((s) => s.addItem);
  const removeItem = useContentStore((s) => s.removeItem);
  return (
    <MarketingPanelInner
      orders={orders}
      portfolioItems={portfolioItems}
      activeUser={activeUser!}
      onAddPortfolioItem={addItem}
      onDeletePortfolioItem={removeItem}
      onNotify={showNotification}
    />
  );
}
