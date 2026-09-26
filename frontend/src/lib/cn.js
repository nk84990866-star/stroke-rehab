/**
 * Joins class names, skipping falsy values.
 * (Kept dependency-free — a full clsx/tailwind-merge isn't needed yet.)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default cn;
