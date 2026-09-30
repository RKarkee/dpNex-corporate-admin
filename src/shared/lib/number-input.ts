import type React from "react";

/**
 * Keeps an <input type="number"> from going negative.
 *
 * `min={0}` stops the spinner arrows and the scroll wheel at 0; blocking the
 * sign/exponent keys (and pastes containing them) stops a user typing "-5" or
 * "1e-5". Spread it before `{...register(...)}` — register supplies neither
 * prop, so nothing is overwritten.
 *
 * Do NOT use on coordinates: latitude/longitude are legitimately negative.
 */
const BLOCKED_KEYS = new Set(["-", "+", "e", "E"]);

const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (BLOCKED_KEYS.has(e.key)) e.preventDefault();
};

const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  if (/[-+eE]/.test(e.clipboardData.getData("text"))) e.preventDefault();
};

/** Coordinates keep at most this many decimals — cut, not rounded. */
export const COORD_DECIMALS = 3;

/** Key/paste guards only — for inputs that already declare their own `min`. */
export const blockSignInputProps = { onKeyDown, onPaste };

/** `min={0}` plus the key/paste guards. */
export const nonNegativeInputProps = { min: 0, onKeyDown, onPaste };

/**
 * Cuts (does NOT round) a number to `places` decimals: 45.34567 -> 45.345.
 * Works on the decimal string, so float error can never turn 45.345 into
 * 45.344 the way Math.trunc(n * 1000) / 1000 can.
 */
export const truncateDecimals = (value: number, places: number): number => {
  if (!Number.isFinite(value)) return value;
  const text = /e/i.test(String(value)) ? value.toFixed(places + 10) : String(value);
  const [whole, fraction = ""] = text.split(".");
  const cut = Number(fraction ? `${whole}.${fraction.slice(0, places)}` : whole);
  return cut === 0 ? 0 : cut; // no "-0"
};

/**
 * For an <input> onChange: trims what was typed/pasted to `places` decimals
 * in place, before React Hook Form (or anything else) reads the value.
 */
export const truncateInputDecimals = (
  e: React.ChangeEvent<HTMLInputElement>,
  places: number,
) => {
  const v = e.target.value;
  const dot = v.indexOf(".");
  if (dot >= 0 && v.length - dot - 1 > places) {
    e.target.value = v.slice(0, dot + 1 + places);
  }
};
