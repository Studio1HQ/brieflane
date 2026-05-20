import React, { useRef, useState, useMemo, useEffect } from "react";

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function SlackEditor({
  value,
  onChange,
  onMentionSearch,
  users,
}: {
  value: string;
  onChange: (val: string) => void;
  onMentionSearch: (search: string, pos: number) => void;
  users: any[];
}) {
  const [scroll, setScroll] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setScroll(e.currentTarget.scrollTop);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const cursor = e.target.selectionStart;
    const textBefore = e.target.value.slice(0, cursor);
    const match = textBefore.match(/@([\w.]*)$/);
    if (match) {
      onMentionSearch(match[1] || "", cursor);
    } else {
      onMentionSearch("", -1);
    }
  };

  // Convert raw text into styled HTML for the backdrop layer
  const highlighted = useMemo(() => {
    let safe = escapeHtml(value);
    
    // Slack-like rules
    // Bold
    safe = safe.replace(/\*([^*]+)\*/g, "<strong>*$1*</strong>");
    // Italic
    safe = safe.replace(/_([^_]+)_/g, "<em>_$1_</em>");
    // Code
    safe = safe.replace(/`([^`]+)`/g, "<code class='bg-gray-100 rounded text-red-500'>`$1`</code>");
    // Mentions
    safe = safe.replace(/@channel\b/g, '<span class="text-blue-500 bg-blue-50 px-1 rounded">@channel</span>');
    
    users.forEach(u => {
      if (!u.name) return;
      const regex = new RegExp(`@${escapeHtml(u.name)}\\b`, 'g');
      safe = safe.replace(regex, `<span class="text-blue-500 bg-blue-50 px-1 rounded">@${escapeHtml(u.name)}</span>`);
    });

    // Make newlines render correctly
    // Trailing newline needs an extra space or br to ensure height is calculated
    if (safe.endsWith("\n")) {
      safe += "<br/>";
    }
    safe = safe.replace(/\n/g, "<br/>");
    
    return safe;
  }, [value, users]);

  return (
    <div className="relative w-full text-[15px] leading-relaxed border border-(--color-surface-bone) bg-[#fdfbfa] overflow-hidden focus-within:border-(--color-primary)">
      {/* <div 
        className="absolute inset-0 p-4 pointer-events-none whitespace-pre-wrap break-words prose max-w-none text-(--app-text) overflow-hidden"
        style={{ transform: `translateY(-${scroll}px)` }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      /> */}
      <textarea
        value={value}
        onChange={handleInput}
        onScroll={handleScroll}
        onClick={handleInput as any}
        onKeyUp={handleInput as any}
        className="relative w-full h-full p-4 resize-y focus:outline-none placeholder-gray-400 rounded-none"
        style={{
          // color: "transparent",
          caretColor: "var(--app-text)", // Ensure caret is visible
          minHeight: "12rem",
          borderRadius: "0px"
        }}
        spellCheck="false"
        placeholder="Type your Slack message... Use @ to mention"
      />
    </div>
  );
}