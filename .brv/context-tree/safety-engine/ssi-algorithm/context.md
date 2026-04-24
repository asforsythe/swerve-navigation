---
title: "SSI Algorithm"
tags: ["safety-index", "calculation", "risk-assessment"]
keywords: ["SSI", "risk-scoring", "traction", "hazard-level"]
related: ["safety-engine/weather-integration", "safety-engine/routing-integration"]
createdAt: "2026-04-22T05:48:00Z"
updatedAt: "2026-04-22T05:48:00Z"
---

# Topic: ssi-algorithm

## Overview
Implementation of the Swerve Safety Index (SSI) scoring system. Evaluates weather and surface conditions sampled along a route to produce a final safety score (0–100), hazard classification, traction estimate, and spoken alert message.

## Key Concepts
- Risk factors are evaluated per sampled point; maximum risk dominates the final score.
- Four hazard tiers: black ice (critical), storm cell (high), high winds (medium), slick roads (low).
- Traction model distinguishes ice (10% traction) from hydroplaning risk (precip-intensity dependent).
- SSI = round((1 - maxRisk) * 100). Categories: Critical (≤30), Caution (31–70), Optimal (≥71).

## Related Topics
- [safety-engine/weather-integration](./weather-integration/context.md) — where weather datapoints originate
- [safety-engine/routing-integration](./routing-integration/context.md) — how SSI drives route comparison
