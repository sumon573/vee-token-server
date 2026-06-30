# Vee Token Server

Production-ready Vercel Serverless Function that generates Agora RTC tokens for the Vee Voice Room app.

## Endpoint

```
GET /api/rtc/{channel}/{role}/uid/{uid}
```

| Parameter | Values                     | Description                       |
|-----------|----------------------------|-----------------------------------|
| channel   | any string                 | Agora channel name (room ID)      |
| role      | `publisher` / `subscriber` | User role in the channel          |
| uid       | integer                    | Unique user ID (numeric hash)     |

**Response:**
```json
{
  "rtcToken": "007eJxT...",
  "uid": 12345678,
  "channel": "room-abc",
  "role": "publisher"
}
```

## Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Deploy
```bash
cd vee-token-server
vercel
```

### 3. Set Environment Variables
In the Vercel dashboard → your project → Settings → Environment Variables, add:

| Variable              | Value                        |
|-----------------------|------------------------------|
| `AGORA_APP_ID`        | Your Agora App ID            |
| `AGORA_APP_CERTIFICATE` | Your Agora App Certificate |

> **Never** commit real credentials. Use Vercel environment variables only.

### 4. Update the Expo App

After deployment, set the `EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL` in the EAS dashboard or in `eas.json`:

```json
"env": {
  "EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL": "https://your-project.vercel.app/api"
}
```

Then rebuild the APK:
```bash
eas build --platform android --profile preview --non-interactive
```

## Local Development

```bash
npm install
vercel dev
```

The server runs on `http://localhost:3000` by default.

Test with:
```bash
curl "http://localhost:3000/api/rtc/test-channel/publisher/uid/12345"
```
