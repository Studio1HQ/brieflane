const fs = require("fs");
const path = require("path");

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

write(
  "src/app/runs/[id]/page.tsx",
  `
"use client";

import { use, useState } from "react";
import { api } from "~/trpc/react";

export default function MeetingRunDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: run, isLoading, refetch } = api.app.getRunDetails.useQuery(resolvedParams.id);
  const approveDraft = api.app.approveDraft.useMutation({ onSuccess: () => refetch() });
  const approveAll = api.app.approveAll.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;
  if (!run) return <div className="p-8 text-center text-zinc-500">Run not found.</div>;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* 2-Panel Layout */}
      <div className="flex-1 space-y-6">
        {/* Context Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-6">
          <div className="text-xs uppercase text-zinc-500 mb-2">Meeting Title</div>
          <h1 className="text-2xl font-semibold mb-4">{run.meeting_title}</h1>
          <div className="text-sm text-zinc-400 whitespace-pre-wrap">{run.summary || "No summary available."}</div>
        </div>
        
        {/* Actions Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-300">Run Actions</div>
          <div className="flex gap-2">
            <button 
              disabled={run.slack_summary_sent}
              className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-sm hover:bg-zinc-700 disabled:opacity-50"
            >
              Send Summary to Slack
            </button>
          </div>
        </div>
      </div>

      <div className="w-full md:w-96 flex flex-col gap-4">
        {/* Issues List Area */}
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-200">Draft Issues ({run.drafts?.length || 0})</h2>
          <button 
             onClick={() => approveAll.mutate(resolvedParams.id)}
             className="text-xs font-semibold text-orange-500 hover:text-orange-400"
          >
            Approve All
          </button>
        </div>

        {run.drafts?.map(draft => (
          <div key={draft.id} className="bg-zinc-900 border border-zinc-800 rounded-sm p-4 relative flex flex-col gap-2">
             <div className="flex items-start justify-between gap-4">
                <div className="font-medium text-sm text-zinc-200">{draft.title}</div>
                <span className={\`text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider \${draft.status === "draft" ? "bg-zinc-800 text-zinc-400" : "bg-green-500/20 text-green-400"}\`}>
                  {draft.status}
                </span>
             </div>
             {draft.description && <div className="text-xs text-zinc-400 line-clamp-3">{draft.description}</div>}
             <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
               <div className="text-xs text-zinc-500">P{draft.priority}</div>
               {draft.status === 'draft' && (
                 <button 
                   onClick={() => approveDraft.mutate(draft.id)}
                   className="text-xs font-medium text-orange-500 hover:text-orange-400"
                 >
                   Approve
                 </button>
               )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
);
console.log("Run details generated successfully.");
