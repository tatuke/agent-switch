import { SoulSchema, Soul } from './schema';

export function validateSoul(soul: unknown): Soul {
  return SoulSchema.parse(soul);
}

export function isSoulValid(soul: unknown): boolean {
  try {
    SoulSchema.parse(soul);
    return true;
  } catch {
    return false;
  }
}
