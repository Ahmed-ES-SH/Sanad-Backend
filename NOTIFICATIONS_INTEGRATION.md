# Notifications Integration Guide

> **For Frontend Developers**  
> This document explains how to integrate the real-time notification system into your frontend application.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [WebSocket Connection](#websocket-connection)
4. [REST API Endpoints](#rest-api-endpoints)
5. [WebSocket Events](#websocket-events)
6. [Error Handling](#error-handling)

---

## Overview

The notification system provides real-time notifications via WebSocket and REST API:

| Feature            | Technology           |
| ------------------ | -------------------- |
| Real-time delivery | Socket.IO v4         |
| REST API           | NestJS REST          |
| Authentication     | JWT Token            |
| Database           | PostgreSQL + TypeORM |

---

## Authentication

### REST API Authentication

All notification endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### WebSocket Authentication

WebSocket connections require the JWT token in one of these ways:

1. **Query parameter** (recommended):

   ```
   ws://server:port?token=<your_jwt_token>
   ```

2. **Authorization header**:
   ```
   Authorization: Bearer <your_jwt_token>
   ```

---

## WebSocket Connection

### Connection Setup

```typescript
import { io, Socket } from 'socket.io-client';

// Define event types
interface ServerToClientEvents {
  'notification:new': (notification: Notification) => void;
  'notification:read': (data: { notificationId: string }) => void;
  'notification:read_all': () => void;
  'notification:count': (data: { unreadCount: number }) => void;
  'notification:delete': (data: { notificationId: string }) => void;
}

interface ClientToServerEvents {
  'notification:read': (data: { notificationId: string }) => void;
  'notification:read_all': () => void;
}

// Create socket connection
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  'http://localhost:5000',
  {
    auth: {
      token: 'your_jwt_token_here', // Will be sent as query param
    },
    transports: ['websocket'],
  },
);

// Connection events
socket.on('connect', () => {
  console.log('Connected to notification server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from notification server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Listening for Notifications

```typescript
// Listen for new notifications
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show toast/notification in UI
});

// Listen for read update (single notification)
socket.on('notification:read', ({ notificationId }) => {
  console.log('Notification marked as read:', notificationId);
  // Update UI to show notification as read
});

// Listen for read all update
socket.on('notification:read_all', () => {
  console.log('All notifications marked as read');
  // Update UI to show all notifications as read
});

// Listen for unread count update
socket.on('notification:count', ({ unreadCount }) => {
  console.log('Unread count:', unreadCount);
  // Update badge count in navbar
});

// Listen for delete update
socket.on('notification:delete', ({ notificationId }) => {
  console.log('Notification deleted:', notificationId);
  // Remove notification from UI
});
```

### Sending Messages (Optional)

```typescript
// Mark a notification as read via WebSocket (optional - REST is recommended)
socket.emit('notification:read', { notificationId: 'uuid-here' });

// Mark all notifications as read via WebSocket (optional - REST is recommended)
socket.emit('notification:read_all');
```

---

## REST API Endpoints

### Base URL

```
http://localhost:5000/api
```

---

### 1. Get Paginated Notifications

Fetch notifications for the current user with pagination.

**Endpoint:** `GET /notifications`

**Query Parameters:**

| Parameter | Type   | Required | Default | Description               |
| --------- | ------ | -------- | ------- | ------------------------- |
| page      | number | No       | 1       | Page number (minimum: 1)  |
| limit     | number | No       | 20      | Items per page (max: 100) |

**Request Example:**

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "user-uuid-here",
      "type": "PAYMENT_SUCCESS",
      "title": "Payment Successful",
      "message": "Your payment of $100 has been processed successfully.",
      "data": {
        "paymentId": "pay_123",
        "amount": 100
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-04-09T10:30:00.000Z",
      "updatedAt": "2026-04-09T10:30:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "userId": "user-uuid-here",
      "type": "ORDER_UPDATED",
      "title": "Order Status Updated",
      "message": "Your order #12345 has been shipped.",
      "data": {
        "orderId": "ord_123",
        "status": "SHIPPED"
      },
      "isRead": true,
      "readAt": "2026-04-08T15:20:00.000Z",
      "createdAt": "2026-04-08T14:00:00.000Z",
      "updatedAt": "2026-04-08T15:20:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### 2. Get Unread Count

Get the count of unread notifications for the current user.

**Endpoint:** `GET /notifications/unread-count`

**Request Example:**

```bash
curl -X GET "http://localhost:5000/api/notifications/unread-count" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "unreadCount": 5
}
```

---

### 3. Mark Notification as Read

Mark a single notification as read.

**Endpoint:** `PATCH /notifications/:id/read`

**Path Parameters:**

| Parameter | Type          | Required | Description     |
| --------- | ------------- | -------- | --------------- |
| id        | string (UUID) | Yes      | Notification ID |

**Request Example:**

```bash
curl -X PATCH "http://localhost:5000/api/notifications/a1b2c3d4-e5f6-7890-abcd-ef1234567890/read" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-uuid-here",
  "type": "PAYMENT_SUCCESS",
  "title": "Payment Successful",
  "message": "Your payment of $100 has been processed successfully.",
  "data": {
    "paymentId": "pay_123",
    "amount": 100
  },
  "isRead": true,
  "readAt": "2026-04-09T11:00:00.000Z",
  "createdAt": "2026-04-09T10:30:00.000Z",
  "updatedAt": "2026-04-09T11:00:00.000Z"
}
```

---

### 4. Mark All Notifications as Read

Mark all notifications as read for the current user.

**Endpoint:** `PATCH /notifications/read-all`

**Request Example:**

```bash
curl -X PATCH "http://localhost:5000/api/notifications/read-all" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "success": true
}
```

---

### 5. Delete Notification (Soft Delete)

Soft delete a notification (marks as deleted, doesn't permanently remove).

**Endpoint:** `DELETE /notifications/:id`

**Path Parameters:**

| Parameter | Type          | Required | Description     |
| --------- | ------------- | -------- | --------------- |
| id        | string (UUID) | Yes      | Notification ID |

**Request Example:**

```bash
curl -X DELETE "http://localhost:5000/api/notifications/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:** `204 No Content` (empty response)

---

### 6. Get Notification Preferences

Get the current user's notification preferences.

**Endpoint:** `GET /notifications/preferences`

**Request Example:**

```bash
curl -X GET "http://localhost:5000/api/notifications/preferences" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "id": "pref-uuid-here",
  "userId": "user-uuid-here",
  "orderNotifications": true,
  "paymentNotifications": true,
  "systemNotifications": true,
  "emailEnabled": true,
  "pushEnabled": true,
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-09T10:00:00.000Z"
}
```

---

### 7. Update Notification Preferences

Update the current user's notification preferences.

**Endpoint:** `PATCH /notifications/preferences`

**Query Parameters:**

| Parameter            | Type    | Required | Description                  |
| -------------------- | ------- | -------- | ---------------------------- |
| orderNotifications   | boolean | No       | Enable order notifications   |
| paymentNotifications | boolean | No       | Enable payment notifications |
| systemNotifications  | boolean | No       | Enable system notifications  |
| emailEnabled         | boolean | No       | Enable email notifications   |
| pushEnabled          | boolean | No       | Enable push notifications    |

**Request Example:**

```bash
curl -X PATCH "http://localhost:5000/api/notifications/preferences?orderNotifications=true&paymentNotifications=false" \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response Example:**

```json
{
  "id": "pref-uuid-here",
  "userId": "user-uuid-here",
  "orderNotifications": true,
  "paymentNotifications": false,
  "systemNotifications": true,
  "emailEnabled": true,
  "pushEnabled": true,
  "createdAt": "2026-04-01T00:00:00.000Z",
  "updatedAt": "2026-04-09T12:00:00.000Z"
}
```

---

## Admin Endpoints (RESTricted to Admin Role)

### 1. Send Notification to Specific User

Send a notification to a specific user (admin only).

**Endpoint:** `POST /api/admin/notifications/send`

**Request Body:**

```json
{
  "userId": "target-user-uuid",
  "type": "SYSTEM",
  "title": "Welcome!",
  "message": "Welcome to our platform!",
  "data": {
    "key": "value"
  }
}
```

| Field   | Type          | Required | Description                                                                                    |
| ------- | ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| userId  | string (UUID) | Yes      | Target user ID                                                                                 |
| type    | string (enum) | Yes      | Notification type: `ORDER_UPDATED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `SYSTEM`, `BROADCAST` |
| title   | string        | Yes      | Notification title                                                                             |
| message | string        | Yes      | Notification message                                                                           |
| data    | object        | No       | Additional data as key-value pairs                                                             |

**Response Example:**

```json
{
  "id": "notif-uuid-here",
  "userId": "target-user-uuid",
  "type": "SYSTEM",
  "title": "Welcome!",
  "message": "Welcome to our platform!",
  "data": { "key": "value" },
  "isRead": false,
  "readAt": null,
  "createdAt": "2026-04-09T12:00:00.000Z",
  "updatedAt": "2026-04-09T12:00:00.000Z"
}
```

---

### 2. Broadcast Notification

Broadcast a notification to all users or specific users (admin only).

**Endpoint:** `POST /api/admin/notifications/broadcast`

**Request Body:**

```json
{
  "title": "System Maintenance",
  "message": "We will be performing maintenance on Sunday at 2 AM.",
  "targetUserIds": ["user-1-uuid", "user-2-uuid"],
  "data": {
    "maintenanceWindow": "2:00 AM - 4:00 AM"
  }
}
```

| Field         | Type             | Required | Description                                                 |
| ------------- | ---------------- | -------- | ----------------------------------------------------------- |
| title         | string           | Yes      | Notification title                                          |
| message       | string           | Yes      | Notification message                                        |
| targetUserIds | array of strings | No       | Specific user IDs. If not provided, broadcasts to all users |
| data          | object           | No       | Additional data                                             |

**Response Example:**

```json
{
  "success": true
}
```

---

### 3. Get All Notifications (Admin)

Get all notifications paginated (admin only).

**Endpoint:** `GET /api/admin/notifications`

**Query Parameters:**

| Parameter | Type   | Required | Default | Description    |
| --------- | ------ | -------- | ------- | -------------- |
| page      | number | No       | 1       | Page number    |
| limit     | number | No       | 20      | Items per page |

**Response Example:**

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### 4. Hard Delete Notification (Admin)

Permanently delete a notification (admin only).

**Endpoint:** `DELETE /api/admin/notifications/:id`

**Response:** `204 No Content`

---

## Notification Types

The system supports the following notification types:

| Type              | Description          | Possible Data Fields            |
| ----------------- | -------------------- | ------------------------------- |
| `ORDER_UPDATED`   | Order status changes | `orderId`, `status`             |
| `PAYMENT_SUCCESS` | Successful payment   | `paymentId`, `amount`           |
| `PAYMENT_FAILED`  | Failed payment       | `paymentId`, `amount`, `reason` |
| `SYSTEM`          | System notifications | Custom fields                   |
| `BROADCAST`       | Broadcast messages   | Custom fields                   |

---

## WebSocket Events Summary

### Server → Client Events

| Event                   | Payload                      | Description                        |
| ----------------------- | ---------------------------- | ---------------------------------- |
| `notification:new`      | `Notification` object        | New notification received          |
| `notification:read`     | `{ notificationId: string }` | Single notification marked as read |
| `notification:read_all` | none                         | All notifications marked as read   |
| `notification:count`    | `{ unreadCount: number }`    | Unread count updated               |
| `notification:delete`   | `{ notificationId: string }` | Notification deleted               |

### Client → Server Events

| Event                   | Payload                      | Description               |
| ----------------------- | ---------------------------- | ------------------------- |
| `notification:read`     | `{ notificationId: string }` | Mark notification as read |
| `notification:read_all` | none                         | Mark all as read          |

---

## Error Handling

### HTTP Status Codes

| Status Code | Description                                      |
| ----------- | ------------------------------------------------ |
| 200         | Success                                          |
| 201         | Created                                          |
| 204         | No Content (successful delete)                   |
| 400         | Bad Request (validation error)                   |
| 401         | Unauthorized (invalid/missing token)             |
| 403         | Forbidden (not authorized, e.g., admin endpoint) |
| 404         | Not Found                                        |
| 500         | Internal Server Error                            |

### Error Response Format

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

### WebSocket Error Handling

```typescript
socket.on('connect_error', (error) => {
  if (error.message === 'WebSocket token not provided') {
    // Handle missing token
    console.error('Please provide a valid JWT token');
  } else if (error.message === 'Invalid WebSocket token') {
    // Handle invalid token
    console.error('Token is invalid or expired');
  } else if (error.message === 'Token has been revoked') {
    // Handle blacklisted token
    console.error('Please login again');
  }
});
```

---

## Complete Example: React Integration

```tsx
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ServerToClientEvents {
  'notification:new': (notification: Notification) => void;
  'notification:read': (data: { notificationId: string }) => void;
  'notification:read_all': () => void;
  'notification:count': (data: { unreadCount: number }) => void;
  'notification:delete': (data: { notificationId: string }) => void;
}

export function useNotifications(token: string) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents> | null>(
    null,
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification server');
    });

    newSocket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on('notification:read', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    newSocket.on('notification:read_all', () => {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    });

    newSocket.on('notification:count', ({ unreadCount }) => {
      setUnreadCount(unreadCount);
    });

    newSocket.on('notification:delete', ({ notificationId }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(
    async (page = 1, limit = 20) => {
      const response = await fetch(
        `http://localhost:5000/api/notifications?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      setNotifications(data.data);
      return data;
    },
    [token],
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const response = await fetch(
      'http://localhost:5000/api/notifications/unread-count',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = await response.json();
    setUnreadCount(data.unreadCount);
  }, [token]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    },
    [token],
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    await fetch('http://localhost:5000/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  }, [token]);

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    [token],
  );

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
```

---

## Support

If you encounter any issues or have questions:

1. Check the error messages in the response
2. Verify your JWT token is valid and not expired
3. Ensure your user account has the required permissions
4. Check the server logs for detailed error information

---

_Document Version: 1.0_  
_Last Updated: 2026-04-09_
