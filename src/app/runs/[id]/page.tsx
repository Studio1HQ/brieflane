"use client";

import { use, useState } from "react";
import { api } from "~/trpc/react";

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

  if (draft.status !== "draft") {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 relative flex flex-col gap-2 opacity-60">
        <div className="flex items-start justify-between gap-4">
          <div className="font-medium text-sm text-zinc-200 line-through">
            {draft.title}
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-green-500/20 text-green-400">
            {draft.status}
          </span>
        </div>
        {draft.description && (
          <div className="text-xs text-zinc-400 line-clamp-2">
            {draft.description}
          </div>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-sm p-4 flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue Title"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="0">No Priority</option>
            <option value="1">Urgent</option>
            <option value="2">High</option>
            <option value="3">Medium</option>
            <option value="4">Low</option>
          </select>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateDraft.isPending}
            className="bg-orange-500 text-white text-xs px-3 py-1 rounded-sm hover:bg-orange-400 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 group flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div className="font-medium text-sm text-zinc-200">{draft.title}</div>
        <div className="flex gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-zinc-800 text-zinc-400">
            {draft.status}
          </span>
        </div>
      </div>
      {draft.description && (
        <div className="text-xs text-zinc-400 line-clamp-3">
          {draft.description}
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
        <span>P{draft.priority}</span>
        {draft.assignee_id && (
          <span>
            {users.find((u) => u.id === draft.assignee_id)?.name || "Assigned"}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
        <div className="flex gap-2 invisible group-hover:visible">
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-zinc-400 hover:text-white"
          >
            Edit
          </button>
          <button
            onClick={() => deleteDraft.mutate(draft.id)}
            className="text-xs font-medium text-red-500 hover:text-red-400"
          >
            Reject
          </button>
        </div>
        <button
          onClick={onApprove}
          className="text-xs font-medium text-orange-500 hover:text-orange-400 bg-orange-500/10 px-2 py-1 rounded-sm"
        >
          Approve
        </button>
      </div>
    </div>
  );
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

  const approveDraft = api.app.approveDraft.useMutation({
    onSuccess: () => refetch(),
  });
  const approveAll = api.app.approveAll.useMutation({
    onSuccess: () => refetch(),
  });
  const sendToSlack = api.app.sendSlackSummary.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading)
    return <div className="p-8 text-center text-zinc-500">Loading...</div>;
  if (!run)
    return <div className="p-8 text-center text-zinc-500">Run not found.</div>;

  const validDrafts = run.drafts || [];
  const pendingDrafts = validDrafts.filter((d: any) => d.status === "draft");

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Context Area */}
      <div className="flex-1 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
          <div className="text-xs uppercase text-zinc-500 mb-2 font-medium tracking-wider">
            Meeting Recap
          </div>
          <h1 className="text-2xl font-semibold mb-4 text-white">
            {run.meeting_title}
          </h1>
          <div className="prose prose-invert max-w-none text-sm text-zinc-300 whitespace-pre-wrap">
            {run.summary || "No summary available for this meeting yet."}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-300">Run Actions</div>
          <div className="flex gap-2">
            <button
              onClick={() => sendToSlack.mutate(resolvedParams.id)}
              disabled={run.slack_summary_sent || sendToSlack.isPending}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {sendToSlack.isPending ? "Sending..." : run.slack_summary_sent ? "Sent to Slack" : "Send Summary to Slack"}
            </button>
          </div>
        </div>
      </div>

      {/* Issues Panel */}
      <div className="w-full lg:w-[420px] flex flex-col gap-4">
        <div className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-sm border border-transparent">
          <h2 className="font-medium text-zinc-100 flex items-center gap-2">
            Draft Issues
            <span className="bg-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded-full">
              {validDrafts.length}
            </span>
          </h2>
          {pendingDrafts.length > 0 && (
            <button
              onClick={() => approveAll.mutate(resolvedParams.id)}
              disabled={approveAll.isPending}
              className="text-xs font-medium bg-orange-500 text-white px-3 py-1 rounded-sm hover:bg-orange-400 disabled:opacity-50 transition-colors shadow-sm"
            >
              {approveAll.isPending ? "Approving..." : "Approve All"}
            </button>
          )}
        </div>

        {validDrafts.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/50 border-dashed rounded-sm p-8 text-center flex flex-col items-center justify-center text-zinc-500">
            <div className="text-2xl mb-2">✨</div>
            <p className="text-sm">No draft issues present.</p>
            <p className="text-xs mt-1 max-w-[200px]">
              Generation may be delayed or no actionable items were found in the
              transcript.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {validDrafts.map((draft: any) => (
              <DraftIssueCard
                key={draft.id}
                draft={draft}
                users={users}
                onApprove={() => approveDraft.mutate(draft.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
