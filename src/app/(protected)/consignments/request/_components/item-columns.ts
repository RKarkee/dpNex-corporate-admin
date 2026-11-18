import type { FormRowsColumn } from "@/shared/components/ui/form-rows";

/**
 * The item table's columns, in the order the cells render. One list, so the
 * header and the rows cannot drift apart — add a field to the item row and
 * its column belongs here, at the same position.
 */
export const ITEM_COLUMNS: FormRowsColumn[] = [
  { label: "Item name", required: true, minRem: 15, grow: 2 },
  { label: "HS code", minRem: 10, grow: 1.2 },
  { label: "Material", minRem: 10 },
  { label: "Manufacturer", minRem: 10 },
  { label: "Gender", minRem: 8, grow: 0.8 },
  { label: "Quantity", required: true, minRem: 6, grow: 0.6 },
  { label: "Quantity code", required: true, minRem: 8, grow: 0.8 },
  { label: "Rate", required: true, minRem: 7, grow: 0.7 },
  { label: "Total amount", required: true, minRem: 7.5, grow: 0.7 },
  { label: "Currency", required: true, minRem: 8, grow: 0.8 },
];
