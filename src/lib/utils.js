/** Tailwind/clsx helpers for className composition. */
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Merge conditional class strings with tailwind-aware deduping. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 