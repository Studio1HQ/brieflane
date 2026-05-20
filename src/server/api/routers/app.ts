import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { corsair } from "~/server/corsair";

import crypto from "crypto";

// Ensure slack track table exists
try {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS slack_messages (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      message TEXT,
      channels TEXT,
      created_at INTEGER
    )
  `,
  ).run();
} catch (e) {
  console.log(
    "Slack messages table init error (can be ignored if already exists):",
    e,
  );
}

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
  getSlackChannels: publicProcedure.query(async () => {
    try {
      const resp = await corsair.slack.api.channels.list({});
      return resp?.channels || [];
    } catch (e) {
      console.error("Failed to fetch slack channels from corsair:", e);
      return [];
    }
  }),

  getSlackUsers: publicProcedure.query(async () => {
    try {
      const resp = await corsair.slack.api.users.list({});
      return resp?.members || [];
    } catch (e) {
      console.error("Failed to fetch slack users from corsair:", e);
      return [];
    }
  }),

  sendSlackDispatch: publicProcedure
    .input(
      z.object({
        id: z.string(),
        channels: z.array(z.string()),
        message: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      let sentCount = 0;
      for (const channel of input.channels) {
        try {
          await corsair.slack.api.messages.post({
            channel,
            text: input.message,
          });
          sentCount++;
        } catch (e) {
          console.error(`Failed to send slack message to ${channel}`, e);
        }
      }
      if (sentCount > 0) {
        db.prepare(
          "UPDATE meeting_runs SET slack_summary_sent = 1 WHERE id = ?",
        ).run(input.id);

        try {
          db.prepare(
            "INSERT INTO slack_messages (id, run_id, message, channels, created_at) VALUES (?, ?, ?, ?, ?)",
          ).run(
            crypto.randomUUID(),
            input.id,
            input.message,
            JSON.stringify(input.channels),
            Date.now(),
          );
        } catch (e) {
          console.error("Failed to insert into slack_messages:", e);
        }
      }
      return { success: true, sentCount };
    }),

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

    let slackMessages = [];
    try {
      slackMessages = db
        .prepare(
          "SELECT * FROM slack_messages WHERE run_id = ? ORDER BY created_at ASC",
        )
        .all(input) as any[];
    } catch (e) {}

    return { ...run, drafts, slackMessages };
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

      if (!draft || draft.status !== "draft") {
        return {
          success: false,
          reason: "Draft not found or not in draft state",
        };
      }

      try {
        const teamId = await getLinearTeamId();

        if (!teamId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No Linear team ID available",
          });
        }

        const payload: any = {
          title: String(draft.title || "").trim(),
          description: String(draft.description || "").trim(),
          teamId: String(teamId),
          priority: Number(draft.priority ?? 0),
        };

        const BAD_ASSIGNEE_VALUES = [
          "linear",
          "unassigned",
          "none",
          "",
          "null",
          "undefined",
        ];

        const rawAssignee =
          typeof draft.assigneeid === "string" ? draft.assigneeid.trim() : "";

        if (
          rawAssignee &&
          !BAD_ASSIGNEE_VALUES.includes(rawAssignee.toLowerCase())
        ) {
          payload.assigneeId = rawAssignee;
        }

        const issue = await corsair.linear.api.issues.create(payload);

        if (!issue?.id) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Linear did not return an issue id",
          });
        }

        db.prepare(
          "UPDATE draft_issues SET status = 'approved', linear_id = ? WHERE id = ?",
        ).run(issue.id, input);

        return { success: true, linear_id: issue.id };
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e?.message || "Failed to create issue in Linear",
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

    if (!drafts.length) {
      return { success: true, approved: 0, failed: [] };
    }

    const teamId = await getLinearTeamId();

    if (!teamId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No Linear team ID available",
      });
    }

    const BAD_ASSIGNEE_VALUES = [
      "linear",
      "unassigned",
      "none",
      "",
      "null",
      "undefined",
    ];

    const failed: Array<{ draftId: string; title: string; reason: string }> =
      [];
    let approved = 0;

    for (const draft of drafts) {
      const title = String(draft.title || "").trim();

      if (!title) {
        failed.push({
          draftId: String(draft.id),
          title: "",
          reason: "Missing issue title",
        });
        continue;
      }

      try {
        const payload: any = {
          title,
          teamId: String(teamId),
        };

        const rawDescription = String(draft.description || "").trim();
        if (rawDescription) {
          payload.description = rawDescription;
        }

        const priority = Number(draft.priority ?? 0);
        if (Number.isFinite(priority)) {
          payload.priority = priority;
        }

        const rawAssignee =
          typeof (draft.assignee_id ?? draft.assigneeid) === "string"
            ? String(draft.assignee_id ?? draft.assigneeid).trim()
            : "";

        const normalizedAssignee = rawAssignee.toLowerCase();

        if (rawAssignee && !BAD_ASSIGNEE_VALUES.includes(normalizedAssignee)) {
          payload.assigneeId = rawAssignee;
        }

        let issue: any = null;

        try {
          issue = await corsair.linear.api.issues.create(payload);
        } catch (primaryError: any) {
          const fallbackPayload: any = {
            title,
            teamId: String(teamId),
          };

          issue = await corsair.linear.api.issues.create(fallbackPayload);
        }

        if (!issue?.id) {
          failed.push({
            draftId: String(draft.id),
            title,
            reason: "Linear did not return an issue id",
          });
          continue;
        }

        db.prepare(
          "UPDATE draft_issues SET status = 'approved', linear_id = ? WHERE id = ?",
        ).run(issue.id, draft.id);

        approved++;
      } catch (e: any) {
        console.error(
          "Bulk approve linear create failed for draft:",
          draft?.id,
          e,
        );

        failed.push({
          draftId: String(draft?.id ?? ""),
          title: String(draft?.title ?? ""),
          reason: e?.message || "Failed to create issue in Linear",
        });
      }
    }

    return {
      success: failed.length === 0,
      approved,
      failed,
    };
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
