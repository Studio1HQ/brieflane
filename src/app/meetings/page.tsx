"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { useState } from "react";
import { ChatPanel } from "../_components/ChatPanel";

export default function MeetingsPage() {
  const { data: runs, isLoading } = api.app.getRuns.useQuery();
  const [filter, setFilter] = useState("All");

  const filteredRuns = runs?.filter((run) => {
    if (filter === "All") return true;
    if (filter === "Summarized" && run.status === "draft_ready") return true;
    if (filter === "Recorded" && run.status === "received") return true;
    if (filter === "Processing" && run.status === "processing") return true;
    return run.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="space-y-8 px-4 pb-12">
      <div className="pt-4">
        <h1
          className="text-3xl font-bold text-(--app-text)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          All Meetings
        </h1>

        <div className="flex items-center gap-3 border-b border-(--app-border) pb-6 mb-8 mt-8 overflow-x-auto">
          {["All", "Recorded", "Summarized", "Processing"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab
                  ? "bg-(--app-panel-muted) text-(--color-on-primary) shadow-sm"
                  : "text-(--app-text-muted) bg-(--app-panel) hover:bg-(--color-surface-bone) border border-(--app-border)"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-(--app-panel) border border-(--app-border) rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-(--app-text-muted)">
              Loading...
            </div>
          ) : filteredRuns?.length === 0 ? (
            <div className="p-12 text-center text-(--app-text-muted)">
              No meeting runs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-(--app-text-soft) border-b border-(--app-border)">
                  <tr>
                    <th className="px-6 py-5 font-semibold uppercase tracking-wider text-xs bg-(--color-surface-bone)">
                      Meeting Name
                    </th>
                    <th className="px-6 py-5 font-semibold uppercase tracking-wider text-xs bg-(--color-surface-bone)">
                      Date
                    </th>
                    <th className="px-6 py-5 font-semibold uppercase tracking-wider text-xs bg-(--color-surface-bone)">
                      Time
                    </th>
                    <th className="px-6 py-5 font-semibold uppercase tracking-wider text-xs bg-(--color-surface-bone)">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns?.map((run, i) => (
                    <tr
                      key={run.id}
                      className={`border-b border-(--app-border) transition-colors hover:bg-(--color-surface-bone)`}
                    >
                      <td className="px-6 py-5 font-medium text-(--app-text) font-semibold flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-(--color-primary-pink) flex-shrink-0"></span>
                        <Link
                          href={`/runs/${run.id}`}
                          className="hover:text-(--color-primary) transition-colors text-base max-w-sm truncate block"
                          title={run.meeting_title}
                        >
                          {run.meeting_title}
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-(--app-text-muted)">
                        {new Date(run.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-5 text-(--app-text-muted)">
                        {new Date(run.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border 
                          ${run.status === "draft_ready" ? "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]" : ""}
                          ${run.status === "received" ? "bg-[#ffebee] text-[#c01f00] border-[#ffcdd2]" : ""}
                          ${run.status === "processing" ? "bg-[#f5f5f5] text-[#616161] border-[#e0e0e0]" : ""}
                          ${!["draft_ready", "received", "processing"].includes(run.status) ? "bg-(--app-panel-muted) text-(--app-text-muted) border-(--app-border)" : ""}
                        `}
                        >
                          {run.status === "draft_ready"
                            ? "Summarized"
                            : run.status === "received"
                              ? "Recorded"
                              : run.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredRuns && filteredRuns.length > 0 && (
            <div className="px-6 py-4 bg-(--color-surface-bone) text-(--app-text-soft) text-xs border-t border-(--app-border) font-medium">
              Showing {filteredRuns.length} of {runs?.length} meetings
            </div>
          )}
        </div>
      </div>

      <ChatPanel />
    </div>
  );
}
