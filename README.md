# Lax 🛠️

A sovereign, broke-proof Slack clone for Operators.
Built with **React + TypeScript** on the frontend and **Google Apps Script + Google Sheets** on the backend.

No servers. No database bills. Just Google infrastructure.

## 🧱 Architecture

```
[ React TS Web App ]
        |
        |  HTTPS (POST)
        v
[ Google Apps Script API ]
        |
        |  SpreadsheetApp
        v
[ Google Sheets DB ]
```

## 🚀 Quick Start (Demo Mode)

By default, the application runs in **Mock Mode**. This means it uses your browser's `localStorage` to simulate a backend.

1.  Open the application.
2.  Login with any email/name (e.g., `maverick@base.com` / `Maverick`).
3.  Start chatting.
4.  Data persists in your browser until you clear cache.

---

## ☁️ Deploying the Backend (Google Sheets)

To make this a real, multi-user chat app, you need to deploy the Google Apps Script backend.

### 1. Database Setup
1.  Create a new **Google Sheet**.
2.  Create 3 tabs (sheets) at the bottom with the exact following names and header rows (row 1):
    *   **Sheet Name**: `Users`
        *   Headers: `user_id`, `email`, `display_name`, `role`, `created_at`, `last_active`
    *   **Sheet Name**: `Channels`
        *   Headers: `channel_id`, `channel_name`, `is_private`, `created_by`, `created_at`
    *   **Sheet Name**: `Messages`
        *   Headers: `message_id`, `channel_id`, `user_id`, `content`, `created_at`
3.  **Seed Data**: Add one row to the `Channels` sheet so you have a place to chat:
    *   `c_general` | `general` | `FALSE` | `admin` | `2024-01-01T00:00:00.000Z`

### 2. Backend API Setup
1.  In the Google Sheet, go to **Extensions > Apps Script**.
2.  Delete any code in `Code.gs` and paste the code below.
3.  **Deploy**:
    *   Click **Deploy** > **New deployment**.
    *   Select type: **Web app**.
    *   Description: `v1`.
    *   **Execute as**: **Me** (your email).
    *   **Who has access**: **Anyone** (Important for CORS).
    *   Click **Deploy** and copy the **Web App URL**.

#### `Code.gs` Payload
```javascript
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;
    let result = {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getChannels') {
      result = getSheetData(ss.getSheetByName('Channels'));
    } 
    else if (action === 'getMessages') {
      const allMsgs = getSheetData(ss.getSheetByName('Messages'));
      // In prod, use filter logic or slice for performance
      result = allMsgs.filter(r => r.channel_id === payload.channelId);
    } 
    else if (action === 'sendMessage') {
      const sheet = ss.getSheetByName('Messages');
      const newRow = [
        Utilities.getUuid(),
        payload.channelId,
        payload.userId,
        payload.message,
        new Date().toISOString()
      ];
      sheet.appendRow(newRow);
      result = zipRow(sheet, newRow);
    }
    else if (action === 'getUsers') {
      result = getSheetData(ss.getSheetByName('Users'));
    }
    else if (action === 'createUser') {
      const sheet = ss.getSheetByName('Users');
      const users = getSheetData(sheet);
      const existing = users.find(u => u.email === payload.email);
      if (existing) {
        result = existing;
      } else {
        const newRow = [
          'u_' + Utilities.getUuid(),
          payload.email,
          payload.displayName,
          'member',
          new Date().toISOString(),
          new Date().toISOString()
        ];
        sheet.appendRow(newRow);
        result = zipRow(sheet, newRow);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function zipRow(sheet, rowArray) {
  const headers = sheet.getDataRange().getValues()[0];
  let obj = {};
  headers.forEach((h, i) => obj[h] = rowArray[i]);
  return obj;
}
```

### 3. Connect Frontend
1.  In the Lax app, log in.
2.  Click **Config** (bottom left sidebar).
3.  Uncheck "Use Demo Mode".
4.  Paste your **Web App URL**.
5.  Save & Reload.

## 🛠 Tech Stack

*   **Frontend**: React 18, TypeScript, Tailwind CSS
*   **State**: Local State (minimal complexity)
*   **Backend**: Google Apps Script
*   **Database**: Google Sheets
