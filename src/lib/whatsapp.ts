// wa.me needs the number in international format with no leading 0/+ —
// Indonesian numbers are stored locally as "08..." so normalize to "628...".
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  return `62${digits}`
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`
}

// Deep link into the public tracking portal, pre-filled with the customer's
// phone — see App.tsx's `?track=` handling. Without this, a WA message would
// only be able to point at the homepage and make the customer retype their
// number.
export function buildTrackingLink(phone: string): string {
  return `${window.location.origin}/?track=${encodeURIComponent(phone)}`
}
