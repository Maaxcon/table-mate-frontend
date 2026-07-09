// Central UI strings for the customer booking flow — one place to translate,
// matching the menu feature's approach (no i18n library yet). Visual casing
// (e.g. uppercase tabs/badges) lives in CSS via text-transform, so the text
// here stays normal-case and localizable.

export const bookStrings = {
  pageTitle: "Бронювання",
  backToMenu: "До меню",
  tabs: {
    floor: "План залу",
    bookings: "Мої броні",
  },
  loading: "Завантаження…",
  retry: "Спробувати ще раз",
  loginCta: {
    text: "Щоб забронювати стіл, потрібно увійти.",
    login: "Увійти",
    cancel: "Скасувати",
  },
  errors: {
    floor: "Не вдалося завантажити план залу.",
    bookings: "Не вдалося завантажити ваші броні.",
  },
  floorPlan: {
    title: "План залу",
    status: {
      free: "Вільно",
      reserved: "Заброньовано",
      occupied: "Зайнято",
    },
    seats: (n: number) => `${n} міс.`,
    tableShort: "Стіл",
    choose: "Обрати",
    // Spoken label so screen readers announce a table as one phrase, with the
    // correct Ukrainian plural for "seat".
    tableAria: (n: string | number, capacity: number, status: string) => {
      const m10 = capacity % 10
      const m100 = capacity % 100
      const word =
        m10 === 1 && m100 !== 11
          ? "місце"
          : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
            ? "місця"
            : "місць"
      return `Стіл ${n}, ${capacity} ${word}, ${status}`
    },
    filterAll: "Усі",
    filterFree: "Вільні",
    noFree: "Немає вільних столів на цей час",
    noTables: "У цій зоні поки немає столів",
    showAll: "Показати всі",
    statusSmall: "Замало місць",
    freeCount: (time?: string | null) => (time ? `вільно на ${time}` : "вільно"),
    perfectFit: (guests: number) => `Саме на ${guests}`,
    zoomIn: "Збільшити",
    zoomOut: "Зменшити",
    zoomFit: "Показати весь зал",
    showMap: "На плані",
    closeMap: "Закрити план",
    freeShort: "вільно",
    slot: {
      title: "Коли вам зручно?",
      hint: "Оберіть дату, час і кількість гостей — у плані залу підсвітяться столи, вільні саме на цей час.",
      date: "Дата",
      time: "Час",
      guests: "Гості",
      noTimes: "Цього дня немає вільного часу",
      today: "Сьогодні",
    },
  },
  modal: {
    title: (table: string) => `Бронь столу ${table}`,
    confirmedTitle: "Бронь підтверджено",
    today: "Сьогодні",
    sections: {
      date: "Дата",
      time: "Час",
      table: "Стіл",
      contacts: "Контакти",
      duration: "Тривалість (хв)",
      guests: "Гості",
      guestName: "Ім'я гостя",
      notes: "Нотатки (необов'язково)",
      confirmation: "Підтвердження",
    },
    flow: {
      steps: ["Дата і час", "Стіл", "Контакти", "Підтвердження"],
      stepLabel: (current: number, total: number) => `Крок ${current} з ${total}`,
      back: "Назад",
      next: "Далі",
      profileHint: "Контакти акаунта будуть використані для цієї броні.",
      notesHint: "Додайте ім'я, телефон або побажання для команди ресторану.",
      notesFallback: "Без нотаток",
    },
    tzNote: (tz: string) => `Час показано за часом ресторану (${tz})`,
    slots: {
      loading: "Завантаження вільних слотів…",
      closed: "Цього дня ресторан зачинено",
      none: "Немає вільних слотів",
    },
    guestNamePlaceholder: "Ім'я гостя",
    notesPlaceholder: "Ім'я гостя, телефон, особливі побажання…",
    summary: {
      table: "Стіл",
      date: "Дата",
      time: "Час",
      duration: "Тривалість",
      guests: "Гості",
    },
    durationUnit: "хв",
    success: (table: string) => `Вашу бронь столу ${table} створено.`,
    ticket: {
      label: "Електронна бронь",
      tableLabel: "Стіл",
      addToCalendar: "Додати в календар",
      done: "Готово",
    },
    actions: {
      ok: "Гаразд",
      cancel: "Скасувати",
      confirm: "Підтвердити бронь",
      submitting: "Бронюємо…",
    },
    validation: {
      closingExceeded: (close: string) => `Час завершення перевищує час закриття (${close})`,
      durationUnavailable:
        "Обрана тривалість недоступна повністю в цей час. Оберіть коротшу тривалість або інший початок.",
      guestNameRequired: "Вкажіть ім'я гостя",
    },
    createFailed: "Не вдалося створити бронь",
  },
  myBookings: {
    title: "Мої броні",
    empty: "Броней поки немає.",
    emptyCta: "Забронювати стіл",
    tzNote: (tz: string) => `Час показано за часом ресторану (${tz})`,
    pastShow: (n: number) => `Показати минулі (${n})`,
    pastHide: "Сховати минулі",
    cancelFailed: "Не вдалося скасувати",
    status: {
      pending: "Очікує",
      active: "Активна",
      completed: "Завершена",
      cancelled: "Скасована",
    },
    phase: {
      upcoming: "Незабаром",
      in_progress: "Триває",
      past: "Минула",
    },
    card: {
      table: (table: string) => `Стіл ${table}`,
    },
    actions: {
      modify: "Змінити",
      cancel: "Скасувати",
      cancelling: "Скасування…",
    },
  },
  reschedule: {
    title: (table: string) => `Змінити бронь столу ${table}`,
    updatedTitle: "Бронь оновлено",
    updatedText: (table: string) => `Вашу бронь столу ${table} оновлено.`,
    sections: {
      date: "Дата",
      time: "Час",
      duration: "Тривалість (хв)",
      guests: "Гості",
      summary: "Підсумок",
    },
    startingFrom: (time: string) => `Початок о ${time}`,
    actions: {
      cancel: "Скасувати",
      save: "Зберегти",
      saving: "Збереження…",
    },
    modifyFailed: "Не вдалося змінити бронь",
  },
  cancel: {
    title: "Скасувати бронь?",
    message: "Ви впевнені, що хочете скасувати цю бронь?",
    close: "Закрити",
    keep: "Залишити",
    confirm: "Скасувати бронь",
    submitting: "Скасування…",
  },
} as const
