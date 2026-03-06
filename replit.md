# Project Overview

A social media app built with React, Vite, and Firebase. Users can register/login, post content, follow others, search users, and receive notifications.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Backend/DB**: Firebase (Auth, Firestore, Storage)
- **Icons**: Lucide React

## Project Structure

```
src/
  components/    # Reusable UI components (Avatar, BottomNav, Header, Post)
  context/       # React context (AuthContext with Firebase auth)
  pages/         # Route pages (Feed, Login, Register, Profile, CreatePost, Notifications, Search)
  firebase.js    # Firebase initialization and exports
  main.jsx       # App entry point with BrowserRouter
  App.jsx        # Route definitions
```

## Configuration

- **Dev server**: Vite on port 5000, host 0.0.0.0
- **Firebase project**: lis-app-8c60c
- **Deployment**: Static site (npm run build → dist/)

## Running

```bash
npm run dev    # Start dev server on port 5000
npm run build  # Build to dist/
```
