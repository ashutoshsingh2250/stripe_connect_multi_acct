# 🚀 Stripe Connect Multi-Account Reporting Application

A comprehensive reporting system for Stripe Connect platforms to generate transaction reports and export data in multiple formats (CSV, Excel, PDF, Email, Google Sheets).

## 📋 Table of Contents

-   [Features](#-features)
-   [Prerequisites](#-prerequisites)
-   [Tech Stack](#-tech-stack)
-   [Project Structure](#-project-structure)
-   [Installation & Setup](#-installation--setup)
-   [Environment Configuration](#-environment-configuration)
-   [Running Locally](#-running-locally)
-   [Production Deployment](#-production-deployment)
-   [API Documentation](#-api-documentation)
-   [Troubleshooting](#-troubleshooting)

## ✨ Features

-   🔐 **Secure Authentication** - JWT-based login system
-   📊 **Multi-Account Reporting** - Generate reports for multiple Stripe Connect accounts
-   📅 **Flexible Date Ranges** - Daily, weekly, monthly, or custom periods
-   🌍 **Timezone Support** - Multiple timezone options for accurate reporting
-   📤 **Multiple Export Formats**:
    -   CSV Export (password-protected ZIP)
    -   Excel Export (password-protected ZIP)
    -   PDF Export (password-protected)
    -   Email Export (password-protected ZIP)
    -   Google Sheets Export (password-protected ZIP)
-   🔒 **Security Features**:
    -   Encrypted Stripe API key transmission
    -   Password-protected export files
    -   JWT authentication
    -   CORS protection

## 🎯 Prerequisites

### **System Requirements**

-   **Node.js**: 18.0.0 or higher
-   **npm**: 8.0.0 or higher
-   **Git**: For version control

### **Accounts & Services**

-   **Stripe Connect Platform Account** - For API access
-   **Gmail Account** - For email export functionality
-   **Render Account** - For production deployment (optional)

### **Stripe API Keys**

-   **Public Key** (pk*test*... or pk*live*...)
-   **Secret Key** (sk*test*... or sk*live*...)

## 🛠️ Tech Stack

### **Frontend**

-   **React 18** - User interface
-   **Axios** - HTTP client
-   **Moment.js** - Date handling
-   **Custom encryption** - API key security

### **Backend**

-   **NestJS** - Server framework
-   **TypeScript** - Type safety
-   **Passport JWT** - Authentication
-   **Stripe SDK** - Payment processing
-   **Nodemailer** - Email functionality
-   **PDFKit** - PDF generation
-   **XLSX** - Excel file handling

### **Infrastructure**

-   **Render** - Production hosting
-   **Environment Variables** - Configuration management

## 📁 Project Structure

```
stripe_connect_multi_acct/
├── 📁 client/                    # React frontend
│   ├── 📁 src/
│   │   ├── 📁 components/       # React components
│   │   ├── 📁 services/         # API services
│   │   ├── 📁 hooks/           # Custom React hooks
│   │   └── 📁 utils/           # Utility functions
│   ├── 📁 public/              # Static assets
│   └── package.json
├── 📁 server-nest/              # NestJS backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/     # API endpoints
│   │   ├── 📁 services/        # Business logic
│   │   ├── 📁 guards/          # Authentication guards
│   │   ├── 📁 dto/            # Data transfer objects
│   │   └── 📁 utils/          # Utility functions
│   ├── 📁 dist/               # Production build
│   └── package.json
├── 📁 exports/                 # Generated export files
├── 📁 temp/                   # Temporary files
├── render.yaml                # Render deployment config
├── package.json               # Root package.json
└── README.md                  # This file
```

## 🚀 Installation & Setup

### **Step 1: Clone Repository**

```bash
git clone <your-repository-url>
cd stripe_connect_multi_acct
```

### **Step 2: Install Dependencies**

```bash
# Install all dependencies (recommended)
npm run install-all

# OR install manually:
npm install
cd client && npm install
cd ../server-nest && npm install
cd ..
```

### **Step 3: Environment Configuration**

Create environment files for both development and production:

#### **Development Environment**

Create `server-nest/.env`:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# JWT Configuration
JWT_SECRET=stripe-connect-jwt-secret-2025

# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

# Client URL
CLIENT_URL=http://localhost:3000
```

#### **Production Environment**

Create `server-nest/.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# JWT Configuration
JWT_SECRET=your-production-jwt-secret

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-production-email@gmail.com
SMTP_PASS=your-production-app-password

# Client URL (update with your domain)
CLIENT_URL=https://your-app-name.onrender.com
```

### **Step 4: Gmail App Password Setup**

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
    - Go to [Google Account Settings](https://myaccount.google.com/)
    - Security → 2-Step Verification → App passwords
    - Select "Mail" and generate password
3. **Use the 16-character password** in `SMTP_PASS`

## 🏃‍♂️ Running Locally

### **Option 1: Run Both Together (Recommended)**

```bash
# From root directory
npm run dev
```

This starts:

-   🖥️ **Backend**: http://localhost:5000 (with hot-reload)
-   🌐 **Frontend**: http://localhost:3000 (with hot-reload)

### **Option 2: Run Separately**

#### **Terminal 1 - Backend**

```bash
cd server-nest
npm run start:dev
```

#### **Terminal 2 - Frontend**

```bash
cd client
npm start
```

### **Option 3: Production Build (Local)**

```bash
# Build both frontend and backend
npm run build

# Start production server
npm run start:prod
```

## 🌐 Production Deployment

### **Render Deployment (Recommended)**

#### **Step 1: Prepare Repository**

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

#### **Step 2: Create Render Service**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Configure service settings

#### **Step 3: Service Configuration**

-   **Name**: `stripe-connect-app`
-   **Environment**: `Node`
-   **Build Command**: `cd server-nest && npm install && npm run build`
-   **Start Command**: `cd server-nest && npm run start:prod`
-   **Health Check Path**: `/health`

#### **Step 4: Environment Variables**

Set these in Render dashboard:

| Key          | Value                           | Description           |
| ------------ | ------------------------------- | --------------------- |
| `NODE_ENV`   | `production`                    | Environment mode      |
| `PORT`       | `10000`                         | Server port           |
| `JWT_SECRET` | `[generate]`                    | JWT encryption secret |
| `SMTP_HOST`  | `smtp.gmail.com`                | SMTP server           |
| `SMTP_PORT`  | `587`                           | SMTP port             |
| `SMTP_USER`  | `your-email@gmail.com`          | Email address         |
| `SMTP_PASS`  | `your-app-password`             | Email password        |
| `CLIENT_URL` | `https://your-app.onrender.com` | Your domain           |

### **Manual Server Deployment**

#### **Step 1: Build Application**

```bash
npm run build
```

#### **Step 2: Upload to Server**

```bash
# Upload dist/ folder to your server
scp -r server-nest/dist/ user@your-server:/path/to/app/
scp -r client/build/ user@your-server:/path/to/app/public/
scp server-nest/package.json user@your-server:/path/to/app/
scp server-nest/.env.production user@your-server:/path/to/app/.env
```

#### **Step 3: Install Dependencies & Start**

```bash
# On your server
cd /path/to/app
npm install --production
npm run start:prod
```

## 📚 API Documentation

### **Authentication Endpoints**

-   `POST /api/auth/login` - User login
-   `POST /api/auth/logout` - User logout
-   `GET /api/auth/me` - Get user profile

### **Reports Endpoints**

-   `GET /api/reports/timezones` - Get available timezones
-   `GET /api/reports/accounts` - Get Stripe Connect accounts
-   `GET /api/reports/multi/:accountIds` - Generate multi-account report

### **Export Endpoints**

-   `POST /api/export/csv/:accountIds` - Export CSV
-   `POST /api/export/xls/:accountIds` - Export Excel
-   `POST /api/export/email/:accountIds` - Export via email
-   `POST /api/export/sheets/:accountIds` - Export to Google Sheets
-   `POST /api/export/pdf/:accountIds` - Export PDF

### **Health Check**

-   `GET /health` - Service health status

## 🔐 Security Features

### **API Key Encryption**

-   Frontend encrypts Stripe API keys before transmission
-   Backend decrypts keys for Stripe API calls
-   Encryption key: `stripe-connect-2025`

### **Export File Protection**

-   All export files are password-protected
-   Password: `stripe2024!`
-   ZIP files for CSV, Excel, and Email exports
-   PDF files with built-in password protection

### **Authentication**

-   JWT-based authentication
-   Protected API endpoints
-   CORS configuration for production domains

## 🧪 Testing

### **Run Tests**

```bash
# Backend tests
cd server-nest
npm run test

# E2E tests
npm run test:e2e
```

### **Test Credentials**

-   **Admin**: `admin` / `admin123`
-   **User**: `user` / `password`

## 🐛 Troubleshooting

### **Common Issues**

#### **Build Failures**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### **Port Already in Use**

```bash
# Kill processes on port 5000
lsof -ti:5000 | xargs kill -9
```

#### **SMTP Connection Issues**

-   Verify Gmail app password is correct
-   Check 2FA is enabled on Google account
-   Ensure SMTP settings match Gmail requirements

#### **Stripe API Errors**

-   Verify API keys are correct
-   Check account permissions
-   Ensure keys match environment (test/live)

### **Logs & Debugging**

```bash
# Backend logs
cd server-nest
npm run start:dev

# Frontend logs
cd client
npm start
```

## 📞 Support

### **Getting Help**

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Test with known working Stripe test keys
4. Check Render deployment logs (if deployed)

### **Useful Commands**

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check running processes
ps aux | grep node

# Check port usage
lsof -i :5000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

## 🎉 Quick Start Summary

```bash
# 1. Clone & Install
git clone <repo-url>
cd stripe_connect_multi_acct
npm run install-all

# 2. Configure Environment
cp server-nest/env.example server-nest/.env
# Edit .env with your SMTP credentials

# 3. Run Development
npm run dev

# 4. Access Application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

**Happy Reporting! 🚀📊**
