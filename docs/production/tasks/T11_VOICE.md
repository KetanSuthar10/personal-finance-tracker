# T11 — Dictation and recorded voice notes

## Prerequisites

T10 verified; selected browser and external audio-processing route identified.

Read [the master plan](../00_MASTER_PLAN.md), [execution contract](../01_EXECUTION_CONTRACT.md), [status](../STATUS.md) and [acceptance tests](../04_ACCEPTANCE_TESTS.md). This card assigns only the work below.

## Build checklist

- [ ] Implement editable live dictation with clear browser support, permission, network, silence, interruption and cancellation states. Do not describe Web Speech recognition as guaranteed local/offline.
- [ ] Add actual recorded-audio file intake/transcription through an approved integrated route. An editable transcript textbox alone is not uploaded voice-note support.
- [ ] Audio can contain identifiers before transcription. Do not claim post-transcription masking protected the original audio upload. Explain the destination/retention and require the chosen appropriate route before sending personal audio.
- [ ] Parse amounts including Indian formatting/spoken numbers, dates such as yesterday, recipient/purpose and account hints. Preserve ambiguity for review; cash must not silently become the first bank account.
- [ ] Use the same draft schema, rule precedence, explicit confirmation and T01 command service as text/receipt entry. Refund/transfer/repayment voice flows require correct accounts and semantics.
- [ ] Keep text entry available when dictation/transcription fails. Avoid unnecessary audio retention and external raw-content logs.

## Exit checks before reporting

- [ ] AT02–AT03 and AT23 pass for actual microphone dictation and actual uploaded synthetic audio on selected supported devices.
- [ ] User can review/edit amount/date/account/category; missing information is clarified and no expense is auto-saved from a partial transcript.
- [ ] Permission denial, unsupported browser, network failure and cancelled audio leave the ledger unchanged and text entry usable.
- [ ] Record live audio destination/route evidence and device checks; never mark the task complete from transcript-parser unit tests alone.

## Handoff

Coverage: F04, F20; AT02–AT03, AT23.

Complete the second-pass review, save a sanitised task report under `docs/production/reports/T11.md` using [the template](../TASK_REPORT_TEMPLATE.md), and update production/root status. Report completed, failed, blocked and unverified checks separately. Finish the assigned work without routine permission loops; stop before the next task.
