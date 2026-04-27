// ISO 4217 minor-unit exponents that differ from the default of 2.
const EXPONENT_OVERRIDES: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  HUF: 0,
  IDR: 0,
  BHD: 3,
  KWD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
}

export function exponentFor(currency: string): number {
  const code = currency.toUpperCase()
  if (code in EXPONENT_OVERRIDES) return EXPONENT_OVERRIDES[code]!
  try {
    const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency: code })
    return fmt.resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

export function isValidCurrency(code: string): boolean {
  if (!/^[A-Za-z]{3}$/.test(code)) return false
  try {
    new Intl.NumberFormat(undefined, { style: "currency", currency: code })
    return true
  } catch {
    return false
  }
}
