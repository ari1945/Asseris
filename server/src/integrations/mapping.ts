// W9 Fase 1 — field-mapping engine. A connector's `mapping` (Connector.mappingJson) is a list of
// [sourceLabel, targetField] pairs from the blueprint, e.g. [['Nominal','amount'], …]. The right
// column is the canonical field name the target SSOT expects; a provider's raw record is keyed by
// those same canonical names (that's the contract the adapter fulfils). applyMapping picks exactly
// the mapped target fields out of a raw record — nothing unmapped leaks through, so the mapping is
// the single declaration of what crosses from external system → SSOT.

export type FieldMapping = Array<[string, string]>; // [sourceLabel, targetField]

/**
 * Project a raw provider record down to only its mapped target fields. Fields named in the
 * mapping but absent from the record are simply omitted (the validator catches missing
 * required ones downstream). Unmapped keys in the record are dropped.
 */
export function applyMapping(mapping: FieldMapping, raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const pair of mapping) {
    const targetField = pair[1];
    if (Object.prototype.hasOwnProperty.call(raw, targetField)) {
      out[targetField] = raw[targetField];
    }
  }
  return out;
}
