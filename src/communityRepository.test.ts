import { describe, expect, it } from "vitest";
import { badgeForXp, badgeProgress } from "./communityRepository";

describe("Nagar Hero badges", () => {
  it("assigns badge thresholds correctly", () => {
    expect(badgeForXp(0)).toBe("Civic Starter");
    expect(badgeForXp(100)).toBe("Bronze Civic Champion");
    expect(badgeForXp(300)).toBe("Silver Civic Champion");
    expect(badgeForXp(700)).toBe("Gold Civic Champion");
    expect(badgeForXp(1500)).toBe("Platinum Civic Champion");
    expect(badgeForXp(3000)).toBe("Diamond Civic Champion");
  });

  it("calculates progress toward the next badge", () => {
    const progress = badgeProgress(200);
    expect(progress.current).toBe("Bronze Civic Champion");
    expect(progress.next).toBe("Silver Civic Champion");
    expect(progress.percent).toBe(50);
  });
});
