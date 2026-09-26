export interface ItemUnitOption {
  id: string;
  unitName: string;
  conversionRate: number; // multiplier to base unit
  price?: number | null;
  isDefault?: boolean;
}

/**
 * Converts a quantity in a specific unit into base unit quantity
 * E.g., 2 Box (conversionRate = 40) => 80 Pcs
 */
export function convertToBaseUnit(quantity: number, conversionRate: number): number {
  return Math.max(0, Math.round(quantity * (conversionRate || 1)));
}

/**
 * Converts a base unit quantity into a breakdown of higher-tier units
 * E.g., 85 Pcs with units [Carton: 80, Box: 40] => "1 Carton, 5 Pcs" or "2 Box, 5 Pcs"
 */
export function formatBaseQuantityWithUnits(
  baseQty: number,
  baseUnit: string,
  units: ItemUnitOption[]
): string {
  if (!units || units.length === 0 || baseQty === 0) {
    return `${baseQty} ${baseUnit}`;
  }

  // Sort units descending by conversion rate
  const sorted = [...units].sort((a, b) => b.conversionRate - a.conversionRate);
  const primaryUnit = sorted[0];

  if (primaryUnit && baseQty >= primaryUnit.conversionRate) {
    const unitCount = Math.floor(baseQty / primaryUnit.conversionRate);
    const remainder = baseQty % primaryUnit.conversionRate;
    if (remainder === 0) {
      return `${unitCount} ${primaryUnit.unitName} (${baseQty} ${baseUnit})`;
    }
    return `${unitCount} ${primaryUnit.unitName} + ${remainder} ${baseUnit}`;
  }

  return `${baseQty} ${baseUnit}`;
}

/**
 * Calculates unit price based on conversion rate or unit explicit price override
 */
export function calculateUnitPrice(
  basePrice: number,
  unit?: { price?: number | null; conversionRate: number }
): number {
  if (!unit) return basePrice;
  if (unit.price !== undefined && unit.price !== null && unit.price > 0) {
    return unit.price;
  }
  return basePrice * (unit.conversionRate || 1);
}
