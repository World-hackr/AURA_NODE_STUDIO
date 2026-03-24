export type DisplayUnit = "mm" | "in";

const UM_PER_MM = 1000;
const UM_PER_IN = 25400;

function getUnitScale(unit: DisplayUnit): number {
  return unit === "mm" ? UM_PER_MM : UM_PER_IN;
}

function getUnitPrecision(unit: DisplayUnit): number {
  return unit === "mm" ? 2 : 3;
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/, "");
}

export function getDisplayUnitLabel(unit: DisplayUnit): string {
  return unit;
}

export function getAlternateDisplayUnit(unit: DisplayUnit): DisplayUnit {
  return unit === "mm" ? "in" : "mm";
}

export function formatUmForDisplay(valueUm: number, unit: DisplayUnit): string {
  const precision = getUnitPrecision(unit);
  const scaledValue = valueUm / getUnitScale(unit);
  return `${scaledValue.toFixed(precision)} ${getDisplayUnitLabel(unit)}`;
}

export function formatUmForInput(valueUm: number, unit: DisplayUnit): string {
  const precision = getUnitPrecision(unit);
  const scaledValue = valueUm / getUnitScale(unit);
  return trimTrailingZeros(scaledValue.toFixed(precision));
}

export function parseDisplayValueToUm(value: string, unit: DisplayUnit): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * getUnitScale(unit));
}

export function formatUmPair(
  firstValueUm: number,
  secondValueUm: number,
  unit: DisplayUnit,
): string {
  return `${formatUmForDisplay(firstValueUm, unit)} x ${formatUmForDisplay(secondValueUm, unit)}`;
}
