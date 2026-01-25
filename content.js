/**
 * Twitch Chat for YouTube - Content Script
 * Replaces YouTube livestream chat with Twitch chat
 */

(function () {
  'use strict';

  console.log('[TCFY] 🚀 Content script loaded on:', window.location.href);

  // Configuration
  const CONFIG = {
    TWITCH_CHAT_URL: 'https://www.twitch.tv/embed/{channel}/chat?parent=www.youtube.com&darkpopout',
    CHECK_INTERVAL: 2000,
    MAX_RETRIES: 20
  };

  // State
  let state = {
    isInitialized: false,
    youtubeChannel: null,
    twitchChannel: null,
    showingTwitch: true,
    originalChatElement: null,
    twitchContainer: null
  };

  /**
   * Check if the current page is a YouTube livestream
   */
  function isLiveStream() {
    const chatFrame = document.querySelector('iframe#chatframe');
    const liveChat = document.querySelector('ytd-live-chat-frame');
    const chatContainer = document.querySelector('#chat');

    const isLive = !!(chatFrame || liveChat || chatContainer);
    console.log('[TCFY] Livestream check:', { chatFrame: !!chatFrame, liveChat: !!liveChat, chatContainer: !!chatContainer, isLive });
    return isLive;
  }

  /**
   * Extract YouTube channel name from the page
   */
  function getYouTubeChannelName() {
    const selectors = [
      'ytd-channel-name yt-formatted-string a',
      'ytd-channel-name a',
      '#channel-name a',
      '#owner-name a',
      '#upload-info ytd-channel-name a'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }
    return null;
  }

  /**
   * Normalize channel name for Twitch lookup
   */
  function normalizeTwitchName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Create the Twitch chat container
   */
  function createTwitchContainer() {
    const container = document.createElement('div');
    container.id = 'tcfy-twitch-container';
    container.innerHTML = `
      <div class="tcfy-header">
        <span class="tcfy-title">📺 Twitch Chat</span>
        <button class="tcfy-toggle" id="tcfy-toggle">Show YouTube Chat</button>
      </div>
      <div class="tcfy-content">
        <iframe id="tcfy-twitch-iframe" src="about:blank"></iframe>
        <div class="tcfy-overlay" id="tcfy-overlay">
          <div class="tcfy-overlay-content">
            <div class="tcfy-overlay-title">Enter Twitch Channel</div>
            <div class="tcfy-overlay-subtitle" id="tcfy-suggestion"></div>
            <div class="tcfy-input-row">
              <input type="text" id="tcfy-input" placeholder="Twitch username" />
              <button id="tcfy-connect">Connect</button>
            </div>
          </div>
        </div>
      </div>
    `;
    return container;
  }

  /**
   * Connect to Twitch channel
   */
  function connectToTwitch(channel) {
    if (!channel) return;

    state.twitchChannel = channel;
    const iframe = document.getElementById('tcfy-twitch-iframe');
    const overlay = document.getElementById('tcfy-overlay');

    iframe.src = CONFIG.TWITCH_CHAT_URL.replace('{channel}', channel.toLowerCase());
    overlay.style.display = 'none';

    // Update header
    document.querySelector('.tcfy-title').textContent = `📺 ${channel}`;

    // Save to storage
    if (chrome?.storage) {
      chrome.storage.local.set({ [`yt_${normalizeTwitchName(state.youtubeChannel)}`]: channel });
    }

    console.log('[TCFY] Connected to Twitch:', channel);
  }

  /**
   * Toggle between Twitch and YouTube chat
   */
  function toggleChat() {
    state.showingTwitch = !state.showingTwitch;

    const twitchContainer = document.getElementById('tcfy-twitch-container');
    const toggleBtn = document.getElementById('tcfy-toggle');

    if (state.showingTwitch) {
      twitchContainer.style.display = 'flex';
      if (state.originalChatElement) state.originalChatElement.style.display = 'none';
      toggleBtn.textContent = 'Show YouTube Chat';
    } else {
      twitchContainer.style.display = 'none';
      if (state.originalChatElement) state.originalChatElement.style.display = '';
      toggleBtn.textContent = 'Show Twitch Chat';
    }
  }

  /**
   * Initialize the extension
   */
  async function inject() {
    if (state.isInitialized) return true;

    // Find YouTube chat
    const chatParent = document.querySelector('#chat') ||
      document.querySelector('ytd-live-chat-frame')?.parentElement ||
      document.querySelector('#chat-container');

    if (!chatParent) {
      console.log('[TCFY] Chat parent not found');
      return false;
    }

    // Store original chat reference
    state.originalChatElement = chatParent.querySelector('ytd-live-chat-frame') ||
      chatParent.querySelector('iframe#chatframe');

    // Get channel name
    state.youtubeChannel = getYouTubeChannelName();
    console.log('[TCFY] YouTube channel:', state.youtubeChannel);

    // Create Twitch container
    const container = createTwitchContainer();
    chatParent.style.position = 'relative';
    chatParent.insertBefore(container, chatParent.firstChild);

    // Hide original chat
    if (state.originalChatElement) {
      state.originalChatElement.style.display = 'none';
    }

    // Set up events
    document.getElementById('tcfy-toggle').addEventListener('click', toggleChat);
    document.getElementById('tcfy-connect').addEventListener('click', () => {
      connectToTwitch(document.getElementById('tcfy-input').value.trim());
    });
    document.getElementById('tcfy-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') connectToTwitch(e.target.value.trim());
    });

    // Try to load saved channel or suggest one
    const suggested = normalizeTwitchName(state.youtubeChannel);
    const input = document.getElementById('tcfy-input');
    const suggestion = document.getElementById('tcfy-suggestion');

    if (chrome?.storage) {
      chrome.storage.local.get([`yt_${suggested}`], (result) => {
        const saved = result[`yt_${suggested}`];
        if (saved) {
          connectToTwitch(saved);
        } else if (suggested) {
          input.value = suggested;
          suggestion.textContent = `Suggested: ${suggested}`;
        }
      });
    } else if (suggested) {
      input.value = suggested;
      suggestion.textContent = `Suggested: ${suggested}`;
    }

    state.isInitialized = true;
    console.log('[TCFY] ✅ Initialized');
    return true;
  }

  /**
   * Main loop
   */
  function init() {
    let retries = 0;

    const check = () => {
      if (!isLiveStream()) {
        if (retries++ < CONFIG.MAX_RETRIES) setTimeout(check, CONFIG.CHECK_INTERVAL);
        return;
      }
      inject().then(success => {
        if (!success && retries++ < CONFIG.MAX_RETRIES) setTimeout(check, CONFIG.CHECK_INTERVAL);
      });
    };

    check();

    // Handle YouTube SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        state.isInitialized = false;
        setTimeout(check, 1000);
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
