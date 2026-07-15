import { useState } from "react"
import { LuCreditCard, LuSettings } from "react-icons/lu"
import Card from "@/components/Card"
import type { ProfileUpdate } from "@/features/cabinet/api"
import type { CabinetProfile } from "@/features/cabinet/types"
import {
  composeUaPhone,
  extractUaNational,
  formatUaNational,
  isValidUaNational,
  memberSinceYear,
} from "@/features/cabinet/utils"
import { useCabinetStrings } from "@/features/cabinet/strings"
import { FeedbackDialog } from "@/features/cabinet/components/FeedbackDialog/FeedbackDialog"
import "./ProfileHeader.css"

type Feedback = { variant: "success" | "error"; title: string; message?: string }

type ProfileHeaderProps = {
  profile: CabinetProfile
  onSave: (patch: ProfileUpdate) => Promise<void>
}

export function ProfileHeader({ profile, onSave }: ProfileHeaderProps) {
  const strings = useCabinetStrings()
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  // Only the 9 national digits; the +380 prefix is fixed in the UI.
  const [phone, setPhone] = useState(() => extractUaNational(profile.phone))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email
  const initialsStr =
    `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() ||
    strings.profile.fallbackInitials

  // Only allow saving when something actually changed — stops the user from
  // firing duplicate, pointless requests at the server.
  const isDirty =
    firstName.trim() !== profile.firstName ||
    lastName.trim() !== profile.lastName ||
    phone !== extractUaNational(profile.phone)

  const openPanel = () => {
    // Reset the form to the current profile each time it opens.
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(extractUaNational(profile.phone))
    setOpen(true)
  }

  const handleSubmit = async () => {
    // Ignore extra submits while a request is in flight or when nothing changed.
    if (saving || !isDirty) return

    // Validate before touching the server.
    if (!isValidUaNational(phone)) {
      setFeedback({
        variant: "error",
        title: strings.profile.invalidPhoneTitle,
        message: strings.profile.invalidPhoneMessage,
      })
      return
    }

    setSaving(true)
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: composeUaPhone(phone) || null,
      })
      setOpen(false)
      setFeedback({
        variant: "success",
        title: strings.profile.savedTitle,
        message: strings.profile.savedMessage,
      })
    } catch (err) {
      setFeedback({
        variant: "error",
        title: strings.profile.saveErrorTitle,
        message: err instanceof Error ? err.message : strings.profile.saveErrorMessage,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="cabinet-profile">
      <div className="cabinet-profile__top">
        <div className="cabinet-profile__avatar" aria-hidden="true">
          {initialsStr}
        </div>
        <div className="cabinet-profile__identity">
          <h1 className="cabinet-profile__name">{fullName}</h1>
          {profile.createdAt && (
            <p className="cabinet-profile__since">
              {strings.profile.memberSince(memberSinceYear(profile.createdAt))}
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
          <span className="cabinet-profile__settings-text">{strings.profile.settings}</span>
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
              <span className="cabinet-field__label">{strings.profile.firstName}</span>
              <input
                className="cabinet-field__input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label className="cabinet-field">
              <span className="cabinet-field__label">{strings.profile.lastName}</span>
              <input
                className="cabinet-field__input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </label>
          </div>
          <label className="cabinet-field">
            <span className="cabinet-field__label">{strings.profile.phone}</span>
            <div className="cabinet-phone">
              <span className="cabinet-phone__prefix">{strings.profile.phonePrefix}</span>
              <input
                className="cabinet-phone__input"
                type="tel"
                inputMode="numeric"
                value={formatUaNational(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder={strings.profile.phonePlaceholder}
                autoComplete="tel-national"
              />
            </div>
          </label>
          <label className="cabinet-field">
            <span className="cabinet-field__label">{strings.profile.email}</span>
            <input
              className="cabinet-field__input cabinet-field__input--readonly"
              type="email"
              value={profile.email}
              readOnly
              disabled
              aria-describedby="cabinet-email-hint"
            />
            <span className="cabinet-field__hint" id="cabinet-email-hint">
              {strings.profile.emailHint}
            </span>
          </label>

          {/* UI only for MVP — not wired to the backend yet. */}
          <div className="cabinet-setting-row" aria-disabled="true">
            <LuCreditCard className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">{strings.profile.paymentMethods}</span>
            <span className="cabinet-setting-row__value">{strings.profile.noneAdded}</span>
          </div>

          <div className="cabinet-profile__actions">
            <button
              type="button"
              className="cabinet-profile__btn"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              {strings.profile.cancel}
            </button>
            <button
              type="submit"
              className="cabinet-profile__btn cabinet-profile__btn--primary"
              disabled={saving || !isDirty}
            >
              {saving ? strings.profile.saving : strings.profile.save}
            </button>
          </div>
        </form>
      )}

      {feedback && (
        <FeedbackDialog
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </Card>
  )
}
