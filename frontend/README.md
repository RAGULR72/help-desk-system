# Proserve Help Desk - Intelligence Interface

A premium, high-performance React frontend designed for modern enterprise support operations. Featuring glassmorphism aesthetics, AI-powered interactions, and multi-layer security.

## ✨ Premium Features

- **AI Concierge**: Multilingual (English, Tamil, Hindi, Telugu) AI assistant for instant ticket drafting and support.
- **Smart Co-Pilot**: Automated resolution blueprints and technical guidance directly in the ticket view.
- **Interactive Command Center**: Real-time admin dashboard with live headcounts and SLA breach monitoring.
- **Visual Analytics**: Dynamic charts (Recharts) for monitoring system performance and ticket trends.
- **Modern UI**: Full dark mode support, smooth Framer Motion transitions, and responsive layouts.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to `.env` and configure your `VITE_API_URL` and map keys.

3. **Development Mode**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```

## 🔐 Security & UX

- **Client-Side Sanitization**: All content (especially AI responses) is sanitized using DOMPurify to prevent XSS.
- **Secure Sessions**: Enforce concurrent session limits and automatic inactivity logouts.
- **MFA Flow**: Integrated 2FA setup and verification process for staff members.
- **CSRF Safety**: Enforces custom security headers on all state-changing API requests.

## 🛠️ Technology Stack

- **React 19**: Latest performance and hook features.
- **Tailwind CSS**: Utility-first styling with custom glassmorphism effects.
- **Framer Motion**: Production-grade animation engine.
- **Axios**: Configured with interceptors for auth and error handling.
- **Lucide/Fi Icons**: Modern iconography.

## 📡 Backend Connectivity
Ensure the [Backend](../backend/README.md) is running and accessible. The frontend communicates via the base URL defined in your `.env`.
