import assert from "node:assert/strict";
import test from "node:test";

import { aggregateVerifiedImpact } from "./impact.js";

test("verified impact includes only approved submissions", () => {
  const impact = aggregateVerifiedImpact([
    {
      id: "approved-action",
      user_id: "user-1",
      status: "approved",
      challenges: { impact_type: "actions" },
    },
    {
      id: "rejected-action",
      user_id: "user-2",
      status: "rejected",
      challenges: { impact_type: "actions" },
    },
  ]);

  assert.equal(impact.actions, 1);
  assert.equal(impact.participants, 1);
});

test("verified tree and waste values are aggregated without trusting reported values", () => {
  const impact = aggregateVerifiedImpact([
    {
      id: "tree",
      user_id: "user-1",
      status: "approved",
      verified_trees: 5,
      challenges: { impact_type: "trees" },
    },
    {
      id: "waste",
      user_id: "user-2",
      status: "approved",
      verified_waste_kg: 3.5,
      challenges: { impact_type: "waste" },
    },
  ]);

  assert.equal(impact.trees, 5);
  assert.equal(impact.wasteKg, 3.5);
});

test("public impact excludes admin submissions", () => {
  const impact = aggregateVerifiedImpact([
    {
      id: "admin-action",
      user_id: "admin-1",
      status: "approved",
      profiles: { role: "admin" },
      challenges: { impact_type: "actions" },
    },
    {
      id: "user-action",
      user_id: "user-1",
      status: "approved",
      profiles: { role: "user" },
      challenges: { impact_type: "actions" },
    },
  ]);

  assert.equal(impact.actions, 1);
  assert.equal(impact.participants, 1);
});
