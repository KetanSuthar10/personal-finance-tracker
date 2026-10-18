# Audit finding → repair task

Reference: [baseline audit](evidence/FINANCE_TRACKER_REVIEW.md). T00 records current reproduction; later tasks close findings using the acceptance IDs. This is a plan, not a list of fixed issues.

| Finding | Primary task | Required evidence |
| --- | --- | --- |
| F01 fabricated receipt extraction | T00 gates; T09 implements | AT17 |
| F02 unsafe matching/multiplicity | T04 | AT04–AT07 |
| F03 reversed imported repayment | T01, T04 | AT02, AT08 |
| F04 quick capture semantics | T01 | AT02–AT03 |
| F05 shared statement payment | T06 | OC01, OC05 |
| F06 EMI obligation projection | T06 | OC02–OC04, OC06 |
| F07 missing auth/database runtime | T02, T03 | AT13–AT15 |
| F08 outbound masking misses payload | T10 | AT19–AT20 |
| F09 browser API key arrangement | T00 gates; T10 implements | Server-only key plus AT13, AT21 |
| F10 undo removes independent data | T04 | AT09 |
| F11 incomplete/invalid backup | T07 | AT16 |
| F12 swallowed storage failures | T03, T07 | AT15–AT16; no production local fallback |
| F13 rules not applied | T05 | AT11–AT12 |
| F14 assistant invented inputs/dates | T01, T10 | AT03, AT19, AT22 |
| F15 stale/unverified Gemini config | T10 | Synthetic live call and AT21 |
| F16 period/freshness | T01, T03 | AT01, AT14 |
| F17 formats/validation/refund inference | T04, T08 | AT03, AT10, AT18 |
| F18 account/card/EMI lifecycle | T03, T06 | AT14, OC01–OC06 |
| F19 expected income/planning inputs | T06 | OC04; expected-to-received linkage |
| F20 missing recorded voice | T11 | AT23 |
| F21 offline cache/update | T12 | AT24 |
| F22 accessibility | Every UI task; T12 final | AT24 |
| F23 product wording/design consistency | T03 onward; T12 final | Real screens and AT24 |
| F24 status/test/dependency overclaims | T00 onward; T12 final | Task evidence ledger, CI, final diff review |

All PRD acceptance criteria remain mandatory: AC01→AT24; AC02→AT01–AT03; AC03→AT07; AC04→AT05/AT08; AC05→AT04–AT06/AT10; AC06→AT11–AT12; AC07→AT02/AT08; AC08→OC01–OC06; AC09→AT01/AT14; AC10→AT13/AT20; AC11→AT03/AT19/AT22; AC12→AT21; AC13→AT09/AT16.
