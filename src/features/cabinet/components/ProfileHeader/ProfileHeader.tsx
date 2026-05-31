import { useState } from "react"
import { LuCreditCard, LuSettings } from "react-icons/lu"
import Card from "@/components/Card"
import type { ProfileUpdate } from "../../api"
import type { CabinetProfile } from "../../types"
import { memberSinceYear } from "../../utils"
import "./ProfileHeader.css"

type ProfileHeaderProps = {
  profile: CabinetProfile
  onSave: (patch: ProfileUpdate) => Promise<void>
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?"
}

export function ProfileHeader({ profile, onSave }: ProfileHeaderProps) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [email, setEmail] = useState(profile.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

  // Only allow saving when something actually changed — stops the user from
  // firing duplicate, pointless requests at the server.
  const isDirty =
    firstName.trim() !== profile.firstName ||
    lastName.trim() !== profile.lastName ||
    phone.trim() !== (profile.phone ?? "") ||
    email.trim() !== profile.email

  const openPanel = () => {
    // Reset the form to the current profile each time it opens.
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(profile.phone ?? "")
    setEmail(profile.email)
    setError(null)
    setSaved(false)
    setOpen(true)
  }

  const handleSubmit = async () => {
    // Ignore extra submits while a request is in flight or when nothing changed.
    if (saving || !isDirty) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() === "" ? null : phone.trim(),
        email: email.trim(),
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="cabinet-profile">
      <div className="cabinet-profile__top">
        <div className="cabinet-profile__avatar" aria-hidden="true">
          {initials(profile.firstName, profile.lastName)}
        </div>
        <div className="cabinet-profile__identity">
          <h1 className="cabinet-profile__name">{fullName}</h1>
          {profile.createdAt && (
            <p className="cabinet-profile__since">
              Member since {memberSinceYear(profile.createdAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          className="cabinet-profile__settings-btn"
          aria-expanded={open}
          aria-controls="cabinet-settings"
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          <LuSettings aria-hidden="true" />
          <span className="cabinet-profile__settings-text">Settings</span>
        </button>
      </div>

      {open && (
        <form
          className="cabinet-profile__settings"
          id="cabinet-settings"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="cabinet-field-grid">
            <label className="cabinet-field">
              <span className="cabinet-field__label">First name</span>
              <input
                className="cabinet-field__input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label className="cabinet-field">
              <span className="cabinet-field__label">Last name</span>
              <input
                className="cabinet-field__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="cabinet-field">
            <span className="cabinet-field__label">Phone</span>
            <input
              className="cabinet-field__input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Not set"
              autoComplete="tel"
            />
          </label>
          <label className="cabinet-field">
            <span className="cabinet-field__label">Email</span>
            <input
              className="cabinet-field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          {/* UI only for MVP — not wired to the backend yet. */}
          <div className="cabinet-setting-row" aria-disabled="true">
            <LuCreditCard className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">Payment methods</span>
            <span className="cabinet-setting-row__value">None added</span>
          </div>

          {error && <p className="cabinet-profile__error">{error}</p>}
          {saved && <p className="cabinet-profile__ok">Saved.</p>}

          <div className="cabinet-profile__actions">
            <button
              type="button"
              className="cabinet-profile__btn"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cabinet-profile__btn cabinet-profile__btn--primary"
              disabled={saving || !isDirty}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </Card>
  )
}
