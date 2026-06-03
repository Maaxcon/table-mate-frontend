// Must match the backend list in apps/menu/allergens.py — the API rejects
// any value outside this set.
export const ALLERGEN_OPTIONS = [
  "Глютен",
  "Молоко",
  "Яйця",
  "Риба",
  "Ракоподібні",
  "Горіхи",
  "Арахіс",
  "Соя",
  "Кунжут",
  "Сульфіти",
  "Селера",
  "Гірчиця",
  "Люпин",
  "Молюски",
] as const
