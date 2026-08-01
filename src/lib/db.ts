import { supabase } from './supabase'
import type { Order, CashTransaction, CashClosing, Expense, WarehouseStockItem, User } from '../types'

const db = () => {
  if (!supabase) throw new Error('DB_UNAVAILABLE')
  return supabase
}

// ============================================================
// PROFILES
// ============================================================

export async function fetchProfiles(): Promise<User[]> {
  const { data, error } = await db().from('profiles').select('*')
  if (error) throw error
  return (data || []).map(mapProfileToUser)
}

export async function seedProfiles(users: User[]): Promise<void> {
  for (const u of users) {
    try {
      const existing = await db().from('profiles').select('id').eq('id', u.id).single()
      if (existing.error?.code === 'PGRST116') {
        const { error } = await db().from('profiles').insert({ id: u.id, name: u.name, role: u.role, email: u.email, phone: u.phone, avatar_url: u.avatarUrl })
        if (error) throw error
      }
    } catch (err) {
      console.error(`Failed to seed profile ${u.id}:`, err)
    }
  }
}

function mapProfileToUser(data: any): User {
  return { id: data.id, name: data.name, role: data.role, email: data.email || '', phone: data.phone || '', avatarUrl: data.avatar_url }
}

// ============================================================
// ORDERS
// ============================================================

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await db().from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapOrder)
}

export async function createOrder(order: Order): Promise<void> {
  const { error } = await db().from('orders').insert({ id: order.id, customer_name: order.customerName, customer_phone: order.customerPhone, customer_address: order.customerAddress, car_brand: order.carBrand, car_model: order.carModel, plate_number: order.plateNumber, car_vin: order.carVin, car_type: order.carType, car_year: order.carYear, car_engine_code: order.carEngineCode, complaint: order.complaint, service_type: order.serviceType, status: order.status, created_at: order.createdAt, advisor_id: order.advisorId, advisor_name: order.advisorName, spk_number: order.spkNumber, findings: JSON.stringify(order.findings), service_items: JSON.stringify(order.serviceItems), timeline: JSON.stringify(order.timeline), payment_status: order.paymentStatus, payment_method: order.paymentMethod, payment_destination: order.paymentDestination, paid_at: order.paidAt, dp_amount: order.dpAmountPaid, notes: order.notes, spk_sent: order.spkSent, assigned_mechanic_id: order.assignedMechanicId, assigned_mechanic_name: order.assignedMechanicName })
  if (error) throw error
}

export async function updateOrder(id: string, fields: Partial<Order>): Promise<void> {
  const dbFields: Record<string, any> = {}
  if (fields.customerName !== undefined) dbFields.customer_name = fields.customerName
  if (fields.customerPhone !== undefined) dbFields.customer_phone = fields.customerPhone
  if (fields.customerAddress !== undefined) dbFields.customer_address = fields.customerAddress
  if (fields.carBrand !== undefined) dbFields.car_brand = fields.carBrand
  if (fields.carModel !== undefined) dbFields.car_model = fields.carModel
  if (fields.plateNumber !== undefined) dbFields.plate_number = fields.plateNumber
  if (fields.status !== undefined) dbFields.status = fields.status
  if (fields.paymentStatus !== undefined) dbFields.payment_status = fields.paymentStatus
  if (fields.paymentMethod !== undefined) dbFields.payment_method = fields.paymentMethod
  if (fields.paymentDestination !== undefined) dbFields.payment_destination = fields.paymentDestination
  if (fields.paidAt !== undefined) dbFields.paid_at = fields.paidAt
  if (fields.dpAmountPaid !== undefined) dbFields.dp_amount = fields.dpAmountPaid
  if (fields.notes !== undefined) dbFields.notes = fields.notes
  if (fields.spkSent !== undefined) dbFields.spk_sent = fields.spkSent
  if (fields.assignedMechanicId !== undefined) dbFields.assigned_mechanic_id = fields.assignedMechanicId
  if (fields.assignedMechanicName !== undefined) dbFields.assigned_mechanic_name = fields.assignedMechanicName
  if (fields.advisorId !== undefined) dbFields.advisor_id = fields.advisorId
  if (fields.advisorName !== undefined) dbFields.advisor_name = fields.advisorName
  if (fields.spkNumber !== undefined) dbFields.spk_number = fields.spkNumber
  const { error } = await db().from('orders').update(dbFields).eq('id', id)
  if (error) throw error
}

export async function updateOrderJsonb(id: string, column: 'findings' | 'service_items' | 'timeline', value: any[]): Promise<void> {
  const { error } = await db().from('orders').update({ [column]: JSON.stringify(value) }).eq('id', id)
  if (error) throw error
}

function mapOrder(data: any): Order {
  return { id: data.id, customerName: data.customer_name, customerPhone: data.customer_phone, customerAddress: data.customer_address || undefined, carBrand: data.car_brand, carModel: data.car_model, plateNumber: data.plate_number, carVin: data.car_vin || undefined, carType: data.car_type || undefined, carYear: data.car_year || undefined, carEngineCode: data.car_engine_code || undefined, complaint: data.complaint, serviceType: data.service_type, status: data.status, createdAt: data.created_at, advisorId: data.advisor_id || undefined, advisorName: data.advisor_name || undefined, spkNumber: data.spk_number || undefined, findings: typeof data.findings === 'string' ? JSON.parse(data.findings) : (data.findings || []), serviceItems: typeof data.service_items === 'string' ? JSON.parse(data.service_items) : (data.service_items || []), timeline: typeof data.timeline === 'string' ? JSON.parse(data.timeline) : (data.timeline || []), paymentStatus: data.payment_status, paymentMethod: data.payment_method || undefined, paymentDestination: data.payment_destination || undefined, paidAt: data.paid_at || undefined, dpAmountPaid: data.dp_amount !== null && data.dp_amount !== undefined ? Number(data.dp_amount) : undefined, notes: data.notes || undefined, spkSent: data.spk_sent || undefined, assignedMechanicId: data.assigned_mechanic_id || undefined, assignedMechanicName: data.assigned_mechanic_name || undefined }
}

// ============================================================
// TRANSACTIONS
// ============================================================

export async function fetchTransactions(): Promise<CashTransaction[]> {
  const { data, error } = await db().from('transactions').select('*').order('timestamp', { ascending: false })
  if (error) throw error
  return (data || []).map(mapTransaction)
}

export async function createTransaction(tx: CashTransaction): Promise<void> {
  const { error } = await db().from('transactions').insert({ id: tx.id, order_id: tx.orderId, customer_name: tx.customerName, amount: tx.amount, type: tx.type, method: tx.method, category: tx.category, description: tx.description, timestamp: tx.timestamp, created_by: tx.createdBy })
  if (error) throw error
}

function mapTransaction(data: any): CashTransaction {
  return { id: data.id, orderId: data.order_id || undefined, customerName: data.customer_name || undefined, amount: Number(data.amount), type: data.type, method: data.method, category: data.category, description: data.description, timestamp: data.timestamp, createdBy: data.created_by || undefined }
}

// ============================================================
// EXPENSES
// ============================================================

export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await db().from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return (data || []).map(mapExpense)
}

export async function createExpense(exp: Expense): Promise<void> {
  const { error } = await db().from('expenses').insert({ id: exp.id, date: exp.date, description: exp.description, amount: exp.amount, category: exp.category, method: exp.method, created_by: exp.createdBy, receipt_url: exp.receiptUrl })
  if (error) throw error
}

function mapExpense(data: any): Expense {
  return { id: data.id, date: data.date, description: data.description, amount: Number(data.amount), category: data.category, method: data.method, createdBy: data.created_by, receiptUrl: data.receipt_url || undefined }
}

// ============================================================
// CLOSINGS
// ============================================================

export async function fetchClosings(): Promise<CashClosing[]> {
  const { data, error } = await db().from('closings').select('*').order('timestamp', { ascending: false })
  if (error) throw error
  return (data || []).map(mapClosing)
}

export async function createClosing(closing: CashClosing): Promise<void> {
  const { error } = await db().from('closings').insert({ id: closing.id, timestamp: closing.timestamp, system_cash: closing.systemCash, physical_cash: closing.physicalCash, discrepancy: closing.discrepancy, closed_by: closing.closedBy, notes: closing.notes })
  if (error) throw error
}

function mapClosing(data: any): CashClosing {
  return { id: data.id, timestamp: data.timestamp, systemCash: Number(data.system_cash), physicalCash: Number(data.physical_cash), discrepancy: Number(data.discrepancy), closedBy: data.closed_by, notes: data.notes || undefined }
}

// ============================================================
// WAREHOUSE STOCK
// ============================================================

export async function fetchWarehouseStock(): Promise<WarehouseStockItem[]> {
  const { data, error } = await db().from('warehouse_stock').select('*').order('name')
  if (error) throw error
  return (data || []).map(mapStockItem)
}

export async function updateStockQuantity(id: string, newStock: number): Promise<void> {
  const { error } = await db().from('warehouse_stock').update({ stock: newStock }).eq('id', id)
  if (error) throw error
}

function mapStockItem(data: any): WarehouseStockItem {
  return { id: data.id, name: data.name, code: data.code, price: Number(data.price), stock: data.stock, rackLocation: data.rack_location }
}

export async function seedWarehouseStock(items: WarehouseStockItem[]): Promise<void> {
  for (const item of items) {
    try {
      const existing = await db().from('warehouse_stock').select('id').eq('id', item.id).single()
      if (existing.error?.code === 'PGRST116') {
        const { error } = await db().from('warehouse_stock').insert({ id: item.id, name: item.name, code: item.code, price: item.price, stock: item.stock, rack_location: item.rackLocation })
        if (error) throw error
      }
    } catch (err) {
      console.error(`Failed to seed warehouse stock ${item.id}:`, err)
    }
  }
}
