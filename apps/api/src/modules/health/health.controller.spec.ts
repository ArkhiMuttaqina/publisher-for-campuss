import { HealthController } from "./health.controller";
import { describe, expect, it } from "vitest";

describe("HealthController", () => {
  it("returns ok status with ISO timestamp", () => {
    const controller = new HealthController();

    const result = controller.getHealth();

    expect(result.status).toBe("ok");
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
