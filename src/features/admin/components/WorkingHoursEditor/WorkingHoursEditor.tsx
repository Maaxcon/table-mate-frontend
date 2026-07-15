import type { WeekDay, WorkingHours } from "@/features/admin/types"
import {
  WEEK_DAYS,
  dayInvalid,
  hasInvalidWorkingHours,
} from "@/features/admin/constants/workingHours"
import { useAdminStrings } from "@/features/admin/strings"
import "./hours.css"

type WorkingHoursEditorProps = {
  value: WorkingHours
  onChange: (value: WorkingHours) => void
}

function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const strings = useAdminStrings()
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
      <span className="admin-field__label">{strings.workingHours.label}</span>
      <div className="hours-editor">
        {WEEK_DAYS.map(({ key }) => {
          const label = strings.workingHours.weekdays[key]
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
                    aria-label={strings.workingHours.openAria(label)}
                    aria-invalid={invalid}
                    onChange={(e) => setDay(key, e.target.value, day.close)}
                  />
                  <span className="hours-row__dash">–</span>
                  <input
                    type="time"
                    className={timeClass}
                    value={day.close}
                    aria-label={strings.workingHours.closeAria(label)}
                    aria-invalid={invalid}
                    onChange={(e) => setDay(key, day.open, e.target.value)}
                  />
                </div>
              ) : (
                <span className="hours-row__closed">{strings.workingHours.closed}</span>
              )}
            </div>
          )
        })}
      </div>
      {anyInvalid ? (
        <span className="admin-field__hint hours-editor__error">{strings.workingHours.error}</span>
      ) : (
        <span className="admin-field__hint">{strings.workingHours.info}</span>
      )}
    </div>
  )
}

export default WorkingHoursEditor
