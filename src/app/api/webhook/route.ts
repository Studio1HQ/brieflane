import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "~/server/db";
import { corsair } from "~/server/corsair";
import OpenAI from "openai";

const FALLBACK_TRANSCRIPT = `
Speaker 1: Customer onboarding is still taking too long. New users are getting confused during setup and many never complete the initial configuration.
Speaker 2: The setup wizard needs clearer progress tracking and better defaults. Right now too many decisions are pushed onto the user immediately.
Speaker 1: We also need to rethink notification handling. Some users are missing important updates because alerts are buried inside the activity feed.
Speaker 2: A dedicated notification center with grouped alerts could help. Critical actions should stay pinned until resolved.
Speaker 1: Search performance is another issue. Query latency increases heavily once the workspace has thousands of records.
Speaker 2: We should add indexing improvements and cache recent searches locally. That should reduce unnecessary database calls.
Speaker 1: Permissions management also feels fragile. Admins want more granular role controls without manually editing every member.
Speaker 2: We can introduce role templates with predefined access levels and allow custom overrides only when needed.
Speaker 1: Mobile responsiveness still needs work too. Several tables break on smaller screens and action menus overflow outside the viewport.
Speaker 2: Agreed. Before launch we should prioritize responsive layouts, smoother onboarding, and improved search stability.
`.trim();

const FALLBACK_SUMMARY = `
- Improve onboarding flow with clearer setup guidance.
- Add a dedicated notification center for important updates.
- Optimize workspace search performance and caching.
- Introduce smarter role and permission management.
- Improve mobile responsiveness across dashboard views.
`.trim();

function ensureTranscriptColumn() {
  try {
    db.prepare(`ALTER TABLE meeting_runs ADD COLUMN transcript TEXT`).run();
  } catch {
    // Column probably already exists, ignore.
  }
}

function ensureFallbackFlagColumn() {
  try {
    db.prepare(
      `ALTER TABLE meeting_runs ADD COLUMN used_fallback INTEGER DEFAULT 0`,
    ).run();
  } catch {
    // Column probably already exists, ignore.
  }
}

function ensureDecisionsAndRisksColumns() {
  try {
    db.prepare(
      `ALTER TABLE meeting_runs ADD COLUMN decisions TEXT DEFAULT '[]'`,
    ).run();
  } catch {}
  try {
    db.prepare(
      `ALTER TABLE meeting_runs ADD COLUMN risks TEXT DEFAULT '[]'`,
    ).run();
  } catch {}
}

export async function POST(req: Request) {
  try {
    ensureTranscriptColumn();
    ensureFallbackFlagColumn();
    ensureDecisionsAndRisksColumns();

    const rawBody = await req.text();

    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      body = { raw: rawBody };
    }

    const headers = Object.fromEntries(req.headers);

    console.log("Webhook headers:", JSON.stringify(headers, null, 2));
    console.log("Webhook body:", JSON.stringify(body, null, 2));

    if (
      body.type === "url_verification" &&
      typeof body.challenge === "string"
    ) {
      return new Response(body.challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    const eventType =
      typeof body.eventType === "string"
        ? body.eventType
        : typeof body.event === "string"
          ? body.event
          : null;

    const firefliesId =
      typeof body.meetingId === "string"
        ? body.meetingId
        : typeof body.transcriptId === "string"
          ? body.transcriptId
          : typeof body.id === "string"
            ? body.id
            : null;

    if (!firefliesId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No meetingId/transcriptId/id found in webhook payload.",
          receivedHeaders: headers,
          receivedBody: body,
        },
        { status: 400 },
      );
    }

    const runId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const initialInsert = db
      .prepare(
        `
        INSERT INTO meeting_runs
          (id, created_at, fireflies_id, meeting_title, meeting_date, summary, transcript, status, used_fallback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .run(
        runId,
        Date.now(),
        firefliesId,
        `Meeting ${firefliesId}`,
        nowIso,
        JSON.stringify(body, null, 2),
        "",
        "received",
        0,
      );

    const inserted = initialInsert.changes > 0;

    console.log("Inserted meeting run:", {
      inserted,
      runId,
      firefliesId,
      eventType,
    });

    let transcriptFetched = false;
    let usedFallback = false;
    let finalStatus = "draft_ready";
    let finalTitle = `Meeting ${firefliesId}`;
    let finalSummary = FALLBACK_SUMMARY;
    let finalTranscript = FALLBACK_TRANSCRIPT;
    let fetchError: string | null = null;

    try {
      console.log(`Fetching transcript for ID: ${firefliesId}...`);

      const transcriptData = await corsair.fireflies.api.transcripts.get({
        transcriptId: firefliesId,
      });

      transcriptFetched = true;

      finalTitle =
        transcriptData?.title ||
        transcriptData?.meetingTitle ||
        `Meeting ${firefliesId}`;

      finalSummary =
        typeof transcriptData?.summary === "string"
          ? transcriptData.summary
          : transcriptData?.summary
            ? JSON.stringify(transcriptData.summary, null, 2)
            : FALLBACK_SUMMARY;

      finalTranscript =
        transcriptData?.transcript ||
        transcriptData?.rawTranscript ||
        transcriptData?.text ||
        FALLBACK_TRANSCRIPT;

      console.log("Successfully fetched transcript data from Fireflies.");
    } catch (err: any) {
      console.error("Transcript fetch failed:", err);

      fetchError =
        err?.message || "Failed to fetch transcript from Fireflies API.";

      if (err?.code === "paid_required") {
        usedFallback = true;
        finalStatus = "draft_ready";
        finalSummary = FALLBACK_SUMMARY;
      } else {
        usedFallback = true;
        finalStatus = "draft_ready";
        finalSummary = FALLBACK_SUMMARY;
      }
    }

    db.prepare(
      `
      UPDATE meeting_runs
      SET
        meeting_title = ?,
        meeting_date = ?,
        summary = ?,
        transcript = ?,
        status = ?,
        used_fallback = ?
      WHERE id = ?
    `,
    ).run(
      finalTitle,
      nowIso,
      finalSummary,
      finalTranscript,
      finalStatus,
      usedFallback ? 1 : 0,
      runId,
    );

    try {
      if (process.env.OPENAI_API_KEY) {
        let defaultAssigneeId: string | null = null;
        let usersList = "";
        try {
          const usersData = await corsair.linear.api.users.list({});
          if (usersData?.nodes?.length) {
            if (usersData.nodes.length === 1)
              defaultAssigneeId = usersData.nodes[0].id;
            usersList = usersData.nodes
              .map((u: any) => `${u.name} (${u.id})`)
              .join(", ");
          }
        } catch (e) {
          console.warn("Could not fetch linear users", e);
        }

        const openai = new OpenAI();
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant that analyzes meeting transcripts to generate a descriptive, user-friendly meeting title (max 6 words), Actionable Linear draft issues, a list of Decisions made, and a list of Risks identified. Return a JSON object with 'title' (string), an 'issues' array, a 'decisions' array of strings, and a 'risks' array of strings.",
            },
            {
              role: "user",
              content: `Transcript:\n${finalTranscript}\n\nSummary:\n${finalSummary}\n\nAvailable Assignees: ${usersList}\n\nGenerate realistic actionable issues. Each issue should have: title, description, priority (0=none, 1=urgent, 2=high, 3=medium, 4=low). If there is a clear assignee match, use their ID. Return JSON: {"title": "Team Sync: UI Review", "issues": [{"title": "...", "description": "...", "priority": 0, "assignee_id": "id_here"}], "decisions": ["We will prioritize task X", "Decided to move from component Y to Z"], "risks": ["API latency in production", "Frontend state management might break"]}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);

          let updateQuery = "UPDATE meeting_runs SET meeting_title = ?";
          let updateParams: any[] = [parsed.title || finalTitle];

          if (Array.isArray(parsed.decisions)) {
            updateQuery += ", decisions = ?";
            updateParams.push(JSON.stringify(parsed.decisions));
          }
          if (Array.isArray(parsed.risks)) {
            updateQuery += ", risks = ?";
            updateParams.push(JSON.stringify(parsed.risks));
          }

          updateQuery += " WHERE id = ?";
          updateParams.push(runId);

          db.prepare(updateQuery).run(...updateParams);

          const issues = parsed.issues;
          if (Array.isArray(issues) && issues.length > 0) {
            const insertIssue = db.prepare(`
              INSERT INTO draft_issues (id, created_at, meeting_run_id, title, description, assignee_id, priority, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertTransaction = db.transaction((issuesList: any[]) => {
              for (const issue of issuesList) {
                insertIssue.run(
                  crypto.randomUUID(),
                  Date.now(),
                  runId,
                  issue.title || "Untitled",
                  issue.description || "",
                  issue.assignee_id || defaultAssigneeId || null,
                  issue.priority || 0,
                  "draft",
                );
              }
            });
            insertTransaction(issues);
            console.log(`Generated ${issues.length} draft issues.`);
          }
        }
      } else {
        console.log("No OPENAI_API_KEY, skipping draft issue generation.");
      }
    } catch (err) {
      console.error("Failed to generate draft issues:", err);
    }

    const recentRuns = db
      .prepare(
        `
        SELECT
          id,
          fireflies_id,
          meeting_title,
          meeting_date,
          status,
          used_fallback
        FROM meeting_runs
        ORDER BY created_at DESC
        LIMIT 5
      `,
      )
      .all();

    return NextResponse.json({
      ok: true,
      receivedHeaders: headers,
      receivedBody: body,
      eventType,
      matchedId: firefliesId,
      inserted,
      runId,
      transcriptFetched,
      usedFallback,
      status: finalStatus,
      fetchError,
      recentRuns,
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown webhook error",
      },
      { status: 500 },
    );
  }
}
