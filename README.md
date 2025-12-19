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
2.  Create 4 tabs (sheets) at the bottom with the exact following names and header rows (row 1):
    *   **Sheet Name**: `Users`
        *   Headers: `user_id`, `email`, `display_name`, `role`, `created_at`, `last_active`, `status`, `job_title`
    *   **Sheet Name**: `Channels`
        *   Headers: `channel_id`, `channel_name`, `is_private`, `created_by`, `created_at`, `type`
    *   **Sheet Name**: `ChannelMembers`
        *   Headers: `channel_id`, `user_id`, `joined_at`
    *   **Sheet Name**: `Messages`
        *   Headers: `message_id`, `channel_id`, `user_id`, `content`, `created_at`
3.  **Seed Data**: 
    *   In `Channels`: `c_general` | `general` | `FALSE` | `admin` | `2024-01-01T00:00:00.000Z` | `channel`
    *   *Note: When you log in for the first time, the script will automatically add you to `c_general`.*

### 2. Backend API Setup
1.  In the Google Sheet, go to **Extensions > Apps Script**.
2.  Delete any code in `Code.gs` and paste the code below.
3.  **Deploy**:
    *   Click **Deploy** > **New deployment**.
    *   Select type: **Web app**.
    *   Description: `v2`.
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

    // --- CHANNELS & MEMBERSHIP ---

    if (action === 'getChannels') {
      // Return only channels user is a member of
      const members = getSheetData(ss.getSheetByName('ChannelMembers'));
      const myChannelIds = new Set(members.filter(m => m.user_id === payload.userId).map(m => m.channel_id));
      
      const allChannels = getSheetData(ss.getSheetByName('Channels'));
      result = allChannels.filter(c => myChannelIds.has(c.channel_id));
    } 
    else if (action === 'getBrowsableChannels') {
      // Return Public channels user is NOT a member of AND exclude DMs
      const members = getSheetData(ss.getSheetByName('ChannelMembers'));
      const myChannelIds = new Set(members.filter(m => m.user_id === payload.userId).map(m => m.channel_id));

      const allChannels = getSheetData(ss.getSheetByName('Channels'));
      // Filter out Private, Existing Memberships, and DMs
      result = allChannels.filter(c => c.is_private === false && c.type !== 'dm' && !myChannelIds.has(c.channel_id));
    }
    else if (action === 'joinChannel') {
      const sheet = ss.getSheetByName('ChannelMembers');
      const members = getSheetData(sheet);
      // Check if already member
      const exists = members.some(m => m.channel_id === payload.channelId && m.user_id === payload.userId);
      
      if (!exists) {
        // Verify channel exists first
        const channels = getSheetData(ss.getSheetByName('Channels'));
        const channel = channels.find(c => c.channel_id === payload.channelId);
        if (channel) {
             sheet.appendRow([payload.channelId, payload.userId, new Date().toISOString()]);
             result = { success: true };
        } else {
             throw new Error("Channel not found");
        }
      } else {
        result = { success: true, message: "Already joined" };
      }
    }
    else if (action === 'createChannel') {
      const cSheet = ss.getSheetByName('Channels');
      const slug = payload.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
      const newId = 'c_' + slug + '_' + Math.floor(Math.random() * 10000);
      
      const newChannelRow = [
        newId, 
        slug, 
        payload.isPrivate, 
        payload.creatorId, 
        new Date().toISOString(),
        payload.type || 'channel'
      ];
      cSheet.appendRow(newChannelRow);
      
      // Auto-join creator
      const mSheet = ss.getSheetByName('ChannelMembers');
      mSheet.appendRow([newId, payload.creatorId, new Date().toISOString()]);

      result = zipRow(cSheet, newChannelRow);
    }
    else if (action === 'createDM') {
      const cSheet = ss.getSheetByName('Channels');
      const allChannels = getSheetData(cSheet);
      
      // payload.name should be deterministic: dm_uidA_uidB
      const existing = allChannels.find(c => c.channel_name === payload.name && c.type === 'dm');
      
      if (existing) {
          result = existing;
      } else {
          const newId = 'dm_' + Utilities.getUuid();
          const newRow = [
             newId,
             payload.name,
             true, // DMs are always private
             payload.creatorId,
             new Date().toISOString(),
             'dm'
          ];
          cSheet.appendRow(newRow);

          // Add BOTH users
          const mSheet = ss.getSheetByName('ChannelMembers');
          mSheet.appendRow([newId, payload.creatorId, new Date().toISOString()]);
          mSheet.appendRow([newId, payload.targetUserId, new Date().toISOString()]);
          
          result = zipRow(cSheet, newRow);
      }
    }

    // --- MESSAGES ---

    else if (action === 'getMessages') {
      const allMsgs = getSheetData(ss.getSheetByName('Messages'));
      // Performance: Filter in memory. For huge scale, use Sheets Query/Filter views.
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

    // --- USERS ---

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
        const userId = 'u_' + Utilities.getUuid();
        const newRow = [
          userId,
          payload.email,
          payload.displayName,
          'member',
          new Date().toISOString(),
          new Date().toISOString(),
          'Online',
          'Operator'
        ];
        sheet.appendRow(newRow);
        
        // Auto-join general
        const channels = getSheetData(ss.getSheetByName('Channels'));
        const general = channels.find(c => c.channel_name === 'general');
        if (general) {
            const mSheet = ss.getSheetByName('ChannelMembers');
            mSheet.appendRow([general.channel_id, userId, new Date().toISOString()]);
        }
        
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
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return []; // No data
  const headers = values[0];
  return values.slice(1).map(row => {
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