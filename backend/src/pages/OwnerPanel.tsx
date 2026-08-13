import OwnerPanelInner from './panels/OwnerPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useAuthStore } from '@/stores/authStore';

export default function OwnerPanel() {
  const orders = useOrderStore((s) => s.orders);
  const transactions = useFinanceStore((s) => s.transactions);
  const closings = useFinanceStore((s) => s.closings);
  const staffUsers = useAuthStore((s) => s.staffDirectory);
  const onlineStaffIds = useAuthStore((s) => s.onlineStaffIds);
  return (
    <OwnerPanelInner
      orders={orders}
      transactions={transactions}
      closings={closings}
      staffUsers={staffUsers}
      onlineStaffIds={onlineStaffIds}
    />
  );
}
