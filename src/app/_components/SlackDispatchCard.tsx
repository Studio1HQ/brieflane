"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { SlackEditor } from "./SlackEditor";

export function SlackDispatchCard({
  run,
  refetch,
}: {
  run: any;
  refetch: () => void;
}) {
  const hasSentMessages = run.slackMessages && run.slackMessages.length > 0;
  const defaultText = hasSentMessages
    ? ""
    : `Hey @channel, here's the summary from our recent *${run.meeting_title}*. Check it out for key decisions and next steps.\n\n${run.summary || "No summary provided."}`;

  const [message, setMessage] = useState(defaultText);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPos, setMentionPos] = useState(-1);

  const { data: channels = [] } = api.app.getSlackChannels.useQuery();
  const { data: users = [] } = api.app.getSlackUsers.useQuery();

  const sendDispatch = api.app.sendSlackDispatch.useMutation({
    onSuccess: () => {
      setMessage("");
      setSelectedChannels([]);
      refetch();
    },
  });

  const handleSend = () => {
    if (selectedChannels.length === 0)
      return alert("Select at least one channel");

    // Transform simple text to Slack markdown
    let slackText = message;
    slackText = slackText.replace(/@channel\b/g, "<!channel>");
    users.forEach((u: any) => {
      if (!u.name) return;
      const regex = new RegExp(`@${u.name}\\b`, "g");
      slackText = slackText.replace(regex, `<@${u.id}>`);
    });

    sendDispatch.mutate({
      id: run.id,
      channels: selectedChannels,
      message: slackText,
    });
  };

  const handleMentionSearch = (search: string, pos: number) => {
    setMentionSearch(search);
    setMentionPos(pos);
  };

  const insertMention = (userName: string) => {
    const textBefore = message.slice(0, mentionPos);
    const textAfter = message.slice(mentionPos);
    const newTextBefore = textBefore.replace(/@[\w.]*$/, `@${userName} `);
    setMessage(newTextBefore + textAfter);
    setMentionPos(-1);
  };

  const filteredUsers = useMemo(() => {
    if (mentionPos === -1) return [];
    if (!mentionSearch) return users.slice(0, 5);
    return users
      .filter(
        (u: any) =>
          (u.name || "").toLowerCase().includes(mentionSearch.toLowerCase()) ||
          (u.real_name || "")
            .toLowerCase()
            .includes(mentionSearch.toLowerCase()),
      )
      .slice(0, 5);
  }, [mentionSearch, users, mentionPos]);

  return (
    <div className="bg-(--app-panel) border border-(--app-border) rounded-2xl overflow-hidden shadow-sm p-6 md:p-8 flex flex-col gap-4">
      <h2
        className="text-xl font-bold text-(--app-text)"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Slack Dispatch
      </h2>

      <div className="relative flex flex-col gap-2">
        <SlackEditor
          value={message}
          onChange={setMessage}
          onMentionSearch={handleMentionSearch}
          users={users}
        />

        {mentionPos !== -1 && filteredUsers.length > 0 && (
          <div
            className="absolute z-10 bg-white border border-gray-200 shadow-lg rounded-md mt-1 w-64 max-h-48 overflow-y-auto"
            style={{ top: "100%", left: "16px" }}
          >
            {filteredUsers.map((u: any) => (
              <div
                key={u.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => insertMention(u.name)}
              >
                <span className="font-semibold">{u.name}</span>{" "}
                <span className="text-gray-500 text-xs">{u.real_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mt-2">
        <div className="flex flex-col gap-1.5 flex-1 w-full relative z-0">
          <label className="text-sm font-semibold text-(--app-text)">
            Destination Channels
          </label>
          <div className="flex flex-col gap-2">
            <select
              className="bg-(--app-panel) border border-(--app-border) rounded-md px-4 py-2.5 text-base text-(--app-text) font-medium outline-none w-full appearance-none cursor-pointer"
              onChange={(e) => {
                if (
                  e.target.value &&
                  !selectedChannels.includes(e.target.value)
                ) {
                  setSelectedChannels([...selectedChannels, e.target.value]);
                }
              }}
              value=""
            >
              <option value="" disabled>
                Add a channel...
              </option>
              {channels.map((c: any) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            {selectedChannels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {selectedChannels.map((cid) => {
                  const c = channels.find((x: any) => x.id === cid);
                  return (
                    <span
                      key={cid}
                      className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-blue-200/50"
                    >
                      #{c ? c.name : cid}
                      <button
                        onClick={() =>
                          setSelectedChannels(
                            selectedChannels.filter((id) => id !== cid),
                          )
                        }
                        className="text-blue-500 hover:text-blue-900 ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 relative z-0">
          <button
            onClick={handleSend}
            disabled={sendDispatch.isPending || selectedChannels.length === 0}
            className="bg-(--color-primary-glow) hover:bg-(--color-primary) text-white font-semibold text-md px-2 py-2.5 rounded-full md:w-48 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sendDispatch.isPending
              ? "Sending..."
              : run.slack_summary_sent
                ? "Resend Update"
                : "Send Update"}
          </button>
        </div>
      </div>

      {run.slack_summary_sent && sendDispatch.isSuccess && (
        <div className="text-sm font-medium text-green-600 flex items-center gap-2 mt-2">
          ✓ Sent to {selectedChannels.length} channel(s)
        </div>
      )}

      {run.slackMessages && run.slackMessages.length > 0 && (
        <div className="flex flex-col gap-4 mt-6 border-t border-(--app-border) pt-6">
          <h3 className="font-semibold text-(--app-text) text-lg">
            Sent Messages
          </h3>
          <div className="flex flex-col gap-4">
            {run.slackMessages.map((msg: any) => {
              let parsedChannels = [];
              try {
                parsedChannels = JSON.parse(msg.channels);
              } catch (e) {}

              // Approximate markdown to HTML for beautiful sent rendering
              let htmlMsg = msg.message
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(
                  /&lt;!channel&gt;/g,
                  '<strong class="text-blue-500">@channel</strong>',
                )
                .replace(/&lt;@([A-Z0-9]+)&gt;/g, (m: string, id: string) => {
                  const u = users.find((x: any) => x.id === id);
                  return `<strong class="text-blue-500">@${u ? u.name : id}</strong>`;
                })
                .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
                .replace(/_([^_]+)_/g, "<em>$1</em>")
                .replace(
                  /`([^`]+)`/g,
                  "<code class='bg-gray-100 rounded px-1 text-red-500'>$1</code>",
                )
                .replace(/\n/g, "<br/>");

              return (
                <div
                  key={msg.id}
                  className="bg-(--app-bg) border border-(--app-border) rounded-xl p-5 text-[15px]"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-(--app-border-light) pb-2">
                    <span className="text-xs text-(--app-text-muted) font-medium">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-(--color-primary-pink) bg-(--color-surface-bone) px-2 py-0.5 rounded text-blue-600">
                      → {parsedChannels.length} channel(s)
                    </span>
                  </div>
                  <div
                    className="text-(--app-text-body) leading-relaxed prose max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: htmlMsg }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
