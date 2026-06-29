# Firebase Realtime Database Security Rules

Paste these rules into the Firebase Console under:  
**Project → Realtime Database → Rules**

> ⚠️ The project currently runs with open rules (`".read": true, ".write": true`) for development.  
> Deploy the rules below **before going to production**.

```json
{
  "rules": {

    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid",

        "role": {
          ".write": false
        },
        "isAdmin": {
          ".write": false
        },
        "isBanned": {
          ".write": false
        },
        "banReason": {
          ".write": false
        },
        "warnings": {
          ".write": false
        },
        "warningsList": {
          ".write": false
        },
        "diamonds": {
          ".write": false
        },
        "coins": {
          ".write": false
        }
      }
    },

    "veeIdIndex": {
      ".read": "auth != null",
      ".write": false
    },

    "rooms": {
      ".read": "auth != null",
      "$roomId": {
        ".write": "auth != null",

        "isActive": {
          ".write": "auth != null && (
            data.parent().child('hostId').val() === auth.uid ||
            data.parent().child('adminIds').child(auth.uid).exists()
          )"
        },
        "adminIds": {
          ".write": "auth != null && data.parent().child('hostId').val() === auth.uid"
        },
        "pkBattle": {
          ".write": "auth != null && data.parent().child('hostId').val() === auth.uid"
        },

        "messages": {
          ".read": "auth != null",
          "$msgId": {
            ".write": "auth != null"
          }
        }
      }
    },

    "privateChats": {
      "$chatId": {
        ".read": "auth != null && (
          $chatId.contains(auth.uid)
        )",
        ".write": "auth != null && (
          $chatId.contains(auth.uid)
        )",

        "messages": {
          "$msgId": {
            ".write": "auth != null && (
              $chatId.contains(auth.uid)
            )"
          }
        }
      }
    },

    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null"
      }
    },

    "friendRequests": {
      "$targetUid": {
        ".read": "auth != null && auth.uid === $targetUid",
        "$fromUid": {
          ".write": "auth != null && (
            auth.uid === $targetUid ||
            (auth.uid === $fromUid && root.child('users').child($targetUid).child('allowFriendRequests').val() !== false)
          )"
        }
      }
    },

    "transactions": {
      ".read": "auth != null",
      "$txId": {
        ".write": "auth != null"
      }
    },

    "reports": {
      ".read": false,
      "$reportId": {
        ".write": "auth != null"
      }
    },

    "announcements": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

## Admin writes (server-side only)

The following fields are write-protected for regular users and must be set via:
- The **Firebase Console** directly, OR
- A **Firebase Admin SDK** backend (trusted server environment)

| Field | Path | Who can write |
|---|---|---|
| `role` / `isAdmin` | `/users/{uid}/role` | Admin SDK only |
| `isBanned` / `banReason` | `/users/{uid}/isBanned` | Admin SDK only |
| `warnings` / `warningsList` | `/users/{uid}/warnings` | Admin SDK only |
| `diamonds` / `coins` | `/users/{uid}/diamonds` | Admin SDK only |
| send badge | `/users/{otherUid}/honorBadges` | Admin SDK only |
| send frame | `/users/{otherUid}/animationFrames` + `activeFrame` | Admin SDK only |
| announcements | `/announcements` | Admin SDK only |
| report resolution | `/reports/{id}/status` | Admin SDK only |

> The base rules restrict `/users/{uid}` writes to `auth.uid === $uid`. This means **every admin moderation action that writes to another user** (ban, unban, warn, grant diamonds, send badge, send frame, toggle admin role) is rejected on the client in production and must run through a trusted Admin SDK backend. In the Admin Panel these failures now surface as an "Action blocked" alert instead of failing silently.

### Quick admin write via Firebase Console

For early-stage moderation (before you have a backend), you can write to any path directly in the Console:

1. Open Firebase Console → Realtime Database → Data
2. Navigate to `/users/{uid}`
3. Click the edit (pencil) icon on any field
4. Change `role` to `"admin"` to grant Admin Panel access

### Setting up the Admin SDK (recommended for production)

```bash
# Install in your Express API server
pnpm --filter @workspace/api-server add firebase-admin
```

```ts
// artifacts/api-server/src/firebase-admin.ts
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_KEY!)),
  databaseURL: "https://vee-chat-671f0-default-rtdb.firebaseio.com/",
});

export const adminDb = getDatabase(app);
```

Store the service account JSON as `FIREBASE_ADMIN_KEY` in Replit Secrets.  
Download it from: **Firebase Console → Project Settings → Service Accounts → Generate new private key**.

## Development vs Production

| Scenario | Rules to use |
|---|---|
| Local / Expo Go dev | Open rules OK (never commit to prod) |
| Deployed to EAS / App Store | Deploy the rules above |
| Admin Panel moderation | Add Admin SDK to `api-server`, call from protected routes |

## Applying the rules

```bash
# If you have Firebase CLI installed:
firebase deploy --only database
```

Or paste directly in the Firebase Console and click **Publish**.
