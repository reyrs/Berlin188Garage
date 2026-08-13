import ManagerPanelInner from './panels/ManagerPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useFinanceStore } from '@/stores/financeStore';

export default function ManagerPanel() {
  const orders = useOrderStore((s) => s.orders);
  const transactions = useFinanceStore((s) => s.transactions);
  return <ManagerPanelInner orders={orders} transactions={transactions} />;
}
