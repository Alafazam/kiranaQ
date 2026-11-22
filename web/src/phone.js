// Distributor phone numbers (spec 2026-11-22-distributor-actions R6). Never log a number.
export const MIN_PHONE_DIGITS = 10
export const MAX_PHONE_DIGITS = 15

export function isValidPhone(value) {
  const v = (value || '').trim()
  if (!/^[0-9+\-\s]+$/.test(v)) return false
  const digits = v.replace(/\D/g, '').length
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS
}

// tel: link uses digits and + only.
export function telHref(phone) {
  return `tel:${(phone || '').replace(/[^0-9+]/g, '')}`
}
