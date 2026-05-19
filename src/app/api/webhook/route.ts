// import { NextResponse } from "next/server";
// import { db } from "~/server/db";
// import crypto from "crypto";

// export async function POST(req: Request) {
//   const body = await req.json();

//   if (body.type === "url_verification") {
//     return new Response(body.challenge, {
//       status: 200,
//       headers: {
//         "Content-Type": "text/plain",
//       },
//     });
//   }

//   // Handle Fireflies meeting processing
//   if (body.transcriptId || body.id) {
//     const firefliesId = body.transcriptId || body.id || "demo-id";
//     const meetingTitle = body.title || "Meeting from Webhook";
//     const meetingDate = new Date().toISOString();
//     const summary = body.summary || "Pending analysis...";

//     const runId = crypto.randomUUID();

//     // Create local meeting_run draft
//     db.prepare(
//       `
//       INSERT INTO meeting_runs (id, created_at, fireflies_id, meeting_title, meeting_date, summary, status)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `,
//     ).run(
//       runId,
//       Date.now(),
//       firefliesId,
//       meetingTitle,
//       meetingDate,
//       summary,
//       "processing",
//     );
//   }

//   return Response.json({ ok: true });
// }

// import { NextResponse } from "next/server";
// import { db } from "~/server/db";
// import crypto from "crypto";
// import { corsair } from "~/server/corsair";

// export async function POST(req: Request) {
//   try {
//     const rawBody = await req.text();
//     let body: any = {};
//     try {
//       body = JSON.parse(rawBody);
//     } catch {
//       body = { raw: rawBody };
//     }

//     const headers = Object.fromEntries(req.headers);

//     console.log("Webhook headers:", JSON.stringify(headers, null, 2));
//     console.log("Webhook body:", JSON.stringify(body, null, 2));

//     if (body.type === "url_verification") {
//       return new Response(body.challenge, {
//         status: 200,
//         headers: {
//           "Content-Type": "text/plain",
//         },
//       });
//     }

//     const eventType = body.eventType;
//     const firefliesId = body.meetingId || body.transcriptId || body.id || null;

//     let inserted = false;
//     let runId: string | null = null;
//     let transcriptData = null;

//     if (firefliesId) {
//       runId = crypto.randomUUID();

//       const result = db
//         .prepare(
//           `
//           INSERT INTO meeting_runs
//             (id, created_at, fireflies_id, meeting_title, meeting_date, summary, status)
//           VALUES (?, ?, ?, ?, ?, ?, ?)
//         `,
//         )
//         .run(
//           runId,
//           Date.now(),
//           firefliesId,
//           `Meeting ${firefliesId}`,
//           new Date().toISOString(),
//           JSON.stringify(body, null, 2),
//           "received",
//         );

//       inserted = result.changes > 0;

//       console.log("Inserted meeting run:", {
//         inserted,
//         runId,
//         firefliesId,
//         eventType,
//       });

//       try {
//         console.log(`Fetching transcript for ID: ${firefliesId}...`);
//         transcriptData = await corsair.fireflies.api.transcripts.get({
//           transcriptId: firefliesId,
//         });

//         db.prepare(
//           `UPDATE meeting_runs
//            SET status = 'processing',
//                meeting_title = ?,
//                summary = ?
//            WHERE id = ?`,
//         ).run(
//           transcriptData.title || `Meeting ${firefliesId}`,
//           transcriptData.summary
//             ? JSON.stringify(transcriptData.summary)
//             : "Analysis pending...",
//           runId,
//         );
//         console.log("Successfully fetched and updated transcript data");
//       } catch (err: any) {
//         console.error("Transcript fetch failed:", err);
//       }
//     } else {
//       console.log("No matching meeting identifier found in webhook body.");
//     }

//     return NextResponse.json({
//       ok: true,
//       receivedHeaders: headers,
//       receivedBody: body,
//       eventType,
//       matchedId: firefliesId,
//       inserted,
//       runId,
//       transcriptFetched: !!transcriptData,
//     });
//   } catch (error) {
//     console.error("Webhook debug error:", error);
//     return NextResponse.json(
//       {
//         ok: false,
//         error: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     );
//   }
// }

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "~/server/db";
import { corsair } from "~/server/corsair";
import OpenAI from "openai";

const FALLBACK_TRANSCRIPT = `
Speaker 1: We need to clean up the dashboard UI before the next review. The current layout works, but the hierarchy is weak and the draft issue panel feels empty when no issues load.
Speaker 2: Agreed. We should improve spacing, status badges, and make the meeting detail page feel more structured. The approve all action should stay visible and the draft issue list should feel like the main workflow.
Speaker 1: There is also a bug in the webhook flow. The meeting run is created correctly, but draft issues are not being generated after fallback content is saved.
Speaker 2: We should make draft issue generation happen even when Fireflies transcript fetch fails. If fallback transcript and summary exist, the app should continue the same pipeline and generate local draft issues automatically.
Speaker 1: The assignee experience also needs improvement. Each draft issue should show the current assignee, default intelligently from available Linear assignees, and allow reassignment from a dropdown.
Speaker 2: Editing should be easy. Every draft issue card should support editing title, description, priority, and assignee before approval.
Speaker 1: We also need the empty state fixed. If no issues exist yet, the UI should clearly explain whether generation is pending, failed, or completed with zero output.
Speaker 2: Once draft issues are visible, approve one and approve all should create the real Linear issues using the existing flow.`.trim();

const FALLBACK_SUMMARY = `
- Improve dashboard and run detail UI hierarchy and spacing.
- Fix missing draft issue generation after webhook fallback processing.
- Make draft issues editable with assignee and priority controls.
- Support approve one and approve all from the draft issue list.
- Improve empty states and issue visibility in the run detail screen.`.trim();

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

export async function POST(req: Request) {
  try {
    ensureTranscriptColumn();
    ensureFallbackFlagColumn();

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
                "You are an assistant that analyzes meeting transcripts to generate a descriptive, user-friendly meeting title (max 6 words) and Actionable Linear draft issues. Return a JSON object with 'title' (string) and an 'issues' array.",
            },
            {
              role: "user",
              content: `Transcript:\n${finalTranscript}\n\nSummary:\n${finalSummary}\n\nAvailable Assignees: ${usersList}\n\nGenerate realistic actionable issues. Each issue should have: title, description, priority (0=none, 1=urgent, 2=high, 3=medium, 4=low). If there is a clear assignee match, use their ID. Return JSON: {"title": "Team Sync: UI Review", "issues": [{"title": "...", "description": "...", "priority": 0, "assignee_id": "id_here"}]}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);

          if (parsed.title) {
            db.prepare(
              `UPDATE meeting_runs SET meeting_title = ? WHERE id = ?`,
            ).run(parsed.title, runId);
          }

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
