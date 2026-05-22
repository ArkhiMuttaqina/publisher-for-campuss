import { describe, expect, it } from "vitest";
import {
  authLoginSchema,
  mediaVisibilitySchema,
  workflowStatusSchema,
} from "./index";

describe("shared-schemas", () => {
  it("validates auth login payload", () => {
    const parsed = authLoginSchema.parse({
      email: "user@example.com",
      password: "12345678",
    });

    expect(parsed.email).toBe("user@example.com");
  });

  it("rejects unsupported visibility value", () => {
    const result = mediaVisibilitySchema.safeParse("internal");

    expect(result.success).toBe(false);
  });

  it("accepts canonical workflow status", () => {
    expect(workflowStatusSchema.parse("published")).toBe("published");
  });
});
