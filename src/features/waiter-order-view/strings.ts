import { useTranslation } from "react-i18next"
import type { VisualTableStatus } from "./types"

export function useWaiterStrings() {
  const { t, i18n } = useTranslation()

  return {
    locale: i18n.language,
    common: {
      close: t("admin.common.close"),
      cancel: t("admin.common.cancel"),
      save: t("admin.common.save"),
      saving: t("admin.common.saving"),
    },
    page: {
      loading: t("admin.waiter.page.loading"),
      loadError: t("admin.waiter.page.loadError"),
      cancelError: t("admin.waiter.page.cancelError"),
      tabs: {
        reservations: t("admin.waiter.page.tabs.reservations"),
        notifications: t("admin.waiter.page.tabs.notifications"),
      },
      notifications: {
        unread: (count: number) => t("admin.waiter.page.notifications.unread", { count }),
      },
    },
    topNav: {
      brandTitle: t("admin.waiter.topNav.brandTitle"),
      brandSubtitle: t("admin.waiter.topNav.brandSubtitle"),
      zonesAria: t("admin.waiter.topNav.zonesAria"),
      stats: {
        occupied: {
          label: t("admin.waiter.topNav.stats.occupied.label"),
          sr: t("admin.waiter.topNav.stats.occupied.sr"),
        },
        reserved: {
          label: t("admin.waiter.topNav.stats.reserved.label"),
          sr: t("admin.waiter.topNav.stats.reserved.sr"),
        },
        free: {
          label: t("admin.waiter.topNav.stats.free.label"),
          sr: t("admin.waiter.topNav.stats.free.sr"),
        },
      },
      timeLabel: t("admin.waiter.topNav.timeLabel"),
      connection: {
        connected: t("admin.waiter.topNav.connection.connected"),
        disconnected: t("admin.waiter.topNav.connection.disconnected"),
      },
      navLink: t("admin.waiter.topNav.navLink"),
    },
    floorPlan: {
      title: t("admin.waiter.floorPlan.title"),
      statusLabel: (status: VisualTableStatus) => t(`admin.waiter.floorPlan.status.${status}`),
      overdue: (minutes: number) => t("admin.waiter.floorPlan.overdue", { minutes }),
      reserved: {
        guestFallback: t("admin.waiter.floorPlan.reserved.guestFallback"),
        eta: (time: string) => t("admin.waiter.floorPlan.reserved.eta", { time }),
      },
      guestLabel: (slot: number) => t("admin.waiter.floorPlan.guestLabel", { slot }),
    },
    overlay: {
      title: (table: string) => t("admin.waiter.overlay.title", { table }),
      closeAria: t("admin.waiter.overlay.closeAria"),
      status: {
        reserved: t("admin.waiter.overlay.status.reserved"),
        current: t("admin.waiter.overlay.status.current"),
        capacity: t("admin.waiter.overlay.status.capacity"),
        details: t("admin.waiter.overlay.status.details"),
        nextBooking: t("admin.waiter.overlay.status.nextBooking"),
        next: t("admin.waiter.overlay.status.next"),
      },
      values: {
        upcoming: t("admin.waiter.overlay.values.upcoming"),
        available: t("admin.waiter.overlay.values.available"),
        none: t("admin.waiter.overlay.values.none"),
        guests: (count: number) => t("admin.waiter.overlay.values.guests", { count }),
      },
      overdue: {
        title: (minutes: number) => t("admin.waiter.overlay.overdue.title", { minutes }),
        message: t("admin.waiter.overlay.overdue.message"),
        prolong: t("admin.waiter.overlay.overdue.prolong"),
        close: t("admin.waiter.overlay.overdue.close"),
      },
      openPanel: {
        seatHint: t("admin.waiter.overlay.openPanel.seatHint"),
        guestLabel: t("admin.waiter.overlay.openPanel.guestLabel"),
        action: t("admin.waiter.overlay.openPanel.action"),
        busy: t("admin.waiter.overlay.openPanel.busy"),
      },
      tabs: {
        order: t("admin.waiter.overlay.tabs.order"),
        reservations: t("admin.waiter.overlay.tabs.reservations"),
      },
      actions: {
        addItem: t("admin.waiter.overlay.actions.addItem"),
        moveTable: t("admin.waiter.overlay.actions.moveTable"),
        closeCheck: t("admin.waiter.overlay.actions.closeCheck"),
        processPayment: t("admin.waiter.overlay.actions.processPayment"),
        markAllServed: t("admin.waiter.overlay.actions.markAllServed"),
        markAllVoided: t("admin.waiter.overlay.actions.markAllVoided"),
        bulkUpdateError: t("admin.waiter.overlay.actions.bulkUpdateError"),
        bulkVoidReason: t("admin.waiter.overlay.actions.bulkVoidReason"),
        selectVoidReason: t("admin.waiter.overlay.actions.selectVoidReason"),
        confirmBulkVoid: t("admin.waiter.overlay.actions.confirmBulkVoid"),
        cancel: t("admin.waiter.overlay.actions.cancel"),
      },
      empty: {
        order: t("admin.waiter.overlay.empty.order"),
        orderMissing: t("admin.waiter.overlay.empty.orderMissing"),
        reservations: t("admin.waiter.overlay.empty.reservations"),
      },
      guestSlot: (slot: number) => t("admin.waiter.overlay.guestSlot", { slot }),
      paidBadge: t("admin.waiter.overlay.paidBadge"),
      totals: {
        subtotal: t("admin.waiter.overlay.totals.subtotal"),
        tax: t("admin.waiter.overlay.totals.tax"),
        service: t("admin.waiter.overlay.totals.service"),
        total: t("admin.waiter.overlay.totals.total"),
        outstanding: t("admin.waiter.overlay.totals.outstanding"),
      },
      reservation: {
        tagSeated: t("admin.waiter.overlay.reservation.tagSeated"),
        seat: t("admin.waiter.overlay.reservation.seat"),
        modify: t("admin.waiter.overlay.reservation.modify"),
        cancel: t("admin.waiter.overlay.reservation.cancel"),
        new: t("admin.waiter.overlay.reservation.new"),
      },
      voidReasons: {
        mispick: t("admin.waiter.overlay.voidReasons.mispick"),
        guest_changed_mind: t("admin.waiter.overlay.voidReasons.guestChangedMind"),
        quality_issue: t("admin.waiter.overlay.voidReasons.qualityIssue"),
        out_of_stock: t("admin.waiter.overlay.voidReasons.outOfStock"),
      },
    },
    payModal: {
      title: t("admin.waiter.payModal.title"),
      empty: t("admin.waiter.payModal.empty"),
      selectAll: t("admin.waiter.payModal.selectAll"),
      selectedTotal: t("admin.waiter.payModal.selectedTotal"),
      pay: t("admin.waiter.payModal.pay"),
      paying: t("admin.waiter.payModal.paying"),
    },
    reservations: {
      sidebar: {
        title: t("admin.waiter.reservations.sidebar.title"),
        searchPlaceholder: t("admin.waiter.reservations.sidebar.searchPlaceholder"),
        guestCount: (count: number) => t("admin.waiter.reservations.sidebar.guestCount", { count }),
        status: {
          pending: t("admin.waiter.reservations.sidebar.status.pending"),
          active: t("admin.waiter.reservations.sidebar.status.active"),
          completed: t("admin.waiter.reservations.sidebar.status.completed"),
          cancelled: t("admin.waiter.reservations.sidebar.status.cancelled"),
          unknown: t("admin.waiter.reservations.sidebar.status.unknown"),
        },
        actions: {
          modify: t("admin.waiter.reservations.sidebar.actions.modify"),
          cancel: t("admin.waiter.reservations.sidebar.actions.cancel"),
        },
        confirm: {
          title: t("admin.waiter.reservations.sidebar.confirm.title"),
          message: t("admin.waiter.reservations.sidebar.confirm.message"),
          confirm: t("admin.waiter.reservations.sidebar.confirm.confirm"),
        },
      },
    },
    orderModal: {
      title: t("admin.waiter.orderModal.title"),
      searchPlaceholder: t("admin.waiter.orderModal.searchPlaceholder"),
      categories: {
        all: t("admin.waiter.orderModal.categories.all"),
      },
      loading: t("admin.waiter.orderModal.loading"),
      empty: t("admin.waiter.orderModal.empty"),
      summary: {
        title: t("admin.waiter.orderModal.summary.title"),
        empty: t("admin.waiter.orderModal.summary.empty"),
        total: t("admin.waiter.orderModal.summary.total"),
        submit: t("admin.waiter.orderModal.summary.submit"),
        submitting: t("admin.waiter.orderModal.summary.submitting"),
      },
      removeAria: t("admin.waiter.orderModal.removeAria"),
      guestOption: (slot: number) => t("admin.waiter.orderModal.guestOption", { slot }),
      commentPlaceholder: t("admin.waiter.orderModal.commentPlaceholder"),
    },
    closeCheck: {
      title: t("admin.waiter.closeCheck.title"),
      message: t("admin.waiter.closeCheck.message"),
      cancel: t("admin.waiter.closeCheck.cancel"),
      confirm: t("admin.waiter.closeCheck.confirm"),
      confirming: t("admin.waiter.closeCheck.confirming"),
      closeAria: t("admin.waiter.closeCheck.closeAria"),
    },
    modifyModal: {
      title: t("admin.waiter.modifyModal.title"),
      labels: {
        guest: t("admin.waiter.modifyModal.labels.guest"),
        table: t("admin.waiter.modifyModal.labels.table"),
        date: t("admin.waiter.modifyModal.labels.date"),
        time: t("admin.waiter.modifyModal.labels.time"),
        duration: t("admin.waiter.modifyModal.labels.duration"),
        guests: t("admin.waiter.modifyModal.labels.guests"),
        summary: t("admin.waiter.modifyModal.labels.summary"),
      },
      time: {
        startingFrom: (time: string) => t("admin.waiter.modifyModal.time.startingFrom", { time }),
        loading: t("admin.waiter.modifyModal.time.loading"),
        tableNotFound: t("admin.waiter.modifyModal.time.tableNotFound"),
        noSlots: t("admin.waiter.modifyModal.time.noSlots"),
        unavailable: (time: string) => t("admin.waiter.modifyModal.time.unavailable", { time }),
      },
      duration: {
        unit: t("admin.waiter.modifyModal.duration.unit"),
        error: t("admin.waiter.modifyModal.duration.error"),
      },
      summary: (start: string, end: string, minutes: number) =>
        t("admin.waiter.modifyModal.summary", { start, end, minutes }),
      buttons: {
        cancel: t("admin.waiter.modifyModal.buttons.cancel"),
        save: t("admin.waiter.modifyModal.buttons.save"),
        saving: t("admin.waiter.modifyModal.buttons.saving"),
      },
      errors: {
        generic: t("admin.waiter.modifyModal.errors.generic"),
      },
    },
    moveModal: {
      title: t("admin.waiter.moveModal.title"),
      summary: (name: string, table: string, guests: number) =>
        t("admin.waiter.moveModal.summary", { name, table, guests }),
      labels: {
        guest: t("admin.waiter.moveModal.labels.guest"),
        target: t("admin.waiter.moveModal.labels.target"),
      },
      targetPlaceholder: t("admin.waiter.moveModal.targetPlaceholder"),
      buttons: {
        cancel: t("admin.waiter.moveModal.buttons.cancel"),
        move: t("admin.waiter.moveModal.buttons.move"),
        moving: t("admin.waiter.moveModal.buttons.moving"),
      },
      errors: {
        generic: t("admin.waiter.moveModal.errors.generic"),
      },
    },
    actions: {
      openTable: t("admin.waiter.actions.openTable"),
      activateReservation: t("admin.waiter.actions.activateReservation"),
      closeCheck: t("admin.waiter.actions.closeCheck"),
      processPayment: t("admin.waiter.actions.processPayment"),
    },
  }
}
