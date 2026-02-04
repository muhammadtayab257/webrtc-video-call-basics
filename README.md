# Simple WebRTC Video Call App

A simple one-to-one video calling application using WebRTC, Node.js, and Angular.

**Live Demo:** After deploying to Render, your app will be at `https://your-app-name.onrender.com`

## Features

- One-to-one video calling
- Hard-coded join code: `CALL123`
- Maximum 2 users at a time
- WebRTC peer-to-peer connection
- Socket.IO for signaling
- Single deployment (backend serves frontend)

## Project Structure

```
VIDEO-CALL-APP/
├── backend/
│   ├── package.json       # Combined build scripts
│   ├── server.js          # Node.js server (API + static files)
│   └── public/            # Angular build output (generated)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.component.ts
│   │   │   ├── app.component.html
│   │   │   └── app.component.css
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   └── package.json
├── .gitignore
└── README.md
```

---

## Deploy to Render (Recommended)

### Step 1: Push to GitHub

```bash
cd VIDEO-CALL-APP
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/video-call-app.git
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New** → **Web Service**
3. Connect your GitHub account
4. Select your `video-call-app` repository
5. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `video-call-app` (or any name) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

6. Click **Create Web Service**
7. Wait 3-5 minutes for deployment

### Step 3: Test Your App

Your app will be live at: `https://your-app-name.onrender.com`

1. Open the URL in Chrome
2. Enter join code: `CALL123`
3. Open the same URL in Firefox (or another device)
4. Enter the same code
5. Click "Start Call"
6. Video call begins!

---

## Local Development

### Option 1: Combined Server (Production-like)

```bash
# Build frontend and copy to backend
cd backend
npm run build

# Start server
npm start
```

Open `http://localhost:3000`

### Option 2: Separate Servers (Development)

Terminal 1 - Backend:
```bash
cd backend
npm install
npm start
```

Terminal 2 - Frontend:
```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`

---

## How to Use

1. Open the app URL
2. Enter join code: **CALL123**
3. Click **Join**
4. Wait for another user
5. Click **Start Call**
6. Allow camera/microphone
7. Video call starts!

---

## WebRTC Flow

```
User A                    Server                    User B
  |                         |                         |
  |-- join-call (CALL123) ->|                         |
  |<-- join-success --------|                         |
  |<-- waiting -------------|                         |
  |                         |<-- join-call (CALL123)--|
  |                         |-------- join-success -->|
  |<-- ready-to-call -------|-------- ready-to-call ->|
  |                         |                         |
  |-- offer --------------->|-------- offer --------->|
  |                         |<-------- answer --------|
  |<-------- answer --------|                         |
  |                         |                         |
  |== ice-candidates ======>|<== ice-candidates ======|
  |                         |                         |
  |========= Direct P2P Video Connection =============|
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Grant browser permissions |
| Can't connect | Try different network, STUN may fail on strict NAT |
| "Call in progress" | Only 2 users allowed, wait for others to leave |
| Render deploy fails | Check build logs, ensure Node 18+ |
| First load slow | Free Render sleeps after 15min, first request wakes it |

---

## Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Frontend:** Angular 18, TypeScript
- **WebRTC:** Browser native API
- **STUN:** Google public servers

## License

MIT
