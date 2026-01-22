# KHIDMA Frontend - Pilot Implementation

This is the pilot frontend implementation for the KHIDMA platform, built with React and Vite.

## Features

- ✅ Phone-based authentication (OTP)
- ✅ User profile management
- ✅ Task creation wizard
- ✅ Task listing and details
- ✅ Arabic RTL support with English option
- ✅ Responsive design

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client
- **react-i18next** - Internationalization (Arabic/English)

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/) if not installed
- **Backend API** running on `http://localhost:3000`

> ⚠️ **Node.js not installed?** See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed installation guide.

## Setup

### Prerequisites

- **Node.js 18+** installed
- **Backend API** running on `http://localhost:3000`

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

   Or on Windows, double-click `run.bat` which will install and start automatically.

2. **Configure environment (optional):**
   Create `.env` file in `frontend/` directory:
   ```
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```
   (Default is already configured via Vite proxy)

3. **Start development server:**
   ```bash
   npm run dev
   ```

   Or on Windows:
   ```bash
   run.bat
   ```

   The app will be available at `http://localhost:5173`

### Quick Test

1. **Start backend first** (in another terminal):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open browser** to `http://localhost:5173`

4. **Test login:**
   - Enter phone: `+201234567890`
   - Check backend console for OTP
   - Enter OTP to login

See `TESTING.md` for complete testing guide.

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   └── Layout.jsx
│   ├── pages/           # Page components
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── TaskCreatePage.jsx
│   │   ├── TaskDetailPage.jsx
│   │   └── ProfilePage.jsx
│   ├── services/        # API client services
│   │   └── api.js
│   ├── store/           # State management
│   │   └── authStore.js
│   ├── styles/          # CSS files
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── i18n.js          # Internationalization config
├── index.html
├── package.json
└── vite.config.js
```

## Testing with Backend

1. **Start the backend:**
   ```bash
   cd ../backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test the flow:**
   - Go to `http://localhost:5173`
   - You'll be redirected to login
   - Enter a phone number (format: +201234567890)
   - Check console for OTP (dev mode)
   - Enter OTP to login
   - Create a task and see it listed

## API Integration

The frontend communicates with the backend API at `/api/v1`. The following endpoints are used:

### Authentication
- `POST /auth/otp/request` - Request OTP
- `POST /auth/otp/verify` - Verify OTP and get tokens
- `POST /auth/token/refresh` - Refresh access token

### User
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update user profile

### Tasks
- `POST /tasks` - Create task
- `GET /tasks` - List tasks
- `GET /tasks/:id` - Get task details
- `PATCH /tasks/:id` - Update task
- `POST /tasks/:id/post` - Post task to marketplace
- `POST /tasks/:id/cancel` - Cancel task
- `GET /tasks/:id/candidates` - Get tasker candidates

## Notes

- OTP is logged to console in dev mode (backend implementation needed for SMS)
- Token refresh is handled automatically by axios interceptor
- Authentication state persists in localStorage
- RTL support is enabled for Arabic language

## Next Steps

- [ ] Add real-time task status updates (WebSocket)
- [ ] Implement messaging/chat feature
- [ ] Add payment integration
- [ ] Add tasker selection UI
- [ ] Add reviews and ratings
- [ ] Add media upload for task photos
- [ ] Improve error handling and loading states
- [ ] Add unit and integration tests
