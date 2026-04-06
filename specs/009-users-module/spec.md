# Feature Specification: Users Module

**Feature Branch**: `009-users-module`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Users Module - Admin user management with role updates, active/inactive toggle, payment history, avatar upload, and deletion safeguards"
**PRD Reference**: §5.7 Users Module, §4 Database Schema (`users`), §6 API Endpoints

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Views and Searches Users (Priority: P1)

An administrator wants to see all registered users on the platform with pagination and view detailed information about any specific user.

**Why this priority**: Visibility into the user base is the foundation for all user management actions.

**Independent Test**: Can be tested by creating users and listing them with pagination, and viewing individual user details.

**Acceptance Scenarios**:

1. **Given** 30 registered users, **When** the admin requests page 1 with limit 10, **Then** 10 users are returned with pagination metadata indicating 30 total.
2. **Given** users exist, **When** the admin requests sorted by created_at descending, **Then** users are returned newest first.
3. **Given** a user with ID "abc-123", **When** the admin requests that user's detail, **Then** all fields are returned (email, full_name, avatar_url, role, is_active, stripe_customer_id, timestamps).
4. **Given** a non-existent user ID, **When** the admin requests it, **Then** a "not found" error is returned.
5. **Given** an unauthenticated or non-admin user, **When** they attempt to list users, **Then** the request is rejected.

---

### User Story 2 - Admin Updates User Roles (Priority: P1)

An administrator wants to promote or demote users between `admin` and `user` roles to manage access control.

**Why this priority**: Role management directly controls platform access and security — critical for governance.

**Independent Test**: Can be tested by changing a user's role and verifying the change persists and affects that user's access.

**Acceptance Scenarios**:

1. **Given** a user with role `user`, **When** the admin updates their role to `admin`, **Then** the role is changed to `admin`.
2. **Given** a user with role `admin`, **When** the admin updates their role to `user`, **Then** the role is changed to `user`.
3. **Given** an invalid role value (not `admin` or `user`), **When** the admin submits a role update, **Then** a validation error is returned.

---

### User Story 3 - Admin Toggles User Active/Inactive Status (Priority: P1)

An administrator wants to deactivate a user account (e.g., for policy violations) without deleting their data. They can also reactivate previously deactivated accounts.

**Why this priority**: Account suspension is a critical security and moderation tool.

**Independent Test**: Can be tested by toggling a user's status and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** an active user, **When** the admin deactivates them, **Then** `is_active = false`.
2. **Given** an inactive user, **When** the admin reactivates them, **Then** `is_active = true`.
3. **Given** the currently authenticated admin, **When** they attempt to deactivate their own account, **Then** the request is rejected with a self-deactivation prevention error.

---

### User Story 4 - Admin Views User Payment History (Priority: P2)

An administrator wants to see all payments associated with a specific user to review their transaction history.

**Why this priority**: Payment history provides financial context for user management decisions.

**Independent Test**: Can be tested by creating payments linked to a user and requesting that user's payment history.

**Acceptance Scenarios**:

1. **Given** user "abc-123" has 5 payments, **When** the admin requests their payment history, **Then** all 5 payments are returned with full details.
2. **Given** a user with no payments, **When** the admin requests their payment history, **Then** an empty list is returned.
3. **Given** a non-existent user ID, **When** the admin requests their payment history, **Then** a "not found" error is returned.

---

### User Story 5 - Admin Manages User Avatars (Priority: P2)

An administrator wants to upload or update a user's profile avatar image via the dashboard.

**Why this priority**: Avatar management enhances the user profile but is secondary to access control.

**Independent Test**: Can be tested by uploading an avatar for a user and verifying the avatar_url is stored.

**Acceptance Scenarios**:

1. **Given** an existing user, **When** the admin uploads an avatar image, **Then** `avatar_url` is set to the cloud storage URL.
2. **Given** a user with an existing avatar, **When** the admin uploads a new one, **Then** the old avatar is replaced (old image MAY be purged from storage).

---

### User Story 6 - Admin Deletes a User Account (Priority: P3)

An administrator wants to remove a user account from the system. However, users with payment records cannot be deleted to preserve financial audit trails.

**Why this priority**: Deletion is a destructive action used less frequently; the safeguard is the critical piece.

**Independent Test**: Can be tested by attempting to delete a user with payments (should fail) and a user without payments (should succeed).

**Acceptance Scenarios**:

1. **Given** a user with no payment records, **When** the admin deletes them, **Then** the user account is removed from the system.
2. **Given** a user with payment records, **When** the admin attempts to delete them, **Then** the request is rejected with a clear error explaining that users with payment history cannot be deleted.
3. **Given** a deleted user had an avatar image, **When** the deletion succeeds, **Then** the avatar is purged from cloud storage.

---

### Edge Cases

- What happens when the last admin tries to deactivate themselves? The system MUST prevent self-deactivation to avoid lockout.
- What happens when an admin changes their own role to `user`? This SHOULD be allowed but the system should warn about potential lockout if they are the last admin.
- What happens when a user is deactivated while they have a pending payment? Deactivation MUST proceed; the pending payment follows its normal webhook lifecycle.
- User email cannot be changed from the dashboard — that is an auth concern marked as out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated admins to list all users with pagination and sorting.
- **FR-002**: System MUST allow admins to view a single user's full profile by ID.
- **FR-003**: System MUST allow admins to update a user's role between `admin` and `user`.
- **FR-004**: System MUST allow admins to toggle a user's `is_active` status.
- **FR-005**: System MUST prevent an admin from deactivating their own account.
- **FR-006**: System MUST allow admins to view a specific user's payment history.
- **FR-007**: System MUST allow admins to upload/update a user's avatar image (stored in cloud storage).
- **FR-008**: System MUST allow admins to delete a user account only if that user has no payment records.
- **FR-009**: System MUST return a clear error when attempting to delete a user with payment history.
- **FR-010**: System MUST purge the user's avatar from cloud storage upon successful deletion.
- **FR-011**: System MUST NOT allow email changes from the admin dashboard (out of scope).
- **FR-012**: System MUST reject all admin operations from unauthenticated or unauthorized users.

### Key Entities

- **User**: Represents a registered platform user. Key attributes: email (unique), full name, avatar image, role (admin/user), payment gateway customer ID, active status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can list and search users with response times under 2 seconds.
- **SC-002**: Self-deactivation prevention works with 100% reliability.
- **SC-003**: User deletion with payment records is blocked with a clear, actionable error message.
- **SC-004**: Avatar upload completes in under 30 seconds.
- **SC-005**: Role changes take effect immediately on the user's next request.

## Assumptions

- Authentication and authorization are already implemented.
- Cloud storage upload/delete is provided by the Media/Storage Module.
- User email management is an auth concern and is explicitly out of scope for this module.
- Payment history is read from the payments table via user_id foreign key.
- "Delete" means hard delete (the user record is removed); there is no soft-delete mechanism.
