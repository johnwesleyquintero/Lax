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

<img width="1136" height="888" alt="image" src="https://github.com/user-attachments/assets/2f6942eb-1c19-4cba-afd3-bdd1fc21bd54" />


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
2.  Go to **Extensions > Apps Script**.
3.  Delete any code in `Code.gs` and paste the code block below.
4.  **Run Setup**:
    *   In the toolbar, select `setup` from the dropdown function list.
    *   Click **Run**.
    *   Grant permissions.
    *   *This will automatically create the Users, Channels, ChannelMembers, and Messages sheets with the correct columns.*

### 2. Deploy API
1.  **Deploy**:
    *   Click **Deploy** > **New deployment**.
    *   Description: `v2 - edit delete`.
    *   **Execute as**: **Me** (your email).
    *   **Who has access**: **Anyone** (Important for CORS).
    *   Click **Deploy** and copy the **Web App URL**.

#### `Code.gs` Payload
```javascript
/**
 * 🛠️ SETUP FUNCTION
 * Run this ONCE to automatically create the database schema.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Users Sheet
  ensureSheet(ss, 'Users', [
    'user_id', 'email', 'display_name', 'role', 'created_at', 'last_active', 'status', 'job_title'
  ]);

  // 2. Channels Sheet
  const chSheet = ensureSheet(ss, 'Channels', [
    'channel_id', 'channel_name', 'is_private', 'created_by', 'created_at', 'type'
  ]);
  // Seed General Channel if empty
  if (chSheet.getLastRow() === 1) {
     chSheet.appendRow(['c_general', 'general', false, 'system', new Date().toISOString(), 'channel']);
  }

  // 3. ChannelMembers Sheet
  ensureSheet(ss, 'ChannelMembers', [
    'channel_id', 'user_id', 'joined_at'
  ]);

  // 4. Messages Sheet
  ensureSheet(ss, 'Messages', [
    'message_id', 'channel_id', 'user_id', 'content', 'created_at'
  ]);
}

/**
 * Helper to create sheet if missing
 */
function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    // Optional: Protect headers
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#f3f4f6");
  }
  return sheet;
}

/**
 * 🌐 API HANDLER
 */
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
      const members = getSheetData(ss.getSheetByName('ChannelMembers'));
      const myChannelIds = new Set(members.filter(m => m.user_id === payload.userId).map(m => m.channel_id));
      
      const allChannels = getSheetData(ss.getSheetByName('Channels'));
      result = allChannels.filter(c => myChannelIds.has(c.channel_id));
    } 
    else if (action === 'getBrowsableChannels') {
      const members = getSheetData(ss.getSheetByName('ChannelMembers'));
      const myChannelIds = new Set(members.filter(m => m.user_id === payload.userId).map(m => m.channel_id));

      const allChannels = getSheetData(ss.getSheetByName('Channels'));
      result = allChannels.filter(c => c.is_private === false && c.type !== 'dm' && !myChannelIds.has(c.channel_id));
    }
    else if (action === 'joinChannel') {
      const sheet = ss.getSheetByName('ChannelMembers');
      const members = getSheetData(sheet);
      const exists = members.some(m => m.channel_id === payload.channelId && m.user_id === payload.userId);
      
      if (!exists) {
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
      
      const mSheet = ss.getSheetByName('ChannelMembers');
      mSheet.appendRow([newId, payload.creatorId, new Date().toISOString()]);

      result = zipRow(cSheet, newChannelRow);
    }
    else if (action === 'updateChannel') {
      const sheet = ss.getSheetByName('Channels');
      const data = sheet.getDataRange().getValues();
      const slug = payload.name.toLowerCase().replace(/[^a-z0-9-]/g, '');
      let found = false;

      // Skip header, find row by ID (col 0)
      for(let i=1; i<data.length; i++) {
          if (data[i][0] === payload.channelId) {
              // Update Name (col index 1)
              sheet.getRange(i+1, 2).setValue(slug);
              // Update IsPrivate (col index 2)
              sheet.getRange(i+1, 3).setValue(payload.isPrivate);
              
              // Construct return object based on existing + updates
              result = {
                  ...zipRow(sheet, data[i]),
                  channel_name: slug,
                  is_private: payload.isPrivate
              };
              found = true;
              break;
          }
      }
      if (!found) throw new Error("Channel not found");
    }
    else if (action === 'deleteChannel') {
        // Simple implementation: delete the row from Channels.
        // In a real app, you'd cascade delete messages or mark as deleted.
        const sheet = ss.getSheetByName('Channels');
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === payload.channelId) {
                sheet.deleteRow(i + 1);
                break;
            }
        }
        result = { success: true };
    }
    else if (action === 'createDM') {
      const cSheet = ss.getSheetByName('Channels');
      const allChannels = getSheetData(cSheet);
      
      // Check for existing DM
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
    else if (action === 'editMessage') {
        const sheet = ss.getSheetByName('Messages');
        const data = sheet.getDataRange().getValues();
        // find row by message_id (col 0)
        for(let i=1; i<data.length; i++) {
            if (data[i][0] === payload.messageId) {
                // Update content column (index 3 based on setup headers)
                sheet.getRange(i+1, 4).setValue(payload.content);
                break;
            }
        }
        result = { success: true };
    }
    else if (action === 'deleteMessage') {
        const sheet = ss.getSheetByName('Messages');
        const data = sheet.getDataRange().getValues();
        for(let i=1; i<data.length; i++) {
            if (data[i][0] === payload.messageId) {
                sheet.deleteRow(i+1);
                break;
            }
        }
        result = { success: true };
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
    else {
      throw new Error("Unknown action: " + action);
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

function doGet(e) {
  return ContentService.createTextOutput("System Operational. Endpoint Active.");
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