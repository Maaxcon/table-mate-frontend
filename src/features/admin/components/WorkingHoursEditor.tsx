import type { WeekDay, WorkingHours } from "../types"
import { WEEK_DAYS, dayInvalid, hasInvalidWorkingHours } from "./workingHours"
import "./hours.css"

type WorkingHoursEditorProps = {
  value: WorkingHours
  onChange: (value: WorkingHours) => void
}

function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const setDay = (key: WeekDay, open: string, close: string) => {
    onChange({ ...value, [key]: { open, close } })
  }

  const setClosed = (key: WeekDay) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const anyInvalid = hasInvalidWorkingHours(value)

  return (
    <div className="admin-field">
      <span className="admin-field__label">Working hours</span>
      <div className="hours-editor">
        {WEEK_DAYS.map(({ key, label }) => {
          const day = value[key]
          const isOpen = day != null
          const invalid = dayInvalid(day)
          const timeClass = `hours-row__time${invalid ? " hours-row__time--error" : ""}`
          return (
            <div className="hours-row" key={key}>
              <label className="hours-row__toggle">
                <input
                  type="checkbox"
                  checked={isOpen}
                  onChange={(e) =>
                    e.target.checked ? setDay(key, "09:00", "22:00") : setClosed(key)
                  }
                />
                <span className="hours-row__day">{label}</span>
              </label>

              {isOpen ? (
                <div className="hours-row__times">
                  <input
                    type="time"
                    className={timeClass}
                    value={day.open}
                    aria-label={`${label} opening time`}
                    aria-invalid={invalid}
                    onChange={(e) => setDay(key, e.target.value, day.close)}
                  />
                  <span className="hours-row__dash">–</span>
                  <input
                    type="time"
                    className={timeClass}
                    value={day.close}
                    aria-label={`${label} closing time`}
                    aria-invalid={invalid}
                    onChange={(e) => setDay(key, day.open, e.target.value)}
                  />
                </div>
              ) : (
                <span className="hours-row__closed">Closed</span>
              )}
            </div>
          )
        })}
      </div>
      {anyInvalid ? (
        <span className="admin-field__hint hours-editor__error">
          Each open day needs both times set, and open and close can’t be the same.
        </span>
      ) : (
        <span className="admin-field__hint">
          Used to show customers whether you are open. Overnight hours are allowed (e.g.
          18:00–02:00).
        </span>
      )}
    </div>
  )
}

export default WorkingHoursEditor
