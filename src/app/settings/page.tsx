
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

  const handleSubmit = (e: React.FormEvent) => {
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
