import AccountingPanelInner from './panels/AccountingPanel';
import { useOrderStore } from '@/stores/orderStore';
import { useFinanceStore } from '@/stores/financeStore';
import { useAuthStore } from '@/stores/authStore';

export default function AccountingPanel() {
  const orders = useOrderStore((s) => s.orders);
  const transactions = useFinanceStore((s) => s.transactions);
  const closings = useFinanceStore((s) => s.closings);
  const expenses = useFinanceStore((s) => s.expenses);
  const staffUser = useAuthStore((s) => s.activeStaffUser);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addClosing = useFinanceStore((s) => s.addClosing);
  const confirmPayment = useOrderStore((s) => s.confirmPayment);
  const confirmDPPayment = useOrderStore((s) => s.confirmDPPayment);
  const issueInvoice = useOrderStore((s) => s.issueInvoice);
  return (
    <AccountingPanelInner
      orders={orders}
      transactions={transactions}
      closings={closings}
      expenses={expenses}
      staffUser={staffUser!}
      onAddExpense={addExpense}
      onCashClosing={addClosing}
      onProcessPayment={confirmPayment}
      onConfirmDPPayment={confirmDPPayment}
      onIssueInvoice={(orderId: string) => issueInvoice(orderId, staffUser?.name)}
    />
  );
}
