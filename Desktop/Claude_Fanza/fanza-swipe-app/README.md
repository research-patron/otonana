# FANZA Swipe App

A modern TikTok-style video discovery app for FANZA content, built with React and Firebase.

## 🚀 Features

- **TikTok-style UI**: Vertical video swiping interface
- **Smart Discovery**: AI-powered video recommendations
- **Real-time Search**: Fast video search with auto-suggestions
- **User Preferences**: Personalized content based on viewing behavior
- **Mobile Optimized**: Responsive design for all devices
- **Cloud Backend**: Serverless architecture with Firebase Functions

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Firebase Functions + Cloud Firestore
- **API**: FANZA Affiliate API integration
- **Hosting**: Firebase Hosting

## 🏃 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase CLI
- FANZA API credentials

### Installation

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd fanza-swipe-app
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase & FANZA API credentials
   ```

3. **Deploy Functions**
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── components/           # React components
├── config/              # Firebase & API configuration  
├── assets/              # Static assets
└── App.jsx             # Main application component

functions/
└── index.js            # Firebase Cloud Functions

public/
└── post/               # Static blog content
```

## 🚀 Deployment

```bash
# Build and deploy everything
npm run build
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions  
firebase deploy --only functions
```

## 🔧 Configuration

### Environment Variables
- `VITE_FIREBASE_*`: Firebase project configuration
- `VITE_FANZA_API_ID`: FANZA API ID
- `VITE_FANZA_AFFILIATE_ID`: FANZA Affiliate ID

### Firebase Setup
1. Create a Firebase project
2. Enable Cloud Functions and Hosting
3. Configure Secret Manager for API credentials

## 📱 Live Demo

Visit: [https://otonana-473e3.web.app](https://otonana-473e3.web.app)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
