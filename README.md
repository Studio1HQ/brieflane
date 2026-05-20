**Brieflane — Automate meeting transcripts → drafts, risks, decisions & Slack**

**What this app is:**  
- **Overview:** A small ops app that ingests meeting data (Fireflies), extracts summaries/transcripts, analyzes decisions & risks, drafts Linear issues, and optionally posts summaries/issues to Slack. [Corsair]("https://corsair.dev/") is the central orchestrator: it wires Fireflies, Linear and Slack together and exposes the webhook endpoint that powers the flow.  

**High-level flow:**  
- **Webhook**: Fireflies sends a webhook to the app when a meeting/transcript is available.  
- **Fetch**: The app (via `Corsair` Fireflies plugin) attempts to fetch full transcript + summary.  
- **Fallback**: If transcript/summary is not available (e.g., Fireflies paid tier required) the app uses an internal fallback transcript + summary so processing still works.  
- **Analyze**: If `OPENAI_API_KEY` is present the app calls OpenAI Agent SDK provided via Corsair to: produce a compact meeting title, generate actionable draft Linear issues, and extract Decisions & Risks from the transcript/summary.  
- **Persist**: Meeting runs and generated draft issues are persisted into a local SQLite DB (corsair.db).  
- **Optional Slack**: The app can post the summary / draft issues to Slack using the Slack plugin (bot token + signing secret).  
- **Manual/Test**: You can trigger the webhook locally (Postman / curl) to exercise the flow and verify fallbacks.

**How it works (components & important files):**  
- **`Corsair`**: App bootstraps Corsair in corsair.ts and registers these plugins:
  - Fireflies plugin (fetch transcripts & signature verification)
  - Linear plugin (create/list users, prepare issues)
  - Slack plugin (post messages using bot token)
- **Webhook route**: The public webhook endpoint lives at route.ts. It:
  - Accepts Fireflies webhooks (looks for `meetingId` / `transcriptId` / `id` in payload),
  - Inserts an initial `meeting_run` row,
  - Attempts to fetch transcript + summary via Corsair Fireflies API,
  - Falls back to an internal transcript/summary if Fireflies data is unavailable [for testing purposes or if the user does not have a paid Fireflies subscription],
  - Calls OpenAI to generate a meeting title, `issues[]`, `decisions[]`, `risks[]`,
  - Stores `decisions`, `risks`, and creates `draft_issues` entries for later review.
- **DB setup script**: setup-app-tables.cjs creates tables in corsair.db (see root script).
- **OpenAI usage**: If `OPENAI_API_KEY` is set, the webhook uses OpenAI chat completions to produce draft issues, decisions and risks.
- **Where to look in code**:
  - Corsair setup: corsair.ts  
  - Webhook handler & fallback logic: route.ts  
  - DB table creation: setup-app-tables.cjs (root)

**Features (quick):**  
- Draft Linear issues automatically created as `draft_issues` from meeting content.  
- Risk & Decisions extraction saved per meeting run.
- Slack integration to push summaries or issues (configurable).
- Fallback transcript/summary for testing or when Fireflies paid features are unavailable.
- An AI Agent to chat about anythign related to to meeting, slack, and linear issues.
- Local SQLite DB (corsair.db) for runs, drafts, and action logs.

**Prerequisites:**  
- Node (recommended v18+).  
- A Fireflies account (paid tier required to reliably fetch summaries & transcripts). If you do not have paid Fireflies, the app still runs using the built-in fallback transcript/summary.  
- Slack: create a Slack App and get a Bot Token and Signing Secret.  
- Linear: generate a Linear API key for creating/listing issues/users.  
- OpenAI API key (optional, required to generate draft issues/decisions/risks automatically).  
- `CORSAIR_KEK` — an encryption key used by Corsair per the app config.

**Environment variables** (create a .env at the repo root):
- `FIREFLIES_API_KEY` — Fireflies API key (optional; required to fetch transcripts).  
- `FIREFLIES_WEBHOOK_SECRET` — Fireflies webhook secret (used to verify incoming webhooks).  
- `LINEAR_API_KEY` — Linear personal API key.  
- `SLACK_BOT_TOKEN` — Slack bot token (e.g. `xoxb-...`).  
- `SLACK_SIGNING_SECRET` — Slack signing secret (used if verifying requests).  
- `OPENAI_API_KEY` — (optional) for automated issue/decision/risk generation.  
- `CORSAIR_KEK` — required by `corsair` in corsair.ts.

Example .env snippet:
```env
FIREFLIES_API_KEY=your_fireflies_api_key_here
FIREFLIES_WEBHOOK_SECRET=your_fireflies_webhook_secret_here
LINEAR_API_KEY=your_linear_api_key_here
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
OPENAI_API_KEY=sk-...
CORSAIR_KEK=some-secure-value
```

**Local setup (step-by-step):**  
- **1) Clone**
  - `git clone <repo-url>`  
  - `cd brieflane`
- **2) Install**
  - `npm install`
- **3) Create .env** (fill the values above)
- **4) Initialize DB tables**
  - Run the bundled setup script to create necessary tables:
  ```bash
  node setup-app-tables.cjs
  ```
  This will create corsair.db and the `meeting_runs`, `draft_issues`, and other tables.
- **5) Run the app (dev)**
  - `npm run dev`  
  - The Next.js app runs on `http://localhost:3000` by default.
- **6) Expose locally (optional for real webhooks)**
  - Use `ngrok http 3000` (or equivalent) and register the `https://<your-ngrok>.ngrok.io/api/webhook` URL inside Fireflies as the webhook target.
- **7) Test the webhook locally (Postman / curl)**  
  - The webhook endpoint: `POST http://localhost:3000/api/webhook`  
  - Minimal test payload (server looks for `meetingId`, `transcriptId`, or `id`):
  ```bash
  curl -X POST http://localhost:3000/api/webhook \
    -H "Content-Type: application/json" \
    -d '{"meetingId":"test-123","eventType":"transcript.created"}'
  ```
  - You will get JSON back describing the inserted `runId`, whether transcript was fetched, or whether fallback was used.
  - If you want to exercise the OpenAI-driven issue generation, ensure `OPENAI_API_KEY` is set in .env.

**Notes about Fireflies & fallback behavior:**  
- Fireflies paid subscription is required to consistently retrieve full transcripts and summaries via the API. If the Fireflies API responds with a paid/permission error, the app will:
  - Mark the run as using the fallback transcript/summary, and
  - Continue processing (you can still test issue generation & Slack pushes).  
- A built-in fallback transcript and summary exist in route.ts so you can test without live Fireflies data.

**Testing & manual flows:**  
- Use the Postman test above to simulate a Fireflies webhook and verify DB inserts and draft issue creation.  
- Inspect corsair.db file (SQLite viewer or `sqlite3`) to see `meeting_runs`, `draft_issues`, and `action_logs`.  
- Logs: webhook handler logs headers/body and processing steps to console — inspect terminal running `npm run dev`.

**Troubleshooting tips:**  
- If you see `Transcript fetch failed` in logs and `usedFallback: true`, either your Fireflies API key or webhook permissions (paid tier) are missing. Use the fallback to continue testing.  
- If draft issues are not being generated, confirm `OPENAI_API_KEY` is present and valid.  
- If Slack messages do not appear, confirm `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` and that your Slack app is installed to the target workspace and has chat scope permissions.

**Key files to review:**  
- Main Corsair bootstrap: corsair.ts  
- Webhook + processing logic: route.ts  
- DB initializer: setup-app-tables.cjs

**Docs & references:**  
- Corsair docs: https://docs.corsair.dev/hosted-sdk/overview
- Fireflies Get Credentials: https://docs.corsair.dev/plugins/fireflies/get-credentials
- Linear Get Credentials: https://docs.corsair.dev/plugins/linear/get-credentials
- Slack Get Credentials: https://docs.corsair.dev/plugins/slack/get-credentials
- Corsair SDK docs: https://docs.corsair.dev/getting-started/introduction
- Corsair Plugins: https://docs.corsair.dev/guides/plugins