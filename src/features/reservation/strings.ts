// Central UI strings for the customer booking flow — one place to translate,
// matching the menu feature's approach (no i18n library yet). Visual casing
// (e.g. uppercase tabs/badges) lives in CSS via text-transform, so the text
// here stays normal-case and localizable.

export const bookStrings = {
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
  },
  modal: {
    title: (table: string) => `Бронь столу ${table}`,
    confirmedTitle: "Бронь підтверджено",
    today: "Сьогодні",
    sections: {
      date: "Дата",
      time: "Час",
      duration: "Тривалість (хв)",
      guests: "Гості",
      notes: "Нотатки (необов'язково)",
      confirmation: "Підтвердження",
    },
    tzNote: (tz: string) => `Час показано за часом ресторану (${tz})`,
    slots: {
      loading: "Завантаження вільних слотів…",
      closed: "Цього дня ресторан зачинено",
      none: "Немає вільних слотів",
    },
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
    },
    createFailed: "Не вдалося створити бронь",
  },
} as const
