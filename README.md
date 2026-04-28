<div align="center">

# ViniPlay

**A powerful, self-hosted IPTV player with a modern web interface.**

Stream your M3U playlists with EPG data, manage users, cast to your TV, and watch multiple channels at once.

Join my <a href="https://discord.gg/DXxvAw22Us">discord</a> to talk with the community.
<p>
    <img src="https://img.shields.io/badge/docker-ready-blue.svg?style=for-the-badge&logo=docker" alt="Docker Ready">
    <img src="https://img.shields.io/badge/platform-node-green.svg?style=for-the-badge&logo=node.js" alt="Node.js Backend">
</p>

</div>

---

## About This Fork

This fork tracks ViniPlay upstream while carrying a set of integration and deployment improvements that are not necessarily present in the upstream `ardoviniandrea/ViniPlay` repository:

- **Fast container startup and login**: startup source processing skips heavyweight VOD catalog refreshes, and the initial `/api/config` response no longer embeds legacy VOD arrays. VOD is loaded lazily from the VOD library endpoint.
- **Per-source VOD control**: M3U and Xtream Codes sources have an **Include VOD content** option. Disable it for live-TV-only subscriptions to avoid processing movie/series catalogs for that source.
- **Timeshift support**: selected live channels can be buffered into local HLS segments for pause/rewind-style playback, with settings, API routes, cleanup, and player integration.
- **Chromecast and proxy hardening**: Cast URLs/session behavior and external image/logo loading are routed through tested helpers/proxy endpoints for better browser/device compatibility.
- **Docker/local runtime fixes**: Docker uses `/data` and `/dvr`, while plain local `npm start` uses project-local `./data` and `./dvr` so development does not require root-owned paths.
- **Regression test harness**: Vitest-based unit, frontend, integration, syntax, diff, and startup smoke checks cover the fork-specific behavior.

---

ViniPlay transforms your M3U and EPG files into a polished, high-performance streaming experience. It's a full-featured IPTV solution that runs in a Docker container, providing a robust Node.js backend to handle streams and a sleek, responsive frontend for an exceptional user experience.

The server-side backend resolves common CORS and browser compatibility issues by proxying or transcoding streams with FFMPEG, while the feature-rich frontend provides a user experience comparable to premium IPTV services.

### Main User Interface Flow
![Main User Interface Flow](https://github.com/ardoviniandrea/ViniPlay/blob/main/images/viniplay-main%20ux-min.gif)

### Feature Snapshots

| TV Guide Page | Multi-View Page | Direct Player |
| :---: | :---: | :---: |
| ![TV Guide page](https://i.imgur.com/O7jk6X1.png) | ![Multi-View page](https://i.imgur.com/eE3R0Hr.png) <br> [View Animation](https://github.com/ardoviniandrea/ViniPlay/blob/main/images/multiview.gif) | ![Direct player](https://i.imgur.com/ftmxvss.png) |

| DVR & Recording | Admin Activity Monitoring | Push Notifications |
| :---: | :---: | :---: |
| ![DVR](https://i.imgur.com/XVhT1pH.png) <br> [View Animation](https://github.com/ardoviniandrea/ViniPlay/blob/main/images/DVR.gif) | ![Admin activity](https://i.imgur.com/4zaFF1v.png) | ![Notification](https://i.imgur.com/D4hFLoI.png) <br> [View Animation](https://github.com/ardoviniandrea/ViniPlay/blob/main/images/notification.gif) |

| Powerful Settings | Responsive Mobile View | Favorite Manager |
| :---: | :---: | :---: |
| ![Settings](https://i.imgur.com/FxOFq88.png) | ![Mobile TV Guide view](https://i.imgur.com/j8LjxSf.png) | ![Favorite manager](https://i.imgur.com/kKCnkFg.png) <br> [View Animation](https://github.com/ardoviniandrea/ViniPlay/blob/main/images/Favorites.gif) |


---

## ✨ Features

 - 👤 **Multi-User Management**: Secure the application with a dedicated admin account. Create, edit, and manage standard user accounts.
 - 📺 **Modern TV Guide**: A high-performance, virtualized EPG grid that handles thousands of channels and programs smoothly. Features include advanced search, channel favoriting, and a "Recents" category.
 - 🖼️ **Multi-View**: Drag, drop, and resize players on a grid to watch multiple streams simultaneously. Save and load custom layouts. "Immersive view" will hide all UI elements and only leave the players on the page to maximize the watching experience.
 - 🛜 **Chromecast Support**: Cast your streams directly to any Google Cast-enabled device on your network. (This will only work if your source signal is strong and correctly passed without package missing, due to Cast framework)
 - 🔔 **Push Notifications**: Set reminders for upcoming programs and receive push notifications in your browser, even when the app is closed.
 - ⚙️ **Powerful Transcoding - even with GPUs**: The backend uses FFMPEG to process streams, ensuring compatibility across all modern browsers and devices. Create custom stream profiles to tailor transcoding settings. GPU transcoding supported. (Nvidia, InterlQSV and Vaapi)
 - 📂 **Flexible Source Management**: Add M3U and EPG sources from local files, Xtream Codes, or remote URLs. Set automatic refresh intervals and optionally disable VOD processing per M3U/XC source for live-TV-only subscriptions.
 - 🚀 **High Performance UI**: The frontend is built with performance in mind, using UI virtualization, lazy VOD loading, and efficient state management to ensure a fast and responsive experience.
 - 🐳 **Dockerized Deployment**: The entire application is packaged in a single Docker container for simple, one-command deployment using Docker or Docker Compose.
 - ▶️ **Picture-in-Picture**: Pop out the player to keep watching while you work on other things.
 - 🎥 **DVR**: Record programs using FFMPEG. Schedule recording via the TV Guide, or set specific channels and time with ease.
 - 📽️ **Single player**: Play .m3u8 and .ts links directly from the browser, with detailed console logs and recorded history
 - 👥 **Admin monitoring page**: Monitor users watch stream in real time, store historical plays, and broadcast messages to all users.
 - 📺 **VOD support**: Play provider VOD through a scalable Movies/Series interface. VOD catalogs load lazily and can be excluded per source when you only want live TV.
 - ⏱️ **Timeshift**: Buffer selected live channels to local HLS segments for timeshift-style playback, with configurable storage and cleanup.
 - 🧪 **Automated Test Harness**: Includes unit, frontend, integration, syntax, diff, and local startup smoke checks for safer updates.

---


## 🚀 Getting Started

ViniPlay is designed for easy deployment using Docker.

### Prerequisites

-   Docker
-   Docker Compose (Recommended)
    
### Method 1: Using `docker-compose` (Recommended)

1.  **Create Project Files:** Create a directory for your ViniPlay setup and add a `docker-compose.yml` and a `.env` file.
    
    -   `docker-compose.yml`:
        
        ```
        version: "3.8"
        services:
          viniplay:
            build: .
            image: viniplay:local
            container_name: viniplay
            ports:
              - "8998:8998"
            restart: unless-stopped
            volumes:
              - ./viniplay-data:/data
              - ./viniplay-dvr:/dvr
            env_file:
              - ./.env
        
        ```
        
    -   `.env`:
        
        ```
        # Replace this with a long, random, and secret string
        SESSION_SECRET=your_super_secret_session_key_here
        
        ```
        
        > **Security Note:** Your `SESSION_SECRET` should be a long, random string to properly secure user sessions.
    
2.  **Build and Run the Container from this checkout:**
    
    ```
    docker-compose up --build -d
    
    ```

### Method 2: Using `docker`

1.  **Build the Image:**
    
    ```
    docker build -t viniplay .
    
    ```
    
2.  **Run the Container:** Create volume directories (`mkdir viniplay-data viniplay-dvr`) and a `.env` file first. Then run the container:
    
    ```
    docker run -d \
      -p 8998:8998 \
      --name viniplay \
      --env-file ./.env \
      -v "$(pwd)/viniplay-data":/data \
      -v "$(pwd)/viniplay-dvr":/dvr \
      viniplay
    
    ```
    
### First-Time Setup

Once the container is running, open your browser and navigate to `http://localhost:8998`. You will be prompted to create your initial **admin account**. After creating the admin account, you can log in and start configuring your sources in the **Settings** tab.

### Local Development

For non-Docker development, run:

```
npm install
npm start
```

Local `npm start` stores runtime files in project-local `./data` and `./dvr` directories. Docker keeps using `/data` and `/dvr` from the container environment.

---
## 🔧 Configuration

All configuration is done via the web interface in the **Settings** tab.

-   **Data Sources:** Add your M3U and EPG sources from remote URLs, Xtream Codes, or uploaded files.
-   **Include VOD content:** For M3U and Xtream Codes sources, leave this enabled when you want movie/series catalog processing. Disable it for live-TV-only subscriptions to reduce refresh time and storage usage.
-   **Processing:** After adding sources, click the **Process Sources & View Guide** button to download, parse, and merge live/EPG data. Manual and scheduled processing can refresh VOD only for sources where **Include VOD content** is enabled; container startup skips VOD refresh so the app becomes responsive quickly.
-   **Player Settings:** Manage User-Agent strings and define `ffmpeg` stream profiles.
-   **User Management (Admin):** Admins can create, edit, and delete user accounts.

---
## 🏗️ Project Structure

The project is organized into a Node.js backend and a modular vanilla JavaScript frontend.

```
/
├── public/                          # Frontend static files
│   ├── js/
│   │   ├── main.js                  # Main application entry point
│   │   └── modules/                 # Modular JS components for each feature
│   │       ├── api.js               # Backend API communication
│   │       ├── auth.js              # Authentication flow
│   │       ├── cast.js              # Google Cast logic
│   │       ├── dvr.js               # DVR logic
│   │       ├── guide.js             # TV Guide logic & rendering
│   │       ├── multiview.js         # Multi-View grid and players
│   │       ├── notification.js      # Push notification management
│   │       ├── player.js            # Video player (mpegts.js)
│   │       ├── settings.js          # Settings page logic
│   │       ├── state.js             # Shared application state
│   │       ├── ui.js                # Global UI functions (modals, etc.)
│   │       └── utils.js             # Utility functions (parsers)
│   ├── sw.js                        # Service Worker for push notifications
│   └── index.html                   # Main HTML file
│
├── lib/                             # Shared backend helpers
├── tests/                           # Vitest unit, frontend, integration, and smoke tests
├── server.js                        # Node.js backend (Express.js)
├── Dockerfile                       # Docker build instructions
├── docker-compose.yml               # Docker Compose configuration
├── package.json                     # Node.js dependencies
└── .env                             # Environment variables (e.g., SESSION_SECRET)

```

---
## 🧪 Verification

Useful local checks:

```
npm test
npm run check:syntax
npm run check:diff
node scripts/smoke-local-start.js
```

---
## 🏗️ Roadmap

Upcoming features and fixes include:

-   Improve VOD provider compatibility and metadata quality.
-   Making DVR .ts files seekable during recording.
-   Storing logos to improve load time.
-   Implementing full horizontal scroll in the TV Guide.

---
## ⚖️ License

ViniPlay is licensed under **CC BY-NC-SA 4.0**:

- **BY**: Give credit where credit’s due.
- **NC**: No commercial use.
- **SA**: Share alike if you remix.

For full license details, see [LICENSE](https://creativecommons.org/licenses/by-nc-sa/4.0/).
