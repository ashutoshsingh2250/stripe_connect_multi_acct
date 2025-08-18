# Stripe Connect Reporting Application

A reporting system for Stripe Connect platforms to generate transaction reports and export data in multiple formats.

## Prerequisites

- Node.js 16+ and npm
- Stripe Connect platform account
- Gmail account (for email export functionality)

## Installation

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
# JWT Configuration
JWT_SECRET=stripe-connect-jwt-secret-2025

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Note**: Stripe API keys are entered in the frontend interface, not in environment variables.

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

- Backend server on port 5000 (with hot-reload)
- Frontend server on port 3000 (with hot-reload)

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

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Usage

1. **Login** with demo credentials:
    - Username: `admin` / Password: `admin123`
    - Username: `user` / Password: `password`

2. **Enter Stripe Keys** in the frontend:
    - Public Key (pk*test*... or pk*live*...)
    - Secret Key (sk*test*... or sk*live*...)

3. **Generate Reports**:
    - Click "Fetch" to get connected accounts
    - Select accounts and configure date range
    - Generate report or export directly

## Export Options

- CSV Export
- Excel Export
- Email Export
- Google Sheets Export
