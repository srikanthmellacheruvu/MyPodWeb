# MyPod (web version) — setup guide

MyPod runs as a Home Screen web app: no Sideloadly, no 7-day renewal, and it works on every iPhone you own (iOS 16 or later). Your songs are stored on each iPhone, inside MyPod, and play offline.

You need: your Windows laptop, your GitHub account, and each iPhone. About 15 minutes the first time.

---

## Part 1 — Put MyPod online (once, on the laptop)

GitHub Pages hosts it for free. Pages only works on **public** repositories on a free account; that's fine, because only the app's code goes there — your songs never leave your phone.

1. Unzip **MyPodWeb.zip**. Inside the `MyPodWeb` folder there are 9 files:
   `index.html`, `app.js`, `style.css`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `README.md`.
2. On github.com click **+** (top right) → **New repository**. Name it `mypod-web`, choose **Public**, click **Create repository**.
3. Click **uploading an existing file**, select all 9 files in File Explorer (Ctrl+A), drag them onto the page, and click **Commit changes**. (There are no folders this time, so nothing gets skipped.)
4. In the repository, click **Settings** (top tab) → **Pages** (left side).
5. Under **Build and deployment → Source**, choose **Deploy from a branch**. Under **Branch**, choose **main** and **/ (root)**, then **Save**.
6. Wait 1–2 minutes and refresh the page. A box appears saying **"Your site is live at"** with the address — it will be
   **https://srikanthmellacheruvu.github.io/mypod-web/**

## Part 2 — Add MyPod to each iPhone

Do this on every iPhone you want it on.

1. Open the address above in **Safari** (it must be Safari, not Chrome).
2. Tap the **Share** button (square with an up arrow) → scroll down → **Add to Home Screen** → **Add**.
3. Open **MyPod from the Home Screen icon** from now on. Songs added there stay with the Home Screen app; the Safari tab keeps a separate, empty library.

## Part 3 — Add songs

1. Get the songs onto the iPhone first. The easiest way from Windows: open File Explorer → **iCloud Drive**, copy your songs folder in, and wait for the green ticks.
2. In MyPod: main menu → **Add Songs…** →
   - **Choose Songs…** to add them to your library, or
   - **Choose Songs into a Playlist…** — type a playlist name, then pick the songs.
3. In the file picker, go to **Browse → iCloud Drive →** your folder, tap **Select** (top right), tap the songs (or **Select All**), then **Open**.
4. MyPod copies each song in and shows "Adding 3 of 40…". Keep MyPod open until it says "Added 40 songs."

Formats: MP3, M4A/AAC, WAV, and others Safari can play. Songs without tags use the file name as the title (`Artist - Title.mp3` is split into both) and go under "Unknown Artist / Album".

On iOS 16 (your iPhone X), Safari may limit how much a web app can store. A few hundred songs is normally fine; if adding stops partway with an error, you've reached the limit.

---

## Using MyPod

| Control | What it does |
|---|---|
| Slide around the wheel | Scroll menus; on Now Playing, volume (needs Sound Processing on) |
| Centre of the wheel | Select. On Now Playing it switches between volume and seeking |
| ▶ top-left / ❚❚ top-right | Play / Pause |
| ◀◀ bottom-left / ▶▶ bottom-right | Previous / next song |
| ‹ Back (title bar) | Back. You can also swipe right on a menu |
| Tap a row | Select it directly |
| Drag the progress bar | Jump to any point in the song |

**Main menu:** Music, Cover Flow, Now Playing, Shuffle Songs, Search, Extras (Clock, Stopwatch), Add Songs…, Settings.

**Settings:**
- **Main Menu** — switch items on or off.
- **Theme** — Silver, Black, Green, Blue, Red, Pink, Gold, Purple.
- **Sound Processing** (off by default) — turns on the **Equalizer** and wheel volume. Leave it **off** if you want music to keep playing reliably with the screen locked; then use the iPhone's side buttons for volume.
- **Volume Levelling** — evens out loudness between MP3s (works with Sound Processing on).
- Shuffle, Repeat (Off / All / One), Clicker Sound, Delete All Songs, About.

Lock screen and Control Centre show the song with play/pause, previous/next and a seek bar.

## What's different from the installed app

- Playback with the screen locked can stop on some iOS versions, especially with Sound Processing on. If it stops, unlock and press Play.
- No vibration on the wheel (iPhone doesn't allow it for web apps); the click sound still works.
- No alarms — use the iPhone Clock app.
- Each iPhone keeps its own songs. iOS can clear a web app's storage if the phone runs very low on space or MyPod isn't opened for several weeks, so keep your song folder in iCloud Drive as the master copy.

## Updating MyPod later

Upload the changed files to the same `mypod-web` repository (they replace the old ones). Each iPhone picks up the new version the next time MyPod is opened with internet. Your songs are not affected.
