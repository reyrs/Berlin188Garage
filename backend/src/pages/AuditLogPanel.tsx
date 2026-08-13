import AuditLogPanelInner from './panels/AuditLogPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useFinanceStore } from '@/stores/financeStore';

export default function AuditLogPanel() {
  const orders = useOrderStore((s) => s.orders);
  const transactions = useFinanceStore((s) => s.transactions);
  const closings = useFinanceStore((s) => s.closings);
  return <AuditLogPanelInner orders={orders} transactions={transactions} closings={closings} />;
}
