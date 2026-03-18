# Wayward ERP - Local Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd "/Users/JohnPastre/Desktop/4. erp/wayward"
   
   # If you have pnpm installed:
   pnpm install
   
   # Otherwise, use npm:
   npm install
   ```

2. **Environment Variables (Optional)**
   The app can run in mock mode without environment variables. If you want to use real services:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your API keys

   **Link Gmail (Settings → Linked accounts)**  
   1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → **Create credentials** → OAuth client ID → **Web application**.  
   2. **Authorized redirect URI**: `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`  
      (e.g. `http://localhost:3000/api/auth/google/callback` for local dev.)  
   3. Set `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in `.env.local`.  
   4. If the app URL and redirect URI don’t match (e.g. `localhost` vs `127.0.0.1`), Google will reject the callback.

3. **Run the Development Server**
   ```bash
   # With pnpm:
   pnpm dev
   
   # With npm:
   npm run dev
   ```

4. **Access the Application**
   Open http://localhost:3000 in your browser

## Features

The app includes:
- Multiple dashboards (Dash, Chat, Tasks, Calendar, Financial, Memory, Social, Health, Goals, Knowledge, Accounts, Settings)
- Chat interface with contextual suggestions
- Forms for Events, Memory, Schedule, Task, Transaction, Upload
- Neo4j integration (runs in mock mode if not configured)
- AI services integration

## Notes

- The app is configured to run in mock mode if Neo4j credentials are missing
- TypeScript build errors are ignored (see next.config.mjs)
- Images are unoptimized for faster development



