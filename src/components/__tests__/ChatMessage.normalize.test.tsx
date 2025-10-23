import { describe, expect, it } from "vitest";

import { normalizeMessageContent } from "../normalizeMessageContent";
import { sanitizeText } from "../../utils/sanitizeText";

describe("normalizeMessageContent", () => {
  it("joins streamed array fragments with appropriate spacing", () => {
    const fragments = ["Oi, rafael.", "Uma hipótese…"];

    const normalized = normalizeMessageContent(fragments);
    const sanitized = sanitizeText(normalized, { collapseWhitespace: false });

    expect(normalized).toBe("Oi, rafael. Uma hipótese…");
    expect(sanitized).toBe("Oi, rafael. Uma hipótese…");
  });
});
