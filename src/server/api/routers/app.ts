import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { corsair } from "~/server/corsair";

async function getLinearTeamId() {
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
    console.error("Failed to fetch teams", e);
  }

  if (settings?.default_linear_team) return settings.default_linear_team;
  return null;
}

export const appOpsRouter = createTRPCRouter({
  getLinearUsers: publicProcedure.query(async () => {
    try {
      const resp = await corsair.linear.api.users.list({});
      return resp?.nodes || [];
    } catch (e) {
      console.error("Failed to fetch linear users from corsair:", e);
      return [];
    }
  }),

  getSettings: publicProcedure.query(() => {
    const row = db
      .prepare("SELECT * FROM app_settings WHERE id = 'default'")
      .get();
    return row as any;
  }),
  updateSettings: publicProcedure
    .input(
      z.object({
        require_human_approval: z.number(),
        require_approval_linear: z.number(),
        require_approval_slack_summary: z.number(),
        require_approval_slack_issues: z.number(),
        default_slack_channel: z.string().optional().nullable(),
        default_linear_project: z.string().optional().nullable(),
        default_linear_team: z.string().optional().nullable(),
      }),
    )
    .mutation(({ input }) => {
      const stmt = db.prepare(`
        UPDATE app_settings 
        SET require_human_approval = ?, 
            require_approval_linear = ?, 
            require_approval_slack_summary = ?, 
            require_approval_slack_issues = ?, 
            default_slack_channel = ?, 
            default_linear_project = ?, 
            default_linear_team = ?
        WHERE id = 'default'
      `);
      stmt.run(
        input.require_human_approval,
        input.require_approval_linear,
        input.require_approval_slack_summary,
        input.require_approval_slack_issues,
        input.default_slack_channel,
        input.default_linear_project,
        input.default_linear_team,
      );
      return { success: true };
    }),

  getRuns: publicProcedure.query(() => {
    return db
      .prepare("SELECT * FROM meeting_runs ORDER BY created_at DESC")
      .all() as any[];
  }),

  getRunCounts: publicProcedure.query(() => {
    const total = db
      .prepare("SELECT COUNT(*) as count FROM meeting_runs")
      .get() as { count: number };
    const pending = db
      .prepare(
        "SELECT COUNT(*) as count FROM draft_issues WHERE status = 'draft'",
      )
      .get() as { count: number };
    const approved = db
      .prepare(
        "SELECT COUNT(*) as count FROM draft_issues WHERE status = 'approved'",
      )
      .get() as { count: number };
    const slackSent = db
      .prepare(
        "SELECT COUNT(*) as count FROM meeting_runs WHERE slack_summary_sent = 1",
      )
      .get() as { count: number };
    return {
      total: total.count,
      pending: pending.count,
      approved: approved.count,
      slackSent: slackSent.count,
    };
  }),

  getRunDetails: publicProcedure.input(z.string()).query(({ input }) => {
    const run = db
      .prepare("SELECT * FROM meeting_runs WHERE id = ?")
      .get(input) as any;
    if (!run) return null;
    const drafts = db
      .prepare(
        "SELECT * FROM draft_issues WHERE meeting_run_id = ? ORDER BY created_at ASC",
      )
      .all(input) as any[];
    return { ...run, drafts };
  }),

  updateDraft: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        assignee_id: z.string().optional().nullable(),
        priority: z.number(),
      }),
    )
    .mutation(({ input }) => {
      db.prepare(
        `UPDATE draft_issues SET title = ?, description = ?, assignee_id = ?, priority = ? WHERE id = ?`,
      ).run(
        input.title,
        input.description,
        input.assignee_id,
        input.priority,
        input.id,
      );
      return { success: true };
    }),

  approveDraft: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const draft = db
        .prepare("SELECT * FROM draft_issues WHERE id = ?")
        .get(input) as any;
      if (!draft || draft.status !== "draft") return { success: false };

      try {
        const teamId = await getLinearTeamId();
        if (teamId) {
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
            ).run(issue.id, input);
            return { success: true, linear_id: issue.id };
          }
        }
      } catch (e: any) {
        console.error("Failed creating linear issue:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e.message || "Failed to create issue in Linear",
        });
      }
    }),

  deleteDraft: publicProcedure.input(z.string()).mutation(({ input }) => {
    db.prepare("DELETE FROM draft_issues WHERE id = ?").run(input);
    return { success: true };
  }),

  approveAll: publicProcedure.input(z.string()).mutation(async ({ input }) => {
    const drafts = db
      .prepare(
        "SELECT * FROM draft_issues WHERE meeting_run_id = ? AND status = 'draft'",
      )
      .all(input) as any[];
    if (!drafts.length) return { success: true };

    const teamId = await getLinearTeamId();
    for (const draft of drafts) {
      try {
        if (teamId) {
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
            ).run(issue.id, draft.id);
            continue;
          }
        }
      } catch (e: any) {
        console.error("Bulk approve linear create failed:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e.message || "Failed to create issue in Linear",
        });
      }
    }

    return { success: true };
  }),

  sendSlackSummary: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const run = db
        .prepare("SELECT * FROM meeting_runs WHERE id = ?")
        .get(input) as any;
      if (!run || run.slack_summary_sent) return { success: false };

      try {
        let channelId = "C0B5AT9ABA4"; // fallback to known meeting_notes channel
        try {
          const channels = await corsair.slack.api.channels.list({
            tenantId: "default",
          });
          const target = channels?.channels?.find(
            (c: any) => c.name === "meeting_notes" || c.name === "general",
          );
          if (target?.id) channelId = target.id;
        } catch (e) {
          console.warn("Could not fetch slack channels, using fallback");
        }

        await corsair.slack.api.messages.post({
          tenantId: "default",
          channel: channelId,
          text: `*${run.meeting_title}*\n\n${run.summary}`,
        });

        db.prepare(
          "UPDATE meeting_runs SET slack_summary_sent = 1 WHERE id = ?",
        ).run(input);
        return { success: true };
      } catch (e) {
        console.error("Failed to send slack summary:", e);
        throw new Error("Failed to send slack summary");
      }
    }),
});
