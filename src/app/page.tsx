
"use client";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function Home() {
  const { data: stats } = api.app.getRunCounts.useQuery();
  const { data: runs, isLoading } = api.app.getRuns.useQuery();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Meetings", val: stats?.total ?? 0 },
          { label: "Pending Issues", val: stats?.pending ?? 0 },
          { label: "Approved Issues", val: stats?.approved ?? 0 },
          { label: "Slack Digests Sent", val: stats?.slackSent ?? 0 },
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm">
            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-2">{s.label}</div>
            <div className="text-2xl font-semibold">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Recent Meeting Runs
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">Loading...</div>
        ) : runs?.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No meeting runs yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-2 font-normal">Date</th>
                <th className="px-4 py-2 font-normal">Meeting</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs?.map(run => (
                <tr key={run.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-4 py-3 text-zinc-400">{new Date(run.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{run.meeting_title}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="text-orange-500 hover:text-orange-400">
                      Review &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
