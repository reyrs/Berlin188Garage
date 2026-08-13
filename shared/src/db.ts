import { supabase } from './supabase'
import type { Order, CashTransaction, CashClosing, Expense, WarehouseStockItem, User, HeroContent, PromoPopup, PortfolioItem, BlogPost, ErrorLog } from './types'
import { sanitizeBlogHtml } from './sanitize'

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

function mapProfileToUser(data: any): User {
  return { id: data.id, name: data.name, role: data.role, email: data.email || '', phone: data.phone || '', avatarUrl: data.avatar_url, specialization: data.specialization || undefined }
}

export async function updateProfileSpecialization(id: string, specialization: string): Promise<void> {
  const { error } = await db().from('profiles').update({ specialization: specialization || null }).eq('id', id)
  if (error) throw error
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
  const { error } = await db().from('orders').insert({ id: order.id, customer_name: order.customerName, customer_phone: order.customerPhone, customer_address: order.customerAddress, car_brand: order.carBrand, car_model: order.carModel, plate_number: order.plateNumber, car_vin: order.carVin, car_type: order.carType, car_year: order.carYear, car_engine_code: order.carEngineCode, complaints: JSON.stringify(order.complaints), service_type: order.serviceType, status: order.status, created_at: order.createdAt, advisor_id: order.advisorId, advisor_name: order.advisorName, spk_number: order.spkNumber, findings: JSON.stringify(order.findings), service_items: JSON.stringify(order.serviceItems), timeline: JSON.stringify(order.timeline), payment_status: order.paymentStatus, payment_method: order.paymentMethod, payment_destination: order.paymentDestination, invoiced_at: order.invoicedAt, paid_at: order.paidAt, dp_amount: order.dpAmountPaid, notes: order.notes, spk_sent: order.spkSent, assigned_mechanic_id: order.assignedMechanicId, assigned_mechanic_name: order.assignedMechanicName, slot_number: order.slotNumber })
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
  if (fields.complaints !== undefined) dbFields.complaints = JSON.stringify(fields.complaints)
  if (fields.status !== undefined) dbFields.status = fields.status
  if (fields.paymentStatus !== undefined) dbFields.payment_status = fields.paymentStatus
  if (fields.paymentMethod !== undefined) dbFields.payment_method = fields.paymentMethod
  if (fields.paymentDestination !== undefined) dbFields.payment_destination = fields.paymentDestination
  if (fields.invoicedAt !== undefined) dbFields.invoiced_at = fields.invoicedAt
  if (fields.paidAt !== undefined) dbFields.paid_at = fields.paidAt
  if (fields.dpAmountPaid !== undefined) dbFields.dp_amount = fields.dpAmountPaid
  if (fields.notes !== undefined) dbFields.notes = fields.notes
  if (fields.spkSent !== undefined) dbFields.spk_sent = fields.spkSent
  if (fields.assignedMechanicId !== undefined) dbFields.assigned_mechanic_id = fields.assignedMechanicId
  if (fields.assignedMechanicName !== undefined) dbFields.assigned_mechanic_name = fields.assignedMechanicName
  if (fields.slotNumber !== undefined) dbFields.slot_number = fields.slotNumber
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

// transactions.order_id / stock_mutations.order_id are ON DELETE SET NULL,
// so deleting an order never fails on an FK — it just detaches history rows
// from a WO that no longer exists instead of blocking the delete.
export async function deleteOrder(id: string): Promise<void> {
  const { error } = await db().from('orders').delete().eq('id', id)
  if (error) throw error
}

// Public "Cek Servis" tracking + customer self-service ACC. These call
// SECURITY DEFINER Postgres functions (not the `orders` table directly) —
// anon has no table-level access to orders anymore, only these narrow,
// phone-scoped RPCs. See supabase/migrations/20260803120000_fix_orders_anon_exposure.sql.
export async function trackOrdersByPhone(phone: string): Promise<Order[]> {
  const { data, error } = await db().rpc('track_orders_by_phone', { p_phone: phone })
  if (error) throw error
  return (data || []).map(mapOrder)
}

export async function customerSetFindingStatus(orderId: string, phone: string, findingId: string, status: 'approved' | 'rejected'): Promise<Order | null> {
  const { data, error } = await db().rpc('customer_set_finding_status', { p_order_id: orderId, p_phone: phone, p_finding_id: findingId, p_status: status })
  if (error) throw error
  return data && data[0] ? mapOrder(data[0]) : null
}

export async function customerSetServiceItemStatus(orderId: string, phone: string, itemId: string, status: 'approved' | 'rejected'): Promise<Order | null> {
  const { data, error } = await db().rpc('customer_set_service_item_status', { p_order_id: orderId, p_phone: phone, p_item_id: itemId, p_status: status })
  if (error) throw error
  return data && data[0] ? mapOrder(data[0]) : null
}

function mapComplaints(data: any): string[] {
  if (Array.isArray(data.complaints)) return data.complaints
  if (typeof data.complaints === 'string') {
    try { const parsed = JSON.parse(data.complaints); if (Array.isArray(parsed)) return parsed } catch { /* fall through */ }
  }
  // Backward-compat: baris lama sebelum migrasi complaints belum punya
  // kolom itu terisi, cuma `complaint` (string tunggal) — tampilkan itu
  // sebagai array 1 elemen daripada keluhan pelanggan hilang dari UI.
  return data.complaint ? [data.complaint] : []
}

export function mapOrder(data: any): Order {
  return { id: data.id, customerName: data.customer_name, customerPhone: data.customer_phone, customerAddress: data.customer_address || undefined, carBrand: data.car_brand, carModel: data.car_model, plateNumber: data.plate_number, carVin: data.car_vin || undefined, carType: data.car_type || undefined, carYear: data.car_year || undefined, carEngineCode: data.car_engine_code || undefined, complaints: mapComplaints(data), serviceType: data.service_type, status: data.status, createdAt: data.created_at, advisorId: data.advisor_id || undefined, advisorName: data.advisor_name || undefined, spkNumber: data.spk_number || undefined, findings: typeof data.findings === 'string' ? JSON.parse(data.findings) : (data.findings || []), serviceItems: typeof data.service_items === 'string' ? JSON.parse(data.service_items) : (data.service_items || []), timeline: typeof data.timeline === 'string' ? JSON.parse(data.timeline) : (data.timeline || []), paymentStatus: data.payment_status, paymentMethod: data.payment_method || undefined, paymentDestination: data.payment_destination || undefined, invoicedAt: data.invoiced_at || undefined, paidAt: data.paid_at || undefined, dpAmountPaid: data.dp_amount !== null && data.dp_amount !== undefined ? Number(data.dp_amount) : undefined, notes: data.notes || undefined, spkSent: data.spk_sent || undefined, assignedMechanicId: data.assigned_mechanic_id || undefined, assignedMechanicName: data.assigned_mechanic_name || undefined, slotNumber: data.slot_number ?? undefined }
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

export async function fetchErrorLogs(): Promise<ErrorLog[]> {
  const { data, error } = await db().from('error_logs').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data || []).map((d: any) => ({
    id: d.id, message: d.message, stack: d.stack || undefined, source: d.source,
    pageUrl: d.page_url || undefined, createdAt: d.created_at,
  }))
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

// warehouse_stock RLS only allows owner/gudang direct writes, but stock
// mutations are also triggered by advisor actions (Pasang part ke WO,
// reject-restock, resolve temuan) — a plain UPDATE from an advisor session
// silently matches 0 rows under RLS (no error thrown) instead of failing
// loudly. adjust_warehouse_stock() is a SECURITY DEFINER RPC scoped to
// advisor/owner/gudang that does an atomic delta update and actually
// throws when unauthorized or when stock would go negative.
export async function adjustWarehouseStock(id: string, delta: number): Promise<number> {
  const { data, error } = await db().rpc('adjust_warehouse_stock', { p_item_id: id, p_delta: delta })
  if (error) throw error
  return data as number
}

export async function updateWarehouseStockMarketplaceLink(id: string, marketplaceProductId: string | null): Promise<void> {
  const { error } = await db().from('warehouse_stock').update({ marketplace_product_id: marketplaceProductId }).eq('id', id)
  if (error) throw error
}

function mapStockItem(data: any): WarehouseStockItem {
  return { id: data.id, name: data.name, code: data.code, price: Number(data.price), stock: data.stock, rackLocation: data.rack_location, marketplaceProductId: data.marketplace_product_id ?? undefined }
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

// ============================================================
// HERO CONTENT (landing page "banner promosi")
// ============================================================

export async function fetchHeroContent(): Promise<HeroContent | null> {
  const { data, error } = await db().from('hero_content').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { headline: data.headline, subtitle: data.subtitle, ctaText: data.cta_text, backgroundImageUrl: data.background_image_url || undefined, updatedAt: data.updated_at || undefined, updatedBy: data.updated_by || undefined }
}

export async function updateHeroContent(fields: Partial<HeroContent>, updatedBy: string): Promise<void> {
  const dbFields: Record<string, any> = { updated_by: updatedBy }
  if (fields.headline !== undefined) dbFields.headline = fields.headline
  if (fields.subtitle !== undefined) dbFields.subtitle = fields.subtitle
  if (fields.ctaText !== undefined) dbFields.cta_text = fields.ctaText
  if (fields.backgroundImageUrl !== undefined) dbFields.background_image_url = fields.backgroundImageUrl
  const { error } = await db().from('hero_content').update(dbFields).eq('id', 1)
  if (error) throw error
}

// Bucket landing-assets sudah ada di Supabase (dibuat & di-RLS lewat migration
// terpisah, dijalankan manual oleh user) — dipakai bareng buat semua upload
// gambar landing page (hero, portofolio, blog). prefix cuma buat gampang
// bedain asal file pas lihat daftar bucket manual.
export async function uploadLandingAsset(file: File, prefix: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${prefix}-${Date.now()}.${ext}`
  const { error } = await db().storage.from('landing-assets').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = db().storage.from('landing-assets').getPublicUrl(path)
  return data.publicUrl
}

// ============================================================
// PROMO POPUP (landing page — muncul otomatis, dikelola marketing)
// ============================================================

export async function fetchPromoPopup(): Promise<PromoPopup | null> {
  const { data, error } = await db().from('promo_popup').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    enabled: data.enabled,
    imageUrl: data.image_url || undefined,
    title: data.title || '',
    description: data.description || '',
    ctaText: data.cta_text || '',
    ctaLink: data.cta_link || '',
    delaySeconds: data.delay_seconds ?? 5,
    updatedAt: data.updated_at || undefined,
    updatedBy: data.updated_by || undefined,
  }
}

export async function updatePromoPopup(fields: Partial<PromoPopup>, updatedBy: string): Promise<void> {
  const dbFields: Record<string, any> = { updated_by: updatedBy }
  if (fields.enabled !== undefined) dbFields.enabled = fields.enabled
  if (fields.imageUrl !== undefined) dbFields.image_url = fields.imageUrl
  if (fields.title !== undefined) dbFields.title = fields.title
  if (fields.description !== undefined) dbFields.description = fields.description
  if (fields.ctaText !== undefined) dbFields.cta_text = fields.ctaText
  if (fields.ctaLink !== undefined) dbFields.cta_link = fields.ctaLink
  if (fields.delaySeconds !== undefined) dbFields.delay_seconds = fields.delaySeconds
  const { error } = await db().from('promo_popup').update(dbFields).eq('id', 1)
  if (error) throw error
}

// ============================================================
// PORTFOLIO ITEMS (landing page — dikelola manual marketing)
// ============================================================

export async function fetchPortfolioItems(): Promise<PortfolioItem[]> {
  const { data, error } = await db().from('portfolio_items').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapPortfolioItem)
}

export async function createPortfolioItem(item: Omit<PortfolioItem, 'id' | 'createdAt'>): Promise<void> {
  const { error } = await db().from('portfolio_items').insert({
    car_brand: item.carBrand,
    car_model: item.carModel,
    service_type: item.serviceType,
    work_description: item.workDescription,
    image_url: item.imageUrl,
    created_by: item.createdBy,
  })
  if (error) throw error
}

export async function deletePortfolioItem(id: string): Promise<void> {
  const { error } = await db().from('portfolio_items').delete().eq('id', id)
  if (error) throw error
}

function mapPortfolioItem(data: any): PortfolioItem {
  return { id: data.id, carBrand: data.car_brand, carModel: data.car_model, serviceType: data.service_type, workDescription: data.work_description, imageUrl: data.image_url, createdAt: data.created_at || undefined, createdBy: data.created_by || undefined }
}

// ============================================================
// BLOG POSTS (landing page — artikel dikelola manual marketing,
// tiap post punya URL sendiri lewat routing di src/main.tsx)
// ============================================================

export async function fetchPublishedBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await db().from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapBlogPost)
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await db().from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapBlogPost(data)
}

// Staff-only: RLS (blog_posts_select_staff_all) is what actually restricts
// this to marketing/owner and is what includes drafts — this function has
// no separate status filter, it just asks for everything the caller's role
// is allowed to see.
export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await db().from('blog_posts').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(mapBlogPost)
}

async function isBlogSlugTaken(slug: string): Promise<boolean> {
  const { data, error } = await db().from('blog_posts').select('id').eq('slug', slug).maybeSingle()
  if (error) throw error
  return !!data
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function generateUniqueBlogSlug(title: string): Promise<string> {
  const base = slugify(title)
  let candidate = base
  let n = 2
  while (await isBlogSlugTaken(candidate)) {
    candidate = `${base}-${n}`
    n++
  }
  return candidate
}

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>): Promise<void> {
  const { error } = await db().from('blog_posts').insert({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: sanitizeBlogHtml(post.content),
    cover_image_url: post.coverImageUrl,
    category: post.category,
    status: post.status,
    published_at: post.status === 'published' ? new Date().toISOString() : null,
    created_by: post.createdBy,
  })
  if (error) throw error
}

export async function updateBlogPost(id: string, fields: Partial<Pick<BlogPost, 'title' | 'slug' | 'excerpt' | 'content' | 'coverImageUrl' | 'category'>>): Promise<void> {
  const dbFields: Record<string, any> = {}
  if (fields.title !== undefined) dbFields.title = fields.title
  if (fields.slug !== undefined) dbFields.slug = fields.slug
  if (fields.excerpt !== undefined) dbFields.excerpt = fields.excerpt
  if (fields.content !== undefined) dbFields.content = sanitizeBlogHtml(fields.content)
  if (fields.coverImageUrl !== undefined) dbFields.cover_image_url = fields.coverImageUrl
  if (fields.category !== undefined) dbFields.category = fields.category
  const { error } = await db().from('blog_posts').update(dbFields).eq('id', id)
  if (error) throw error
}

// published_at cuma diisi kalau ini PERTAMA kali post-nya publish — supaya
// urutan /blog nggak berubah kalau draft lama di-publish belakangan
// (published_at, bukan created_at, yang dipakai buat ORDER BY).
export async function publishBlogPost(id: string, alreadyPublishedBefore: boolean): Promise<void> {
  const dbFields: Record<string, any> = { status: 'published' }
  if (!alreadyPublishedBefore) dbFields.published_at = new Date().toISOString()
  const { error } = await db().from('blog_posts').update(dbFields).eq('id', id)
  if (error) throw error
}

export async function unpublishBlogPost(id: string): Promise<void> {
  const { error } = await db().from('blog_posts').update({ status: 'draft' }).eq('id', id)
  if (error) throw error
}

export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await db().from('blog_posts').delete().eq('id', id)
  if (error) throw error
}

function mapBlogPost(data: any): BlogPost {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    coverImageUrl: data.cover_image_url,
    category: data.category,
    status: data.status,
    publishedAt: data.published_at || undefined,
    createdAt: data.created_at || undefined,
    updatedAt: data.updated_at || undefined,
    createdBy: data.created_by || undefined,
    sourceUrl: data.source_url || undefined,
  }
}
