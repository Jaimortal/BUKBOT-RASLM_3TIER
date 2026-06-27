# Ready for User Testing Notes

The chatbot is ready for manual user testing after the Day 12 cleanup and validation pass.

## What To Run

Recommended local services:

```powershell
rasa run actions
rasa run --enable-api --cors "*"
npm.cmd run dev
```

Use `npm.cmd` on PowerShell if `npm.ps1` is blocked by execution policy.

## What To Test First

Use:

- `docs/Day 11 Full Regression Testing Checklist.md`

Start with:

- `how to get id?`
- `student id`
- `where can i get library id`
- `what are the requirements?`
- `how much?`
- `admission contact`
- `where can i find the avc?`
- `what papers for oral exam`
- `zzzz unknown capstone-only phrase`

## Expected Behavior

- Ambiguous ID questions ask clarification.
- Follow-up questions stay on the active subject.
- Explicit new subjects override memory.
- Maps appear when map data exists.
- Images appear when image URLs exist.
- Unknown questions return a nonblank fallback.
- Admin JSON edits create backups.
- Pure JSON edits do not require Rasa retrain.

## Known Existing Technical Debt

`python -m unittest discover -s test` still includes older expectation failures in `test_context_aware_retrieval.py`.
The focused Day 11 regression suite and query-normalization dataset pass, but the older full context suite needs a cleanup pass so it matches the newest response wording and route names.

`npm.cmd run check` still reports older TypeScript errors unrelated to the chatbot architecture refactor:

- `client/src/pages/MapPage.tsx`
- `server/admin-db.ts`
- `server/db.ts`
- `server/storage.ts`

Production build passes through:

```powershell
npm.cmd run build
```

## When To Retrain

Retrain Rasa only after changing:

- NLU examples
- domain intents/entities/actions/slots
- stories
- rules

JSON response, map, image, phrase, and subject-term changes should work through action hot reload.
