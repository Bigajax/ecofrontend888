const INTERACTION_KEYS = new Set([
  'interaction_id',
  'interactionId',
  'interaction-id',
]);

const MESSAGE_ID_KEYS = new Set([
  'message_id',
  'messageId',
  'message-id',
  'response_message_id',
]);

const normalizeIdentifier = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }
  return null;
};

interface StackEntry {
  key?: string;
  value: unknown;
}

const findIdentifierByKeys = (root: unknown, keys: ReadonlySet<string>): string | null => {
  if (root == null) return null;

  const primitiveRoot = normalizeIdentifier(root);
  if (primitiveRoot) return primitiveRoot;
  if (typeof root !== 'object') return null;

  const visited = new WeakSet<object>();
  const stack: StackEntry[] = [{ value: root }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const { key, value } = current;
    if (value == null) continue;

    const primitive = normalizeIdentifier(value);
    if (primitive) {
      if (!key) continue;
      if (keys.has(key)) {
        return primitive;
      }
      continue;
    }

    if (typeof value !== 'object') continue;
    if (visited.has(value as object)) continue;
    visited.add(value as object);

    if (Array.isArray(value)) {
      for (const item of value) {
        stack.push({ value: item });
      }
      continue;
    }

    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      stack.push({ key: childKey, value: childValue });
    }
  }

  return null;
};

export const findInteractionId = (root: unknown): string | null =>
  findIdentifierByKeys(root, INTERACTION_KEYS);

export const findMessageId = (root: unknown): string | null =>
  findIdentifierByKeys(root, MESSAGE_ID_KEYS);

export { INTERACTION_KEYS, MESSAGE_ID_KEYS };
