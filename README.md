# Felicity Event Management System

A comprehensive event management platform built with the MERN stack for managing events, registrations, and participants for Felicity fest.

## Technology Stack

### Backend
- **Node.js** (v18+): Runtime environment
- **Express.js** (v5.2.1): Web framework for REST APIs
- **MongoDB** with **Mongoose** (v9.2.1): Database and ODM
- **JWT** (jsonwebtoken v9.0.3): Authentication tokens
- **bcrypt** (v6.0.0): Password hashing
- **Zod** (v4.3.6): Schema validation
- **Nodemailer** (v8.0.1): Email sending
- **QRCode** (v1.5.4): QR code generation
- **Multer** (v2.0.2): File upload handling
- **Socket.io**: Real-time communication (for discussion forum)

**Justification:**
- Express.js provides robust routing and middleware support for REST APIs
- Mongoose simplifies MongoDB operations with schema validation
- JWT enables stateless authentication across distributed systems
- bcrypt ensures secure password storage with industry-standard hashing
- Zod provides runtime type checking and validation
- Nodemailer enables email notifications for tickets and confirmations
- QRCode generates scannable tickets for event entry
- Multer handles file uploads for payment proofs
- Socket.io enables real-time messaging in discussion forums

### Frontend
- **React** (v19.2.0): UI library
- **React Router DOM** (v6+): Client-side routing
- **Axios**: HTTP client for API calls
- **Socket.io-client**: Real-time communication client
- **ICS**: Calendar file generation

**Justification:**
- React provides component-based UI development with efficient rendering
- React Router enables SPA navigation without page reloads
- Axios simplifies API calls with interceptors for auth tokens
- Socket.io-client enables real-time updates without polling
- ICS library generates standard calendar files for event export

## Project Structure

```
<roll_no>/
├── backend/
│   ├── src/
│   │   ├── config.js          # Configuration and environment variables
│   │   ├── db.js              # MongoDB connection
│   │   ├── server.js          # Express server entry point
│   │   ├── models/            # Mongoose models
│   │   │   ├── User.js        # User, Participant, Organizer, Admin models
│   │   │   ├── Event.js       # Event model
│   │   │   ├── Registration.js # Registration model
│   │   │   ├── Team.js        # Team model (Tier A)
│   │   │   ├── Forum.js       # Forum message model (Tier B)
│   │   │   └── PasswordReset.js # Password reset model (Tier B)
│   │   ├── routes/            # API routes
│   │   │   ├── auth.js        # Authentication routes
│   │   │   ├── events.js      # Event CRUD routes
│   │   │   ├── registrations.js # Registration routes
│   │   │   ├── organizers.js  # Organizer routes
│   │   │   ├── admin.js       # Admin routes
│   │   │   ├── teams.js       # Team routes (Tier A)
│   │   │   ├── payments.js    # Payment approval routes (Tier A)
│   │   │   ├── forum.js       # Forum routes (Tier B)
│   │   │   └── password-reset.js # Password reset routes (Tier B)
│   │   ├── middleware/        # Express middleware
│   │   │   └── auth.js        # JWT authentication middleware
│   │   └── utils/             # Utility functions
│   │       ├── jwt.js         # JWT signing/verification
│   │       ├── password.js   # Password hashing
│   │       ├── email.js      # Email sending
│   │       └── ticket.js     # Ticket/QR generation
│   ├── package.json
│   └── env.example            # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Navbar.jsx     # Navigation bar
│   │   │   └── ProtectedRoute.jsx # Route protection
│   │   ├── contexts/          # React contexts
│   │   │   └── AuthContext.jsx # Authentication context
│   │   ├── pages/             # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BrowseEvents.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Organizers.jsx
│   │   │   ├── CreateEvent.jsx
│   │   │   ├── OrganizerEventDetails.jsx
│   │   │   └── AdminOrganizers.jsx
│   │   ├── utils/
│   │   │   └── api.js         # Axios API client
│   │   └── App.jsx            # Main app component
│   ├── package.json
│   └── vite.config.js
├── README.md                  # This file
└── deployment.txt             # Deployment URLs
```

## Setup Instructions

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `env.example`:
```bash
cp env.example .env
```

4. Configure environment variables in `.env`:
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@felicity.local
ADMIN_PASSWORD=ChangeThisAdminPassword123!
IIIT_EMAIL_DOMAIN=iiit.ac.in
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="Felicity EMS <no-reply@felicity.local>"
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Start the backend server:
```bash
npm run dev
```

The server will start on `http://localhost:4000` and automatically create an admin account on first run.

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
echo "VITE_API_URL=http://localhost:4000/api" > .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or another port if 5173 is busy).

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` directory, ready for deployment to static hosting.

**Backend:**
```bash
cd backend
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register-participant` - Register new participant
- `POST /api/auth/login` - Login user

### Events
- `GET /api/events` - List all events (with filters)
- `GET /api/events/trending` - Get trending events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (organizer)
- `PATCH /api/events/:id` - Update event (organizer)
- `GET /api/events/:id/registrations` - Get registrations (organizer)
- `GET /api/events/:id/registrations/export` - Export CSV (organizer)

### Registrations
- `POST /api/registrations/normal/:eventId` - Register for normal event
- `POST /api/registrations/merchandise/:eventId` - Purchase merchandise
- `GET /api/registrations/my` - Get user's registrations
- `GET /api/registrations/:id` - Get registration/ticket details

### Teams (Tier A)
- `POST /api/teams` - Create team
- `POST /api/teams/join` - Join team by invite code
- `GET /api/teams/my` - Get user's teams
- `GET /api/teams/:id` - Get team details

### Payments (Tier A)
- `POST /api/payments/:registrationId/upload-proof` - Upload payment proof
- `GET /api/payments/pending` - Get pending approvals (organizer)
- `POST /api/payments/:registrationId/approve` - Approve payment (organizer)
- `POST /api/payments/:registrationId/reject` - Reject payment (organizer)

### Forum (Tier B)
- `GET /api/forum/events/:eventId` - Get forum messages
- `POST /api/forum/events/:eventId` - Post message
- `POST /api/forum/messages/:id/pin` - Pin message (organizer)
- `DELETE /api/forum/messages/:id` - Delete message
- `POST /api/forum/messages/:id/reaction` - Add reaction

### Password Reset (Tier B)
- `POST /api/password-reset/request` - Request reset (organizer)
- `GET /api/password-reset` - Get all requests (admin)
- `POST /api/password-reset/:id/approve` - Approve request (admin)
- `POST /api/password-reset/:id/reject` - Reject request (admin)

## Deployment

See `deployment.txt` for production URLs.

## Notes

- Admin account is automatically created on first server start
- Email functionality works in dev mode (logs to console) without SMTP configuration
- All passwords are hashed using bcrypt with 12 salt rounds
- JWT tokens expire after 7 days (configurable)
- File uploads for payment proofs are stored as base64 in database
- Real-time features require Socket.io server configuration
