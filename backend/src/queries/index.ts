import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOrders, fetchTransactions, fetchExpenses, fetchClosings,
  fetchWarehouseStock, fetchProfiles, fetchHeroContent, fetchPortfolioItems,
} from '@shared/db';

export function useOrdersQuery() {
  return useQuery({ queryKey: ['orders'], queryFn: fetchOrders, staleTime: 30_000 });
}

export function useTransactionsQuery() {
  return useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions, staleTime: 30_000 });
}

export function useExpensesQuery() {
  return useQuery({ queryKey: ['expenses'], queryFn: fetchExpenses, staleTime: 30_000 });
}

export function useClosingsQuery() {
  return useQuery({ queryKey: ['closings'], queryFn: fetchClosings, staleTime: 30_000 });
}

export function useWarehouseStockQuery() {
  return useQuery({ queryKey: ['warehouseStock'], queryFn: fetchWarehouseStock, staleTime: 60_000 });
}

export function useProfilesQuery() {
  return useQuery({ queryKey: ['profiles'], queryFn: fetchProfiles, staleTime: 300_000 });
}

export function useHeroContentQuery() {
  return useQuery({ queryKey: ['heroContent'], queryFn: fetchHeroContent, staleTime: 300_000 });
}

export function usePortfolioItemsQuery() {
  return useQuery({ queryKey: ['portfolioItems'], queryFn: fetchPortfolioItems, staleTime: 300_000 });
}

export function useInvalidateOrders() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['orders'] });
}
