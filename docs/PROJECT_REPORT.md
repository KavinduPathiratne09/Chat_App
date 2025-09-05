# InstantChat – Project Documentation

## 1. Overview
InstantChat is an Android chat app enabling two strangers to start a temporary real‑time conversation by pairing via a QR code. One phone generates a QR, the other scans it, and a chat session is created. The app stores chat history locally using SQLite.

- Platform: Android 9+
- Framework: Expo (React Native + TypeScript)
- Pairing: QR code generation and scanning (expo-camera)
- Storage: SQLite (expo-sqlite) with web fallback to AsyncStorage
- Optional transport: Firebase Firestore (realtime) via configuration; local simulation fallback otherwise

## 2. Objectives
- Simple and fast QR-based pairing between two devices
- Clean chat UI with readable bubbles and timestamps
- Reliable local persistence (sessions and messages)
- Robust UX with permission prompts, toasts, and error handling

## 3. Technologies
- React Native (Expo 53), TypeScript
- expo-camera for scanning, react-native-qrcode-svg for generation
- expo-sqlite for message/session persistence
- Optional: Firebase JS SDK (Firestore) for real-time transport (configurable)

## 4. Compatibility
- Android 9 (API 28) and above (tested via Expo Go / development build)
- Camera permissions requested at runtime; QR scanning requires camera support

## 5. Architecture
- UI Screens (app/(tabs))
  - Menu: entry point to Generate, Scan, and History
  - QRGenerator: create session QR and initialize host connection
  - QRScanner: scan host QR, prompt for guest name, connect
  - ChatInterface: real-time chat view with in-chat QR modal
  - ChatHistory: list of previous sessions from SQLite
- Services (services/*)
  - MessagingService: abstracts connection and messaging
    - Uses FirebaseService when configured (Firestore), otherwise local simulation (no longer auto-replies)
  - DatabaseService: SQLite wrapper for sessions/messages (+ AsyncStorage web adapter)
  - QRCodeService: QR data create/parse, permissions

### Data Model (SQLite)
- Table chat_sessions
  - id (PK), sessionId (TEXT UNIQUE), participantName (TEXT)
  - createdAt (INTEGER), lastMessageAt (INTEGER)
- Table messages
  - id (PK), sessionId (TEXT), sender (TEXT), content (TEXT)
  - timestamp (INTEGER), isOwn (INTEGER)

## 6. Features (Rubric Mapping)
### Core Chat Functionality
- User Interface: Chronological message list with sender labels and timestamps; readable text in bubbles; input area with send state.
- Instant Messaging: MessagingService routes sends/receives; optional Firestore for real-time across phones; otherwise direct local delivery without simulated auto-replies.
- Text Input & Display: Multiline input, send button with loading/disabled states; message bubbles support long text, proper wrapping.
- Message Persistence: All messages saved to SQLite; sessions saved and visible in Chat History (latest first).

### QR Code Pairing & Connection
- QR Generation: Host generates a session QR; QR remains visible until host proceeds.
- QR Scanning: Guest scans via camera; manual entry supported.
- Automated Connection: On scan + name entry, app initializes the connection and navigates to chat.

### Versatility & Robustness
- Notifications: Toasts on connect/disconnect and incoming messages (Android).
- Exception Handling: Alerts and fallbacks for camera permission, invalid/expired QR, send/connect errors, clipboard/share errors.

## 7. Android Considerations
- app.json declares CAMERA permission and usage strings
- Safe areas respected; dark/light themes supported
- Performance: lean components, memoized lists, simple StyleSheet usage

## 8. Setup & Run
Prerequisites: Node.js LTS, Expo CLI (via npx), Android device with Expo Go or a dev build.

1) Install dependencies
- In repository root: `npm install`

2) Start development server
- `npx expo start`

3) Open on Android phone
- Scan the Metro QR with Expo Go (same Wi‑Fi) or run on emulator.

Optional: Real-time across two phones via Firestore
- Edit `app.json` → expo.extra.firebase with your web config:
  - apiKey, authDomain, projectId, appId (required)
- Reload the app. Messages now sync through Firestore between devices.

## 9. Demo Script (for the video)
- Part 1: Pairing
  - Phone A: Menu → Generate QR Code → enter name → Generate (QR stays visible)
  - Phone B: Menu → Scan QR Code → Start Scanning → scan A’s screen → enter name → Join Chat
  - Phone A: Tap “Open Chat” when ready
- Part 2: Messaging
  - Exchange messages both ways; show timestamps and smooth scrolling
  - Show Toasts on connect/disconnect (Android)
- Part 3: Persistence
  - Back to Menu → Chat History shows the session with participant name and last message time
  - Reopen the session from history; confirm messages persist
- Keep video < 20 minutes

## 10. UX Decisions
- QR-first layouts: Enlarged QR (240px), minimal labels to reduce visual noise
- Host flow: QR remains until user taps “Open Chat”, ensuring time to scan
- Contrast: Black button text and readable bubble text based on theme colors
- Deletion: Long-press to delete a session; Clear All button in history

## 11. Error Handling & Edge Cases
- Camera permission denied → explanatory alert with retry
- Invalid/expired QR → alert with retry or cancel
- Connect/send failures → alerts; safe cleanup on disconnect
- Large messages → wrapped text; length capped at 1000 chars

## 12. Testing Checklist
- Generate → QR visible and shareable; Open Chat only when ready
- Scan → name prompt → connect → chat navigates for both
- Send/receive messages on both devices (with Firestore enabled)
- Messages persist and are ordered chronologically
- History shows sessions; delete single session; clear all works
- Dark/light themes readable

## 13. Limitations & Future Work
- No offline sync; messages are local (except with Firestore)
- No typing indicators or read receipts
- No push notifications (can add via expo-notifications)
- Optional E2E encryption could be added at transport layer

## 14. Submission Checklist
- Source code (cleaned) or GitHub repo shared
- Installable APK if required
- Project documentation (this file exported as PDF)
- Demo video (< 20 mins) with QR pairing, chat, and history

## 15. How to Export This to PDF
- Option A: Open this Markdown in VS Code → Print to PDF (or use a Markdown PDF extension)
- Option B: Paste into Google Docs → File → Download → PDF Document

---
Prepared for: Mobile Application Development Project (InstantChat)
