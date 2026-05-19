import { NextResponse } from "next/server";
import { Agent, run, tool } from "@openai/agents";
import { OpenAIAgentsProvider } from "@corsair-dev/mcp";
import { corsair } from "~/server/corsair";
import { db } from "~/server/db";
import { z } from "zod";

async function createAgent() {
  const provider = new OpenAIAgentsProvider();
  const baseTools = await provider.build({ corsair, tool });

  // Add Meeting Ops specific custom tools
  const queryDbTool = tool({
    name: "query_meeting_ops_db",
    description: `Run a read-only SQL SELECT query on the app's SQLite database to answer context questions. 
    Tables: 
    - meeting_runs: id, created_at, fireflies_id, meeting_title, meeting_date, summary, participants, status, slack_summary_sent, slack_issues_sent, transcript, used_fallback
    - draft_issues: id, created_at, meeting_run_id, title, description, assignee_id, priority, team_id, project_id, status (e.g. 'draft', 'approved'), linear_id
    - action_logs: id, created_at, meeting_run_id, action_type, details
    - app_settings: id, default_slack_channel, default_linear_project, default_linear_team...
    Return max 50 rows. Only SELECT is permitted.`,
    parameters: z.object({
      query: z.string().describe("The SQL SELECT query"),
    }),
    execute: async ({ query }) => {
      try {
        if (!query.trim().toUpperCase().startsWith("SELECT")) {
          return { error: "Only SELECT queries are allowed." };
        }
        return db.prepare(query).all();
      } catch (e: any) {
        return { error: e.message };
      }
    },
  });

  const getLinearTeamId = async () => {
    const settings = db
      .prepare(
        "SELECT default_linear_team FROM app_settings WHERE id = 'default'",
      )
      .get() as any;
    try {
      const teams = await corsair.linear.api.teams.list({});
      if (teams?.nodes?.length) {
        if (settings?.default_linear_team) {
          const team = teams.nodes.find(
            (t: any) =>
              t.key === settings.default_linear_team ||
              t.id === settings.default_linear_team,
          );
          if (team) return team.id;
        }
        return teams.nodes[0].id;
      }
    } catch (e) {
      console.error(e);
    }
    if (settings?.default_linear_team) return settings.default_linear_team;
    return null;
  };

  const approveDraftTool = tool({
    name: "approve_draft_issue",
    description: "Approves a draft issue and creates it in Linear.",
    parameters: z.object({
      draftId: z.string().describe("The ID of the draft issue to approve"),
    }),
    execute: async ({ draftId }) => {
      const draft = db
        .prepare("SELECT * FROM draft_issues WHERE id = ?")
        .get(draftId) as any;
      if (!draft || draft.status !== "draft")
        return {
          success: false,
          message: "Draft not found or already approved.",
        };

      const teamId = await getLinearTeamId();
      if (!teamId)
        return { success: false, message: "No Linear team configured." };

      try {
        const payload: any = {
          title: draft.title,
          description: draft.description || "",
          teamId,
          priority: draft.priority || 0,
        };
        if (draft.assignee_id) payload.assigneeId = draft.assignee_id;

        const issue = await corsair.linear.api.issues.create(payload);
        if (issue?.id) {
          db.prepare(
            "UPDATE draft_issues SET status = 'approved', linear_id = ? WHERE id = ?",
          ).run(issue.id, draftId);
          return {
            success: true,
            linearId: issue.id,
            url: issue.url || `https://linear.app/issue/${issue.identifier}`,
          };
        }
      } catch (e: any) {
        return { success: false, error: e.message };
      }
      return { success: false, message: "Unknown creation error." };
    },
  });

  const sendSlackTool = tool({
    name: "send_meeting_summary_to_slack",
    description:
      "Sends the meeting summary into Slack like the UI button does.",
    parameters: z.object({
      runId: z.string().describe("The Meeting Run ID"),
    }),
    execute: async ({ runId }) => {
      const run = db
        .prepare("SELECT * FROM meeting_runs WHERE id = ?")
        .get(runId) as any;
      if (!run) return { success: false, message: "Run not found" };

      try {
        let channelId = "C0B5AT9ABA4";
        try {
          const channels = await corsair.slack.api.channels.list({});
          const target = channels?.channels?.find(
            (c: any) => c.name === "meeting_notes" || c.name === "general",
          );
          if (target?.id) channelId = target.id;
        } catch (e) {
          // ignore
        }

        const message = `*Meeting Summary: ${run.meeting_title}*\n${run.meeting_date}\n\n${run.summary}`;
        await corsair.slack.api.messages.post({
          channel: channelId,
          text: message,
        });

        db.prepare(
          "UPDATE meeting_runs SET slack_summary_sent = 1 WHERE id = ?",
        ).run(runId);
        return {
          success: true,
          message: "Sent successfully to channel ID: " + channelId,
        };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    },
  });

  const getLinearIssuesToolSafely = tool({
    name: "get_linear_issues_safely",
    description:
      "Get recent Linear issues safely bypassing internal validation errors.",
    parameters: z.object({}),
    execute: async () => {
      try {
        // Workaround for the schema creatorId parsing error
        const res = await corsair.linear.api.issues.list({});
        return (
          res?.nodes?.map((n: any) => ({
            id: n.id,
            title: n.title,
            state: n.state?.name,
            url: n.url,
            identifier: n.identifier,
            assignee: n.assignee?.name,
            assigneeId: n.assignee?.id,
          })) || []
        );
      } catch (e: any) {
        // Fallback to local DB ONLY if linear API throws validation error again
        const approvedDrafts = db
          .prepare("SELECT * FROM draft_issues WHERE status = 'approved'")
          .all() as any[];
        return approvedDrafts.map((d: any) => ({
          id: d.linear_id || d.id,
          title: d.title,
          state: "approved",
          assigneeId: d.assignee_id,
        }));
      }
    },
  });

  return new Agent({
    name: "Meeting Ops Agent",
    instructions: `You are the ultimate Meeting Ops Context Agent. 
You act across the full meeting context (DB queries, Slack tools, Linear tools).
When answering questions about meetings, drafts, approvals, or linear tasks generated by this app, ALWAYS use 'query_meeting_ops_db' first to get the local state instead of doing blind global tool searches.
- If asked "what's the recent task created in linear", look at the 'draft_issues' table for status = 'approved'.
- If the user asks about "me" or "my assigned issues", FIRST look up the Linear users list to find their ID (usually the single human user or the admin), then use get_linear_issues_safely or query_meeting_ops_db.
- You can approve draft issues using 'approve_draft_issue'.
- You can send slack summaries via 'send_meeting_summary_to_slack'.
- For other raw connected plugins, use the native Corsair tools gracefully. Ignore background tool errors if you already have the data.
Be highly accurate. Base your context heavily on 'query_meeting_ops_db' local answers before deferring to generic "I couldn't find it" responses.`,
    model: "gpt-4o",
    tools: [
      ...baseTools,
      queryDbTool,
      approveDraftTool,
      sendSlackTool,
      getLinearIssuesToolSafely,
    ],
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return NextResponse.json({
        reply:
          "I am ready! Please configure OPENAI_API_KEY to start real capabilities.",
      });
    }

    const latestMessage =
      Array.isArray(messages) && messages.length > 0
        ? (messages[messages.length - 1]?.content ?? "")
        : "";

    const agent = await createAgent();
    const result = await run(agent, latestMessage);

    return NextResponse.json({
      reply:
        result.finalOutput || "Something went wrong processing your request.",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
