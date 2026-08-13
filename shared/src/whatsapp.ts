function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  return `62${digits}`
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`
}

export function buildTrackingLink(phone: string): string {
  return `${window.location.origin}/?track=${encodeURIComponent(phone)}`
}
