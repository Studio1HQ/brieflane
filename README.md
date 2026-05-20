**Brieflane: Automate meeting transcripts → issues, risks, decisions & Slack**

**What this app is:**  
- **Overview:** A small ops app that ingests meeting data (Fireflies), extracts summaries/transcripts, analyzes decisions & risks, drafts Linear issues, and optionally posts summaries/issues to Slack. [Corsair](https://corsair.dev/) is the central orchestrator: it wires Fireflies, Linear, and Slack together and exposes the webhook endpoint that powers the flow.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/b8132c2c-23ff-4de1-89e3-ad1aefa6a209" />


> **What is Corsair?** [Corsair](https://corsair.dev/) is a developer SDK that connects third-party services, like Fireflies, Linear, and Slack, through a single unified API. Instead of writing separate integration code for each service, you register plugins once and Corsair handles auth, credential encryption, and method routing for all of them.


## High-level flow:
- **Webhook**: Fireflies sends meeting data to the app through the webhook endpoint.
- **Fetch**: The app uses the Corsair Fireflies plugin to fetch the transcript and summary.
- **Fallback**: If Fireflies transcript or summary data is unavailable, the app falls back to the default summary and transcript defined in `brieflane\src\app\api\webhook\route.ts`.
- **Analyze**: If `OPENAI_API_KEY` is present, the app uses the OpenAI Agents flow through Corsair's MCP adapter to generate a short meeting title, draft Linear issues, decisions, and risks.
- **Persist**: The app stores meeting runs, decisions, risks, and draft issues in the local SQLite database `corsair.db`.
- **Slack**: The app can also post summaries or issues to Slack through the Corsair Slack plugin.

## How to use it: 

### 1. Create a Fireflies account and prepare a meeting
- Go to [Fireflies](https://app.fireflies.ai/) and create an account.
- Add meeting content in either of these ways:
  - Upload a meeting audio file that you downloaded from somewhere, or
  - Join a real meeting with your teammates and let Fireflies capture it.
- After the meeting appears in Fireflies, open **My Meetings** and click the meeting you want to use.
<img width="1905" height="785" alt="image" src="https://github.com/user-attachments/assets/d3e97772-ea51-4874-aaf1-908820956ec3" />


### 2. Copy the meeting ID from the Fireflies URL
- Open the meeting details page in Fireflies.
- Copy the meeting ID from the browser URL. It is the long id shown in the URL bar.
<img width="1451" height="192" alt="image" src="https://github.com/user-attachments/assets/a4ee49d1-bff3-4bfa-b6b1-2bb838ecc764" />

That meeting ID will be used in the webhook payload.

### 3. Run the app locally
- Clone the repo:
  ```bash
  git clone <repo-url>
  cd brieflane
  ```
- Install dependencies:
  ```bash
  npm install
  ```
- Create a `.env` file in the project root and fill in the required values:
  ```env
  FIREFLIES_API_KEY=your_fireflies_api_key_here
  FIREFLIES_WEBHOOK_SECRET=your_fireflies_webhook_secret_here
  LINEAR_API_KEY=your_linear_api_key_here
  SLACK_BOT_TOKEN=xoxb-...
  SLACK_SIGNING_SECRET=...
  OPENAI_API_KEY=sk-...
  CORSAIR_KEK=some-secure-value
  ```
  To get the Fireflies, Linear, and Slack plugin keys, visit these pages for detailed step-by-step setup:
  - [Fireflies credentials](https://docs.corsair.dev/plugins/fireflies/get-credentials)  
  - [Linear credentials](https://docs.corsair.dev/plugins/linear/get-credentials)  
  - [Slack credentials](https://docs.corsair.dev/plugins/slack/get-credentials)
- Initialize the SQLite tables:
  ```bash
  node setup-app-tables.cjs
  ```
- Start the app:
  ```bash
  npm run dev
  ```

### 4. Expose your local server with ngrok
Run:

```bash
ngrok http 3000
```

Use the public ngrok URL for webhook testing. In this example, the webhook endpoint is:

```txt
https://xyz-your-url.ngrok-free.dev/api/webhook
```

### 5. Trigger the webhook from Postman
Open Postman and create a **POST** request to:

```txt
https://xyz-your-url.ngrok-free.dev/api/webhook
```

Set this header:

```txt
Content-Type: application/json
```

Set the body to **raw JSON** and use:

```json
{
  "eventType": "Transcription",
  "meetingId": "your_meeting_id_here",
  "clientReferenceId": "test-session"
}
```

- Replace `your_meeting_id_here` with the meeting id you copied from Fireflies.
- `clientReferenceId` can be any name you want.

If the request succeeds, you should get a **200 OK** response.

### 6. What happens after 200 OK
- The webhook is processed immediately.
- The app creates a meeting run in the database.
- It tries to fetch transcript and summary data from Fireflies.
- It analyzes the meeting and creates draft issues, decisions, and risks.
- Then you can open the app UI and see the generated data appear there in real time.

### 7. Important Fireflies fallback note
If you do **not** have a paid Fireflies account, transcript and summary fetches may not be available through the API. In that case, the app automatically falls back to the default summary and transcript already defined in:

```txt
brieflane\src\app\api\webhook\route.ts
```

You can edit that fallback content in code any time to test different meeting scenarios.

## How it works in code:
- **`corsair.ts`**: Bootstraps Corsair and registers the Fireflies, Linear, and Slack plugins.
- **`brieflane\src\app\api\webhook\route.ts`**: Accepts webhook payloads, fetches transcript and summary, falls back if needed, calls AI generation, and stores the results.
- **`setup-app-tables.cjs`**: Creates the SQLite tables used by the app.

## AI agent: 
The app also includes an AI agent for chat-based actions around meetings, Slack, and Linear. It uses the OpenAI Agents flow through Corsair's MCP adapter, based on the Corsair OpenAI Agents integration here: [https://docs.corsair.dev/mcp-adapters/openai-agents](https://docs.corsair.dev/mcp-adapters/openai-agents).

## Features:
- Draft Linear issues created from meeting content.
- Decisions and risks extracted and saved per meeting run.
- Slack integration for posting summaries or issues.
- Fallback transcript and summary support for testing without paid Fireflies access.
- AI chat agent for meeting, Slack, and Linear workflows.
- Local SQLite database (`corsair.db`) for runs, drafts, and logs.

## Prerequisites:
- Node.js 18+ recommended.
- Fireflies account.
- Linear API key.
- Slack bot token and signing secret, if using Slack.
- OpenAI API key.
- `CORSAIR_KEK` for Corsair configuration.

## Troubleshooting:
- If the transcript fetch fails and fallback is used, check your Fireflies plan and API access first.
- If draft issues are missing, verify `OPENAI_API_KEY` is set correctly.
- If Slack messages do not appear, verify the Slack app is installed and has the required permissions.

**Docs & references:**  
- Corsair overview: [https://docs.corsair.dev/hosted-sdk/overview](https://docs.corsair.dev/hosted-sdk/overview)  
- Corsair introduction: [https://docs.corsair.dev/getting-started/introduction](https://docs.corsair.dev/getting-started/introduction)  
- Corsair plugins: [https://docs.corsair.dev/guides/plugins](https://docs.corsair.dev/guides/plugins)  
- OpenAI Agents via Corsair MCP adapter: [https://docs.corsair.dev/mcp-adapters/openai-agents](https://docs.corsair.dev/mcp-adapters/openai-agents)  
- Fireflies credentials: [https://docs.corsair.dev/plugins/fireflies/get-credentials](https://docs.corsair.dev/plugins/fireflies/get-credentials)  
- Linear credentials: [https://docs.corsair.dev/plugins/linear/get-credentials](https://docs.corsair.dev/plugins/linear/get-credentials)  
- Slack credentials: [https://docs.corsair.dev/plugins/slack/get-credentials](https://docs.corsair.dev/plugins/slack/get-credentials)
