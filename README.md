<div align="center">

<img src="https://raw.githubusercontent.com/Studio1HQ/Studio1HQ/main/assets/banners/brieflane.webp" alt="Brieflane Meeting Automation with Corsair: Turn meeting transcripts into Linear issues, risks, decisions and Slack posts" width="100%" />

<br />
<br />

# Brieflane Meeting Automation with Corsair

### Turn meeting transcripts into Linear issues, risks, decisions and Slack posts

A Next.js app that takes Fireflies meeting webhooks, extracts decisions and risks, drafts Linear issues with OpenAI and posts summaries to Slack. Corsair wires the three services together.

<br />

[![Built by Studio1](https://img.shields.io/badge/Built_by_Studio1-f97316?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTYwIiBmaWxsPSJub25lIj48cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTAgMzVDMCAxNi42ODA3IDE0LjA3NDQgMS42NDg0NCAzMiAwLjEyNjk1M1YxNDFINTEuMDUyM0M1Mi40MzA4IDEzNy4zNDQgNTQuNzQ0NiAxMzMuNjg5IDU3Ljk5MzggMTMwLjAzM0M2MS4xNDQ2IDEyNi41MDggNjQuNjg5MiAxMjMuNDQgNjguNjI3NyAxMjAuODI5QzcyLjU2NjIgMTE4LjM0OSA3Ni4zNTY5IDExNi43ODIgODAgMTE2LjEyOVY4Ni43NTQ0Qzc1LjQ3MDggODcuOTI5MiA3MS4zODQ2IDg5LjY5MTkgNjcuNzQxNSA5Mi4wNDE1QzY0IDk0LjUyMjUgNjAuNzUwOCA5Ny40NiA1Ny45OTM4IDEwMC44NTRDNTYuNTM0NSAxMDIuNzIgNTUuMjU0NSAxMDQuNjU5IDU0LjE1MzkgMTA2LjY3MVYwSDEyNUMxNDQuMzMgMCAxNjAgMTUuNjY5OSAxNjAgMzVWMTI1QzE2MCAxNDQuMzMgMTQ0LjMzIDE2MCAxMjUgMTYwSDEyNFYxOEgxMDQuOTQ4QzEwMy41NjkgMjEuNjgxNiAxMDEuMjU1IDI1LjM2MjggOTguMDA2MiAyOS4wNDQ0Qzk0Ljg1NTQgMzIuNTk0MiA5MS4zMTA4IDM1LjY4NDEgODcuMzcyMyAzOC4zMTRDODMuNDMzOCA0MC44MTIgNzkuNjQzMSA0Mi4zODk2IDc2IDQzLjA0NzRWNzIuNjMwNEM4MC41MjkyIDcxLjQ0NzMgODQuNjE1NCA2OS42NzI0IDg4LjI1ODUgNjcuMzA1N0M5MiA2NC44MDc2IDk1LjI0OTIgNjEuODQ5MSA5OC4wMDYyIDU4LjQzMDdDOTkuNDY1NSA1Ni41NTEzIDEwMC43NDUgNTQuNTk4NiAxMDEuODQ2IDUyLjU3MjNWMTYwSDM1QzE1LjY3IDE2MCAwIDE0NC4zMyAwIDEyNVYzNVoiIGZpbGw9IiNmZmZmZmYiLz48L3N2Zz4K)](https://studio1hq.com)
[![Built with Corsair](https://img.shields.io/badge/Built_with_Corsair-141414?style=for-the-badge)](https://corsair.dev)

[Corsair docs](https://docs.corsair.dev) &nbsp;·&nbsp; [Corsair](https://corsair.dev) &nbsp;·&nbsp; [More examples](https://github.com/Studio1HQ) &nbsp;·&nbsp; [studio1hq.com](https://studio1hq.com)

</div>

<br />

## Overview

Brieflane is a small ops app that ingests meeting data from Fireflies, pulls the summary and transcript, analyzes decisions and risks, drafts Linear issues, and can post summaries or issues to Slack. [Corsair](https://corsair.dev/) is the central orchestrator. It wires Fireflies, Linear and Slack together and the app exposes the webhook endpoint that starts the flow.

Corsair is a developer SDK that connects third-party services through one API. You register plugins once, and Corsair handles auth, credential encryption and method routing for each service.

<p align="center"><img src="https://github.com/user-attachments/assets/b8132c2c-23ff-4de1-89e3-ad1aefa6a209" alt="Brieflane app" width="100%" /></p>

## Features

- **Draft Linear issues**: issues are drafted from meeting content.
- **Decisions and risks**: extracted and saved for each meeting run.
- **Slack posting**: summaries or issues can be posted to Slack through the Corsair Slack plugin.
- **Fallback content**: a default summary and transcript lets you test without paid Fireflies access.
- **AI chat agent**: a chat panel for meeting, Slack and Linear actions, using the OpenAI Agents flow through Corsair's MCP adapter.
- **Local storage**: a SQLite database (`corsair.db`) holds runs, drafts and logs.

## Tech stack

| Layer | Tool |
| --- | --- |
| Framework | [Next.js](https://nextjs.org), React, tRPC |
| Integrations | [Corsair](https://corsair.dev/) with the Fireflies, Linear and Slack plugins |
| Meetings | [Fireflies](https://app.fireflies.ai/) |
| Issues | [Linear](https://linear.app) |
| Messaging | [Slack](https://slack.com) |
| LLM | [OpenAI](https://openai.com) (OpenAI Agents SDK) |
| Database | SQLite (`better-sqlite3`) |

## Getting started

### Prerequisites

- Node.js 18 or later
- A Fireflies account
- A Linear API key
- A Slack bot token and signing secret, if you use Slack
- An OpenAI API key
- A value for `CORSAIR_KEK`
- [ngrok](https://ngrok.com) and Postman (or any HTTP client) to test the webhook locally

### Installation

```bash
git clone https://github.com/Studio1HQ/brieflane.git
cd brieflane
npm install
```

### Environment variables

Create a `.env` file in the project root (see `.env.example`).

| Variable | Description |
| --- | --- |
| `FIREFLIES_API_KEY` | Fireflies API key. See [Fireflies credentials](https://docs.corsair.dev/plugins/fireflies/get-credentials). |
| `FIREFLIES_WEBHOOK_SECRET` | Fireflies webhook secret. |
| `LINEAR_API_KEY` | Linear API key. See [Linear credentials](https://docs.corsair.dev/plugins/linear/get-credentials). |
| `SLACK_BOT_TOKEN` | Slack bot token (`xoxb-...`). See [Slack credentials](https://docs.corsair.dev/plugins/slack/get-credentials). |
| `SLACK_SIGNING_SECRET` | Slack signing secret. |
| `OPENAI_API_KEY` | OpenAI key. Without it the app skips AI analysis and draft issues are not created. |
| `CORSAIR_KEK` | A secure value used by Corsair for credential encryption. |

### Run

Create the SQLite tables, then start the app:

```bash
node setup-app-tables.cjs
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). To test the webhook:

1. In Fireflies, upload a meeting recording or join a real meeting. Open it from My Meetings and copy the meeting ID from the URL.
2. Expose the local server with `ngrok http 3000`.
3. Send a `POST` request (for example from Postman) to `https://<your-ngrok-url>/api/webhook` with the header `Content-Type: application/json` and a raw JSON body:

```json
{
  "eventType": "Transcription",
  "meetingId": "your_meeting_id_here",
  "clientReferenceId": "test-session"
}
```

Replace `meetingId` with the ID you copied. `clientReferenceId` can be any name. A `200 OK` means the webhook was processed. The generated data then appears in the app.

<details>
<summary>More screenshots</summary>

<p align="center"><img src="https://github.com/user-attachments/assets/d3e97772-ea51-4874-aaf1-908820956ec3" alt="Fireflies My Meetings list" width="100%" /></p>
<p align="center"><img src="https://github.com/user-attachments/assets/a4ee49d1-bff3-4bfa-b6b1-2bb838ecc764" alt="Meeting ID in the Fireflies URL" width="100%" /></p>

</details>

## How it works

1. **Webhook**: Fireflies sends meeting data to `/api/webhook`.
2. **Fetch**: the Corsair Fireflies plugin fetches the transcript and summary.
3. **Fallback**: if the transcript or summary is unavailable (for example on a free Fireflies plan), the app uses the default summary and transcript defined in `src/app/api/webhook/route.ts`. Edit it to test other scenarios.
4. **Analyze**: if `OPENAI_API_KEY` is set, the OpenAI Agents flow through Corsair's MCP adapter generates a short meeting title, draft Linear issues, decisions and risks.
5. **Persist**: meeting runs, decisions, risks and draft issues are stored in `corsair.db`.
6. **Slack**: summaries or issues can be posted through the Corsair Slack plugin.

Key files:

- `src/server/corsair.ts`: bootstraps Corsair and registers the Fireflies, Linear and Slack plugins.
- `src/app/api/webhook/route.ts`: accepts webhook payloads, fetches data, falls back if needed, runs AI generation and stores results.
- `src/app/api/chat/route.ts`: the AI agent for chat-based actions.
- `setup-app-tables.cjs`: creates the SQLite tables.

Troubleshooting:

- If the transcript fetch fails and the fallback is used, check your Fireflies plan and API access.
- If draft issues are missing, check that `OPENAI_API_KEY` is set.
- If Slack messages do not appear, check that the Slack app is installed and has the required permissions.

## Resources

- [Corsair overview](https://docs.corsair.dev/hosted-sdk/overview): the hosted SDK.
- [Corsair introduction](https://docs.corsair.dev/getting-started/introduction): getting started.
- [Corsair plugins](https://docs.corsair.dev/guides/plugins): registering plugins.
- [OpenAI Agents via Corsair MCP adapter](https://docs.corsair.dev/mcp-adapters/openai-agents): how the AI agent is wired.
- [Corsair](https://corsair.dev/): the SDK used here.

<br />

---

<div align="center">

<a href="https://studio1hq.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Studio1HQ/website/main/brand/studio1-logo-on-dark.svg" />
    <img src="https://raw.githubusercontent.com/Studio1HQ/website/main/brand/studio1-logo-on-light.svg" alt="Studio1" width="160" />
  </picture>
</a>

Built by **[Studio1](https://studio1hq.com)**, the technical content and DevRel partner for devtool teams. Made with [Corsair](https://corsair.dev).<br />
Browse more open-source examples at [github.com/Studio1HQ](https://github.com/Studio1HQ).

[![Website](https://img.shields.io/badge/studio1hq.com-0b0807?style=for-the-badge&logo=googlechrome&logoColor=white)](https://studio1hq.com)
[![Book a call](https://img.shields.io/badge/Book_a_strategy_call-f97316?style=for-the-badge&logo=googlecalendar&logoColor=white)](https://cal.com/studio1/collab)
[![X](https://img.shields.io/badge/%40Studio1HQ-141414?style=for-the-badge&logo=x&logoColor=white)](https://x.com/Studio1HQ)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0a66c2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/studio1hq/)

<sub><a href="https://studio1hq.com">studio1hq.com</a> · Technical content, docs, video and DevRel for devtools</sub>

</div>
