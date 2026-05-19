const fs = require("fs");
const path = require("path");

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

write(
  "src/app/layout.tsx",
  `
import '~/styles/globals.css';
import { type Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { TRPCReactProvider } from '~/trpc/react';

export const metadata = {
  title: 'Meeting Ops',
  description: 'Meeting operations powered by Corsair',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
};

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default function RootLayout({ children }) {
  return (
    <html lang='en' className={\`\${geist.variable} dark antialiased\`}>
      <body className='bg-zinc-950 text-zinc-100 min-h-screen font-sans flex flex-col'>
        <TRPCReactProvider>
          <header className='border-b border-zinc-900 bg-zinc-950 shadow-sm sticky top-0 z-10'>
            <div className='mx-auto flex h-14 max-w-7xl items-center justify-between px-6'>
              <div className='flex items-center gap-6'>
                <Link href='/' className='font-semibold text-white uppercase tracking-wider text-sm flex items-center gap-2'>
                  <span className='h-4 w-4 bg-orange-500 rounded-sm inline-block'></span>
                  Meeting Ops
                </Link>
                <nav className='flex items-center gap-4 text-sm font-medium text-zinc-400'>
                  <Link href='/' className='hover:text-white transition-colors'>Dashboard</Link>
                  <Link href='/settings' className='hover:text-white transition-colors'>Settings</Link>
                </nav>
              </div>
              <div className='flex items-center gap-4 text-xs font-medium text-zinc-500'>
                <div className='flex items-center gap-1'>
                  <span className='w-2 h-2 rounded-full bg-green-500'></span> System Online
                </div>
              </div>
            </div>
          </header>
          <div className='flex-1 max-w-7xl w-full mx-auto p-6 md:p-8'>
            {children}
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
`,
);

write(
  "src/app/page.tsx",
  `
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
                    <Link href={\`/runs/\${run.id}\`} className="text-orange-500 hover:text-orange-400">
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
`,
);

write(
  "src/app/settings/page.tsx",
  `
"use client";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

export default function Settings() {
  const { data, refetch } = api.app.getSettings.useQuery();
  const updateSettings = api.app.updateSettings.useMutation({
    onSuccess: () => refetch(),
  });

  const [form, setForm] = useState({
    require_human_approval: 1,
    require_approval_linear: 1,
    require_approval_slack_summary: 1,
    require_approval_slack_issues: 1,
    default_slack_channel: "",
    default_linear_project: "",
    default_linear_team: ""
  });

  useEffect(() => {
    if (data) {
      setForm({
        require_human_approval: data.require_human_approval,
        require_approval_linear: data.require_approval_linear,
        require_approval_slack_summary: data.require_approval_slack_summary,
        require_approval_slack_issues: data.require_approval_slack_issues,
        default_slack_channel: data.default_slack_channel || "",
        default_linear_project: data.default_linear_project || "",
        default_linear_team: data.default_linear_team || ""
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings.mutate(form);
  };

  return (
    <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <label className="flex items-center space-x-3">
          <input type="checkbox" checked={!!form.require_human_approval} onChange={e => setForm({...form, require_human_approval: e.target.checked ? 1 : 0})} className="form-checkbox bg-zinc-800 border-zinc-700 rounded-sm text-orange-500 focus:ring-offset-zinc-950 focus:ring-orange-500" />
          <span className="text-zinc-300">Require human approval globally</span>
        </label>
        
        <label className="flex items-center space-x-3">
          <input type="checkbox" checked={!!form.require_approval_linear} onChange={e => setForm({...form, require_approval_linear: e.target.checked ? 1 : 0})} className="form-checkbox bg-zinc-800 border-zinc-700 rounded-sm text-orange-500 focus:ring-offset-zinc-950 focus:ring-orange-500" />
          <span className="text-zinc-300">Require approval for Linear issue creation</span>
        </label>

        <label className="flex items-center space-x-3">
          <input type="checkbox" checked={!!form.require_approval_slack_summary} onChange={e => setForm({...form, require_approval_slack_summary: e.target.checked ? 1 : 0})} className="form-checkbox bg-zinc-800 border-zinc-700 rounded-sm text-orange-500 focus:ring-offset-zinc-950 focus:ring-orange-500" />
          <span className="text-zinc-300">Require approval for Slack Summary</span>
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Default Slack Channel</label>
            <input type="text" value={form.default_slack_channel} onChange={e => setForm({...form, default_slack_channel: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200" placeholder="#engineering" />
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-500 mb-1">Default Linear Team (ID)</label>
            <input type="text" value={form.default_linear_team} onChange={e => setForm({...form, default_linear_team: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-sm p-2 text-sm text-zinc-200" placeholder="team-id" />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button type="submit" disabled={updateSettings.isPending} className="bg-orange-500 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-400 rounded-sm disabled:opacity-50">
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
`,
);

console.log("Pages generated successfully.");
