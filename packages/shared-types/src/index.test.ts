import { describe, expect, it } from "vitest";
import type { ApiSuccessEnvelope, RoleName } from "./index";

describe("shared-types", () => {
  it("allows known role name literals", () => {
    const role: RoleName = "editor";
    expect(role).toBe("editor");
  });

  it("keeps success envelope shape", () => {
    const envelope: ApiSuccessEnvelope<{ id: string }> = {
      success: true,
      data: { id: "book-1" },
    };

    expect(envelope.success).toBe(true);
    expect(envelope.data.id).toBe("book-1");
  });
});
