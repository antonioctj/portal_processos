import {
  Complexity,
  ConfidenceLevel,
  GapCategory,
  OpportunityType,
  Severity,
} from "@prisma/client";

function safeEnum<T extends Record<string, string>>(
  enumObj: T,
  value: string | undefined | null,
  fallback: T[keyof T]
): T[keyof T] {
  if (!value) return fallback;
  const normalized = value.toUpperCase().replace(/\s+/g, "_");
  return (Object.values(enumObj) as string[]).includes(normalized)
    ? (normalized as T[keyof T])
    : fallback;
}

export const toGapCategory = (v: string | undefined) =>
  safeEnum(GapCategory, v, GapCategory.OTHER);

export const toSeverity = (v: string | undefined) => safeEnum(Severity, v, Severity.MEDIUM);

export const toConfidence = (v: string | undefined) =>
  safeEnum(ConfidenceLevel, v, ConfidenceLevel.MEDIUM);

export const toOpportunityType = (v: string | undefined) =>
  safeEnum(OpportunityType, v, OpportunityType.OTHER);

export const toComplexity = (v: string | undefined) =>
  safeEnum(Complexity, v, Complexity.MEDIUM);
