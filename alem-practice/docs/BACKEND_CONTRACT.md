# Backend contract — 23 September 2026

This contract describes **alem-practice**, not the separate `Frontend` Vite/localStorage demo.
Routes, existing field names and status strings are retained. Additions are optional response fields.
No UI, CSS, page or layout changes are part of this backend update.

## Transport and identity

- Same-origin JSON HTTP API. Local origin: `http://127.0.0.1:3000`, configured by `APP_URL`.
- All mutations require `Origin` exactly equal to `APP_URL` origin and a valid `alem_session` cookie.
- The existing auth routes issue HttpOnly/SameSite cookies. Role and actor ID come from the session.
  `x-demo-role`, `x-demo-id`, client scores and client ownership are not trusted.
- Error shape is always `{ "error": "human-readable message" }`. Statuses: 400 invalid input,
  401 no session, 403 wrong role/owner/origin, 404 missing record, 413 oversized body, 429 local quota,
  500 unexpected failure. Provider payloads and credentials are never returned.
- Body limit: 65,536 characters (and declared Content-Length limit). JSON uses ISO dates, string IDs and explicit nulls.
- Auth mock is for a local demonstration, not verification of phone ownership. Existing Twilio support is unchanged.

## GET /api/data

Returns an object (no new envelope):

```ts
{
  tasks: TaskView[], businesses: BusinessView[], teams: TeamView[],
  proposals: ProposalView[], profiles: PublicProfile[], me: OwnProfile | null,
  authMode: 'mock' | 'twilio', aiMode: 'mock' | 'live',
  aiConfiguration: { configured: boolean, provider: 'openai' | 'compatible', model: string | null }
}
```

`aiMode`/`aiConfiguration` describe configuration, **not a successful provider health check**.
Only a specific `/api/ai` response with `mode: "live"` proves that request used the provider.
No key or base URL is returned. `Cache-Control: no-store` applies.

Each task retains `id, ownerId, ownerName, title, topic, fields, learning, confirmedFields,
readinessScore, readinessLevel, publicationStatus, createdAt, proposalCount, isDemo`.
`fields` has nine string-or-null values: `context, need, data, expectedResult,
successCriteria, constraints, users, contact, collaboration`.
`learning` has `skills: string[], prerequisites: string[], portfolio: string, difficulty: string`.
An additive `readiness` object provides `score, level, breakdown, missingFields, tips`.
Each breakdown item: `{field,label,weight,points,confirmed,complete}`;
each tip: `{field,message,potentialPoints}`. Missing fields are invalid/absent fields;
filled but unconfirmed fields appear in tips and earn zero.

All published tasks are visible at every rating. Unpublished tasks are returned only to their owner.
Proposals are scoped to the owning business or submitting team; unauthenticated visitors see only synthetic seed proposals.
Private phone numbers, session hashes and auth challenge data are never in this response.
Order: descending computed score, descending creation date, ascending ID for exact ties.
The existing catalog filters title/company/skills, topic and readiness on this loaded array.

## POST /api/action

Request remains `{ "action": "createTask", "payload": {...} }`.
Successful actions return the existing Prisma record shape directly, except `confirmMilestone` below.
Stringified record fields in mutation responses remain strings, e.g. `confirmTask.confirmedFields` is JSON text;
`GET /api/data` exposes parsed arrays/objects as before. The current provider refreshes it after a mutation.

| Action | Payload | Role |
|---|---|---|
| createTask | `{title,topic,fields,learning,draftText?}` | business |
| updateTask | `{id,task:{title,topic,fields,learning,draftText?}}` | owning business |
| confirmTask | `{id}` | owning business |
| publishTask | `{id}` | owning business |
| createProposal | `{taskId,idea,plan:string[],durationDays:number,prototypeUrl,assumptions?}` | student |
| decideProposal | `{id,status:'pending'|'selected'|'rejected'}` | owning business |
| submitMilestone | `{id,result,resultUrl}` | selected team |
| confirmMilestone | `{id}` | owning business |

Task title: 3–160 characters; topic: 2–100; each card field: up to 6,000; initial draft: up to 10,000.
Proposal idea: 10–3,000 characters; 1–15 plan steps, 3–1,000 characters each;
duration: integer 1–365 days. Ordinary prototype URLs must be HTTP(S), without embedded credentials.
**Compatibility exception:** existing UI sends `/demo/prototypes/<safe-id>`; the backend allows only that
specific internal path and converts new proposal links to an absolute URL under `APP_URL` before storage.
Other relative URLs, protocol-relative URLs, javascript/data/ftp and credential-bearing URLs are rejected.
Historical seed links and milestone demo links retain the existing relative format.

Exact duplicate proposal submissions (same team, task and normalized complete payload) return the
same proposal, including simultaneous requests and retries after restart. SHA-256 fingerprint is unique
in SQLite. Different payloads create independent proposals; there is no per-task count limit.
The legacy client has no request ID, so identical deliberate re-submissions also reuse the record.

Each action executes ownership checks and writes in one transaction. SQLite conflicts have a bounded
retry. Selecting one proposal never rejects another. Selection creates a single milestone with status `open`.
Submission changes it to `submitted`; business confirmation changes it to `confirmed`.
Confirmation returns `{points:50}` or `{alreadyConfirmed:true,points:50}`.
Award creation, balance increment and milestone confirmation commit together; unique `Award.milestoneId`
prevents duplicate awards. Decisions cannot be reversed after a confirmed milestone.

## Editing and publication

Any change to title, topic, fields or learning temporarily changes `publicationStatus` to `unpublished`
and sets `reviewRequired`. The task stays in the owner's cabinet; proposals and awarded points remain.
The changed card is therefore hidden from the public catalog until the owner explicitly confirms and
publishes it again. This is intentionally **not a snapshot/versioning implementation**.
Unchanged saves do not remove publication. Changed scored fields lose their individual confirmations.
`confirmTask` confirms valid fields and clears reviewRequired; it does not publish.
`publishTask` requires a valid confirmed `need` and no pending review, not a minimum score.
The existing Save → Confirm → Publish controls support this without UI changes.

## POST /api/ai

Business session required; 20 requests per user/hour and 100 total/hour, persisted in SQLite.
Called only by an explicit constructor action, never by catalog loading.

```json
{
  "mode": "questions",
  "draft": {"id":"draft","text":"Кафе хочет уменьшить списания продуктов.","industry":"Кафе"},
  "answers": [{"id":"answer-q-data","questionId":"q-data","text":"Есть учебный CSV продаж"}],
  "forceMock": false
}
```

`mode`: `questions` or `card`; `forceMock` optional. Draft text: 10–10,000 characters;
answer text: up to 6,000; combined text: up to 20,000. Unique source IDs and question IDs required.
Question IDs are `q-<field>`, using the nine card fields.

Question result: `{questions:[{id,field,question,reason}],missingFields,mode,diagnostics,draftId}`.
Card result: `{card:{title,...nineFields},evidence:[{field,sourceIds}],missingFields,mode,diagnostics,draftId}`.
There are 3–9 unique questions. The card is editable, never auto-confirmed, scored by AI or published.
Source IDs must refer to the input draft or a nonempty supplied answer. Source-reference validation
does not establish factual truth; human review is still required.

`mode` remains `live` or `mock` for old clients. Additive diagnostics:

```json
{"provider":"deterministic","fallbackReason":"timeout","model":null}
```

Live provider: `openai` or `compatible`, model name, null fallbackReason.
Fallback reasons: disabled, requested_mock, not_configured, unauthorized, rate_limited,
unavailable, timeout, network, refusal, invalid_response.
Provider errors produce HTTP 200 with a valid deterministic result and `mode: "mock"`;
bad input/auth/quota errors remain non-2xx. Never present fallback as a successful OpenAI call.
OpenAI uses Responses API, strict JSON Schema, `store:false`, 3,500 output tokens,
12 seconds per attempt and at most two attempts with 250 ms backoff for transient failures.
Response bytes are capped at 128 KB. No provider response bodies or credentials are logged.

The initial text is saved **before** AI execution; answers are saved when submitted for analysis.
Identical owner/text/industry reuses the draft. Different descriptions produce separate drafts.
`draftId` is the server ID; evidence continues to use the submitted source IDs for compatibility.
`createTask` links the matching stored draft when draftText/topic match.

## GET /api/drafts (new)

Business session required. Returns the owner's most recent 100 drafts as an array:
`[{id,text,industry,answers:[{id,questionId,text}],createdAt}]`.
No cross-owner drafts are exposed.

## Frontend follow-up, deliberately not changed here

- `components/task-builder.tsx`: the current form can use the existing AI flow unchanged. To resume
  after closing/reloading an unfinished form, add a draft picker using GET /api/drafts and restore
  `text/industry/answers`. Backend persistence works; automatic UI restoration is not implemented.
- `components/shell.tsx`: global AI indicator currently reflects configured mode. To show health,
  distinguish `aiConfiguration.configured` from the last actual response diagnostics.
- `components/task-builder.tsx`: optional explanation that editing removes publication until review,
  and optional fallback reason display. Actual AI mode is already consumed by the existing form.
- The separate `Frontend/src/store/useAppStore.ts` still uses localStorage. Its mentor, multi-stage
  learning and +100 XP model are not supported by this API. Connecting that separate app is not
  claimed complete; use the existing alem-practice client for the end-to-end MVP.

## Verification and database lifecycle

SQLite + Prisma 6.19.2. Apply migrations with `npm run db:migrate`; never reset/drop a live database.
`npm run db:seed` only inserts missing seed records (5 businesses, 25 tasks, 5 teams, 5 proposals).
Back up the SQLite file while the app is stopped, including journals if present.
`npm test` uses a separate temporary database; `npm run test:http` requires a build and runs its own
mock-only server at port 3107, tests HTTP workflow and restarts it to verify persistence. Neither uses
the local live database or paid providers. `npm run ai:check -- --live` is a separate explicit paid opt-in.
