<<<<<<< HEAD
# Tasks: Tablemate Frontend MVP

**Input**: Planning documents from `/specs/001-tablemate-frontend-mvp/`  
**Prerequisites**: `plan.md`, `spec.md`  
**Format**: GitHub Issue drafts  
**Team**: 2-3 developers

## Phase 0 - Project Foundation

### TASK-001
**Title**: Initialize Vite + React 18 + TypeScript project  
**Labels**: `chore`, `phase-0`  
**Description**:
- Run: `npm create vite@latest table-mate-frontend`
- Set TypeScript to strict mode in `tsconfig.json`
- Verify app runs on localhost:5173
**Acceptance Criteria**:
- [ ] App builds with no TypeScript errors
- [ ] `strict: true` in `tsconfig.json`

### TASK-002
**Title**: Configure ESLint + Prettier + Husky  
**Labels**: `chore`, `phase-0`  
**Description**:
- Install ESLint with Airbnb config
- Install Prettier
- Install Husky + lint-staged
- Pre-commit hook runs Prettier on staged files
**Acceptance Criteria**:
- [ ] `eslint .` passes with no errors
- [ ] Unformatted commit is blocked by Husky
- [ ] `prettier --check .` passes

### TASK-003
**Title**: Set up Feature-Sliced Design directory structure  
**Labels**: `chore`, `phase-0`  
**Description**:
- Create all directories under `src/`:
- `api/`, `assets/`, `components/`, `context/`
- `features/auth/`, `features/editor/`
- `features/reservation/`, `features/menu/`
- `features/orders/`, `features/restaurants/`
- `hooks/`, `layouts/`, `pages/`, `routes/`
- `store/`, `styles/`, `types/`, `utils/`
**Acceptance Criteria**:
- [ ] All directories exist
- [ ] Each directory has an `index.ts` placeholder

### TASK-004
**Title**: Configure Redux Toolkit store + Redux Persist  
**Labels**: `chore`, `phase-0`  
**Description**:
- Install `@reduxjs/toolkit` `redux-persist`
- Create `src/store/index.ts`
- Configure `persistStore` with `localStorage`
- Wrap App in `Provider` + `PersistGate`
**Acceptance Criteria**:
- [ ] Redux DevTools shows store on localhost
- [ ] Store survives page refresh

### TASK-005
**Title**: Set up Axios instance with interceptors  
**Labels**: `chore`, `phase-0`  
**Description**:
- Install `axios`
- Create `src/api/client.ts`
- Base URL from `.env` (`VITE_API_URL`)
- Request interceptor: attach auth token
- Response interceptor: handle 401
**Acceptance Criteria**:
- [ ] Axios instance exports correctly
- [ ] `.env.example` documents `VITE_API_URL`

### TASK-006
**Title**: Define global TypeScript interfaces  
**Labels**: `chore`, `phase-0`  
**Description**:
- Create `src/types/index.ts` with:
- `UserDTO`, `TableDTO`, `ReservationDTO`
- `CartSessionDTO`, `CartItemDTO`
- `MenuItemDTO`, `CategoryDTO`
- Create enums:
- `Role`, `TableStatus`, `TableShape`
- `ReservationStatus`, `CanvasMode`
- `CartSessionStatus`
**Acceptance Criteria**:
- [ ] All interfaces exported from `src/types/`
- [ ] No `any` usage anywhere

### TASK-007
**Title**: Define design tokens  
**Labels**: `chore`, `phase-0`  
**Description**:
- Create `src/assets/tokens.css`:
- `--color-bg: #000000`
- `--color-text: #FFFFFF`
- `--border: 1px solid #FFFFFF`
- `--font-primary`, `--spacing-*` tokens
- Import in `src/styles/global.css`
**Acceptance Criteria**:
- [ ] Tokens apply globally
- [ ] No hardcoded hex values in components

---

## Phase 1 - Auth Module

### TASK-101
**Title**: Install and configure GoogleOAuthProvider  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- Install `@react-oauth/google`
- Wrap App in `GoogleOAuthProvider`
- Client ID from `.env` (`VITE_GOOGLE_CLIENT_ID`)
**Acceptance Criteria**:
- [ ] Provider wraps App in `main.tsx`
- [ ] `.env.example` documents `VITE_GOOGLE_CLIENT_ID`

### TASK-102
**Title**: Create RTK authSlice  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- Create `src/features/auth/authSlice.ts`
- State:
- `user: UserDTO | null`
- `isAuthenticated: boolean`
- `isGuest: boolean`
- `isLoading: boolean`
- `error: string | null`
- Async thunk: `googleLogin(token)`
- `pending` -> `isLoading: true`
- `fulfilled` -> `user`, `isAuthenticated: true`
- `rejected` -> `error message`
**Acceptance Criteria**:
- [ ] Slice visible in Redux DevTools
- [ ] All 3 async states handled

### TASK-103
**Title**: Implement Google login button + hook  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- Create `src/features/auth/GoogleLoginButton.tsx`
- `useGoogleLogin` hook from `@react-oauth/google`
- On success: dispatch `googleLogin(token)`
- On error: dispatch `setError()`
- Loading spinner while `isLoading: true`
**Acceptance Criteria**:
- [ ] Google popup opens on click
- [ ] Loading state shows during API call
- [ ] Error toast shows on failure

### TASK-104
**Title**: Build Landing page  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- Create `src/pages/LandingPage.tsx`
- Background: `#000000`
- Logo + `TABLEMATE` heading
- `SIGN IN / REGISTER` button triggers `GoogleLoginButton`
- `Continue as Guest` button:
- dispatch `setGuest(true)`
- navigate to `/menu`
- Use design tokens for all styling
**Acceptance Criteria**:
- [ ] Matches monochromatic aesthetic
- [ ] Both buttons work correctly
- [ ] No inline styles

### TASK-105
**Title**: Create ProtectedRoute + GuestRoute wrappers  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- `src/routes/ProtectedRoute.tsx`
- Reads `isAuthenticated` from RTK
- Redirects to `/` if not authenticated
- Accepts `role` prop for role-based access
- `src/routes/GuestRoute.tsx`
- Allows anonymous guest mode and authenticated role users
- Blocks completely unauthenticated
**Acceptance Criteria**:
- [ ] `/home` redirects to `/` when not authenticated
- [ ] `/menu` accessible to guest
- [ ] `/editor` accessible only to `ROOT`, `OWNER`, `ADMIN` roles

### TASK-106
**Title**: Configure Redux Persist for auth state  
**Labels**: `feature`, `phase-1`, `auth`  
**Description**:
- Persist `authSlice` to `localStorage`
- Rehydrate on app load
- Test login -> refresh -> still authenticated
**Acceptance Criteria**:
- [ ] Auth state survives page refresh
- [ ] `isGuest` state also persists

---

## Phase 2 - Routing and Layouts

### TASK-201
**Title**: Configure full React Router structure  
**Labels**: `feature`, `phase-2`, `routing`  
**Description**:
- Create `src/routes/index.tsx` with all routes
- Public: `/`
- AnonymousGuest+Roles: `/menu`
- Role `GUEST` and above: `/home`, `/reserve`, `/reservation/success`, `/cart`, `/reviews`
- `ROOT`/`OWNER`: `/dashboard`
- `ROOT`/`OWNER`/`ADMIN`: `/editor`
- `WAITER` and above: `/hall`
- `COOK` and above: `/orders`
- Wrap private routes in `ProtectedRoute`
**Acceptance Criteria**:
- [ ] All routes render correct page
- [ ] Wrong role redirects to `/`

### TASK-202
**Title**: Build AdminLayout  
**Labels**: `feature`, `phase-2`, `routing`  
**Description**:
- Create `src/layouts/AdminLayout.tsx`
- Sidebar with navigation links
- Top navbar with user avatar
- `Outlet` for page content
- Monochromatic styling with tokens
**Acceptance Criteria**:
- [ ] Renders correctly on `/editor` and `/dashboard`
- [ ] Sidebar links navigate correctly

### TASK-203
**Title**: Build GuestLayout  
**Labels**: `feature`, `phase-2`, `routing`  
**Description**:
- Create `src/layouts/GuestLayout.tsx`
- Minimal top header with logo
- No sidebar
- `Outlet` for page content
**Acceptance Criteria**:
- [ ] Renders on `/menu` for guest users
- [ ] Header shows logo only

---

## Phase 4 - Reservation Module

### TASK-401
**Title**: Create RTK reservationSlice  
**Labels**: `feature`, `phase-4`, `reservation`  
**Description**:
- Create `src/features/reservation/reservationSlice.ts`
- State:
- `availableTables: TableDTO[]`
- `selectedTable: TableDTO | null`
- `currentReservation: ReservationDTO | null`
- `status: idle | loading | success | error`
- Async thunks:
- `fetchAvailableTables(date, time, guests)`
- `createReservation(tableId, details)`
**Acceptance Criteria**:
- [ ] Slice visible in Redux DevTools
- [ ] All async states handled

### TASK-402
**Title**: Create reservation API calls  
**Labels**: `feature`, `phase-4`, `reservation`  
**Description**:
- Create `src/api/reservation.ts`
- `GET /api/editor/tables/available/`
- `POST /api/reservations/`
- Use Axios instance from `src/api/client.ts`
**Acceptance Criteria**:
- [ ] Both calls return typed responses
- [ ] Errors propagate to RTK rejected state

### TASK-403
**Title**: Build interactive hall map with react-konva  
**Labels**: `feature`, `phase-4`, `reservation`  
**Description**:
- Install `react-konva` and `konva`
- Create `src/features/reservation/HallMap.tsx`
- `Stage` + `Layer` from react-konva
- Render `TableDTO[]` as `Rect`/`Circle` shapes
- Green = available, Grey = taken
- `onClick` -> dispatch `selectTable(table)`
**Acceptance Criteria**:
- [ ] Tables render in correct positions
- [ ] Color reflects availability
- [ ] Click selects table in RTK

### TASK-404
**Title**: Build reservation confirmation screen  
**Labels**: `feature`, `phase-4`, `reservation`  
**Description**:
- Create `src/features/reservation/ReservationConfirm.tsx`
- Show restaurant, date, time, guest count, table number
- `Confirm Booking` button dispatches `createReservation()`
- 409 error -> toast `Table was just taken`
- Success -> navigate `/reservation/success`
**Acceptance Criteria**:
- [ ] All booking details display correctly
- [ ] 409 shows toast and stays on map
- [ ] Success navigates correctly

### TASK-405
**Title**: Build /reservation/success page  
**Labels**: `feature`, `phase-4`, `reservation`  
**Description**:
- Create `src/pages/ReservationSuccessPage.tsx`
- Success checkmark
- Booking summary (table, date, time)
- `Go to Menu` button -> `/menu`
- `Go to Cart` button -> `/cart`
**Acceptance Criteria**:
- [ ] Page renders after successful booking
- [ ] Both navigation buttons work

---

## Phase 5 - Menu Module

### TASK-501
**Title**: Create RTK menuSlice  
**Labels**: `feature`, `phase-5`, `menu`  
**Description**:
- Create `src/features/menu/menuSlice.ts`
- State:
- `categories: CategoryDTO[]`
- `items: MenuItemDTO[]`
- `searchQuery: string`
- Async thunks:
- `fetchCategories()`
- `fetchItems(categoryId?)`
**Acceptance Criteria**:
- [ ] Slice visible in Redux DevTools
- [ ] Items filter by category correctly

### TASK-502
**Title**: Create menu API calls  
**Labels**: `feature`, `phase-5`, `menu`  
**Description**:
- Create `src/api/menu.ts`
- `GET /api/menu/categories/`
- `GET /api/menu/items/`
**Acceptance Criteria**:
- [ ] Typed responses for both calls
- [ ] Errors handled correctly

### TASK-503
**Title**: Build category filter tabs  
**Labels**: `feature`, `phase-5`, `menu`  
**Description**:
- Create `src/features/menu/CategoryTabs.tsx`
- Tabs: `ALL`, `SALADS`, `SIDES`, `DESSERTS`, `DRINKS`
- Active tab filters `menuSlice` items
- Monochromatic active state styling
**Acceptance Criteria**:
- [ ] Clicking tab filters dishes
- [ ] Active tab visually distinct

### TASK-504
**Title**: Build dish card component  
**Labels**: `feature`, `phase-5`, `menu`  
**Description**:
- Create `src/features/menu/DishCard.tsx`
- Dish image, name, description, price
- `ADD TO ORDER` button:
- `isAuthenticated` -> enabled
- `isGuest` -> disabled + greyed out
**Acceptance Criteria**:
- [ ] Card renders all dish data
- [ ] Guest sees disabled button
- [ ] Authenticated user can add to cart

### TASK-505
**Title**: Implement dish search  
**Labels**: `feature`, `phase-5`, `menu`  
**Description**:
- Create `src/features/menu/MenuSearch.tsx`
- Text input dispatches `setSearchQuery()`
- `menuSlice` filters items by name
- Real-time filtering (no debounce for MVP)
**Acceptance Criteria**:
- [ ] Search filters results in real time
- [ ] Empty state shows `No dishes found`

---

## Phase 6 - Shared Cart Module

### TASK-601
**Title**: Create RTK cartSlice  
**Labels**: `feature`, `phase-6`, `cart`  
**Description**:
- Create `src/features/orders/cartSlice.ts`
- State:
- `items: CartItemDTO[]`
- `participants: UserDTO[]`
- `sessionStatus: idle | connected | disconnected`
- Actions:
- `itemAdded`, `itemRemoved`
- `participantJoined`, `sessionStatusChanged`
**Acceptance Criteria**:
- [ ] Slice visible in Redux DevTools
- [ ] Optimistic add/remove works

### TASK-602
**Title**: Create cart API calls  
**Labels**: `feature`, `phase-6`, `cart`  
**Description**:
- Create `src/api/cart.ts`
- `POST /api/orders/cart/sessions/`
- `GET /api/orders/cart/sessions/:id/`
- `POST /api/orders/cart/sessions/:id/items/`
- `DELETE /api/orders/cart/sessions/:id/items/:item_id/`
**Acceptance Criteria**:
- [ ] All calls typed correctly
- [ ] Errors propagate to RTK

### TASK-603
**Title**: Build useSocket hook  
**Labels**: `feature`, `phase-6`, `cart`  
**Description**:
- Create `src/hooks/useSocket.ts`
- Connect to `ws/cart/:session_id/`
- Handle events:
- `ITEM_ADDED` -> dispatch `itemAdded()`
- `ITEM_REMOVED` -> dispatch `itemRemoved()`
- `USER_JOINED` -> dispatch `participantJoined()`
- `USER_LEFT` -> dispatch `participantLeft()`
- Update `sessionStatus` on connect/disconnect
**Acceptance Criteria**:
- [ ] Hook connects on mount
- [ ] All 4 events update RTK correctly
- [ ] Disconnects cleanly on unmount

### TASK-604
**Title**: Build cart page  
**Labels**: `feature`, `phase-6`, `cart`  
**Description**:
- Create `src/pages/CartPage.tsx`
- Item list with name, quantity, price
- Remove item button per line
- Subtotal + 10% service fee
- Participant avatars list
- `Place Order` button
**Acceptance Criteria**:
- [ ] All items display correctly
- [ ] Subtotal calculates correctly
- [ ] Remove updates list instantly (optimistic)

---

## Phase 7 - Admin Canvas Editor

### TASK-701
**Title**: Create RTK editorSlice  
**Labels**: `feature`, `phase-7`, `editor`  
**Description**:
- Create `src/features/editor/editorSlice.ts`
- State:
- `tables: TableDTO[]`
- `selectedTableId: string | null`
- `canvasMode: view | edit`
- Async thunk: `fetchTables()`
**Acceptance Criteria**:
- [ ] Tables load from API on mount
- [ ] `canvasMode` toggle works

### TASK-702
**Title**: Build react-konva canvas editor  
**Labels**: `feature`, `phase-7`, `editor`  
**Description**:
- Create `src/features/editor/EditorCanvas.tsx`
- `Stage` + `Layer`
- Render each `TableDTO` as draggable shape
- Grid snapping on drag (20px)
- `onDragEnd` -> `PATCH /api/editor/tables/:id/position/`
- Click -> dispatch `selectTable(id)`
**Acceptance Criteria**:
- [ ] All tables render on canvas
- [ ] Drag snaps to grid
- [ ] Position saves to backend after drop

---

## Phase 8 - Staff Views

### TASK-801
**Title**: Build live hall map for Waiter  
**Labels**: `feature`, `phase-8`, `staff`  
**Description**:
- Create `src/features/restaurants/HallStatus.tsx`
- Connect to `ws/hall/`
- Render tables with status colors:
- Free -> green
- Occupied -> red
- Dirty -> yellow
- Reserved -> orange
- `TABLE_STATUS_CHANGED` and `NEW_RESERVATION` events update RTK
**Acceptance Criteria**:
- [ ] Colors reflect real-time status
- [ ] Updates without page refresh

### TASK-802
**Title**: Build kitchen Kanban board  
**Labels**: `feature`, `phase-8`, `staff`  
**Description**:
- Create `src/features/orders/KanbanBoard.tsx`
- 3 columns: New / In Progress / Ready
- Order cards with table number + items
- Drag between columns updates status
**Acceptance Criteria**:
- [ ] All 3 columns render
- [ ] Cards show correct order info
- [ ] Drag updates order status

---

## Labels Reference

- `chore` -> setup, config, tooling
- `feature` -> new functionality
- `phase-0` -> foundation
- `phase-1` -> auth
- `phase-2` -> routing
- `phase-4` -> reservation
- `phase-5` -> menu
- `phase-6` -> cart
- `phase-7` -> editor
- `phase-8` -> staff views

## Task Summary

- Phase 0: TASK-001 to TASK-007 (7 tasks)
- Phase 1: TASK-101 to TASK-106 (6 tasks)
- Phase 2: TASK-201 to TASK-203 (3 tasks)
- Phase 4: TASK-401 to TASK-405 (5 tasks)
- Phase 5: TASK-501 to TASK-505 (5 tasks)
- Phase 6: TASK-601 to TASK-604 (4 tasks)
- Phase 7: TASK-701 to TASK-702 (2 tasks)
- Phase 8: TASK-801 to TASK-802 (2 tasks)

**Total**: 34 tasks
=======
# Tasks: TableMate Frontend MVP

**Input**: Design documents from `/specs/001-tablemate-frontend-mvp/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/frontend-backend-boundary.md`, `quickstart.md`
**Tests**: Add focused validation tasks for constitution-critical behavior and user-story independent checks.
**Organization**: Tasks are grouped by user story so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- `[P]` means the task can run in parallel (different files, no unresolved dependency).
- `[Story]` label appears only in user story phases (`[US1]` ... `[US5]`).
- Every task includes explicit file path(s).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare frontend structure and shared policy-aware scaffolding.

- [ ] T001 Create/update base app structure and route shells in `src/pages/`, `src/routes/`, and `src/layouts/`.
- [ ] T002 [P] Define canonical frontend projection types in `src/types/domain.ts` using `specs/001-tablemate-frontend-mvp/data-model.md`.
- [ ] T003 [P] Define event envelope and versioned payload types in `src/types/events.ts`.
- [ ] T004 Create central API clients and auth interceptors in `src/api/client.ts` and `src/api/interceptors.ts`.
- [ ] T005 [P] Add MVP/demo marker config in `src/config/mvp.ts` and UI helper in `src/components/feedback/MvpOnlyBadge.tsx`.
- [ ] T006 Create policy docs index for developers in `docs/frontend-boundaries.md` referencing `AGENTS.md` and `specs/001-tablemate-frontend-mvp/contracts/frontend-backend-boundary.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement constitution-critical guardrails before story work.

- [ ] T007 Implement backend-authoritative role/permission selectors in `src/features/auth/selectors/permissions.ts`.
- [ ] T008 Implement protected route guards using backend claims in `src/routes/ProtectedRoute.tsx` and `src/routes/RoleGate.tsx`.
- [ ] T009 Implement immutable-record guard utilities in `src/features/shared/model/immutability.ts`.
- [ ] T010 Implement authoritative-status rendering adapters in `src/features/shared/model/statusAdapters.ts`.
- [ ] T011 Implement event `schema_version` validation and safe-ignore handling in `src/hooks/useSocket.ts`.
- [ ] T012 Implement duplicate-event protection (idempotent apply by event id/version) in `src/features/orders/cartEventsReducer.ts` and `src/features/restaurants/hallEventsReducer.ts`.
- [ ] T013 Implement reconnect recovery with snapshot re-fetch in `src/hooks/useSocket.ts` and `src/features/orders/cartSlice.ts`.
- [ ] T014 Add foundational validation tests for role authority and non-authoritative transitions in `src/routes/__tests__/RoleGate.test.tsx` and `src/features/shared/__tests__/authority-boundary.test.ts`.

**Checkpoint**: No user story starts until backend-authority, role-gating, event safety, and immutable guards are in place.

---

## Phase 3: User Story 1 - Landing, Authentication, and Guest Entry (Priority: P1) 🎯 MVP

**Goal**: Deliver secure entry flows with backend-authoritative auth outcomes and guest restrictions.

**Independent Test**: User can authenticate or continue as guest; unauthorized access is denied by backend-role-aware guards.

- [ ] T015 [P] [US1] Implement landing screen and entry actions in `src/pages/LandingPage.tsx`.
- [ ] T016 [US1] Implement auth slice and backend-auth result handling in `src/features/auth/authSlice.ts`.
- [ ] T017 [US1] Implement OAuth command flow and failure UI in `src/features/auth/GoogleLoginButton.tsx`.
- [ ] T018 [US1] Implement guest mode read-only capability flags in `src/features/auth/model/guestMode.ts`.
- [ ] T019 [US1] Enforce route redirects for unauthenticated/unauthorized users in `src/routes/index.tsx`.
- [ ] T020 [US1] Mark any seeded auth/demo behavior as MVP-only in `src/pages/LandingPage.tsx` and `src/components/feedback/MvpOnlyBadge.tsx`.
- [ ] T021 [US1] Add independent tests for auth success/failure/guest entry in `src/features/auth/__tests__/entry-flow.test.tsx`.

**Checkpoint**: US1 works independently and respects backend authority boundaries.

---

## Phase 4: User Story 2 - Menu and Role-Aware Navigation (Priority: P1)

**Goal**: Render menu/navigation by backend-provided permissions and keep restricted actions non-authoritative.

**Independent Test**: Guest and role-based users see allowed UI only; restricted actions remain disabled/hidden.

- [ ] T022 [P] [US2] Implement menu data fetch and projection in `src/features/menu/menuSlice.ts` and `src/api/menu.ts`.
- [ ] T023 [US2] Implement role-aware action visibility in `src/features/menu/DishCard.tsx` and `src/features/menu/CategoryTabs.tsx`.
- [ ] T024 [US2] Implement navigation visibility by backend permissions in `src/components/navigation/AppNav.tsx`.
- [ ] T025 [US2] Ensure no local authoritative order/session/payment transition logic in `src/features/menu/menuCommands.ts`.
- [ ] T026 [US2] Label any mock menu items/flags as MVP-only in `src/features/menu/MenuPage.tsx`.
- [ ] T027 [US2] Add independent permission-visibility tests in `src/features/menu/__tests__/menu-permissions.test.tsx`.

**Checkpoint**: US2 works independently with policy-safe visibility and actions.

---

## Phase 5: User Story 3 - Reservation with Backend-Authoritative Table State (Priority: P1)

**Goal**: Reservation flow uses backend statuses and backend-confirmed outcomes only.

**Independent Test**: User can reserve from backend availability; conflict handling is correct; no client-side table truth.

- [ ] T028 [P] [US3] Implement reservation API commands and typed responses in `src/api/reservation.ts`.
- [ ] T029 [US3] Implement reservation state slice with backend-confirmed transitions in `src/features/reservation/reservationSlice.ts`.
- [ ] T030 [US3] Render table states only from backend payload in `src/features/reservation/HallMap.tsx`.
- [ ] T031 [US3] Implement conflict and validation UX (`409`, validation errors) in `src/features/reservation/ReservationConfirm.tsx`.
- [ ] T032 [US3] Enforce non-authoritative transitions for table/session states in `src/features/reservation/model/authorityGuard.ts`.
- [ ] T033 [US3] Add independent reservation flow tests in `src/features/reservation/__tests__/reservation-flow.test.tsx`.

**Checkpoint**: US3 works independently with backend-authoritative table and reservation states.

---

## Phase 6: User Story 4 - Shared Cart with Event-Driven Updates (Priority: P2)

**Goal**: Event-consistent cart/hall updates with version safety, deduplication, and reconnect recovery.

**Independent Test**: Event stream updates UI safely; unknown versions are ignored; reconnect restores authoritative state.

- [ ] T034 [P] [US4] Implement cart session APIs and snapshot fetch in `src/api/cart.ts`.
- [ ] T035 [US4] Implement cart event consumer with `schema_version` handling in `src/hooks/useSocket.ts`.
- [ ] T036 [US4] Implement safe-ignore path for unsupported event versions in `src/hooks/useSocket.ts` and `src/features/orders/cartSlice.ts`.
- [ ] T037 [US4] Implement duplicate event suppression in `src/features/orders/cartEventsReducer.ts`.
- [ ] T038 [US4] Implement replay/refresh rebuild via snapshot reconciliation in `src/features/orders/cartSlice.ts`.
- [ ] T039 [US4] Implement reconnect re-sync gate before mutating actions in `src/pages/CartPage.tsx`.
- [ ] T040 [US4] Ensure payment state shown in cart is backend-verified display-only in `src/features/orders/PaymentStatusBadge.tsx`.
- [ ] T041 [US4] Add independent event compatibility tests in `src/features/orders/__tests__/cart-events.test.ts`.

**Checkpoint**: US4 works independently with robust event compatibility and recovery behavior.

---

## Phase 7: User Story 5 - Staff Operational Views by Role (Priority: P3)

**Goal**: Staff surfaces enforce backend role permissions and immutable/read-only boundaries.

**Independent Test**: Each staff role sees only allowed surfaces; immutable finalized records are read-only.

- [ ] T042 [P] [US5] Implement staff route gating matrix in `src/routes/index.tsx` and `src/routes/RoleGate.tsx`.
- [ ] T043 [US5] Implement hall and orders views with backend-provided statuses in `src/features/restaurants/HallStatus.tsx` and `src/features/orders/KanbanBoard.tsx`.
- [ ] T044 [US5] Implement read-only rendering for settled/completed/closed records in `src/features/orders/OrderDetailsPanel.tsx` and `src/features/restaurants/SessionSummary.tsx`.
- [ ] T045 [US5] Implement irreversible-action confirmation flows in `src/components/feedback/ConfirmDestructiveActionModal.tsx`.
- [ ] T046 [US5] Ensure ticket/session/payment status components are backend-data display only in `src/features/orders/TicketStatusColumn.tsx` and `src/features/orders/PaymentStatusBadge.tsx`.
- [ ] T047 [US5] Mark any demo-only staff widgets as MVP-only in `src/features/orders/KanbanBoard.tsx`.
- [ ] T048 [US5] Add independent staff-role access tests in `src/routes/__tests__/staff-access-matrix.test.tsx`.

**Checkpoint**: US5 works independently with role safety and immutable UI boundaries.

---

## Phase 8: Polish & Cross-Cutting Consistency

**Purpose**: Final synchronization of constitution/spec/plan/tasks and enforcement checks.

- [ ] T049 Document explicit frontend payment/webhook/replay/reporting scope exceptions in `specs/001-tablemate-frontend-mvp/contracts/frontend-backend-boundary.md`.
- [ ] T050 Verify no task introduces frontend authoritative business transitions in `specs/001-tablemate-frontend-mvp/tasks.md`.
- [ ] T051 Run Speckit Analyze and capture results in `specs/001-tablemate-frontend-mvp/checklists/analyze.md`.
- [ ] T052 Verify no mismatch across `.specify/memory/constitution.md`, `specs/001-tablemate-frontend-mvp/spec.md`, `specs/001-tablemate-frontend-mvp/plan.md`, and `specs/001-tablemate-frontend-mvp/tasks.md`.
- [ ] T053 Verify technical standards are referenced from `AGENTS.md` or engineering docs, not duplicated as constitution business rules, in `specs/001-tablemate-frontend-mvp/plan.md` and `docs/frontend-boundaries.md`.
- [ ] T054 [P] Run lint/build and fix blockers in `package.json` scripts and impacted `src/**` files.
- [ ] T055 [P] Update quick validation steps in `specs/001-tablemate-frontend-mvp/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): can start immediately.
- Phase 2 (Foundational): depends on Phase 1 and blocks all user-story phases.
- Phase 3-5 (US1, US2, US3): start after Phase 2; US2 and US3 can run in parallel after US1 route/auth primitives are stable.
- Phase 6 (US4): depends on foundational event stack and APIs from prior phases.
- Phase 7 (US5): depends on role gating and status adapters from prior phases.
- Phase 8 (Polish): runs after target user stories complete.

### User Story Dependencies

- US1: independent after foundational phase.
- US2: depends on US1 auth/role primitives.
- US3: depends on US1 auth/role primitives.
- US4: depends on event infrastructure and cart APIs (Phases 2 + 3/4 where needed).
- US5: depends on role gates + status rendering adapters from foundational phase.

### Within Each User Story

- Implement model/state boundary first.
- Implement UI and command handling next.
- Add independent verification tests last in the story phase.

---

## Parallel Execution Examples

### US1

- Run `T015` and `T021` in parallel after foundational tasks are complete.

### US4

- Run `T034` and `T037` in parallel before reconnect verification `T039`.

### US5

- Run `T042` and `T044` in parallel, then complete confirmation and status tasks.

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1 and Phase 2.
2. Complete US1 (Phase 3) and validate independently.
3. Add US2 and US3 for functional frontend MVP.
4. Add US4 and US5 incrementally.
5. Execute Phase 8 consistency and analysis tasks.

### Incremental Delivery

1. Deliver entry + role-safe navigation (US1/US2).
2. Deliver reservation with backend-authoritative statuses (US3).
3. Deliver real-time event-safe cart (US4).
4. Deliver staff role views with immutable boundaries (US5).

### Parallel Team Strategy

1. Engineer A: US1 + US2
2. Engineer B: US3 + US4
3. Engineer C: US5 + Phase 8 consistency tasks

## Notes

- All tasks follow strict checklist format with IDs, labels, and file paths.
- Constitution/business alignment is enforced as implementation work, not as post-hoc documentation.
>>>>>>> 55d78c2 (chore: add initial specification documents for TableMate Frontend MVP)
