import { useTranslation } from "react-i18next"

export function useAuthStrings() {
  const { t } = useTranslation()
  return {
    hero: {
      logoAlt: t("auth.hero.logoAlt"),
      subtitle: t("auth.hero.subtitle"),
    },
    socialAuth: {
      title: t("auth.socialAuth.title"),
      text: t("auth.socialAuth.text"),
      googleButton: t("auth.socialAuth.googleButton"),
      googleButtonLoading: t("auth.socialAuth.googleButtonLoading"),
      or: t("auth.socialAuth.or"),
    },
    guest: {
      button: t("auth.guest.button"),
      noteLine1: t("auth.guest.noteLine1"),
      noteLine2: t("auth.guest.noteLine2"),
    },
    footer: t("auth.footer"),
  } as const
}
