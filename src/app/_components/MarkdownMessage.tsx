"use client";

import MarkdownPreview from "@uiw/react-markdown-preview";

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <MarkdownPreview
      source={content}
      style={{
        width: "fit-content",
        background: "var(--color-on-primary)",
        border: "1px solid var(--app-border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md) var(--space-lg)",
        boxShadow: "var(--shadow-soft)",
        color: "var(--app-text)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-body-sm)",
        lineHeight: "var(--leading-body)",
      }}
      wrapperElement={{
        "data-color-mode": "light",
      }}
      components={{
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-primary-glow)",
              textDecoration: "underline",
              wordBreak: "break-all",
            }}
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code
                className={className}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-code-sm)",
                  background: "var(--app-panel-muted)",
                  borderRadius: "var(--radius-xs)",
                  padding: "2px 6px",
                  display: "block",
                  overflowX: "auto",
                }}
              >
                {children}
              </code>
            );
          }
          return (
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-code-sm)",
                background: "var(--app-panel-muted)",
                borderRadius: "var(--radius-xs)",
                padding: "2px 5px",
                color: "var(--color-primary-glow)",
              }}
            >
              {children}
            </code>
          );
        },
        p: ({ children }) => (
          <p style={{ color: "var(--app-text)", marginBottom: "6px" }}>
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul
            style={{
              paddingLeft: "var(--space-lg)",
              marginBottom: "6px",
              color: "var(--app-text-muted)",
            }}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            style={{
              paddingLeft: "var(--space-lg)",
              marginBottom: "6px",
              color: "var(--app-text-muted)",
            }}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li
            style={{
              marginBottom: "2px",
              color: "var(--app-text-muted)",
            }}
          >
            {children}
          </li>
        ),
        strong: ({ children }) => (
          <strong style={{ color: "var(--app-text)", fontWeight: 600 }}>
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em style={{ color: "var(--app-text-muted)" }}>{children}</em>
        ),
        h1: ({ children }) => (
          <h1
            style={{
              color: "var(--app-text)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-heading-sm)",
              marginBottom: "6px",
            }}
          >
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2
            style={{
              color: "var(--app-text)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-body-lg)",
              marginBottom: "4px",
            }}
          >
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3
            style={{
              color: "var(--app-text)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-body-md)",
              marginBottom: "4px",
            }}
          >
            {children}
          </h3>
        ),
      }}
    />
  );
}
