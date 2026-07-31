import "./Toolbar.css"
import { useAdminStrings } from "@/features/admin/strings"

interface ToolbarProps {
  dirty: boolean
  publishing: boolean
  activeTool: string | null
  onToolSelect: (tool: string | null) => void
  onPublish: () => void
  onSync: () => void
  onDiscard: () => void
  draftSaving?: boolean
  draftSavedAt?: string | null
  draftConflict?: boolean
  loadedDraft: boolean | null
}

export function Toolbar({
  dirty,
  publishing,
  activeTool,
  onToolSelect,
  onPublish,
  onSync,
  onDiscard,
  draftSaving,
  draftSavedAt,
  draftConflict,
  loadedDraft,
}: ToolbarProps) {
  const strings = useAdminStrings()
  const toolbarStrings = strings.floor.toolbar
  const pageStrings = strings.floor.page

  const draftStatus = draftConflict
    ? pageStrings.status.draftConflict
    : draftSavedAt
      ? pageStrings.status.draftSaved
      : dirty
        ? pageStrings.status.dirty
        : pageStrings.status.clean

  const tools = [
    {
      id: "select",
      label: toolbarStrings.tools.select.label,
      hint: toolbarStrings.tools.select.hint,
      icon: "◎",
    },
    {
      id: "table-square",
      label: toolbarStrings.tools.tableSquare.label,
      hint: toolbarStrings.tools.tableSquare.hint,
      icon: "▦",
    },
    {
      id: "table-round",
      label: toolbarStrings.tools.tableRound.label,
      hint: toolbarStrings.tools.tableRound.hint,
      icon: "◯",
    },
    {
      id: "obstacle",
      label: toolbarStrings.tools.obstacle.label,
      hint: toolbarStrings.tools.obstacle.hint,
      icon: "▧",
    },
    {
      id: "threshold",
      label: toolbarStrings.tools.threshold.label,
      hint: toolbarStrings.tools.threshold.hint,
      icon: "⎯",
    },
    {
      id: "portal",
      label: toolbarStrings.tools.portal.label,
      hint: toolbarStrings.tools.portal.hint,
      icon: "⇄",
    },
  ] as const
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar__tools-panel">
        <div className="editor-toolbar__section-head">
          <span className="editor-toolbar__section-kicker">{toolbarStrings.section.kicker}</span>
          <span className="editor-toolbar__section-title">{toolbarStrings.section.title}</span>
        </div>
        <div className="editor-toolbar__tools">
          {tools.map((tool) => (
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
        <span className="editor-toolbar__section-kicker">{toolbarStrings.section.project}</span>
        {loadedDraft !== null && (
          <span
            className={`editor-toolbar__layout-source editor-toolbar__layout-source--${loadedDraft ? "draft" : "published"}`}
          >
            {loadedDraft ? toolbarStrings.source.draft : toolbarStrings.source.published}
          </span>
        )}
        <span
          className={`editor-toolbar__status-badge${draftConflict ? " editor-toolbar__status-badge--conflict" : ""}`}
        >
          {draftSaving ? toolbarStrings.actions.savingDraft : draftStatus}
        </span>
        <div className="editor-toolbar__actions">
          <button
            type="button"
            className="editor-toolbar__btn"
            disabled={publishing || draftSaving}
            onClick={onSync}
          >
            {toolbarStrings.actions.sync}
          </button>
          <button
            type="button"
            className="editor-toolbar__btn editor-toolbar__btn--discard"
            disabled={(!dirty && !draftSavedAt) || publishing}
            onClick={onDiscard}
          >
            {draftSavedAt ? toolbarStrings.actions.discardDraft : toolbarStrings.actions.discard}
          </button>
          <button
            type="button"
            className="editor-toolbar__btn editor-toolbar__btn--publish"
            disabled={publishing}
            onClick={onPublish}
          >
            {publishing ? toolbarStrings.actions.publishing : toolbarStrings.actions.publish}
          </button>
        </div>
      </div>
    </div>
  )
}
