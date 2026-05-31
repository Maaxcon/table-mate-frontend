import { useState } from "react"
import { LuChevronRight, LuCreditCard, LuMail, LuPhone, LuSettings, LuUser } from "react-icons/lu"
import Card from "@/components/Card"
import type { CabinetProfile } from "../../types"
import { memberSinceYear } from "../../utils"
import "./ProfileHeader.css"

type ProfileHeaderProps = {
  profile: CabinetProfile
}

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?"
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  // Settings are UI-only for the MVP. They open a simple panel; no save yet.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email

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
          aria-expanded={settingsOpen}
          aria-controls="cabinet-settings"
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <LuSettings aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>

      {settingsOpen && (
        <div className="cabinet-profile__settings" id="cabinet-settings">
          {/* UI only for MVP — editing is not wired to the backend yet. */}
          <button type="button" className="cabinet-setting-row" disabled>
            <LuUser className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">Name</span>
            <span className="cabinet-setting-row__value">{fullName}</span>
            <LuChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="cabinet-setting-row" disabled>
            <LuPhone className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">Phone</span>
            <span className="cabinet-setting-row__value">{profile.phone ?? "Not set"}</span>
            <LuChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="cabinet-setting-row" disabled>
            <LuMail className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">Email</span>
            <span className="cabinet-setting-row__value">{profile.email}</span>
            <LuChevronRight aria-hidden="true" />
          </button>
          <button type="button" className="cabinet-setting-row" disabled>
            <LuCreditCard className="cabinet-setting-row__icon" aria-hidden="true" />
            <span className="cabinet-setting-row__label">Payment methods</span>
            <span className="cabinet-setting-row__value">None added</span>
            <LuChevronRight aria-hidden="true" />
          </button>
          <p className="cabinet-profile__settings-note">Editing is coming soon.</p>
        </div>
      )}
    </Card>
  )
}
