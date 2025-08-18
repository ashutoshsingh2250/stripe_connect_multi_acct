# Stripe Connect Reporting Application

A reporting system for Stripe Connect platforms to generate transaction reports and export data in multiple formats.

## Prerequisites

- Node.js 16+ and npm
- Stripe Connect platform account
- Gmail account (for email functionality)

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Environment Configuration

Create `server/.env` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET=your_session_secret_here
```

**Note**: A real `.env` file is attached to this project which can be directly tested.

### 3. Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: Google Account → Security → 2-Step Verification → App passwords
3. Use the 16-character app password in `SMTP_PASS`

## Running the Application

### Option 1: Run Both Together (Recommended)

From the root directory:

```bash
npm run dev
```

This starts:

- Backend server on port 5000
- Frontend server on port 3000

### Option 2: Run Separately

**Backend (Terminal 1):**

```bash
cd server
npm run dev
```

**Frontend (Terminal 2):**

```bash
cd client
npm start
```

## Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Enter your Stripe Connect API keys
2. Click "Fetch" to get connected accounts
3. Select accounts for reporting
4. Configure date range and timezone
5. Generate report or export directly
