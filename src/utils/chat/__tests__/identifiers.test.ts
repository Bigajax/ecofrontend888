import { describe, expect, it } from 'vitest';

import { findInteractionId, findMessageId } from '../identifiers';

describe('findInteractionId', () => {
  it('finds a direct interaction id property', () => {
    const payload = {
      interaction_id: 'abc-123',
    };

    expect(findInteractionId(payload)).toBe('abc-123');
  });

  it('finds nested ids under supported keys', () => {
    const payload = {
      data: {
        context: [{ meta: { interactionId: 'nested-value' } }],
      },
    };

    expect(findInteractionId(payload)).toBe('nested-value');
  });

  it('ignores falsy or empty values', () => {
    const payload = {
      interaction_id: '   ',
      fallback: null,
    };

    expect(findInteractionId(payload)).toBeNull();
  });

  it('supports numeric identifiers', () => {
    const payload = {
      meta: {
        'interaction-id': 987,
      },
    };

    expect(findInteractionId(payload)).toBe('987');
  });

  it('handles arrays with nested objects', () => {
    const payload = [
      { skip: true },
      {
        data: [
          { value: 0 },
          {
            metadata: {
              interactionId: 'array-hit',
            },
          },
        ],
      },
    ];

    expect(findInteractionId(payload)).toBe('array-hit');
  });

  it('avoids infinite loops on circular references', () => {
    const node: Record<string, unknown> = {};
    node.self = node;
    node.payload = { interaction_id: 'loop-safe' };

    expect(findInteractionId(node)).toBe('loop-safe');
  });
});

describe('findMessageId', () => {
  it('returns null when keys are missing', () => {
    expect(findMessageId({ foo: 'bar' })).toBeNull();
  });

  it('finds message ids within nested arrays', () => {
    const payload = {
      events: [
        { name: 'first' },
        {
          details: {
            messageId: 'message-777',
          },
        },
      ],
    };

    expect(findMessageId(payload)).toBe('message-777');
  });

  it('normalises numeric ids to strings', () => {
    expect(findMessageId({ response: { message_id: 42 } })).toBe('42');
  });
});
