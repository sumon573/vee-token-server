# Vee Token Server

Production-ready Vercel Serverless Function that generates Agora RTC tokens for the Vee Voice Room app.

## Endpoints

### Health Check

```
GET /api/health
```

Use this to verify the server is running and all required environment variables are loaded before doing a production build.

**Response — healthy (HTTP 200):**
```json
{
  "status": "healthy",
  "service": "vee-token-server",
  "version": "1.0.0",
  "timestamp": "2026-06-30T12:00:00.000Z"
}
```

**Response — unhealthy (HTTP 500):**
```json
{
  "status": "unhealthy",
  "service": "vee-token-server",
  "version": "1.0.0",
  "timestamp": "2026-06-30T12:00:00.000Z",
  "error": "Missing required environment variable(s): AGORA_APP_ID, AGORA_APP_CERTIFICATE"
}
```

---

### RTC Token

```
GET /api/rtc/{channel}/{role}/uid/{uid}
```

| Parameter | Values                     | Description                       |
|-----------|----------------------------|-----------------------------------|
| channel   | string (1–64 chars)        | Agora channel name (room ID)      |
| role      | `publisher` / `subscriber` | User role in the channel          |
| uid       | non-negative integer       | Unique user ID (numeric hash)     |

**Response — success (HTTP 200):**
```json
{
  "rtcToken": "007eJxT...",
  "uid": 12345678,
  "channel": "room-abc",
  "role": "publisher",
  "expiresAt": 1751285400
}
```

**Error responses:**

| HTTP | Condition |
|------|-----------|
| 400  | Missing or invalid parameter |
| 405  | Non-GET request |
| 500  | Missing env vars or Agora SDK error |

---

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

In the Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable               | Value                        |
|------------------------|------------------------------|
| `AGORA_APP_ID`         | Your Agora App ID            |
| `AGORA_APP_CERTIFICATE`| Your Agora App Certificate   |

> **Never** commit real credentials. Use Vercel environment variables only.

### 4. Verify the Deployment

```bash
curl https://your-project.vercel.app/api/health
```

Expect `"status": "healthy"` and HTTP 200 before proceeding.

### 5. Update the Expo App

After deployment, set `EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL` in `eas.json` (all three profiles):

```json
"env": {
  "EXPO_PUBLIC_AGORA_TOKEN_SERVER_URL": "https://your-project.vercel.app/api"
}
```

Then rebuild the APK:
```bash
eas build --platform android --profile preview --non-interactive
```

---

## Local Development

```bash
npm install
vercel dev
```

The server runs on `http://localhost:3000` by default.

**Test health:**
```bash
AGORA_APP_ID=your_id AGORA_APP_CERTIFICATE=your_cert \
  curl "http://localhost:3000/api/health"
```

**Test token:**
```bash
AGORA_APP_ID=your_id AGORA_APP_CERTIFICATE=your_cert \
  curl "http://localhost:3000/api/rtc/test-channel/publisher/uid/12345"
```

---

## Local Smoke Test (without Vercel CLI)

```bash
node -e "
  process.env.AGORA_APP_ID='test';
  process.env.AGORA_APP_CERTIFICATE='test';
  const h = require('./api/health');
  const mockRes = {
    status(c) { console.log('Status:', c); return this; },
    json(b) { console.log(JSON.stringify(b, null, 2)); },
    setHeader() { return this; },
    end() {}
  };
  h({ method: 'GET' }, mockRes);
"
```
