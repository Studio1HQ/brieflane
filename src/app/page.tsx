"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Video,
  FileText,
  CheckCircle,
  BarChart,
  ExternalLink,
  Zap,
} from "lucide-react";
import { ChatPanel } from "./_components/ChatPanel";

export default function Home() {
  const { data: stats } = api.app.getRunCounts.useQuery();
  const { data: runs, isLoading } = api.app.getRuns.useQuery();

  const [greetingText, setGreetingText] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreetingText("Good morning");
    else if (hour < 17) setGreetingText("Good afternoon");
    else if (hour < 21) setGreetingText("Good evening");
    else setGreetingText("Good evening");
  }, []);

  const userName = "John";
  const recentRun = runs?.[0];

  return (
    <div className="space-y-12 px-4 pb-16">
      {/* Top Gradient Area */}
      <div className="relative rounded-3xl p-10 md:p-14 overflow-hidden shadow-sm mesh-gradient">
        <div className="absolute inset-0 bg-linear-to-t from-background to-transparent opacity-60"></div>
        <div className="relative z-10">
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-(--color-surface-deep)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greetingText}, {userName}
          </h1>
          <p className="max-w-2xl text-[white]! text-lg md:text-xl font-medium mt-4! italic font-serif">
            We've analyzed your latest syncs.{" "}
            {stats?.pending ? (
              <>
                {stats.pending} draft issues items are ready for editorial
                review and Slack distribution.
              </>
            ) : (
              "All caught up on action items."
            )}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 -mt-20 md:-mt-4 relative px-4 md:px-8">
        {[
          {
            label: "Meetings analyzed today",
            val: stats?.total ?? 0,
            icon: Video,
            trend: "",
          },
          {
            label: "Draft issues pending",
            val: stats?.pending ?? 0,
            icon: FileText,
            sub: "Pending Review",
          },
          {
            label: "Updates pushed to Slack",
            val: stats?.slackSent ?? 0,
            icon: Zap,
            sub: "Automated",
          },
          {
            label: "Linear issues created",
            val: stats?.approved ?? 0,
            icon: BarChart,
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-(--app-panel) border border-(--app-border) p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:border-(--color-primary-pink) transition-colors"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="w-10 h-10 flex items-center justify-center bg-[#ffebee] text-(--color-primary) rounded-full">
                <s.icon size={18} strokeWidth={2} />
              </div>
              {(s.trend || s.sub) && (
                <div
                  className={`text-xs font-medium ${s.trend ? "text-(--color-success)" : "text-(--app-text-muted)"}`}
                >
                  {s.trend || s.sub}
                </div>
              )}
            </div>
            <div>
              <div
                className="text-4xl font-bold text-(--app-text) mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.val}
              </div>
              <div className="text-(--app-text-body) text-sm">{s.label}</div>
              {s.label.includes("Meeting") && <div className="mt-4"></div>}
              {!s.label.includes("Meeting") && (
                <div className="mt-4 h-1 w-full bg-(--app-panel-muted) rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--color-primary) rounded-full"
                    style={{
                      width: Math.max(15, Math.min(100, s.val * 15)) + "%",
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Meeting */}
      <div className="pt-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 px-2 gap-4">
          <div>
            <h2
              className="text-2xl font-bold text-(--app-text)"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent Meeting Runs
            </h2>
            <p className="text-(--app-text-soft) text-sm mt-1">
              Real-time transcripts and AI insight generation
            </p>
          </div>
          <Link
            href="/meetings"
            className="text-(--color-primary) hover:text-(--color-primary-deep) text-sm font-medium flex items-center gap-1 transition-colors group pb-1"
          >
            View all meetings{" "}
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-(--app-text-muted)">
            Loading...
          </div>
        ) : recentRun ? (
          <div className="bg-(--app-panel) border border-(--app-border) rounded-2xl overflow-hidden hover:shadow-sm transition-all max-w-4xl">
            <div className="p-8 pb-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest flex items-center gap-1.5 uppercase ${recentRun.status === "draft_ready" ? "bg-[#e8f5e9] text-[#2b9a66]" : "bg-(--color-surface-bone) text-(--app-text-muted)"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${recentRun.status === "draft_ready" ? "bg-[#2b9a66]" : "bg-(--app-text-muted)"}`}
                    ></span>
                    {recentRun.status === "draft_ready"
                      ? "Summarized"
                      : recentRun.status === "received"
                        ? "Recorded"
                        : recentRun.status}
                  </span>
                  <span className="px-3 py-1 bg-(--app-panel-muted) rounded-full text-xs font-semibold text-(--app-text-soft)">
                    {new Date(recentRun.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <Link
                  href={`/runs/${recentRun.id}`}
                  className="text-(--app-text-soft) hover:text-(--color-primary) transition-colors p-2"
                  title="Open Run"
                >
                  <ExternalLink size={20} />
                </Link>
              </div>

              <Link href={`/runs/${recentRun.id}`}>
                <h3
                  className="text-3xl lg:text-4xl font-bold text-(--app-text) mb-6 hover:text-(--color-primary) transition-colors tracking-tight line-clamp-2"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {recentRun.meeting_title}
                </h3>
              </Link>

              {recentRun.summary && (
                <div className="bg-(--color-surface-bone) p-6 rounded-xl border border-(--app-border) relative overflow-hidden mt-4">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-(--color-primary)"></div>
                  <div className="text-xs font-bold text-(--color-primary) mb-3 tracking-widest flex items-center gap-2 uppercase">
                    AI HIGHLIGHT
                  </div>
                  <p className="text-(--app-text-body) text-sm font-medium leading-relaxed italic line-clamp-3">
                    "{recentRun.summary}"
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-(--app-panel) border border-(--app-border) p-12 rounded-2xl text-center text-(--app-text-muted) max-w-4xl">
            No recent meetings found. Start a meeting run to generate insights.
          </div>
        )}
      </div>

      <ChatPanel />
    </div>
  );
}
