import { useTranslation } from "react-i18next"

export function useBookStrings() {
  const { t } = useTranslation()

  return {
    pageTitle: t("reservation.pageTitle"),
    backToMenu: t("reservation.backToMenu"),
    tabs: {
      floor: t("reservation.tabs.floor"),
      bookings: t("reservation.tabs.bookings"),
    },
    loading: t("reservation.loading"),
    retry: t("reservation.retry"),
    loginCta: {
      text: t("reservation.loginCta.text"),
      login: t("reservation.loginCta.login"),
      cancel: t("reservation.loginCta.cancel"),
    },
    errors: {
      floor: t("reservation.errors.floor"),
      bookings: t("reservation.errors.bookings"),
    },
    floorPlan: {
      title: t("reservation.floorPlan.title"),
      status: {
        free: t("reservation.floorPlan.status.free"),
        reserved: t("reservation.floorPlan.status.reserved"),
        occupied: t("reservation.floorPlan.status.occupied"),
      },
      seats: (n: number) => t("reservation.floorPlan.seats", { count: n }),
      tableShort: t("reservation.floorPlan.tableShort"),
      choose: t("reservation.floorPlan.choose"),
      tableAria: (number_: string | number, capacity: number, status: string) =>
        t("reservation.floorPlan.tableAria", {
          number: String(number_),
          seats: t("reservation.floorPlan.seats", { count: capacity }),
          status,
        }),
      filterAll: t("reservation.floorPlan.filterAll"),
      filterFree: t("reservation.floorPlan.filterFree"),
      noFree: t("reservation.floorPlan.noFree"),
      noTables: t("reservation.floorPlan.noTables"),
      showAll: t("reservation.floorPlan.showAll"),
      statusSmall: t("reservation.floorPlan.statusSmall"),
      freeCount: (time?: string | null) =>
        time
          ? t("reservation.floorPlan.freeCount", { time })
          : t("reservation.floorPlan.freeCountDefault"),
      perfectFit: (guests: number) => t("reservation.floorPlan.perfectFit", { guests }),
      zoomIn: t("reservation.floorPlan.zoomIn"),
      zoomOut: t("reservation.floorPlan.zoomOut"),
      zoomFit: t("reservation.floorPlan.zoomFit"),
      showMap: t("reservation.floorPlan.showMap"),
      closeMap: t("reservation.floorPlan.closeMap"),
      freeShort: t("reservation.floorPlan.freeShort"),
      slot: {
        title: t("reservation.floorPlan.slot.title"),
        hint: t("reservation.floorPlan.slot.hint"),
        date: t("reservation.floorPlan.slot.date"),
        time: t("reservation.floorPlan.slot.time"),
        guests: t("reservation.floorPlan.slot.guests"),
        noTimes: t("reservation.floorPlan.slot.noTimes"),
        today: t("reservation.floorPlan.slot.today"),
      },
    },
    modal: {
      title: (table: string) => t("reservation.modal.title", { table }),
      confirmedTitle: t("reservation.modal.confirmedTitle"),
      today: t("reservation.modal.today"),
      sections: {
        date: t("reservation.modal.sections.date"),
        time: t("reservation.modal.sections.time"),
        table: t("reservation.modal.sections.table"),
        contacts: t("reservation.modal.sections.contacts"),
        duration: t("reservation.modal.sections.duration"),
        guests: t("reservation.modal.sections.guests"),
        guestName: t("reservation.modal.sections.guestName"),
        notes: t("reservation.modal.sections.notes"),
        confirmation: t("reservation.modal.sections.confirmation"),
      },
      flow: {
        steps: t("reservation.modal.flow.steps", { returnObjects: true }) as string[],
        stepLabel: (current: number, total: number) =>
          t("reservation.modal.flow.stepLabel", { current, total }),
        back: t("reservation.modal.flow.back"),
        next: t("reservation.modal.flow.next"),
        profileHint: t("reservation.modal.flow.profileHint"),
        notesHint: t("reservation.modal.flow.notesHint"),
        notesFallback: t("reservation.modal.flow.notesFallback"),
      },
      tzNote: (tz: string) => t("reservation.modal.tzNote", { tz }),
      slots: {
        loading: t("reservation.modal.slots.loading"),
        closed: t("reservation.modal.slots.closed"),
        none: t("reservation.modal.slots.none"),
      },
      guestNamePlaceholder: t("reservation.modal.guestNamePlaceholder"),
      notesPlaceholder: t("reservation.modal.notesPlaceholder"),
      summary: {
        table: t("reservation.modal.summary.table"),
        date: t("reservation.modal.summary.date"),
        time: t("reservation.modal.summary.time"),
        duration: t("reservation.modal.summary.duration"),
        guests: t("reservation.modal.summary.guests"),
      },
      durationUnit: t("reservation.modal.durationUnit"),
      success: (table: string) => t("reservation.modal.success", { table }),
      ticket: {
        label: t("reservation.modal.ticket.label"),
        tableLabel: t("reservation.modal.ticket.tableLabel"),
        reservationNumber: t("reservation.modal.ticket.reservationNumber"),
        addToCalendar: t("reservation.modal.ticket.addToCalendar"),
        share: t("reservation.modal.ticket.share"),
        shareCopied: t("reservation.modal.ticket.shareCopied"),
        shareUnsupported: t("reservation.modal.ticket.shareUnsupported"),
        done: t("reservation.modal.ticket.done"),
      },
      actions: {
        ok: t("reservation.modal.actions.ok"),
        cancel: t("reservation.modal.actions.cancel"),
        confirm: t("reservation.modal.actions.confirm"),
        submitting: t("reservation.modal.actions.submitting"),
      },
      validation: {
        closingExceeded: (close: string) =>
          t("reservation.modal.validation.closingExceeded", { close }),
        durationUnavailable: t("reservation.modal.validation.durationUnavailable"),
        guestNameRequired: t("reservation.modal.validation.guestNameRequired"),
      },
      createFailed: t("reservation.modal.createFailed"),
    },
    myBookings: {
      title: t("reservation.myBookings.title"),
      empty: t("reservation.myBookings.empty"),
      emptyCta: t("reservation.myBookings.emptyCta"),
      tzNote: (tz: string) => t("reservation.myBookings.tzNote", { tz }),
      pastShow: (n: number) => t("reservation.myBookings.pastShow", { count: n }),
      pastHide: t("reservation.myBookings.pastHide"),
      cancelFailed: t("reservation.myBookings.cancelFailed"),
      status: {
        pending: t("reservation.myBookings.status.pending"),
        active: t("reservation.myBookings.status.active"),
        completed: t("reservation.myBookings.status.completed"),
        cancelled: t("reservation.myBookings.status.cancelled"),
      },
      phase: {
        upcoming: t("reservation.myBookings.phase.upcoming"),
        in_progress: t("reservation.myBookings.phase.in_progress"),
        past: t("reservation.myBookings.phase.past"),
      },
      card: {
        table: (table: string) => t("reservation.myBookings.card.table", { table }),
      },
      actions: {
        modify: t("reservation.myBookings.actions.modify"),
        cancel: t("reservation.myBookings.actions.cancel"),
        cancelling: t("reservation.myBookings.actions.cancelling"),
      },
    },
    reschedule: {
      title: (table: string) => t("reservation.reschedule.title", { table }),
      updatedTitle: t("reservation.reschedule.updatedTitle"),
      updatedText: (table: string) => t("reservation.reschedule.updatedText", { table }),
      sections: {
        date: t("reservation.reschedule.sections.date"),
        time: t("reservation.reschedule.sections.time"),
        duration: t("reservation.reschedule.sections.duration"),
        guests: t("reservation.reschedule.sections.guests"),
        summary: t("reservation.reschedule.sections.summary"),
      },
      startingFrom: (time: string) => t("reservation.reschedule.startingFrom", { time }),
      actions: {
        cancel: t("reservation.reschedule.actions.cancel"),
        save: t("reservation.reschedule.actions.save"),
        saving: t("reservation.reschedule.actions.saving"),
      },
      modifyFailed: t("reservation.reschedule.modifyFailed"),
    },
    cancel: {
      title: t("reservation.cancel.title"),
      message: t("reservation.cancel.message"),
      close: t("reservation.cancel.close"),
      keep: t("reservation.cancel.keep"),
      confirm: t("reservation.cancel.confirm"),
      submitting: t("reservation.cancel.submitting"),
    },
  } as const
}
