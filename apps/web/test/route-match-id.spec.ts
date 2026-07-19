import { describe, expect, it } from "vitest";
import { decodeRouteMatchId } from "../src/lib/route-match-id";

describe("decodeRouteMatchId", () => {
  it("decodes odds percent-encoding from App Router params", () => {
    expect(decodeRouteMatchId("odds%3Ac520ae86e0b084879e18dc8bdb8dcf35")).toBe(
      "odds:c520ae86e0b084879e18dc8bdb8dcf35",
    );
  });

  it("is stable for already-decoded ids", () => {
    expect(decodeRouteMatchId("odds:abc")).toBe("odds:abc");
  });
});
