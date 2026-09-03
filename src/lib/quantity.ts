/**
 * Quantities are stored as 3-decimal fixed point ("milli") integers so the
 * split math never touches floating point. See `Item.quantitiesMilli`.
 */
export const MILLI = 1000

/** One tap of the -/+ stepper moves a whole unit. Type a decimal for halves. */
export const QTY_STEP_MILLI = MILLI

/** 1000 -> "1", 500 -> "0.5", 1250 -> "1.25" */
export function formatQty(milli: number): string {
  const qty = milli / MILLI
  return Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(3)))
}
