# Ordered task index

Start one task per Antigravity assignment. Read the master plan, execution contract and current status each time. Finish all work and checks inside the assigned task, then report; do not treat the remaining roadmap as permission to start later tasks.

| ID | Task file | Depends on | Exit outcome |
| --- | --- | --- | --- |
| T00 | [Baseline and truthful status](tasks/T00_BASELINE.md) | None | Instructions reconciled; audit baseline recorded; simulated paths gated |
| T01 | [Ledger and date correctness](tasks/T01_LEDGER.md) | T00 | One validated financial command path across input modes |
| T02 | [Database and access boundaries](tasks/T02_DATABASE.md) | T01 | Atomic schema/RPC writes and owner isolation tested |
| T03 | [Google login and real ledger slice](tasks/T03_AUTH_AND_SYNC.md) | T02 | Empty owner app, real accounts/entries and cross-device persistence |
| T04 | [CSV import and reconciliation](tasks/T04_IMPORTS.md) | T03 | One validated bank CSV layout, review, safe matching/retry/undo |
| T05 | [Categories, recipients and learning](tasks/T05_LEARNING.md) | T04 | Corrections and explicit rules applied on all entry/import paths |
| T06 | [Cards, EMIs and planning](tasks/T06_COMMITMENTS.md) | T05 | Allocations, instalments and received/expected income reconcile |
| T07 | [Backup and recovery](tasks/T07_RECOVERY.md) | T06 | Complete private export and atomic clean restore verified |
| T08 | [PDF and XLSX statement intake](tasks/T08_DOCUMENT_IMPORTS.md) | T07 | Real extraction for declared layouts with row/balance review |
| T09 | [Receipt and payment image OCR](tasks/T09_RECEIPTS.md) | T08 | Uploaded pixels produce a real editable draft |
| T10 | [Gemini backend and tools](tasks/T10_GEMINI.md) | T09 | Authenticated bounded integration, grounded results and verified data route |
| T11 | [Dictation and recorded notes](tasks/T11_VOICE.md) | T10 | Selected voice methods work through editable drafts and normal writes |
| T12 | [UI, PWA and release gate](tasks/T12_RELEASE.md) | T11 | Evidence-backed owner release on phone and laptop |

Prerequisites are verification gates. If a task's prerequisite lacks live evidence, report the exact gap. Continue independent implementation within the assigned task when possible; do not claim dependent live flows work. The user can explicitly assign independent later work while an external gate is blocked, but release remains blocked until mandatory gates pass.

## First usable private pilot

After T01–T03 are verified, the owner may use manual accounts and entry on the private connected ledger. Imports, planning, AI and capture features stay accurately unavailable until their own checks pass. This is a limited real capability, not a declaration that the full app is complete. Export via a controlled administrative owner backup can protect pilot records before T07's full recovery UI; do not begin a pilot without a recoverable copy of valuable records.

T12 is the full-scope release gate. n8n, Drive and external notifications are optional future tasks and are not secretly included in T12.
