# Crescent Management Platform V0.1

A comprehensive, production-ready workforce management system built with React, Firebase, and Material-UI. Track attendance, forecast staffing needs, and manage your recruiting pipeline - all in one powerful platform designed specifically for Crescent operations.

## 🚀 Features

### Core Functionality
- ✅ **Role-Based Authentication** - Secure login with role-specific permissions
- ✅ **Admin Panel** - User management, badge templates, and audit logs (Market Managers only)
- ✅ **Real-Time Data Entry** - Tailored forms for each role
- ✅ **Comprehensive Dashboard** - Visualize trends and metrics with Chart.js
- ✅ **Applicant Tracking System** - Full recruiting pipeline with photo capture
- ✅ **Badge Management System** - Create, verify, and print badges with PLX format
- ✅ **Performance Scorecard** - Track KPIs and performance
- ✅ **Intelligent Forecasting** - AI-driven staffing predictions
- ✅ **Bulk Data Import** - CSV upload for historical data
- ✅ **Early Leave Tracking** - Monitor and analyze trends

### Key Metrics Tracked
- Per-shift attendance and staffing levels
- Client requests vs. actual headcount
- New starts and send-homes
- Hours worked by shift and total
- Early leaves with corrective actions
- Recruiting pipeline metrics
- Interview show rates
- Turnover analysis

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite
- **UI Framework**: Material-UI (MUI) v7
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Charts**: Chart.js + React-Chartjs-2
- **Date Handling**: Day.js
- **CSV Processing**: PapaParse
- **Routing**: React Router v7
- **Media**: Webcam API for photo capture

## 📦 Installation

### Prerequisites
- Node.js 18+
- Firebase account
- Git

### Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Firebase**

   Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions:
   - Create Firebase project
   - Enable Authentication
   - Create Firestore database
   - Configure security rules

3. **Configure Firebase credentials**

   Edit `src/firebase.js` with your Firebase config

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **First-time setup**
   - Sign up for an account
   - Go to Firebase Console → Firestore → `users` collection
   - Add `role: "admin"` to your user document

## 📖 Usage Guide

### For On-Site Managers
- Record shift attendance, new starts, and send-homes
- Track line cuts and operational metrics

### For Recruiters
- Log interviews and applications processed
- Manage applicant pipeline
- Track conversion rates

### For Market Managers
- Submit hours worked
- Record early leaves
- Access full analytics and forecasting

## 🎯 Key Features

### Intelligent Forecasting
Analyzes 90 days of historical data to predict:
- Future headcount needs
- Recommended hiring numbers
- Recruiting timelines
- Confidence scores

### Applicant Tracking System
- Full pipeline: Applied → Interviewed → Processed → Hired → Started
- Conversion rate tracking
- Projected start dates
- Pipeline health metrics

### Performance Scorecard
- Overall performance score (0-100)
- Fill rate tracking
- Staffing movement analysis
- Hours and recruiting metrics

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/            # React context providers
├── pages/               # Page components
├── services/            # Business logic and API calls
├── firebase.js          # Firebase configuration
└── App.jsx             # Main app component
```

## 🚢 Deployment

### Firebase Hosting
```bash
npm run build
firebase deploy
```

### Vercel/Netlify
- Build command: `npm run build`
- Output directory: `dist`

## 📚 Documentation

- [Firebase Setup Guide](FIREBASE_SETUP.md)
- [Firestore Schema](FIRESTORE_SCHEMA.md)
- [Badge Management System](BADGE_SYSTEM.md)
- [Admin Panel Guide](ADMIN_PANEL.md)

## 🗺️ Roadmap

- [ ] Email notifications
- [ ] SharePoint integration
- [ ] PDF/Excel exports
- [ ] Mobile optimizations
- [ ] Advanced analytics
- [ ] Multi-client support

## 📄 License

Proprietary software for Crescent Management Platform V0.1.

---

**Built with ❤️ for efficient workforce management**
