export function nairaToKobo(amount: unknown): number | null {
  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return null;
  }

  const amountInKobo = amount * 100;
  return Number.isSafeInteger(amountInKobo) ? amountInKobo : null;
}
