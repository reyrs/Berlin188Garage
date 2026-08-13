import FinanceReportPanelInner from './panels/FinanceReportPanel';
import { useFinanceStore } from '@/stores/financeStore';

export default function FinanceReportPanel() {
  const transactions = useFinanceStore((s) => s.transactions);
  const expenses = useFinanceStore((s) => s.expenses);
  return <FinanceReportPanelInner transactions={transactions} expenses={expenses} />;
}
