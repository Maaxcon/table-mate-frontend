import "./Toolbar.css"

interface ToolbarProps {
  dirty: boolean
  publishing: boolean
  activeTool: string | null
  onToolSelect: (tool: string | null) => void
  onPublish: () => void
  onDiscard: () => void
}

const TOOLS = [
  { id: "select", label: "Select" },
  { id: "table-square", label: "Table" },
  { id: "table-round", label: "Round" },
  { id: "obstacle", label: "Obstacle" },
  { id: "threshold", label: "Threshold" },
  { id: "portal", label: "Portal" },
] as const

export function Toolbar({
  dirty,
  publishing,
  activeTool,
  onToolSelect,
  onPublish,
  onDiscard,
}: ToolbarProps) {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={[
              "editor-toolbar__btn",
              activeTool === tool.id ? "editor-toolbar__btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onToolSelect(activeTool === tool.id ? "select" : tool.id)}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div className="editor-toolbar__actions">
        <button
          type="button"
          className="editor-toolbar__btn editor-toolbar__btn--discard"
          disabled={!dirty || publishing}
          onClick={onDiscard}
        >
          Discard
        </button>
        <button
          type="button"
          className="editor-toolbar__btn editor-toolbar__btn--publish"
          disabled={!dirty || publishing}
          onClick={onPublish}
        >
          {publishing ? "Publishing..." : "Publish Layout"}
        </button>
      </div>
    </div>
  )
}
