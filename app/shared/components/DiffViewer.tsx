import { T } from "../styles/tokens";
import { diffLines, type Change } from "diff";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  oldLabel?: string;
  newLabel?: string;
}

export function DiffViewer({ oldText, newText, oldLabel, newLabel }: DiffViewerProps) {
  const changes: Change[] = diffLines(oldText, newText);

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        overflow: "hidden",
        fontFamily: "monospace",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      {/* Labels */}
      {(oldLabel || newLabel) && (
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 14px",
            background: T.s1,
            borderBottom: `1px solid ${T.border}`,
            fontSize: 11,
            fontWeight: 600,
            color: T.ink3,
            fontFamily: T.sans,
          }}
        >
          {oldLabel && <span style={{ color: "#dc2626" }}>{oldLabel}</span>}
          <span style={{ color: T.ink4 }}>&rarr;</span>
          {newLabel && <span style={{ color: "#16654e" }}>{newLabel}</span>}
        </div>
      )}

      {/* Diff lines */}
      <div style={{ maxHeight: 400, overflowY: "auto", background: "#fff" }}>
        {changes.map((change, i) => {
          const lines = change.value.split("\n").filter((l, idx, arr) => idx < arr.length - 1 || l !== "");
          return lines.map((line, j) => {
            let bg: string = "transparent";
            let color: string = T.ink2;
            let prefix = " ";
            if (change.added) {
              bg = "#f0fdf4";
              color = "#166534";
              prefix = "+";
            } else if (change.removed) {
              bg = "#fef2f2";
              color = "#991b1b";
              prefix = "-";
            }
            return (
              <div
                key={`${i}-${j}`}
                style={{
                  padding: "1px 14px",
                  background: bg,
                  color,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  borderLeft: change.added
                    ? "3px solid #16654e"
                    : change.removed
                      ? "3px solid #dc2626"
                      : "3px solid transparent",
                }}
              >
                <span style={{ opacity: 0.5, userSelect: "none" }}>{prefix} </span>
                {line}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
