/**
 * YouTube on Twitch - Content Script
 * Watch YouTube livestreams with Twitch chat
 */

(function () {
    'use strict';

    // Prevent double execution
    if (window.__ytOnTwitchLoaded) return;
    window.__ytOnTwitchLoaded = true;

    // =====================
    // Configuration
    // =====================
    const CONFIG = {
        SYNC_INTERVAL: 10 * 60 * 1000, // 10 minutes
        SYNC_SPEED: 2.0,
        NORMAL_SPEED: 1.0,
        CHECK_INTERVAL: 1500,
        MAX_ATTEMPTS: 15
    };

    // =====================
    // State
    // =====================
    const state = {
        initialized: false,
        youtubeVideoId: null,
        twitchVideo: null,
        autoSyncEnabled: false,
        syncIntervalId: null,
        isSyncing: false
    };

    // =====================
    // Storage Helpers
    // =====================
    function saveState(key, value) {
        try {
            chrome.storage?.local?.set({ [key]: value });
        } catch (e) { }
    }

    function loadState(key) {
        return new Promise((resolve) => {
            try {
                chrome.storage?.local?.get([key], (result) => resolve(result?.[key]));
            } catch (e) {
                resolve(null);
            }
        });
    }

    function getTwitchChannel() {
        const match = window.location.pathname.match(/^\/([a-zA-Z0-9_]+)/);
        return match ? match[1].toLowerCase() : null;
    }

    // =====================
    // UI Creation
    // =====================
    function createNavButton() {
        const wrapper = document.createElement('div');
        wrapper.id = 'ytot-nav-wrapper';

        wrapper.innerHTML = `
            <button class="ytot-nav-btn" id="ytot-toggle">
                <span class="ytot-icon">▶</span>
                <span class="ytot-label">YouTube</span>
            </button>
            <div class="ytot-dropdown" id="ytot-dropdown">
                <div class="ytot-dropdown-header">
                    <span>Watch YouTube Stream</span>
                    <button class="ytot-close" id="ytot-close">×</button>
                </div>
                <div class="ytot-dropdown-body">
                    <input type="text" id="ytot-url" placeholder="Paste YouTube URL" />
                    <button class="ytot-go" id="ytot-go">Go</button>
                </div>
                <div class="ytot-options">
                    <label class="ytot-option">
                        <input type="checkbox" id="ytot-autosync" />
                        <span>Auto-sync (catch up every 10 min)</span>
                    </label>
                </div>
                <div class="ytot-actions">
                    <button class="ytot-sync-now" id="ytot-sync-now">⚡ Sync Now</button>
                    <button class="ytot-restore" id="ytot-restore">Restore Twitch</button>
                </div>
                <div class="ytot-status" id="ytot-status"></div>
            </div>
        `;
        return wrapper;
    }

    // =====================
    // YouTube URL Parsing
    // =====================
    function extractVideoId(url) {
        if (!url) return null;
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    // =====================
    // Twitch Player Control
    // =====================
    function pauseTwitch() {
        const video = document.querySelector('video');
        if (video) {
            video.pause();
            video.muted = true;
            state.twitchVideo = video;
        }
    }

    function resumeTwitch() {
        if (state.twitchVideo) {
            state.twitchVideo.muted = false;
            state.twitchVideo.play().catch(() => { });
        }
    }

    // =====================
    // YouTube Player
    // =====================
    function injectYouTube(videoId) {
        if (!videoId) return;

        const container = document.querySelector('[data-a-target="video-player-layout"]') ||
            document.querySelector('.video-player__container') ||
            document.querySelector('.video-player');

        if (!container) {
            updateStatus('Error: Player not found', 'error');
            return;
        }

        pauseTwitch();

        // Remove existing wrapper if any
        document.getElementById('ytot-youtube-wrapper')?.remove();

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.id = 'ytot-youtube-wrapper';

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'ytot-youtube-player';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
        iframe.setAttribute('allowfullscreen', 'true');

        wrapper.appendChild(iframe);
        container.style.position = 'relative';
        container.appendChild(wrapper);

        // Update state
        state.youtubeVideoId = videoId;
        saveState(`ytot_${getTwitchChannel()}`, videoId);

        // Update UI
        updateToggleButton(true);
        closeDropdown();
        updateStatus('YouTube playing', 'success');

        // Start auto-sync if enabled
        if (state.autoSyncEnabled) {
            startAutoSync();
        }

        console.log('[YTOT] YouTube injected:', videoId);
    }

    function removeYouTube() {
        document.getElementById('ytot-youtube-wrapper')?.remove();
        resumeTwitch();
        stopAutoSync();

        state.youtubeVideoId = null;
        updateToggleButton(false);
        updateStatus('');

        console.log('[YTOT] YouTube removed');
    }

    // =====================
    // Auto-Sync Feature
    // =====================
    function syncNow() {
        const iframe = document.getElementById('ytot-youtube-player');
        if (!iframe) return;

        state.isSyncing = true;
        updateStatus('⚡ Syncing...', 'syncing');

        // Send message to YouTube iframe to speed up
        try {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: 'setPlaybackRate',
                args: [CONFIG.SYNC_SPEED]
            }), '*');

            // After 5 seconds, check and reset
            setTimeout(() => {
                iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'setPlaybackRate',
                    args: [CONFIG.NORMAL_SPEED]
                }), '*');

                state.isSyncing = false;
                updateStatus('✓ Synced', 'success');

                // Clear status after 3 seconds
                setTimeout(() => {
                    if (!state.isSyncing) updateStatus('');
                }, 3000);
            }, 5000);
        } catch (e) {
            state.isSyncing = false;
            updateStatus('Sync failed', 'error');
        }
    }

    function startAutoSync() {
        if (state.syncIntervalId) return;

        state.syncIntervalId = setInterval(() => {
            if (state.youtubeVideoId && !state.isSyncing) {
                syncNow();
            }
        }, CONFIG.SYNC_INTERVAL);

        console.log('[YTOT] Auto-sync started');
    }

    function stopAutoSync() {
        if (state.syncIntervalId) {
            clearInterval(state.syncIntervalId);
            state.syncIntervalId = null;
        }
    }

    // =====================
    // UI Helpers
    // =====================
    function updateToggleButton(isActive) {
        const toggle = document.getElementById('ytot-toggle');
        const icon = toggle?.querySelector('.ytot-icon');
        const label = toggle?.querySelector('.ytot-label');

        if (isActive) {
            toggle?.classList.add('active');
            if (icon) icon.textContent = '🔴';
            if (label) label.textContent = 'Live';
            document.getElementById('ytot-restore').style.display = 'block';
            document.getElementById('ytot-sync-now').style.display = 'block';
        } else {
            toggle?.classList.remove('active');
            if (icon) icon.textContent = '▶';
            if (label) label.textContent = 'YouTube';
            document.getElementById('ytot-restore').style.display = 'none';
            document.getElementById('ytot-sync-now').style.display = 'none';
        }
    }

    function updateStatus(message, type = '') {
        const status = document.getElementById('ytot-status');
        if (status) {
            status.textContent = message;
            status.className = 'ytot-status' + (type ? ` ytot-status-${type}` : '');
        }
    }

    function openDropdown() {
        document.getElementById('ytot-dropdown')?.classList.add('visible');
    }

    function closeDropdown() {
        document.getElementById('ytot-dropdown')?.classList.remove('visible');
    }

    // =====================
    // Event Handlers
    // =====================
    function setupEventListeners() {
        const toggle = document.getElementById('ytot-toggle');
        const dropdown = document.getElementById('ytot-dropdown');
        const close = document.getElementById('ytot-close');
        const urlInput = document.getElementById('ytot-url');
        const goBtn = document.getElementById('ytot-go');
        const restore = document.getElementById('ytot-restore');
        const syncNowBtn = document.getElementById('ytot-sync-now');
        const autoSyncCheckbox = document.getElementById('ytot-autosync');

        // Toggle dropdown
        toggle.onclick = () => dropdown.classList.toggle('visible');
        close.onclick = closeDropdown;

        // Go button
        goBtn.onclick = () => {
            const videoId = extractVideoId(urlInput.value);
            if (videoId) injectYouTube(videoId);
            else updateStatus('Invalid YouTube URL', 'error');
        };

        // Enter key
        urlInput.onkeydown = (e) => {
            if (e.key === 'Enter') goBtn.click();
        };

        // Restore
        restore.onclick = removeYouTube;

        // Sync now
        syncNowBtn.onclick = syncNow;

        // Auto-sync toggle
        autoSyncCheckbox.onchange = (e) => {
            state.autoSyncEnabled = e.target.checked;
            saveState('ytot_autosync', state.autoSyncEnabled);

            if (state.autoSyncEnabled && state.youtubeVideoId) {
                startAutoSync();
            } else {
                stopAutoSync();
            }
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('ytot-nav-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                closeDropdown();
            }
        });

        // Keyboard shortcut: Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeDropdown();
            }
        });
    }

    // =====================
    // Initialization
    // =====================
    async function init() {
        if (state.initialized) return;

        // Find nav bar
        const leftNav = document.querySelector('.top-nav__menu > div:first-child') ||
            document.querySelector('button[aria-label="More Options"]')?.closest('div[class]')?.parentElement;

        if (!leftNav) return;
        if (document.getElementById('ytot-nav-wrapper')) return;

        // Inject button
        leftNav.appendChild(createNavButton());
        setupEventListeners();

        // Load saved preferences
        const savedAutoSync = await loadState('ytot_autosync');
        if (savedAutoSync) {
            state.autoSyncEnabled = true;
            document.getElementById('ytot-autosync').checked = true;
        }

        // Load last used YouTube URL for this channel
        const channel = getTwitchChannel();
        if (channel) {
            const savedVideoId = await loadState(`ytot_${channel}`);
            if (savedVideoId) {
                const urlInput = document.getElementById('ytot-url');
                if (urlInput) {
                    urlInput.value = `https://youtube.com/watch?v=${savedVideoId}`;
                    urlInput.placeholder = 'Last: ' + savedVideoId;
                }
            }
        }

        state.initialized = true;
        console.log('[YTOT] Initialized');
    }

    // =====================
    // Entry Point
    // =====================
    let attempts = 0;
    function check() {
        if (state.initialized || attempts > CONFIG.MAX_ATTEMPTS) return;
        attempts++;

        if (document.querySelector('.top-nav__menu')) {
            init();
        } else {
            setTimeout(check, CONFIG.CHECK_INTERVAL);
        }
    }

    setTimeout(check, 1000);
})();
