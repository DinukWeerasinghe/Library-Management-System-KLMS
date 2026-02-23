# KLMS — Kandy Library Management System
## User Manual

**Version:** Refer to Settings → About for the current version  
**Platform:** Windows Desktop Application (Electron)  
**Audience:** Librarians, Administrators, and Teachers

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started — First Launch & Login](#2-getting-started)
3. [Application Layout](#3-application-layout)
4. [Book Checkout (Issue Book)](#4-book-checkout-issue-book)
5. [Book Returns](#5-book-returns)
6. [Members Management](#6-members-management)
7. [Books Management](#7-books-management)
8. [Reports](#8-reports)
9. [User Management](#9-user-management)
10. [Activity Log](#10-activity-log)
11. [Settings](#11-settings)
12. [Data & Storage — Backup and Restore](#12-data--storage)
13. [Security Features](#13-security-features)
14. [Troubleshooting](#14-troubleshooting)
15. [Appendix — Roles & Permissions](#15-appendix--roles--permissions)

---

## 1. Introduction

**KLMS** (Kandy Library Management System) is a desktop application designed for school libraries. It manages library members (students and teachers), the book catalogue, lending transactions (issuing and returning books), overdue tracking, fine calculation, and library reporting.

The system supports:
- Barcode scanner integration for fast checkouts and returns
- Multiple user accounts with Role-Based Access Control (RBAC)
- Fully offline operation — all data is stored locally in a secure database
- Automatic database backup on application exit

---

## 2. Getting Started

### 2.1 Splash Screen & Boot Process

When KLMS launches, a splash screen appears while the application:
1. Connects to the local database
2. Runs any required schema migrations
3. Loads configuration and feature settings
4. Initializes active sessions

This process takes a few seconds. Once complete, the **Login** screen appears.

### 2.2 Logging In

1. Enter your **Username** and **Password**.
2. Click **Login** (or press Enter).
3. If credentials are valid, you are taken to the main **Dashboard**.

> **Default Admin Credentials:** Contact your system administrator for the initial admin username and password.

### 2.3 Logging Out

Click the **Logout** button at the bottom of the left sidebar at any time. You will be returned to the Login screen.

---

## 3. Application Layout

The application consists of two main areas:

| Area | Description |
|---|---|
| **Left Sidebar** | Navigation menu to switch between modules |
| **Main Content Area** | The active page/module |

### 3.1 Sidebar Navigation

The sidebar displays the following items (depending on your role):

| Icon / Label | Module |
|---|---|
| **Book Checkout** | Issue a book to a member |
| **Book Returns** | Process a book return |
| **Members** | Manage library members |
| **Books** | Manage the book catalogue |
| **Reports** | View and export library reports |
| **Users** | Manage system user accounts (Admin only) |
| **Settings** | System configuration and branding |
| **Activity Log** | View all system events |

The sidebar also displays the **currently logged-in user's name and role** and a **Logout** button.

---

## 4. Book Checkout (Issue Book)

Navigate to **Book Checkout** from the sidebar. This is the primary daily-use screen for issuing books to members.

### 4.1 Workflow Overview

The checkout screen is split into two panels:
1. **STEP 1: IDENTIFY MEMBER** — left panel
2. **STEP 2: IDENTIFY BOOK** — right panel

Once both a member and a book are identified, click **ISSUE BOOK** at the bottom.

### 4.2 Identifying a Member

**Method A — Barcode Scanner:**
- Focus the **Scan Member ID Card** field (it is auto-focused on page load).
- Scan the member's ID card barcode. The member's details appear instantly in the identity card below.

**Method B — Manual Selection:**
- Use the **"Or Select Name manually..."** dropdown to search and pick a member by name and member code.

Once identified, the member's name, type (Student/Teacher), member code, active borrowings, and membership validity status are displayed.

> ⚠️ If a member's **Membership** shows as **Expired**, the system will warn accordingly.

### 4.3 Identifying a Book

**Method A — Barcode Scanner:**
- After a member is identified, the cursor moves automatically to the **Scan Book Barcode or ISBN** field.
- Scan the book's barcode or ISBN. The book's title, author, category, and number of available copies are displayed.

**Method B — Manual Selection:**
- Use the **"Or Select Title manually..."** dropdown to choose a book. Only books with available copies are shown.

> ⚠️ If a book has 0 copies available, a warning is shown and the book cannot be selected.

### 4.4 Issuing the Book

Once both member and book are identified:
- The footer displays the **Borrowing Period** (e.g., 14 days) and the calculated **Return By** date.
- Click **ISSUE BOOK** to complete the transaction.
- A success message is shown and the form resets for the next transaction.

---

## 5. Book Returns

Navigate to **Book Returns** from the sidebar. This screen handles returning borrowed books.

### 5.1 Scan-Based Workflow (Recommended)

The return terminal uses a single scan field that works in two steps:

**Step 1 — Scan Member ID Card:**
- The scan field prompts for a Member ID. Scan the member's barcode.
- The member's details and a count of their currently borrowed books appear in the left panel.
- The cursor stays in the scan field, ready for Step 2.

**Step 2 — Scan Book to Return:**
- Scan the book's barcode or ISBN.
- The system finds the active issue for that member and that book, marks it as returned, and displays a **Return Receipt** with the book title, member name, and any fine amount owed.

**Switching Member:**
- Scan a different member's ID card while in Step 2 to instantly switch the active member context.
- Alternatively, click the **CHANGE** button next to the member's name.

### 5.2 Manual Return

The **Active Issues** table below the scan panels lists all currently issued books. You can:
- Click **RETURN** next to any row to manually process a return.
- (If enabled) Click **RENEW** to extend the due date for a borrowed book.

The table highlights **OVERDUE** items in a different colour.

### 5.3 Fines on Return

If the **Fine Calculation** feature is enabled and the book is returned past its due date, the return receipt will display the calculated fine amount (in LKR). The system calculates this based on the fine per day value configured in Settings.

---

## 6. Members Management

Navigate to **Members** from the sidebar to manage library members.

### 6.1 Viewing Members

Members are displayed in a sortable, searchable table showing:
- Member Code, Name, Type (Student/Teacher), Email, Phone, and Membership Status.

Use the **Search** bar to filter members by name or member code.

### 6.2 Adding a Member

1. Click **Add Member**.
2. Fill in the required fields:
   - **Name** (required)
   - **Member Type:** Student or Teacher
   - **Email**, **Phone**, **Address** (optional)
   - **Member Code** (auto-generated or manually set)
   - **Validity From / Validity To** dates (if membership validity is enabled)
3. Click **Save**.

### 6.3 Editing a Member

Click the **Edit** button (pencil icon) next to a member's row, update the details, and click **Save**.

### 6.4 Deleting a Member

Click the **Delete** button (trash icon) next to a member. A confirmation dialog will appear. Note: members with active (unreturned) books cannot be deleted.

### 6.5 Generating a Member ID Card

Click the **ID Card** button (if available) next to a member to generate and print a membership ID card with their barcode.

### 6.6 Importing Members (Bulk)

1. Click **Import Members**.
2. Click "Select File" and choose a CSV file.
3. Map the CSV columns to the required fields (Name, Member Type, etc.).
4. Click **Import**.

The import is recorded in **Import History** under Settings, and can be rolled back by an Admin if needed.

---

## 7. Books Management

Navigate to **Books** from the sidebar to manage the book catalogue.

### 7.1 Viewing Books

Books are listed in a table showing: Title, Author, ISBN, Internal Code, Category, Total Copies, and Available Copies.

Use the **Search** bar to find books by title, author, or ISBN.

### 7.2 Adding a Book

1. Click **Add Book**.
2. Fill in the details:
   - **Title** (required)
   - **Author**
   - **ISBN** (standard international identifier)
   - **Internal Code** (your library's internal barcode code)
   - **Category** (if categories are enabled)
   - **Total Copies** (number of physical copies owned)
3. Click **Save**.

### 7.3 Editing and Deleting Books

- Click **Edit** to update a book's information.
- Click **Delete** to remove a book. Books with active (unreturned) issues cannot be deleted.

### 7.4 Importing Books (Bulk)

1. Click **Import Books**.
2. Choose a CSV file and map the columns.
3. Click **Import**.

As with member imports, book imports are tracked and can be rolled back from Settings.

---

## 8. Reports

Navigate to **Reports** from the sidebar.

> ⚠️ **Note:** The Reports module must be enabled in **Settings → Feature Toggles** before it can be used.

### 8.1 Report Types

| Report | Description |
|---|---|
| **Issued Books Report** | All books currently issued or issued within a date range |
| **Returned Books Report** | All books returned within a date range |
| **Overdue Books Report** | All currently overdue books |
| **Member-wise Borrowing Report** | Borrowing history filtered by a specific member |

### 8.2 Filters

- **Report Type:** Select from the dropdown
- **Date Range:** Set From Date and To Date to filter by issue/return date
- **Member (for Member-wise report):** Select a specific member or leave as "All Members"

### 8.3 Summary Statistics

The top of the Reports page shows four key statistics for the selected filters:
- **Total Issued** — total transactions
- **Total Returned** — completed returns
- **Overdue Now** — currently overdue items
- **Fine Collected** — total fines accrued (in LKR)

### 8.4 Insights

Two insight panels display:
- **Most Borrowed Books** — top books by borrow count
- **Top Active Members** — members with the most issues

### 8.5 Exporting Reports

Click **Export CSV** to download the full detailed report table as a comma-separated values file, ready for Excel or other spreadsheet tools.

---

## 9. User Management

Navigate to **Users** from the sidebar. This section is visible to **Admin** users only.

### 9.1 Viewing Users

The users table shows: Username, Role, and Date Created.

### 9.2 Adding a User

1. Click **Add User**.
2. Enter a **Username** and **Password**.
3. Select a **Role:**
   - **ADMIN** — Full access to all features including Settings, Users, and Branding.
   - **LIBRARIAN** — Access to all day-to-day operations (issue, return, members, books, reports).
   - **TEACHER** — Limited access role.
4. Click **Create**.

### 9.3 Deleting a User

Click **Delete** next to a user's row and confirm the action. The Admin account cannot be deleted.

### 9.4 Changing Your Own Password

Go to **Settings → Change Password** to update your own password. You will need to provide your current password.

---

## 10. Activity Log

Navigate to **Activity Log** from the sidebar. This page gives a full audit trail of all actions performed in the system.

### 10.1 Columns

| Column | Description |
|---|---|
| **Timestamp** | Date and time of the event |
| **User** | Which system user performed the action |
| **Action** | A code describing the event type |
| **Description** | A human-readable description of the event |

### 10.2 Action Types Tracked

`LOGIN`, `LOGOUT`, `LOCK_SESSION`, `UNLOCK_SESSION`, `ISSUE_BOOK`, `RETURN_BOOK`, `ADD_BOOK`, `DELETE_BOOK`, `REGISTER_MEMBER`, `DELETE_MEMBER`, `UPDATE_SETTINGS`, `EXPORT_REPORT`, `RESET_PASSWORD`

### 10.3 Filtering Logs

Use the filter form to narrow down logs by:
- **From Date / To Date**
- **User** — filter by a specific system user
- **Action Type** — filter by event category

Click **Filter Logs** to apply filters.

### 10.4 Pagination

Logs are displayed 20 per page. Use the **Previous / Next** and page number buttons at the bottom to navigate.

### 10.5 Exporting Logs

Click **Export to CSV** to download the filtered activity log.

---

## 11. Settings

Navigate to **Settings** from the sidebar.

### 11.1 Feature Toggles

Control which features are active in the system. Changes apply immediately without restarting the application.

| Feature | Description |
|---|---|
| Enable fine calculation | Calculates fines for overdue books on return |
| Enable due date tracking | Tracks and displays due dates for issued books |
| Allow renewal | Allows staff to extend a book's due date from the Returns screen |
| Enable reports | Activates the Reports module |
| Enable book categories | Allows categorising books by genre or subject |
| Enforce borrow limit | Prevents a member from borrowing more than the configured maximum |

### 11.2 Configuration (Numeric Settings)

| Setting | Description |
|---|---|
| Max borrow days | Number of days a member can keep a book before it is overdue |
| Max books per member | Maximum number of books a member can borrow simultaneously |
| Fine per day | Amount (in LKR) charged for each day a book is overdue |
| Grace period (days) | Number of days after the due date before fines start accruing |
| Registration Fee | Fee charged at member registration |

Click **Save configuration** to persist these values.

### 11.3 System Branding *(Admin Only)*

Customise the visual appearance of the application:

| Setting | Description |
|---|---|
| Primary Color | Main accent colour used in headers and highlights |
| Secondary Color | Secondary accent colour |
| Sidebar Color | Background colour of the left sidebar |
| Button Color | Background colour of primary action buttons |
| Button Hover Color | Button colour on mouse hover |
| Header Text Color | Text colour used over primary/button backgrounds |
| Background Color | Main application background colour |
| School Name | Your institution's name (shown in the sidebar header) |
| School Logo | Upload an image file (.png, .jpg) to brand the system |

Click **Save branding** to apply. Changes take effect immediately without a restart.

### 11.4 Application Security *(Admin Only)*

**Exit PIN:**
- Toggle **Enable Exit PIN** to require a numeric PIN before closing the application window.
- When enabled, enter your PIN in the **Set Exit PIN** field and click **Save PIN**.
- When a user clicks the window's close button, they will be prompted to enter this PIN.

### 11.5 Session Security

**Auto Lock:**
- Toggle **Enable Auto Lock** to automatically lock the screen after a period of inactivity.
- Set the **Timeout (minutes)** — the idle period before the lock screen activates.
- Set the **Lock PIN** — the numeric PIN required to unlock the screen.
- Click **Save Session Settings**.

Users can also manually lock the screen from the sidebar when they step away.

### 11.6 Change Password

All logged-in users can change their own password:
1. Enter the **Current password**.
2. Enter and confirm the **New password** (minimum 6 characters).
3. Click **Change password**.

### 11.7 Import History & Rollback *(Admin Only)*

Displays a history of all bulk CSV imports (books and members). Each entry shows:
- Import type (BOOK or MEMBER)
- Number of records imported
- Date and time of the import

Click **Rollback** on any import to permanently delete all records that were added in that batch. This is useful if an incorrect file was imported.

> ⚠️ **Warning:** Rollback is permanent. Records with existing borrowing history cannot be rolled back.

### 11.8 About

Displays the current application **Version Name** and **Version Code** for reference when reporting issues.

---

## 12. Data & Storage

### 12.1 Backup Database

Located in **Settings → Data & Storage → Backup Database**.

1. Click **Export Backup**.
2. A file save dialog appears — choose a location to save the `.db` backup file.
3. A success confirmation is shown.

> 💡 **Best Practice:** Back up the database regularly (e.g., daily or weekly) and store the backup file on a separate drive or cloud storage.

### 12.2 Automatic Backup on Exit

Every time KLMS is closed normally, it automatically creates a backup in your system's user data folder. This is a safety net for unexpected events.

### 12.3 Restore Database

Located in **Settings → Data & Storage → Restore Data**.

1. Click **Restore Data**.
2. A file open dialog appears — navigate to and select your `.db` backup file.
3. The application will replace the current database and **restart automatically**.

> ⚠️ **Caution:** Restoring a backup will replace ALL current data. Ensure you have a backup of the current state before restoring.

---

## 13. Security Features

### 13.1 Exit PIN Gate

When **Exit PIN** is enabled, clicking the window's close button (X) will show a numeric keypad dialog. The user must enter the correct PIN to close the application. This prevents unauthorised shutdown of the system.

### 13.2 Session Lock Screen

When **Auto Lock** is enabled, the screen will automatically lock after the configured number of idle minutes. A lock screen overlay appears, hiding all content. The user must enter the **Lock PIN** to resume. The session is resumed without logging out.

Users can also **manually lock** the session from the sidebar.

### 13.3 Role-Based Access Control (RBAC)

| Feature | ADMIN | LIBRARIAN | TEACHER |
|---|:---:|:---:|:---:|
| Issue & Return Books | ✅ | ✅ | ✅ |
| Manage Members | ✅ | ✅ | ❌ |
| Manage Books | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ❌ |
| Activity Log | ✅ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| System Branding | ✅ | ❌ | ❌ |
| Application Security | ✅ | ❌ | ❌ |
| Import History / Rollback | ✅ | ❌ | ❌ |

---

## 14. Troubleshooting

### Application won't start / crashes at boot
- Check that the application has write permission to its data directory.
- Look at the log file located at: `%APPDATA%\KLMS\app.log` for detailed error messages.
- Contact your system administrator.

### Barcode scanner not being detected
- Ensure the scanner is configured to emit a carriage return (Enter key) after each scan — this is the standard HID keyboard emulation mode.
- Click inside the scan input field to ensure it has focus before scanning.

### Member / Book "not found" after scanning
- Verify that the member code or book barcode is correctly registered in the system.
- Ensure the scanner reads the complete barcode without truncation.

### Reports not accessible
- Go to **Settings → Feature Toggles** and enable **Enable reports**.

### "Membership Expired" warning during checkout
- The member's validity period has passed. Go to **Members**, edit the member, and update the **Validity To** date.

### Forgot Exit PIN
- Contact a system Admin. The PIN can be reset via **Settings → Application Security → Save PIN** (requires Admin login).

### Forgot Lock PIN
- If locked and the PIN is unknown, restart the application. On restart, any locked sessions are automatically closed and the login screen is shown.

---

## 15. Appendix — Roles & Permissions

### User Roles

| Role | Description |
|---|---|
| **ADMIN** | Full system access. Manages users, branding, security settings, and can rollback imports. |
| **LIBRARIAN** | Day-to-day library operations: issue, return, manage members and books, view reports. |
| **TEACHER** | Minimal access — primarily for checking out books at a dedicated terminal. |

### Member Types

| Type | Description |
|---|---|
| **Student** | School students registered in the library. |
| **Teacher** | Teaching staff registered as library members. |

### Member Code Format

- Member codes may follow the format `M` followed by 6 digits (e.g., `M000123`) or the legacy `KMV` format used by older barcode cards.

### Book Code Format

- Books can be identified by their **ISBN** (international standard), their **Internal Code** (a library-assigned barcode starting with `B` e.g., `B000456`), or both.

---

*End of KLMS User Manual*

*For technical support, contact your system administrator.*
