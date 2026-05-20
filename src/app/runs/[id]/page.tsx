"use client";

import { use, useState, useMemo } from "react";
import { api } from "~/trpc/react";
import {
  Clock,
  Users,
  Video,
  ChevronDown,
  Check,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { MarkdownContent } from "~/lib/format-markdown";
import { SlackDispatchCard } from "~/app/_components/SlackDispatchCard";
import { ChatPanel } from "~/app/_components/ChatPanel";

function DraftIssueCard({
  draft,
  users,
  onApprove,
}: {
  draft: any;
  users: any[];
  onApprove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(draft.title || "");
  const [description, setDescription] = useState(draft.description || "");
  const [priority, setPriority] = useState(draft.priority ?? 0);
  const [assigneeId, setAssigneeId] = useState(draft.assignee_id || "");

  const utils = api.useUtils();
  const updateDraft = api.app.updateDraft.useMutation({
    onSuccess: () => {
      utils.app.getRunDetails.invalidate();
      setIsEditing(false);
    },
  });
  const deleteDraft = api.app.deleteDraft.useMutation({
    onSuccess: () => utils.app.getRunDetails.invalidate(),
  });

  const handleSave = () => {
    updateDraft.mutate({
      id: draft.id,
      title,
      description,
      priority: Number(priority),
      assignee_id: assigneeId || null,
    });
  };

  const getPriorityLabel = (p: number) => {
    if (p === 1) return "P1";
    if (p === 2) return "P2";
    if (p === 3) return "P3";
    if (p === 4) return "P4";
    return "P0";
  };

  if (draft.status !== "draft") {
    const isApproved = draft.status === "approved";
    return (
      <div className="bg-(--app-panel) border border-(--app-border) rounded-xl p-5 relative flex flex-col gap-3 transition-opacity">
        <div className="flex items-start justify-between gap-4">
          <div className="font-semibold text-lg text-(--app-text)">
            {draft.title}
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold shrink-0">
            {draft.status}
          </span>
        </div>
        {draft.description && (
          <div className="text-sm text-(--app-text-body) line-clamp-2">
            {draft.description}
          </div>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bg-(--app-panel) border border-(--app-border-strong) rounded-xl p-5 flex flex-col gap-4 shadow-sm">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue Title"
          className="w-full bg-(--app-bg) border border-(--app-border) rounded-md px-3 py-2 text-base font-semibold text-(--app-text) focus:outline-none focus:border-(--color-primary)"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full bg-(--app-bg) border border-(--app-border) rounded-md px-3 py-2 text-sm text-(--app-text-body) focus:outline-none focus:border-(--color-primary) resize-none"
        />
        <div className="flex items-center gap-3">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-(--app-bg) border border-(--app-border) rounded-md px-3 py-2 text-sm text-(--app-text) outline-none focus:border-(--color-primary) cursor-pointer"
          >
            <option value="0">No Priority</option>
            <option value="1">Urgent (P1)</option>
            <option value="2">High (P2)</option>
            <option value="3">Medium (P3)</option>
            <option value="4">Low (P4)</option>
          </select>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="flex-1 bg-(--app-bg) border border-(--app-border) rounded-md px-3 py-2 text-sm text-(--app-text) outline-none focus:border-(--color-primary) cursor-pointer"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-3 mt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm font-medium text-(--app-text-muted) hover:text-(--app-text) px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateDraft.isPending}
            className="bg-(--color-primary) text-white text-sm font-medium px-4 py-1.5 rounded-full hover:bg-(--color-primary-deep) disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const assigneeUser = users.find((u) => u.id === draft.assignee_id);

  return (
    <div className="bg-(--app-panel) border border-(--app-border) rounded-xl p-5 group flex flex-col gap-3 hover:border-(--color-primary-pink) transition-colors">
      <div className="flex flex-col gap-1.5">
        <h4 className="font-semibold text-lg text-(--app-text) leading-tight">
          {draft.title}
        </h4>

        <div className="flex items-center gap-3 text-xs font-medium text-(--app-text-soft)">
          <span className="bg-(--color-surface-bone) px-2 py-0.5 rounded text-(--app-text-muted) uppercase tracking-wider font-bold text-[10px]">
            Draft
          </span>
          <span className="flex items-center gap-1">
            Priority:{" "}
            <span className="">{getPriorityLabel(draft.priority)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            Assignee:
            {assigneeUser ? (
              <span className="flex items-center gap-1.5 text-(--app-text)">
                <span className="w-4 h-4 rounded-full bg-(--app-text-muted) text-(--color-surface-bone) flex items-center justify-center text-[8px] font-bold overflow-hidden uppercase shrink-0">
                  {assigneeUser.name?.charAt(0) || "U"}
                </span>
                {assigneeUser.name}
              </span>
            ) : (
              <span className="text-(--app-text-muted)">Unassigned</span>
            )}
          </span>
        </div>
      </div>

      {draft.description && (
        <div className="text-sm text-(--app-text-body) leading-relaxed">
          {draft.description}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm border border-(--app-border) bg-(--app-bg) text-(--app-text) px-4 py-1.5 rounded-full font-medium hover:bg-(--color-surface-bone) transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => deleteDraft.mutate(draft.id)}
            className="text-sm border border-(--app-border) bg-(--app-bg) text-(--app-text) px-4 py-1.5 rounded-full font-medium hover:bg-(--color-surface-bone) transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="text-sm bg-(--color-primary-glow) hover:bg-(--color-primary) text-white px-5 py-1.5 rounded-full font-medium transition-colors shadow-sm"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function parseTranscript(text: string) {
  if (!text) return [];
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  const parsed = [];
  let currentSpeaker = "System";
  let currentText = "";

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      if (currentText) {
        parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = line.slice(0, colonIdx).trim();
      currentText = line.slice(colonIdx + 1).trim() + " ";
    } else {
      currentText += line.trim() + " ";
    }
  }
  if (currentText)
    parsed.push({ speaker: currentSpeaker, text: currentText.trim() });
  return parsed;
}

export default function MeetingRunDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const {
    data: run,
    isLoading,
    refetch,
  } = api.app.getRunDetails.useQuery(resolvedParams.id);
  const { data: users = [] } = api.app.getLinearUsers.useQuery();

  const [activeTab, setActiveTab] = useState<
    "summary" | "decisions" | "risks" | "transcript"
  >("summary");
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState<
    "all" | "draft" | "approved" | "rejected"
  >("draft");

  const approveDraft = api.app.approveDraft.useMutation({
    onSuccess: () => refetch(),
  });
  const approveAll = api.app.approveAll.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading)
    return (
      <div className="p-12 text-center text-(--app-text-muted) text-lg">
        Loading meeting data...
      </div>
    );
  if (!run)
    return (
      <div className="p-12 text-center text-(--app-text-muted) text-lg">
        Run not found.
      </div>
    );

  const validDrafts = run.drafts || [];

  const displayedDrafts = validDrafts.filter((d: any) => {
    if (issueFilter === "all") return true;
    if (issueFilter === "draft") return d.status === "draft";
    if (issueFilter === "approved") return d.status === "approved";
    if (issueFilter === "rejected") return false;
    return true;
  });

  const parsedTranscript = parseTranscript(run.transcript || "");
  const filteredTranscript = parsedTranscript.filter(
    (block) =>
      transcriptSearch === "" ||
      block.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      block.speaker.toLowerCase().includes(transcriptSearch.toLowerCase()),
  );

  const pendingCount = validDrafts.filter(
    (d: any) => d.status === "draft",
  ).length;

  return (
    <div className="max-w-360 mx-auto px-4 lg:px-8 py-8 w-full flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-(--app-border) pb-8">
        <h1
          className="text-4xl md:text-5xl font-bold text-(--app-text) tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {run.meeting_title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-(--app-text-body)">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-(--app-text-soft)" />
            {new Date(run.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          <div className="w-px h-4 bg-(--app-border-strong) opacity-20"></div>
          <div>
            Source: <span className="text-(--color-primary)">Fireflies</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm font-medium mt-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 text-(--color-success) whitespace-nowrap">
            <div className="w-5 h-5 rounded-full bg-[#e8f5e9] flex items-center justify-center">
              <Check size={12} strokeWidth={3} />
            </div>
            Transcript{" "}
            <span className="opacity-80 font-normal">(Completed)</span>
          </div>
          <span className="text-(--app-text-soft)">?</span>
          <div className="flex items-center gap-2 text-(--color-success) whitespace-nowrap">
            <div className="w-5 h-5 rounded-full bg-[#e8f5e9] flex items-center justify-center">
              <Check size={12} strokeWidth={3} />
            </div>
            Summary
          </div>
          <span className="text-(--app-text-soft)">?</span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {pendingCount > 0 ? (
              <div className="w-5 h-5 rounded-full bg-[#ffebee] flex items-center justify-center">
                <AlertCircle size={12} strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#e8f5e9] flex items-center justify-center">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
            Issues
          </div>
          <span className="text-(--app-text-soft)">?</span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {run.slack_summary_sent ? (
              <div className="w-5 h-5 rounded-full bg-[#e8f5e9] flex items-center justify-center">
                <Check size={12} strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-(--color-surface-bone) border border-(--app-border) flex items-center justify-center"></div>
            )}
            Slack
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.5fr_1fr] gap-8">
        <div className="flex flex-col gap-6">
          <div className="bg-(--app-panel) border border-(--app-border) rounded-2xl overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-(--app-border) px-2 pt-2">
              <div className="flex items-center gap-1">
                {[
                  { id: "summary", label: "Summary" },
                  { id: "decisions", label: "Decisions" },
                  { id: "risks", label: "Risks" },
                  { id: "transcript", label: "Transcript" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      activeTab === t.id
                        ? "border-(--color-primary) text-(--color-primary)"
                        : "border-transparent text-(--app-text-muted) hover:text-(--app-text)"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === "transcript" && (
                <div className="pr-4 pb-2">
                  <input
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="bg-(--app-bg) border border-(--app-border) text-sm px-3 py-1.5 rounded-full w-48 focus:outline-none focus:border-(--color-primary) text-(--app-text)"
                  />
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              {activeTab === "summary" && (
                <div className="prose prose-lg prose-p:text-(--app-text-body) prose-li:text-(--app-text-body) prose-strong:text-(--app-text) max-w-none">
                  {run.summary ? (
                    <MarkdownContent content={run.summary} />
                  ) : (
                    <p className="text-(--app-text-muted)">
                      No summary available.
                    </p>
                  )}
                </div>
              )}
              {activeTab === "decisions" && (
                <div className="flex flex-col gap-3">
                  {(() => {
                    let decisions = [];
                    try {
                      decisions = run.decisions
                        ? JSON.parse(run.decisions)
                        : [];
                    } catch (e) {}
                    if (!Array.isArray(decisions) || decisions.length === 0) {
                      return (
                        <p className="text-(--app-text-body) italic text-sm">
                          No explicit decisions tagged during this sync.
                        </p>
                      );
                    }
                    return (
                      <ul className="list-disc pl-5 flex flex-col gap-2">
                        {decisions.map((decision: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-(--app-text-body) text-[15px]"
                          >
                            {decision}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}
              {activeTab === "risks" && (
                <div className="flex flex-col gap-3">
                  {(() => {
                    let risks = [];
                    try {
                      risks = run.risks ? JSON.parse(run.risks) : [];
                    } catch (e) {}
                    if (!Array.isArray(risks) || risks.length === 0) {
                      return (
                        <p className="text-(--app-text-body) italic text-sm">
                          No major risks captured.
                        </p>
                      );
                    }
                    return (
                      <ul className="list-disc pl-5 flex flex-col gap-2">
                        {risks.map((risk: string, idx: number) => (
                          <li
                            key={idx}
                            className="text-(--app-text-body) text-[15px]"
                          >
                            {risk}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}
              {activeTab === "transcript" && (
                <div className="flex flex-col gap-6 max-h-150 overflow-y-auto pr-4 scrollbar-thin">
                  {filteredTranscript.length > 0 ? (
                    filteredTranscript.map((block, idx) => {
                      const initial =
                        block.speaker.charAt(0).toUpperCase() || "S";
                      const colorVariants = [
                        "bg-emerald-400 text-emerald-900",
                        "bg-amber-400 text-amber-900",
                        "bg-sky-400 text-sky-900",
                        "bg-purple-400 text-purple-900",
                      ];
                      const colorClass =
                        colorVariants[
                          block.speaker.length % colorVariants.length
                        ];

                      return (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-(--app-text)">
                                {block.speaker}
                              </span>
                              <span className="text-xs font-medium text-(--color-primary)">
                                {/* {:} */}
                              </span>
                            </div>
                            <p className="text-(--app-text-body) text-[15px] leading-relaxed">
                              {block.text}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-(--app-text-muted)">
                      No transcript matches found.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <SlackDispatchCard run={run} refetch={refetch} />
        </div>

        <div className="bg-(--app-panel) border border-(--app-border) rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-5 md:p-6 border-b border-(--app-border) flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h2
                className="text-xl font-bold text-(--app-text)"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Draft Issues
              </h2>
              <span className="bg-(--color-surface-bone) text-(--app-text-muted) text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount} Drafts
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 md:mx-0 md:px-0">
              {[
                { id: "all", label: "All" },
                { id: "draft", label: "Draft" },
                { id: "approved", label: "Approved" },
              ].map((t) => {
                const isActive = issueFilter === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => setIssueFilter(t.id as any)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary-glow)] text-[var(--color-on-primary)] border-[var(--color-primary-glow)]"
                        : "bg-transparent text-[var(--color-text)] border-[var(--color-border)]"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 md:p-5 flex items-right justify-end bg-[#fdfbfa] border-b border-(--app-border)">
            <button
              onClick={() => approveAll.mutate(resolvedParams.id)}
              disabled={approveAll.isPending || pendingCount === 0}
              className="bg-transparent border border-(--color-primary-pink) text-(--color-primary) hover:bg-[#fff5f3] font-semibold text-sm px-6 py-1.5 rounded-full transition-colors disabled:opacity-40"
            >
              {approveAll.isPending ? "Approving..." : "Approve All"}
            </button>
          </div>

          <div className="bg-(--app-bg) p-4 md:p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
            {displayedDrafts.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center text-(--app-text-muted)">
                <div className="text-3xl mb-3 opacity-50">??</div>
                <p className="text-base font-medium text-(--app-text)">
                  No issues found
                </p>
                <p className="text-sm mt-1 max-w-50">
                  Adjust your filters or generate new drafts.
                </p>
              </div>
            ) : (
              displayedDrafts.map((draft: any) => (
                <DraftIssueCard
                  key={draft.id}
                  draft={draft}
                  users={users}
                  onApprove={() => approveDraft.mutate(draft.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <ChatPanel />
    </div>
  );
}
