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
- Allows Guest + Authenticated
- Blocks completely unauthenticated
**Acceptance Criteria**:
- [ ] `/home` redirects to `/` when not authenticated
- [ ] `/menu` accessible to guest
- [ ] `/editor` only accessible to `Admin` role

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
- Guest+Auth: `/menu`
- Auth: `/home`, `/reserve`, `/reservation/success`, `/cart`, `/reviews`
- Admin: `/editor`, `/dashboard`
- Staff: `/hall`, `/orders`
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
**Title**: Build live hall map for Hostess  
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
