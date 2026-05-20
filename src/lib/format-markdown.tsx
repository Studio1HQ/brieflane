import React from "react";

export function parseMarkdown(text: string) {
  if (!text) return null;

  // Split into lines for basic paragraph separation
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    // Basic inline parsing: bold (*text* or **text**), italic (_text_), and code (`text`)
    // Since Slack uses *bold* we match single or double asterisk for bold
    const tokens: React.ReactNode[] = [];
    let currentContent = "";

    for (let i = 0; i < line.length; i++) {
      if (
        line[i] === "*" &&
        (i === 0 ||
          line[i - 1] === " " ||
          line[i - 1] === "*" ||
          line.slice(i, i + 2) === "**")
      ) {
        const isDouble = line.slice(i, i + 2) === "**";
        const searchChar = isDouble ? "**" : "*";
        const endIdx = line.indexOf(searchChar, i + searchChar.length);
        if (endIdx !== -1) {
          if (currentContent) tokens.push(currentContent);
          tokens.push(
            <strong
              key={`${lineIndex}-${i}`}
              className="font-bold text-[var(--app-text)]"
            >
              {line.slice(i + searchChar.length, endIdx)}
            </strong>,
          );
          i = endIdx + searchChar.length - 1;
          currentContent = "";
          continue;
        }
      }

      if (line[i] === "_" && (i === 0 || line[i - 1] === " ")) {
        const endIdx = line.indexOf("_", i + 1);
        if (endIdx !== -1) {
          if (currentContent) tokens.push(currentContent);
          tokens.push(
            <em key={`${lineIndex}-${i}`} className="italic">
              {line.slice(i + 1, endIdx)}
            </em>,
          );
          i = endIdx;
          currentContent = "";
          continue;
        }
      }

      if (line[i] === "`") {
        const endIdx = line.indexOf("`", i + 1);
        if (endIdx !== -1) {
          if (currentContent) tokens.push(currentContent);
          tokens.push(
            <code
              key={`${lineIndex}-${i}`}
              className="bg-[var(--color-surface-bone)] border border-[var(--app-border)] px-1 py-0.5 rounded text-[var(--color-primary)] font-mono text-sm"
            >
              {line.slice(i + 1, endIdx)}
            </code>,
          );
          i = endIdx;
          currentContent = "";
          continue;
        }
      }

      currentContent += line[i];
    }

    if (currentContent) tokens.push(currentContent);

    // Check if line is a bullet point (starts with '-' or '*')
    const trimmed = line.trim();
    if (
      trimmed.startsWith("- ") ||
      (trimmed.startsWith("* ") && !trimmed.startsWith("** "))
    ) {
      return (
        <li
          key={lineIndex}
          className="ml-4 list-disc marker:text-[var(--app-text-soft)] mb-1"
        >
          {tokens.map((t, idx) =>
            typeof t === "string" && idx === 0 ? t.replace(/^[-*]\s/, "") : t,
          )}
        </li>
      );
    }

    return (
      <p key={lineIndex} className="mb-2 last:mb-0">
        {tokens}
      </p>
    );
  });
}

export function MarkdownContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={`text-[var(--app-text-body)] ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
}
