import { useTranslation } from "react-i18next"

export function useAdminStrings() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith("uk") ? "uk-UA" : "en-US"

  const raw = (key: string, options?: Record<string, unknown>) => t(`admin.${key}`, options)

  const floorEntityLabels = {
    tableSquare: t("admin.floor.entities.tableSquare"),
    tableRound: t("admin.floor.entities.tableRound"),
    obstacle: t("admin.floor.entities.obstacle"),
    threshold: t("admin.floor.entities.threshold"),
    portal: t("admin.floor.entities.portal"),
  }

  const floorTableTags = [
    { value: "window-seat", label: t("admin.floor.sidebar.entity.table.tags.windowSeat") },
    { value: "quiet", label: t("admin.floor.sidebar.entity.table.tags.quiet") },
    {
      value: "wheelchair-accessible",
      label: t("admin.floor.sidebar.entity.table.tags.wheelchairAccessible"),
    },
  ] as const

  const floorShortcuts = [
    t("admin.floor.sidebar.zone.shortcuts.copy"),
    t("admin.floor.sidebar.zone.shortcuts.paste"),
    t("admin.floor.sidebar.zone.shortcuts.delete"),
    t("admin.floor.sidebar.zone.shortcuts.undo"),
  ]

  const formatSchedulerSummary = (changeCount: number, cancellationCount: number) => {
    const parts: string[] = []
    if (changeCount > 0) {
      parts.push(t("admin.scheduler.saveBar.changes", { count: changeCount }))
    }
    if (cancellationCount > 0) {
      parts.push(t("admin.scheduler.saveBar.cancellations", { count: cancellationCount }))
    }
    if (parts.length === 0) return ""
    return `${parts.join(", ")} ${t("admin.scheduler.saveBar.unsaved")}`
  }

  const schedulerBlockStatusLabels: Record<string, string> = {
    pending: t("admin.scheduler.block.status.pending"),
    active: t("admin.scheduler.block.status.active"),
    completed: t("admin.scheduler.block.status.completed"),
    cancelled: t("admin.scheduler.block.status.cancelled"),
  }

  const schedulerStrings = {
    locale,
    empty: {
      noRestaurant: t("admin.scheduler.empty.noRestaurant"),
    },
    toolbar: {
      today: t("admin.scheduler.toolbar.today"),
      singleView: t("admin.scheduler.toolbar.single"),
      splitView: t("admin.scheduler.toolbar.split"),
    },
    stale: {
      text: t("admin.scheduler.stale.text"),
      discard: t("admin.scheduler.stale.discard"),
      continue: t("admin.scheduler.stale.continue"),
    },
    loading: t("admin.scheduler.loading"),
    errors: {
      loadData: t("admin.scheduler.errors.load"),
    },
    saveBar: {
      summary: formatSchedulerSummary,
      reset: t("admin.scheduler.saveBar.reset"),
      save: t("admin.scheduler.saveBar.save"),
      saving: t("admin.scheduler.saveBar.saving"),
    },
    confirm: {
      nav: {
        title: t("admin.scheduler.confirm.nav.title"),
        message: t("admin.scheduler.confirm.nav.message"),
        confirm: t("admin.scheduler.confirm.nav.confirm"),
        cancel: t("admin.scheduler.confirm.nav.cancel"),
      },
      active: {
        title: t("admin.scheduler.confirm.active.title"),
        message: (name: string, table: string) =>
          t("admin.scheduler.confirm.active.message", { name, table }),
        confirm: t("admin.scheduler.confirm.active.confirm"),
        cancel: t("admin.scheduler.confirm.active.cancel"),
      },
    },
    cancelZone: {
      ariaCancel: t("admin.scheduler.cancelZone.ariaCancel"),
      ariaUndo: t("admin.scheduler.cancelZone.ariaUndo"),
      labelCancel: t("admin.scheduler.cancelZone.cancel"),
      labelUndo: t("admin.scheduler.cancelZone.undo"),
    },
    dayNav: {
      prev: t("admin.scheduler.dayNav.prev"),
      next: t("admin.scheduler.dayNav.next"),
    },
    table: {
      capacity: (count: number) => t("admin.scheduler.table.capacity", { count }),
    },
    block: {
      guests: (count: number) => t("admin.scheduler.block.guests", { count }),
      duration: (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0 && mins > 0) {
          return t("admin.scheduler.block.duration.hoursMinutes", {
            hours,
            minutes: mins,
          })
        }
        if (hours > 0) {
          return t("admin.scheduler.block.duration.hours", { count: hours })
        }
        return t("admin.scheduler.block.duration.minutes", { count: mins })
      },
      meta: (guests: string, duration: string) =>
        t("admin.scheduler.block.meta", { guests, duration }),
      cancelBadge: t("admin.scheduler.block.cancelled"),
      resizeStart: t("admin.scheduler.block.resizeStart"),
      resizeEnd: t("admin.scheduler.block.resizeEnd"),
      aria: (options: {
        name: string
        guests: string
        status: string
        conflict: boolean
        modified: boolean
        cancelling: boolean
      }) => {
        const base = t("admin.scheduler.block.aria.base", {
          name: options.name,
          guests: options.guests,
          status: schedulerBlockStatusLabels[options.status] ?? options.status,
        })
        const extras = [
          options.conflict ? t("admin.scheduler.block.aria.conflict") : "",
          options.modified ? t("admin.scheduler.block.aria.modified") : "",
          options.cancelling ? t("admin.scheduler.block.aria.cancelling") : "",
        ].filter(Boolean)
        return `${base}${extras.join("")}`
      },
      statusLabel: (status: string) => schedulerBlockStatusLabels[status] ?? status,
    },
    dragOverlay: {
      meta: (guests: string, time: string) => t("admin.scheduler.drag.meta", { guests, time }),
    },
    toasts: {
      conflict: {
        generic: t("admin.scheduler.toast.conflict.generic"),
        overlap: t("admin.scheduler.toast.conflict.overlap"),
        beforeSeated: t("admin.scheduler.toast.conflict.beforeSeated"),
        pastDate: t("admin.scheduler.toast.conflict.pastDate"),
        pastTime: t("admin.scheduler.toast.conflict.pastTime"),
        activeDifferentDate: t("admin.scheduler.toast.conflict.activeDifferentDate"),
        beforeOpening: t("admin.scheduler.toast.conflict.beforeOpening"),
        afterClosing: t("admin.scheduler.toast.conflict.afterClosing"),
        closedDay: t("admin.scheduler.toast.conflict.closedDay"),
      },
      saveSuccess: t("admin.scheduler.toast.saveSuccess"),
      saveFailed: t("admin.scheduler.toast.saveFailed"),
    },
  }

  return {
    locale,
    raw,
    common: {
      loading: t("admin.common.loading"),
      error: t("admin.common.error"),
      save: t("admin.common.save"),
      saving: t("admin.common.saving"),
      cancel: t("admin.common.cancel"),
      add: t("admin.common.add"),
      confirm: t("admin.common.confirm"),
      close: t("admin.common.close"),
      search: t("admin.common.search"),
      connected: t("admin.common.connected"),
      disconnected: t("admin.common.disconnected"),
    },
    layout: {
      brand: t("admin.layout.brand"),
      collapseExpand: t("admin.layout.collapse.expand"),
      collapseCollapse: t("admin.layout.collapse.collapse"),
      collapseAuto: t("admin.layout.collapse.auto"),
      nav: {
        overview: t("admin.layout.nav.overview"),
        restaurant: t("admin.layout.nav.restaurant"),
        settings: t("admin.layout.nav.settings"),
        staff: t("admin.layout.nav.staff"),
        menu: t("admin.layout.nav.menu"),
        scheduler: t("admin.layout.nav.scheduler"),
        floorPlan: t("admin.layout.nav.floorPlan"),
        kitchen: t("admin.layout.nav.kitchen"),
        floor: t("admin.layout.nav.floor"),
      },
      logoutAria: t("admin.layout.logout.aria"),
      logoutError: t("admin.layout.logout.error"),
      unsaved: {
        title: t("admin.layout.unsaved.title"),
        message: t("admin.layout.unsaved.message"),
        confirm: t("admin.layout.unsaved.confirm"),
      },
    },
    scheduler: schedulerStrings,
    overview: {
      title: (name?: string | null) =>
        name && name.trim().length > 0
          ? t("admin.overview.titleGreeting", { name: name.trim() })
          : t("admin.overview.titleFallback"),
      status: {
        open: t("admin.overview.status.open"),
        closed: t("admin.overview.status.closed"),
      },
      viewRestaurant: t("admin.overview.viewRestaurant"),
      description: t("admin.overview.description"),
      error: t("admin.overview.error"),
      stats: {
        menus: {
          label: t("admin.overview.stats.menus.label"),
          sub: (total: number) => t("admin.overview.stats.menus.sub", { total }),
        },
        dishes: {
          label: t("admin.overview.stats.dishes.label"),
          sub: (visible: number, hidden: number) =>
            t("admin.overview.stats.dishes.sub", { visible, hidden }),
        },
        categories: {
          label: t("admin.overview.stats.categories.label"),
          sub: t("admin.overview.stats.categories.sub"),
        },
        staff: {
          label: t("admin.overview.stats.staff.label"),
          sub: (total: number) => t("admin.overview.stats.staff.sub", { total }),
        },
      },
      needsAttention: {
        title: t("admin.overview.needsAttention.title"),
        empty: t("admin.overview.needsAttention.empty"),
        fix: t("admin.overview.needsAttention.fix"),
      },
      insights: {
        title: t("admin.overview.insights.title"),
        categoriesTitle: t("admin.overview.insights.categories.title"),
        categoriesEmpty: t("admin.overview.insights.categories.empty"),
        priceTitle: t("admin.overview.insights.price.title"),
        priceEmpty: t("admin.overview.insights.price.empty"),
        likesTitle: t("admin.overview.insights.likes.title"),
        likesEmpty: t("admin.overview.insights.likes.empty"),
      },
      actions: {
        title: t("admin.overview.actions.title"),
        addDish: {
          label: t("admin.overview.actions.addDish.label"),
          desc: t("admin.overview.actions.addDish.desc"),
        },
        manageMenu: {
          label: t("admin.overview.actions.manageMenu.label"),
          desc: t("admin.overview.actions.manageMenu.desc"),
        },
        manageStaff: {
          label: t("admin.overview.actions.manageStaff.label"),
          desc: t("admin.overview.actions.manageStaff.desc"),
        },
        settings: {
          label: t("admin.overview.actions.settings.label"),
          desc: t("admin.overview.actions.settings.desc"),
        },
      },
    },
    settings: {
      title: t("admin.settings.title"),
      description: t("admin.settings.description"),
      rateErrors: {
        required: t("admin.settings.rateErrors.required"),
        number: t("admin.settings.rateErrors.number"),
        range: t("admin.settings.rateErrors.range"),
      },
      fields: {
        tax: {
          label: t("admin.settings.fields.tax.label"),
          hint: t("admin.settings.fields.tax.hint"),
        },
        service: {
          label: t("admin.settings.fields.service.label"),
          hint: t("admin.settings.fields.service.hint"),
        },
        currency: {
          label: t("admin.settings.fields.currency.label"),
          hint: (example: string) => t("admin.settings.fields.currency.hint", { example }),
        },
        locale: {
          label: t("admin.settings.fields.locale.label"),
        },
        timezone: {
          label: t("admin.settings.fields.timezone.label"),
        },
      },
    },
    forms: {
      saved: t("admin.forms.saved"),
      saveFailed: t("admin.forms.saveFailed"),
      discard: {
        title: t("admin.forms.discard.title"),
        message: t("admin.forms.discard.message"),
        confirm: t("admin.forms.discard.confirm"),
      },
    },
    staff: {
      title: t("admin.staff.title"),
      description: t("admin.staff.description"),
      add: t("admin.staff.add"),
      empty: t("admin.staff.empty"),
      searchPlaceholder: t("admin.staff.searchPlaceholder"),
      searchAria: t("admin.staff.searchAria"),
      emptyQuery: (query: string) => t("admin.staff.emptyQuery", { query }),
      table: {
        name: t("admin.staff.table.name"),
        email: t("admin.staff.table.email"),
        role: t("admin.staff.table.role"),
      },
    },
    restaurant: {
      title: t("admin.restaurant.title"),
      description: t("admin.restaurant.description"),
      fields: {
        name: t("admin.restaurant.fields.name"),
        address: t("admin.restaurant.fields.address"),
        phone: t("admin.restaurant.fields.phone"),
        phonePlaceholder: t("admin.restaurant.fields.phonePlaceholder"),
        telegram: t("admin.restaurant.fields.telegram"),
        telegramPlaceholder: t("admin.restaurant.fields.telegramPlaceholder"),
        facebook: t("admin.restaurant.fields.facebook"),
        facebookPlaceholder: t("admin.restaurant.fields.facebookPlaceholder"),
      },
    },
    restaurantCover: {
      label: t("admin.restaurantCover.label"),
      empty: t("admin.restaurantCover.empty"),
      uploading: t("admin.restaurantCover.uploading"),
      alt: t("admin.restaurantCover.alt"),
      change: t("admin.restaurantCover.change"),
      upload: t("admin.restaurantCover.upload"),
      remove: t("admin.restaurantCover.remove"),
      toasts: {
        updated: t("admin.restaurantCover.toasts.updated"),
        removed: t("admin.restaurantCover.toasts.removed"),
        uploadError: t("admin.restaurantCover.toasts.uploadError"),
        removeError: t("admin.restaurantCover.toasts.removeError"),
      },
    },
    menu: {
      title: t("admin.menu.title"),
      description: t("admin.menu.description"),
      view: t("admin.menu.view"),
      addMenu: t("admin.menu.addMenu"),
      hiddenBadge: t("admin.menu.hiddenBadge"),
      empty: t("admin.menu.empty"),
      categoriesTitle: t("admin.menu.categoriesTitle"),
      categoriesEmpty: t("admin.menu.categoriesEmpty"),
      namePlaceholder: t("admin.menu.namePlaceholder"),
      toastAdded: t("admin.menu.toastAdded"),
      createError: t("admin.menu.createError"),
      adding: t("admin.menu.adding"),
      categories: {
        newPlaceholder: t("admin.menu.categories.newPlaceholder"),
        nameAria: t("admin.menu.categories.nameAria"),
        dragAria: (name: string) => t("admin.menu.categories.dragAria", { name }),
        color: {
          change: t("admin.menu.categories.color.change"),
          set: t("admin.menu.categories.color.set"),
          clear: t("admin.menu.categories.color.clear"),
        },
        buttons: {
          add: t("admin.menu.categories.buttons.add"),
          save: t("admin.menu.categories.buttons.save"),
        },
        deleteAria: t("admin.menu.categories.deleteAria"),
        confirmDelete: {
          title: t("admin.menu.categories.confirmDelete.title"),
          message: (name: string) => t("admin.menu.categories.confirmDelete.message", { name }),
          confirm: t("admin.menu.categories.confirmDelete.confirm"),
        },
        toasts: {
          updated: t("admin.menu.categories.toasts.updated"),
          deleted: t("admin.menu.categories.toasts.deleted"),
          added: t("admin.menu.categories.toasts.added"),
          addError: t("admin.menu.categories.toasts.addError"),
          actionError: t("admin.menu.categories.toasts.actionError"),
        },
      },
      dishes: {
        title: t("admin.menu.dishes.title"),
        add: t("admin.menu.dishes.add"),
        empty: t("admin.menu.dishes.empty"),
        searchPlaceholder: t("admin.menu.dishes.searchPlaceholder"),
        searchAria: t("admin.menu.dishes.searchAria"),
        sortAria: t("admin.menu.dishes.sortAria"),
        sort: {
          manual: t("admin.menu.dishes.sort.manual"),
          name: t("admin.menu.dishes.sort.name"),
          priceAsc: t("admin.menu.dishes.sort.priceAsc"),
          priceDesc: t("admin.menu.dishes.sort.priceDesc"),
        },
        emptyQuery: (query: string) => t("admin.menu.dishes.emptyQuery", { query }),
        groupUncategorized: t("admin.menu.dishes.groupUncategorized"),
        dragHere: t("admin.menu.dishes.dragHere"),
        bulk: {
          selectAll: t("admin.menu.dishes.bulk.selectAll"),
          selected: (count: number) => t("admin.menu.dishes.bulk.selected", { count }),
          show: t("admin.menu.dishes.bulk.show"),
          hide: t("admin.menu.dishes.bulk.hide"),
          moveAria: t("admin.menu.dishes.bulk.moveAria"),
          moveLabel: t("admin.menu.dishes.bulk.moveLabel"),
          noCategory: t("admin.menu.dishes.bulk.noCategory"),
          delete: t("admin.menu.dishes.bulk.delete"),
          clear: t("admin.menu.dishes.bulk.clear"),
        },
        confirmDelete: {
          title: t("admin.menu.dishes.confirmDelete.title"),
          message: (count: number) => t("admin.menu.dishes.confirmDelete.message", { count }),
          confirm: t("admin.menu.dishes.confirmDelete.confirm"),
        },
      },
      dishCard: {
        noPhoto: t("admin.menu.dishCard.noPhoto"),
        selectAria: (name: string) => t("admin.menu.dishCard.selectAria", { name }),
        dragAria: (name: string) => t("admin.menu.dishCard.dragAria", { name }),
        hideAria: (name: string) => t("admin.menu.dishCard.hideAria", { name }),
        showAria: (name: string) => t("admin.menu.dishCard.showAria", { name }),
        availableTitle: t("admin.menu.dishCard.availableTitle"),
        hiddenTitle: t("admin.menu.dishCard.hiddenTitle"),
        available: t("admin.menu.dishCard.available"),
        hidden: t("admin.menu.dishCard.hidden"),
        weight: (grams: number) => t("admin.menu.dishCard.weight", { grams }),
        allergens: (list: string) => t("admin.menu.dishCard.allergensPrefix", { list }),
      },
      dishModal: {
        title: (editing: boolean) =>
          editing ? t("admin.menu.dishModal.titleEdit") : t("admin.menu.dishModal.titleAdd"),
        aria: t("admin.menu.dishModal.aria"),
        fields: {
          name: t("admin.menu.dishModal.fields.name"),
          description: t("admin.menu.dishModal.fields.description"),
          price: t("admin.menu.dishModal.fields.price"),
          weight: t("admin.menu.dishModal.fields.weight"),
          weightPlaceholder: t("admin.menu.dishModal.fields.weightPlaceholder"),
          category: t("admin.menu.dishModal.fields.category"),
          noCategory: t("admin.menu.dishModal.fields.noCategory"),
          available: t("admin.menu.dishModal.fields.available"),
        },
        validation: {
          priceRequired: t("admin.menu.dishModal.validation.priceRequired"),
          number: t("admin.menu.dishModal.validation.number"),
          pricePositive: t("admin.menu.dishModal.validation.pricePositive"),
          weightPositive: t("admin.menu.dishModal.validation.weightPositive"),
        },
        buttons: {
          save: t("admin.menu.dishModal.buttons.save"),
          saving: t("admin.menu.dishModal.buttons.saving"),
          duplicate: t("admin.menu.dishModal.buttons.duplicate"),
          duplicating: t("admin.menu.dishModal.buttons.duplicating"),
          delete: t("admin.menu.dishModal.buttons.delete"),
          deleting: t("admin.menu.dishModal.buttons.deleting"),
        },
        toasts: {
          added: t("admin.menu.dishModal.toasts.added"),
          updated: t("admin.menu.dishModal.toasts.updated"),
          duplicated: t("admin.menu.dishModal.toasts.duplicated"),
          deleted: t("admin.menu.dishModal.toasts.deleted"),
          saveError: t("admin.menu.dishModal.toasts.saveError"),
          duplicateError: t("admin.menu.dishModal.toasts.duplicateError"),
          deleteError: t("admin.menu.dishModal.toasts.deleteError"),
        },
        confirmDelete: {
          title: t("admin.menu.dishModal.confirmDelete.title"),
          message: (name: string) => t("admin.menu.dishModal.confirmDelete.message", { name }),
          confirm: t("admin.menu.dishModal.confirmDelete.confirm"),
        },
      },
      dishPhoto: {
        add: t("admin.menu.dishPhoto.add"),
        change: t("admin.menu.dishPhoto.change"),
        remove: t("admin.menu.dishPhoto.remove"),
        uploading: t("admin.menu.dishPhoto.uploading"),
      },
      ingredients: {
        label: t("admin.menu.ingredients.label"),
        placeholder: t("admin.menu.ingredients.placeholder"),
        add: t("admin.menu.ingredients.add"),
        remove: (item: string) => t("admin.menu.ingredients.remove", { item }),
      },
      allergens: {
        label: t("admin.menu.allergens.label"),
        placeholder: t("admin.menu.allergens.placeholder"),
        remove: (item: string) => t("admin.menu.allergens.remove", { item }),
      },
      toolbar: {
        rename: t("admin.menu.toolbar.rename"),
        show: t("admin.menu.toolbar.show"),
        hide: t("admin.menu.toolbar.hide"),
        deleteAria: t("admin.menu.toolbar.deleteAria"),
        renameTitle: t("admin.menu.toolbar.renameTitle"),
        nameLabel: t("admin.menu.toolbar.nameLabel"),
        cancel: t("admin.menu.toolbar.cancel"),
        save: t("admin.menu.toolbar.save"),
        confirmDelete: {
          title: t("admin.menu.toolbar.confirmDelete.title"),
          message: (name: string) => t("admin.menu.toolbar.confirmDelete.message", { name }),
          confirm: t("admin.menu.toolbar.confirmDelete.confirm"),
        },
        confirmHide: {
          title: t("admin.menu.toolbar.confirmHide.title"),
          message: (name: string) => t("admin.menu.toolbar.confirmHide.message", { name }),
          confirm: t("admin.menu.toolbar.confirmHide.confirm"),
        },
        toasts: {
          renamed: t("admin.menu.toolbar.toasts.renamed"),
          shown: t("admin.menu.toolbar.toasts.shown"),
          hidden: t("admin.menu.toolbar.toasts.hidden"),
          deleted: t("admin.menu.toolbar.toasts.deleted"),
          actionError: t("admin.menu.toolbar.toasts.actionError"),
        },
      },
    },
    toast: {
      regionLabel: t("admin.toast.regionLabel"),
      dismiss: t("admin.toast.dismiss"),
    },
    workingHours: {
      label: t("admin.workingHours.label"),
      closed: t("admin.workingHours.closed"),
      error: t("admin.workingHours.error"),
      info: t("admin.workingHours.info"),
      weekdays: {
        mon: t("admin.workingHours.weekdays.mon"),
        tue: t("admin.workingHours.weekdays.tue"),
        wed: t("admin.workingHours.weekdays.wed"),
        thu: t("admin.workingHours.weekdays.thu"),
        fri: t("admin.workingHours.weekdays.fri"),
        sat: t("admin.workingHours.weekdays.sat"),
        sun: t("admin.workingHours.weekdays.sun"),
      },
      openAria: (day: string) => t("admin.workingHours.openAria", { day }),
      closeAria: (day: string) => t("admin.workingHours.closeAria", { day }),
    },
    kitchen: {
      header: {
        brand: t("admin.kitchen.header.brand"),
        stationLabel: t("admin.kitchen.header.stationLabel"),
        stationValue: t("admin.kitchen.header.stationValue"),
        localTime: t("admin.kitchen.header.localTime"),
        floorLink: t("admin.kitchen.header.floorLink"),
      },
      footer: {
        incoming: t("admin.kitchen.footer.incoming"),
        active: t("admin.kitchen.footer.active"),
        completed: t("admin.kitchen.footer.completed"),
        prepTime: t("admin.kitchen.footer.prepTime"),
      },
      incoming: {
        title: t("admin.kitchen.incoming.title"),
        empty: t("admin.kitchen.incoming.empty"),
        acceptHint: t("admin.kitchen.incoming.acceptHint"),
        readOnlyHint: t("admin.kitchen.incoming.readOnlyHint"),
      },
      active: {
        title: t("admin.kitchen.active.title"),
        subtitle: t("admin.kitchen.active.subtitle"),
        empty: t("admin.kitchen.active.empty"),
        completeAria: t("admin.kitchen.active.completeAria"),
        bump: t("admin.kitchen.active.bump"),
        guestPrefix: t("admin.kitchen.active.guestPrefix"),
        serverPrefix: t("admin.kitchen.active.serverPrefix"),
      },
      batch: {
        title: t("admin.kitchen.batch.title"),
        empty: t("admin.kitchen.batch.empty"),
      },
      completed: {
        title: t("admin.kitchen.completed.title"),
        empty: t("admin.kitchen.completed.empty"),
        aria: t("admin.kitchen.completed.aria"),
      },
      notifications: {
        title: t("admin.kitchen.notifications.title"),
        markAll: t("admin.kitchen.notifications.markAll"),
        empty: t("admin.kitchen.notifications.empty"),
        unread: t("admin.kitchen.notifications.unread"),
        read: t("admin.kitchen.notifications.read"),
        new: t("admin.kitchen.notifications.new"),
      },
      page: {
        loadError: t("admin.kitchen.page.loadError"),
        loading: t("admin.kitchen.page.loading"),
        mutations: {
          update: t("admin.kitchen.page.mutations.update"),
          bump: t("admin.kitchen.page.mutations.bump"),
          accept: t("admin.kitchen.page.mutations.accept"),
        },
      },
    },
    floor: {
      entities: floorEntityLabels,
      page: {
        brandTitle: t("admin.floor.page.brandTitle"),
        brandSubtitle: t("admin.floor.page.brandSubtitle"),
        title: t("admin.floor.page.title"),
        subtitleEditing: (name: string) => t("admin.floor.page.subtitle.editing", { name }),
        subtitleEmpty: t("admin.floor.page.subtitle.empty"),
        status: {
          dirty: t("admin.floor.page.status.dirty"),
          clean: t("admin.floor.page.status.clean"),
        },
        live: {
          ariaConnected: t("admin.floor.page.live.ariaConnected"),
          ariaDisconnected: t("admin.floor.page.live.ariaDisconnected"),
          connected: t("admin.floor.page.live.connected"),
          disconnected: t("admin.floor.page.live.disconnected"),
          timeLabel: t("admin.floor.page.live.timeLabel"),
          timeAria: t("admin.floor.page.live.timeAria"),
          metricsAria: t("admin.floor.page.live.metricsAria"),
        },
        metrics: {
          zones: {
            label: t("admin.floor.page.metrics.zones.label"),
            hint: t("admin.floor.page.metrics.zones.hint"),
          },
          tables: {
            label: t("admin.floor.page.metrics.tables.label"),
            hintSelected: t("admin.floor.page.metrics.tables.hintSelected"),
            hintEmpty: t("admin.floor.page.metrics.tables.hintEmpty"),
          },
          portals: {
            label: t("admin.floor.page.metrics.portals.label"),
            hintSelected: t("admin.floor.page.metrics.portals.hintSelected"),
            hintEmpty: t("admin.floor.page.metrics.portals.hintEmpty"),
          },
          grid: {
            label: t("admin.floor.page.metrics.grid.label"),
            hint: t("admin.floor.page.metrics.grid.hint"),
          },
        },
        emptyState: t("admin.floor.page.empty"),
        sidebarToggle: {
          show: t("admin.floor.page.sidebarToggle.show"),
          hide: t("admin.floor.page.sidebarToggle.hide"),
        },
        toasts: {
          stale: {
            message: t("admin.floor.page.toasts.stale.message"),
            action: t("admin.floor.page.toasts.stale.action"),
          },
          occupied: t("admin.floor.page.toasts.occupied"),
        },
      },
      toolbar: {
        section: {
          kicker: t("admin.floor.toolbar.section.kicker"),
          title: t("admin.floor.toolbar.section.title"),
          project: t("admin.floor.toolbar.section.project"),
        },
        tools: {
          select: {
            label: t("admin.floor.toolbar.tools.select.label"),
            hint: t("admin.floor.toolbar.tools.select.hint"),
          },
          tableSquare: {
            label: floorEntityLabels.tableSquare,
            hint: t("admin.floor.toolbar.tools.tableSquare.hint"),
          },
          tableRound: {
            label: floorEntityLabels.tableRound,
            hint: t("admin.floor.toolbar.tools.tableRound.hint"),
          },
          obstacle: {
            label: floorEntityLabels.obstacle,
            hint: t("admin.floor.toolbar.tools.obstacle.hint"),
          },
          threshold: {
            label: floorEntityLabels.threshold,
            hint: t("admin.floor.toolbar.tools.threshold.hint"),
          },
          portal: {
            label: floorEntityLabels.portal,
            hint: t("admin.floor.toolbar.tools.portal.hint"),
          },
        },
        actions: {
          discard: t("admin.floor.toolbar.actions.discard"),
          publish: t("admin.floor.toolbar.actions.publish"),
          publishing: t("admin.floor.toolbar.actions.publishing"),
        },
      },
      zoneHeader: {
        placeholder: t("admin.floor.zoneHeader.placeholder"),
        add: t("admin.floor.zoneHeader.add"),
        cancel: t("admin.floor.zoneHeader.cancel"),
        addTab: t("admin.floor.zoneHeader.addTab"),
        deleteAria: (name: string) => t("admin.floor.zoneHeader.deleteAria", { name }),
      },
      sidebar: {
        empty: {
          title: t("admin.floor.sidebar.empty.title"),
          subtitle: t("admin.floor.sidebar.empty.subtitle"),
          description: t("admin.floor.sidebar.empty.description"),
        },
        zone: {
          titleFallback: t("admin.floor.sidebar.zone.titleFallback"),
          subtitle: t("admin.floor.sidebar.zone.subtitle"),
          stats: {
            tables: t("admin.floor.sidebar.zone.stats.tables"),
            seats: t("admin.floor.sidebar.zone.stats.seats"),
            portals: t("admin.floor.sidebar.zone.stats.portals"),
            obstacles: t("admin.floor.sidebar.zone.stats.obstacles"),
          },
          sections: {
            quickAdd: t("admin.floor.sidebar.zone.sections.quickAdd"),
            canvas: t("admin.floor.sidebar.zone.sections.canvas"),
            borders: t("admin.floor.sidebar.zone.sections.borders"),
            shortcuts: t("admin.floor.sidebar.zone.sections.shortcuts"),
          },
          fields: {
            columns: t("admin.floor.sidebar.zone.fields.columns"),
            rows: t("admin.floor.sidebar.zone.fields.rows"),
          },
          borders: {
            edges: {
              top: t("admin.floor.sidebar.zone.borders.edges.top"),
              right: t("admin.floor.sidebar.zone.borders.edges.right"),
              bottom: t("admin.floor.sidebar.zone.borders.edges.bottom"),
              left: t("admin.floor.sidebar.zone.borders.edges.left"),
            },
            styles: {
              dashed: t("admin.floor.sidebar.zone.borders.styles.dashed"),
              solid: t("admin.floor.sidebar.zone.borders.styles.solid"),
            },
          },
          shortcuts: floorShortcuts,
        },
        entity: {
          idPrefix: t("admin.floor.sidebar.entity.idPrefix"),
          noZone: t("admin.floor.sidebar.entity.noZone"),
          noticeTitle: t("admin.floor.sidebar.entity.noticeTitle"),
          warnings: {
            missingLabel: t("admin.floor.sidebar.entity.warnings.missingLabel"),
            missingTarget: t("admin.floor.sidebar.entity.warnings.missingTarget"),
            capacity: t("admin.floor.sidebar.entity.warnings.capacity"),
            bounds: t("admin.floor.sidebar.entity.warnings.bounds"),
          },
          sections: {
            transform: t("admin.floor.sidebar.entity.sections.transform"),
            placement: t("admin.floor.sidebar.entity.sections.placement"),
            table: t("admin.floor.sidebar.entity.sections.table"),
            passage: t("admin.floor.sidebar.entity.sections.passage"),
            navigation: t("admin.floor.sidebar.entity.sections.navigation"),
          },
          fields: {
            x: t("admin.floor.sidebar.entity.fields.x"),
            y: t("admin.floor.sidebar.entity.fields.y"),
            width: t("admin.floor.sidebar.entity.fields.width"),
            height: t("admin.floor.sidebar.entity.fields.height"),
            rotation: t("admin.floor.sidebar.entity.fields.rotation"),
            rotationAria: t("admin.floor.sidebar.entity.fields.rotationAria"),
            rotateStep: t("admin.floor.sidebar.entity.fields.rotateStep"),
            zone: t("admin.floor.sidebar.entity.fields.zone"),
            noneOption: t("admin.floor.sidebar.entity.fields.noneOption"),
            centerX: t("admin.floor.sidebar.entity.fields.centerX"),
            centerY: t("admin.floor.sidebar.entity.fields.centerY"),
            move: {
              up: t("admin.floor.sidebar.entity.fields.move.up"),
              down: t("admin.floor.sidebar.entity.fields.move.down"),
              left: t("admin.floor.sidebar.entity.fields.move.left"),
              right: t("admin.floor.sidebar.entity.fields.move.right"),
            },
          },
          table: {
            idLabel: t("admin.floor.sidebar.entity.table.idLabel"),
            unassigned: t("admin.floor.sidebar.entity.table.unassigned"),
            showQr: t("admin.floor.sidebar.entity.table.showQr"),
            qrHint: t("admin.floor.sidebar.entity.table.qrHint"),
            publicLabel: t("admin.floor.sidebar.entity.table.publicLabel"),
            labelPlaceholder: t("admin.floor.sidebar.entity.table.labelPlaceholder"),
            capacity: t("admin.floor.sidebar.entity.table.capacity"),
            presetsAria: t("admin.floor.sidebar.entity.table.presetsAria"),
            tagsTitle: t("admin.floor.sidebar.entity.table.tagsTitle"),
            tags: floorTableTags,
          },
          passage: {
            label: t("admin.floor.sidebar.entity.passage.label"),
            placeholder: t("admin.floor.sidebar.entity.passage.placeholder"),
          },
          navigation: {
            targetLabel: t("admin.floor.sidebar.entity.navigation.targetLabel"),
            placeholder: t("admin.floor.sidebar.entity.navigation.placeholder"),
          },
          actions: {
            duplicate: t("admin.floor.sidebar.entity.actions.duplicate"),
            delete: t("admin.floor.sidebar.entity.actions.delete"),
          },
        },
      },
      modals: {
        publish: {
          title: t("admin.floor.modals.publish.title"),
          bodyLine1: t("admin.floor.modals.publish.bodyLine1"),
          bodyLine2: t("admin.floor.modals.publish.bodyLine2"),
          cancel: t("admin.floor.modals.publish.cancel"),
          confirm: t("admin.floor.modals.publish.confirm"),
          confirming: t("admin.floor.modals.publish.confirming"),
        },
        deleteZone: {
          title: t("admin.floor.modals.deleteZone.title"),
          message: (name: string) => t("admin.floor.modals.deleteZone.message", { name }),
          warning: (count: number) => t("admin.floor.modals.deleteZone.warning", { count }),
          cancel: t("admin.floor.modals.deleteZone.cancel"),
          confirm: t("admin.floor.modals.deleteZone.confirm"),
          confirming: t("admin.floor.modals.deleteZone.confirming"),
        },
        qr: {
          title: (table: string) => t("admin.floor.modals.qr.title", { table }),
          loading: t("admin.floor.modals.qr.loading"),
          error: t("admin.floor.modals.qr.error"),
          download: t("admin.floor.modals.qr.download"),
          close: t("admin.floor.modals.qr.close"),
          alt: (table: string) => t("admin.floor.modals.qr.alt", { table }),
        },
      },
    },
  }
}

export type AdminStrings = ReturnType<typeof useAdminStrings>
export type SchedulerStrings = AdminStrings["scheduler"]
