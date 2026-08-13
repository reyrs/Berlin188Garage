import SlotBoardInner from './panels/SlotBoard';
import { useOrderStore } from '@/stores/orderStore';

export default function SlotBoard({ interactive }: { interactive: boolean }) {
  const orders = useOrderStore((s) => s.orders);
  return <SlotBoardInner orders={orders} interactive={interactive} />;
}
