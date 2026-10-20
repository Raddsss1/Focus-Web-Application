# ClassMeet — Setup, Deployment & Usage Guide

## 0. How it all fits together

```
Chrome Extension (popup + content script on meet.google.com)
        │  login, class code, heartbeat every ~10 s, events
        ▼
Supabase (Auth + Postgres + Row Level Security + Realtime)  ◄── React web app (dashboard, records, CSV)
```

- Teacher signs up → the extension auto-creates their **class code** (6 characters).
- Student signs up → enters the code → selects the class → opens/creates a Google Meet.
- Content script on Meet detects: in-call, tab focus/away, mic, camera, hand raise, reactions, time in call.
- Everything is saved to Supabase; the teacher sees it live (popup + React dashboard).
- Teacher and students use the **same Supabase account** in the extension and the website.

> **Important:** Google Meet has no public API for these signals, so the extension reads Meet's page
> (button states). Google can change that HTML without notice. All selectors live in one `SEL` object at the
> top of `extension/content.js` — that's the only place to fix if something stops detecting.
> Meet's English UI is assumed (selectors use English `aria-label`s).

## 1. Supabase backend (free)

1. Go to https://supabase.com → sign up → **New project** (save the DB password).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Email**: for testing, turn **off** "Confirm email" (turn on later for production).
4. **Project Settings → API**: copy **Project URL** and the **anon public** key.
   (The anon key is meant to be public; the RLS policies in the SQL protect the data. Never put the `service_role` key anywhere in the extension or React app.)
5. Free-tier limits and auto-pausing of inactive projects change over time — check Supabase's pricing page.

**Alternatives if you don't want Supabase:** Firebase (Auth + Firestore, free Spark plan, very good realtime), Appwrite Cloud, or self-hosted PocketBase (single file, free on a small VPS). The extension only uses `lib/supabase.js`, so switching backends means rewriting that file and the REST calls in `background.js`/`popup.js`.

## 2. VS Code setup

1. Install **Node.js LTS** (https://nodejs.org), **VS Code**, and Google Chrome.
2. Unzip `classmeet.zip` and **File → Open Folder** → `classmeet`.
3. Recommended VS Code extensions: _ESLint_, _Prettier_, _ES7+ React snippets_.
4. Edit `extension/config.js`: paste your Supabase URL + anon key.
5. **React app** (use your existing project, or create one):
   ```bash
   npm create vite@latest web -- --template react
   cd web
   npm install @supabase/supabase-js
   ```
   Copy `web-integration/src/*` into `web/src/`, copy `.env.example` to `web/.env` and fill it in.
   In `App.jsx`, log users in with `signIn/signUp` from `supabaseClient.js`, call `getRole()`, then render
   `<TeacherDashboard />` or `<StudentRecords />`.
   ```bash
   npm run dev     # http://localhost:5173  (matches WEB_APP_URL in config.js)
   ```

## 3. Load the extension in Chrome (testing)

1. Open `chrome://extensions` → turn on **Developer mode** (top right).
2. **Load unpacked** → choose the `classmeet/extension` folder.
3. Pin it via the puzzle-piece icon.
4. After every code change click the **reload ↻** icon on the extension card, then refresh the Meet tab.

**Debugging**

- Popup: right-click the popup → _Inspect_.
- Background: on the extension card click **service worker**.
- Content script: open DevTools on the Meet tab → Console (top dropdown "top" → choose _ClassMeet Tracker_).

**Test plan** (use two Chrome profiles: teacher + student)

1. Teacher profile: sign up as Teacher → note the code.
2. Student profile: sign up as Student → enter the code → Join.
3. Student: **Create my own Meet** → join the call. A blue "attendance is being recorded" badge appears.
4. Toggle mic/camera, raise hand, click a reaction, switch tabs → events appear in Supabase **Table Editor → events** and on the dashboard.
5. If something isn't detected, inspect that Meet button (right-click → Inspect) and update `SEL` in `content.js`.

## 4. Publish to the Chrome Web Store

1. Replace placeholder icons in `extension/icons/` (16, 48, 128 px PNG). Set `WEB_APP_URL` in `config.js` to your hosted dashboard (Vercel/Netlify, both free).
2. Zip the **contents** of the `extension` folder (so `manifest.json` is at the zip root).
3. Register at https://chrome.google.com/webstore/devconsole (one-time US$5 developer fee).
4. **New item** → upload the zip → fill the listing: description, screenshots (1280×800), category.
5. **Privacy tab**: you collect personal data (name, email, attendance activity), so provide a privacy-policy URL, declare the data use, and justify permissions (`storage`; hosts `meet.google.com` for detection and `*.supabase.co` for saving).
6. Visibility: choose **Unlisted** (only people with the link) for school use, or **Public**.
7. Submit for review (typically a few days; host-permission extensions can take longer).
8. Schools using Google Workspace for Education can have the admin **force-install** it from the Admin console (Devices → Chrome → Apps & extensions).
9. Updates: raise `"version"` in `manifest.json`, re-zip, upload again.

## 5. Teacher guide

1. Install the extension, click its icon → **Create account → I'm a teacher**.
2. Your **class code** appears automatically. **Copy code** and send it to students.
3. Click **Start Meet** and join the call. Your Meet link is automatically shared, so students get a "Join teacher's live Meet" button.
4. During class, the popup shows live students: 🎤/🔇 mic, 📷/🚫 camera, ✋ hand, ⚠️ tab away, time in class.
5. After class, open the **dashboard**: attendance per session, time in class, time away, mic/camera time, hand raises, reactions, a per-student event timeline, and **Export CSV**.
6. Statuses: 🟢 active, 🟠 tab away, ⚪ left (no heartbeat for 45 s or the call ended).

## 6. Student guide

1. Install the extension → **Create account → I'm a student**.
2. Enter the teacher's **class code** → **Join**.
3. Pick your active class, then **Join teacher's live Meet** (or **Create my own Meet** for a study session).
4. Stay in the Meet tab. A blue badge confirms recording. Attendance is tracked only inside the call.
5. Check **My records** on the website for your attendance history.
6. Leaving the call or closing the tab ends the session automatically.

## 7. Privacy & limitations (please read)

- Tell students and parents what is recorded and why (consent is legally required in many regions, and mandatory for minors). The badge is deliberately visible.
- The extension records **states and durations** only (mic on/off, camera on/off) — never audio, video, or screen content.
- "Tab away" = the Meet tab is hidden **or** the window lost focus. A student on a second monitor clicking another app counts as away.
- Reactions are detected from clicks on Meet's emoji tray (`data-emoji`); hand-raise/mic/camera come from button state. Verify these after Meet UI updates.
- Students could disable the extension; the dashboard simply shows no session for them.
- Heartbeat is every ~10 s; the live dashboard refetches on each update (fine for classes of ~50). For bigger classes, patch state from the realtime payload instead of refetching.
