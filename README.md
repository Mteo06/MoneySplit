# MoneySplit

MoneySplit is a modern, mobile-first web application for groups and couples to track shared expenses, split costs, and settle debts easily. It features a Next.js App Router frontend with Tailwind CSS and shadcn/ui components, powered by Firebase Authentication and Firestore.

## Features

- **Authentication**: Email/Password login and registration via Firebase Auth.
- **Group Management**: Create groups, invite members via shareable links.
- **Expense Tracking**: Add expenses with descriptions, amounts, and categories.
- **Smart Debt Simplification**: Built-in algorithm minimizes the number of transactions needed for group members to settle up.
- **Modern UI**: Clean, responsive design optimized for mobile and desktop using shadcn/ui.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, shadcn/ui, Lucide React icons.
- **Backend & Database**: Firebase (Auth, Firestore).
- **Deployment**: Vercel (recommended).

## Setup & Local Development

### Prerequisites

- Node.js 18+
- A [Firebase](https://firebase.google.com/) Project

### 1. Firebase Configuration

1. Go to the Firebase Console and create a new project.
2. Enable **Authentication** (Email/Password provider).
3. Enable **Firestore Database** (Start in test mode or copy the rules below).
4. Register a Web App in your Firebase project settings to get your API keys.

Replace the contents of your Firebase Rules in the Firestore console with the provided `firestore.rules` file:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    match /users/{userId} { allow read: if isAuthenticated(); allow write: if request.auth.uid == userId; }
    match /groups/{groupId} { allow read, create: if isAuthenticated(); allow update: if isAuthenticated(); allow delete: if request.auth.uid == resource.data.created_by; }
    match /expenses/{expenseId} { allow read, write: if isAuthenticated(); }
    match /expense_participants/{participantId} { allow read, write: if isAuthenticated(); }
    match /settlements/{settlementId} { allow read, write: if isAuthenticated(); }
  }
}
```

### 2. Environment Variables

Create a `.env.local` file in the root of the project and add your Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Installation

Install the dependencies:

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment to Vercel

The easiest way to deploy your Next.js app is to use the Vercel Platform.

1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Add the exact same environment variables from your `.env.local` file in the Vercel project settings.
4. Click **Deploy**.

## Future Roadmap / Advanced Features
- Receipt photo uploads (Firebase Storage)
- Advanced charts for spending categories
- Activity Feed
