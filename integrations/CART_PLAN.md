# Cart Integration Plan

## 1. Overview

This plan outlines the integration of the Cart module between the Next.js frontend and the NestJS backend. The cart allows authenticated users to manage their selected services before checkout. All cart operations require JWT authentication via the `Bearer` token strategy defined in the `AUTH_PLAN.md`.

---

## 2. Data Models

### Cart Entity

```typescript
interface Cart {
  id: string; // UUID
  userId: number; // FK to User
  user: User; // Relation (joined on demand)
  items: CartItem[]; // Array of cart items
  totalAmount: number; // Total price (decimal)
  createdAt: Date;
  updatedAt: Date;
}
```

### CartItem Entity

```typescript
interface CartItem {
  id: string; // UUID
  cartId: string; // FK to Cart
  cart: Cart; // Relation
  serviceId: string; // FK to Service (UUID)
  service: Service | null; // Relation (joined on demand)
  quantity: number; // Item quantity (default: 1)
  unitPrice: number; // Price per unit (decimal)
  subtotal: number; // quantity * unitPrice (decimal)
  createdAt: Date;
  updatedAt: Date;
}
```

### Service (Related)

```typescript
interface Service {
  id: string; // UUID
  title: string;
  slug: string;
  basePrice: number; // Service price (decimal)
  iconUrl: string | null;
}
```

---

## 3. Backend API Endpoints

All cart endpoints require:

- **JWT Authentication** — `Authorization: Bearer <token>` header
- **Authenticated User** — Only logged-in users can access their cart

---

### GET /cart

Fetches the current user's cart with all items and calculated totals. Creates a new empty cart if one doesn't exist.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request:**

```
GET /cart
```

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "items": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "serviceTitle": "Web Development",
      "serviceSlug": "web-development",
      "serviceIconUrl": "https://cdn.example.com/icons/web.svg",
      "quantity": 1,
      "unitPrice": 500.0,
      "subtotal": 500.0
    },
    {
      "id": "770a0622-g4bd-63f6-c938-668877662222",
      "serviceId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "serviceTitle": "Mobile App Development",
      "serviceSlug": "mobile-app-development",
      "serviceIconUrl": "https://cdn.example.com/icons/mobile.svg",
      "quantity": 2,
      "unitPrice": 750.0,
      "subtotal": 1500.0
    }
  ],
  "totalItems": 3,
  "totalAmount": 2000.0,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-08T14:30:00.000Z"
}
```

**Empty Cart Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "items": [],
  "totalItems": 0,
  "totalAmount": 0,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-08T14:30:00.000Z"
}
```

**Error Responses:**

| Status             | Body                                   |
| ------------------ | -------------------------------------- |
| `401 Unauthorized` | Invalid, expired, or missing JWT token |

---

### POST /cart/items

Adds a service to the cart. If the service already exists in the cart, it increments the quantity.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

| Field       | Type          | Required | Default | Description               |
| ----------- | ------------- | -------- | ------- | ------------------------- |
| `serviceId` | string (UUID) | Yes      | —       | Service ID to add to cart |
| `quantity`  | number        | No       | `1`     | Quantity (min: 1)         |

**Example Request:**

```json
{
  "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "quantity": 1
}
```

**Success Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "items": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "serviceTitle": "Web Development",
      "serviceSlug": "web-development",
      "serviceIconUrl": "https://cdn.example.com/icons/web.svg",
      "quantity": 1,
      "unitPrice": 500.0,
      "subtotal": 500.0
    }
  ],
  "totalItems": 1,
  "totalAmount": 500.0,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-08T14:30:00.000Z"
}
```

**Error Responses:**

| Status             | Body                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `400 Bad Request`  | `{"statusCode": 400, "message": ["serviceId must be a UUID"], "error": "Bad Request"}`               |
| `401 Unauthorized` | Invalid, expired, or missing JWT token                                                               |
| `404 Not Found`    | `{"statusCode": 404, "message": "Service with ID \"invalid-uuid\" not found", "error": "Not Found"}` |

---

### PUT /cart/items/:itemId

Updates the quantity of a specific cart item.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**

| Parameter | Type          | Required | Description    |
| --------- | ------------- | -------- | -------------- |
| `itemId`  | string (UUID) | Yes      | Cart item UUID |

**Request Body:**

| Field      | Type   | Required | Description           |
| ---------- | ------ | -------- | --------------------- |
| `quantity` | number | No       | New quantity (min: 1) |

**Example Request:**

```json
{
  "quantity": 3
}
```

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "items": [
    {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "serviceTitle": "Web Development",
      "serviceSlug": "web-development",
      "serviceIconUrl": "https://cdn.example.com/icons/web.svg",
      "quantity": 3,
      "unitPrice": 500.0,
      "subtotal": 1500.0
    }
  ],
  "totalItems": 3,
  "totalAmount": 1500.0,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-08T14:30:00.000Z"
}
```

**Error Responses:**

| Status             | Body                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `400 Bad Request`  | `{"statusCode": 400, "message": "Quantity must be at least 1", "error": "Bad Request"}`                |
| `401 Unauthorized` | Invalid, expired, or missing JWT token                                                                 |
| `404 Not Found`    | `{"statusCode": 404, "message": "Cart item with ID \"invalid-uuid\" not found", "error": "Not Found"}` |

---

### DELETE /cart/items/:itemId

Removes a specific item from the cart.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Path Parameters:**

| Parameter | Type          | Required | Description    |
| --------- | ------------- | -------- | -------------- |
| `itemId`  | string (UUID) | Yes      | Cart item UUID |

**Example Request:**

```
DELETE /cart/items/660f9511-f3ac-52e5-b827-557766551111
```

**Success Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 1,
  "items": [],
  "totalItems": 0,
  "totalAmount": 0,
  "createdAt": "2026-04-07T10:00:00.000Z",
  "updatedAt": "2026-04-08T14:30:00.000Z"
}
```

**Error Responses:**

| Status             | Body                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `401 Unauthorized` | Invalid, expired, or missing JWT token                                                                 |
| `404 Not Found`    | `{"statusCode": 404, "message": "Cart item with ID \"invalid-uuid\" not found", "error": "Not Found"}` |

---

### DELETE /cart

Clears all items from the current user's cart.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Request:**

```
DELETE /cart
```

**Success Response (200 OK):**

```json
{
  "message": "Cart cleared successfully"
}
```

**Error Responses:**

| Status             | Body                                   |
| ------------------ | -------------------------------------- |
| `401 Unauthorized` | Invalid, expired, or missing JWT token |

---

### POST /cart/merge

Merges guest cart items from local storage with the authenticated user's cart. This endpoint should be called immediately after a successful login to consolidate any items the user added while browsing as a guest.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

| Field   | Type               | Required | Description                        |
| ------- | ------------------ | -------- | ---------------------------------- |
| `items` | GuestCartItemDto[] | Yes      | Array of guest cart items to merge |

**GuestCartItemDto:**

| Field       | Type          | Required | Description                |
| ----------- | ------------- | -------- | -------------------------- |
| `serviceId` | string (UUID) | Yes      | Service ID from guest cart |
| `quantity`  | number        | Yes      | Quantity (min: 1, max: 99) |

**Example Request:**

```json
{
  "items": [
    { "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "quantity": 2 },
    { "serviceId": "b2c3d4e5-f6a7-8901-bcde-f23456789012", "quantity": 1 }
  ]
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Cart merged successfully",
  "cart": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": 1,
    "items": [
      {
        "id": "660f9511-f3ac-52e5-b827-557766551111",
        "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "serviceTitle": "Web Development",
        "serviceSlug": "web-development",
        "serviceIconUrl": "https://cdn.example.com/icons/web.svg",
        "quantity": 3,
        "unitPrice": 500.0,
        "subtotal": 1500.0
      },
      {
        "id": "770a0622-g4bd-63f6-c938-668877662222",
        "serviceId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
        "serviceTitle": "Mobile App Development",
        "serviceSlug": "mobile-app-development",
        "serviceIconUrl": "https://cdn.example.com/icons/mobile.svg",
        "quantity": 1,
        "unitPrice": 750.0,
        "subtotal": 750.0
      }
    ],
    "totalItems": 4,
    "totalAmount": 2250.0,
    "createdAt": "2026-04-07T10:00:00.000Z",
    "updatedAt": "2026-04-08T14:30:00.000Z"
  },
  "failedItems": []
}
```

**Partial Merge Response (200 OK):**

When some items fail validation, the response includes `failedItems` with reasons:

```json
{
  "success": false,
  "message": "Partially merged: 1 of 2 items",
  "cart": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": 1,
    "items": [
      {
        "id": "660f9511-f3ac-52e5-b827-557766551111",
        "serviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "serviceTitle": "Web Development",
        "serviceSlug": "web-development",
        "serviceIconUrl": "https://cdn.example.com/icons/web.svg",
        "quantity": 2,
        "unitPrice": 500.0,
        "subtotal": 1000.0
      }
    ],
    "totalItems": 2,
    "totalAmount": 1000.0,
    "createdAt": "2026-04-07T10:00:00.000Z",
    "updatedAt": "2026-04-08T14:30:00.000Z"
  },
  "failedItems": [
    {
      "serviceId": "invalid-uuid",
      "reason": "Service not found or unavailable"
    }
  ]
}
```

**Error Responses:**

| Status             | Body                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `400 Bad Request`  | `{"statusCode": 400, "message": ["items must be an array", "items[0].serviceId must be a UUID"], "error": "Bad Request"}` |
| `401 Unauthorized` | Invalid, expired, or missing JWT token                                                                                    |

---

## 4. Frontend Integration - Guest Cart Merge Flow

### Cart Context / State Management

Implement a cart context or store (e.g., using React Context, Zustand, or Redux) to manage:

- Cart data (items, totals)
- Loading states for async operations
- Error handling

### Recommended Structure

```
src/
  context/
    CartContext.tsx
  hooks/
    useCart.ts
  actions/
    cartActions.ts
```

---

## 5. Server Actions

Create a dedicated actions file for cart mutations: `app/actions/cartActions.ts`

**Planned Actions:**

| Action                             | Backend Endpoint             | Description                  |
| ---------------------------------- | ---------------------------- | ---------------------------- |
| `getCart()`                        | `GET /cart`                  | Fetch user's cart            |
| `addToCart(serviceId, quantity)`   | `POST /cart/items`           | Add service to cart          |
| `updateCartItem(itemId, quantity)` | `PUT /cart/items/:itemId`    | Update item quantity         |
| `removeFromCart(itemId)`           | `DELETE /cart/items/:itemId` | Remove item from cart        |
| `clearCart()`                      | `DELETE /cart`               | Clear all cart items         |
| `mergeCart(guestItems)`            | `POST /cart/merge`           | Merge guest cart after login |

---

## 6. Guest Cart Merge Flow (Post-Login)

### When to Call

Call `POST /cart/merge` immediately after:

- User logs in via email/password
- User logs in via Google OAuth
- User registers a new account

### Flow

1. **Before Login:** Guest cart is stored in local storage (frontend)
2. **User Clicks Login:** Perform authentication
3. **On Success:** Call `POST /cart/merge` with guest cart items
4. **Response:** Get merged cart and replace local storage cart
5. **Clear Guest Cart:** Clear local storage cart items
6. **Sync State:** Update React cart context with merged cart

### Frontend Implementation Example

```typescript
// After successful login
async function handleLogin(credentials) {
  const response = await login(credentials); // Your auth function
  const { token, user } = response;

  // Get guest cart from local storage
  const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');

  if (guestCart.length > 0) {
    // Merge guest cart with user cart
    const merged = await fetch('/cart/merge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items: guestCart }),
    }).then((res) => res.json());

    // Update cart context with merged cart
    setCart(merged.cart);

    // Clear local guest cart
    localStorage.removeItem('guestCart');
  } else {
    // Just fetch the user's cart
    const cart = await fetch('/cart', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => res.json());
    setCart(cart);
  }

  // Set auth token
  setAuthToken(token);
}
```

### Guest Cart Storage (Pre-Authentication)

While the user is not authenticated, store cart items in local storage:

```typescript
// Add to cart (guest mode)
function addToCartGuest(serviceId, quantity = 1) {
  const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]');

  const existingIndex = guestCart.findIndex(
    (item) => item.serviceId === serviceId,
  );
  if (existingIndex >= 0) {
    guestCart[existingIndex].quantity += quantity;
  } else {
    guestCart.push({ serviceId, quantity });
  }

  localStorage.setItem('guestCart', JSON.stringify(guestCart));
  updateCartCount(guestCart.reduce((sum, item) => sum + item.quantity, 0));
}
```

---

## 7. Implementation Steps

1. **Cart Context:** Create `CartContext` to manage cart state globally
2. **API Client:** Ensure authenticated API client includes `Authorization: Bearer <token>` header
3. **Add to Cart Button:** Add to service cards/pages that trigger `addToCart()` action
4. **Cart Page:** Create `app/[local]/(routes)/cart/page.tsx` to display cart contents
5. **Quantity Controls:** Implement +/- buttons or input for quantity updates
6. **Remove Item:** Add remove buttons for each cart item
7. **Guest Cart Storage:** Implement local storage cart for unauthenticated users
8. **Merge on Login:** Call `POST /cart/merge` after successful authentication
9. **Checkout Integration:** Connect cart totals to checkout flow

---

## 8. Key Business Rules

| Rule                          | Details                                              |
| ----------------------------- | ---------------------------------------------------- |
| **Auth required**             | All cart operations require authenticated user       |
| **One cart per user**         | Each user has exactly one cart                       |
| **Auto-create cart**          | Cart is automatically created on first access        |
| **Increment on duplicate**    | Adding existing service increases quantity           |
| **Min quantity**              | Quantity must be at least 1                          |
| **Max quantity**              | Quantity cannot exceed 99 per item                   |
| **Auto-calculate totals**     | Cart totals calculated on server                     |
| **Cascade delete**            | Deleting user removes their cart                     |
| **Never trust client prices** | Prices are always fetched from database during merge |
| **Merge conflict handling**   | Guest quantity + existing quantity = new quantity    |
| **Partial merge support**     | Some items can fail while others succeed             |

---

## 9. Security Considerations

1. **Price Validation:** Never accept prices from client - always fetch from database
2. **Quantity Limits:** Enforce min (1) and max (99) quantity limits
3. **Service Validation:** Verify service exists before adding to cart
4. **JWT Authentication:** All merge requests must include valid JWT token
5. **User Ownership:** Ensure cart items belong to the authenticated user

---

## 10. UI/UX Recommendations

1. **Sticky Cart Summary:** Display cart icon with item count in header
2. **Add to Cart Feedback:** Show toast/notification on successful add
3. **Optimistic Updates:** Update UI immediately while API processes
4. **Loading States:** Show skeleton/spinner while fetching
5. **Empty State:** Friendly message when cart is empty with link to services
6. **Quantity Limits:** Disable decrement at 1 (use remove instead)
