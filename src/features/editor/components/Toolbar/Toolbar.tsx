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
  {
    id: "select",
    label: "Select",
    hint: "Pick and edit objects",
    icon: "◎",
  },
  {
    id: "table-square",
    label: "Square Table",
    hint: "Add seating table",
    icon: "▦",
  },
  {
    id: "table-round",
    label: "Round Table",
    hint: "Add round seating",
    icon: "◯",
  },
  {
    id: "obstacle",
    label: "Obstacle",
    hint: "Block access area",
    icon: "▧",
  },
  {
    id: "threshold",
    label: "Threshold",
    hint: "Passage / divider",
    icon: "⎯",
  },
  {
    id: "portal",
    label: "Portal",
    hint: "Jump to another zone",
    icon: "⇄",
  },
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
      <div className="editor-toolbar__tools-panel">
        <div className="editor-toolbar__section-head">
          <span className="editor-toolbar__section-kicker">Layout Builder</span>
          <span className="editor-toolbar__section-title">Add Elements</span>
        </div>
        <div className="editor-toolbar__tools">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={[
                "editor-toolbar__tool",
                `editor-toolbar__tool--${tool.id}`,
                activeTool === tool.id ? "editor-toolbar__tool--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onToolSelect(activeTool === tool.id ? "select" : tool.id)}
              aria-label={`${tool.label}. ${tool.hint}`}
            >
              <span className="editor-toolbar__tool-icon" aria-hidden="true">
                {tool.icon}
              </span>
              <span className="editor-toolbar__tool-copy">
                <span className="editor-toolbar__tool-label">{tool.label}</span>
                <span className="editor-toolbar__tool-hint">{tool.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="editor-toolbar__actions-panel">
        <span className="editor-toolbar__section-kicker">Project</span>
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
    </div>
  )
}
