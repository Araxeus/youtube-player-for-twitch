/**
 * Twitch Chat for YouTube
 * Floating panel approach - doesn't modify YouTube's chat
 */

(function () {
  'use strict';

  // Prevent double execution
  if (window._tcfyInit) return;
  window._tcfyInit = true;

  const TWITCH_URL = 'https://www.twitch.tv/embed/{ch}/chat?parent=www.youtube.com&darkpopout';

  // Create floating panel
  const panel = document.createElement('div');
  panel.id = 'tcfy-panel';
  panel.innerHTML = `
    <div id="tcfy-header">
      <span id="tcfy-title">Twitch Chat</span>
      <div id="tcfy-controls">
        <button id="tcfy-min">_</button>
        <button id="tcfy-close">×</button>
      </div>
    </div>
    <div id="tcfy-body">
      <iframe id="tcfy-frame" src="about:blank"></iframe>
      <div id="tcfy-setup">
        <input type="text" id="tcfy-channel" placeholder="Enter Twitch channel" />
        <button id="tcfy-connect">Connect</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #tcfy-panel {
      position: fixed;
      right: 20px;
      top: 80px;
      width: 340px;
      height: 500px;
      background: #18181b;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
    }
    #tcfy-panel.minimized {
      height: auto;
    }
    #tcfy-panel.minimized #tcfy-body {
      display: none;
    }
    #tcfy-panel.hidden {
      display: none;
    }
    #tcfy-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: #0e0e10;
      cursor: move;
      user-select: none;
    }
    #tcfy-title {
      color: #efeff1;
      font-size: 13px;
      font-weight: 600;
    }
    #tcfy-controls {
      display: flex;
      gap: 4px;
    }
    #tcfy-controls button {
      width: 24px;
      height: 24px;
      border: none;
      background: #3a3a3d;
      color: #efeff1;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    #tcfy-controls button:hover {
      background: #4a4a4d;
    }
    #tcfy-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    #tcfy-frame {
      flex: 1;
      border: none;
      display: none;
    }
    #tcfy-frame.active {
      display: block;
    }
    #tcfy-setup {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px;
    }
    #tcfy-setup.hidden {
      display: none;
    }
    #tcfy-channel {
      width: 100%;
      max-width: 200px;
      padding: 10px;
      background: #1f1f23;
      border: 1px solid #3a3a3d;
      border-radius: 4px;
      color: #efeff1;
      font-size: 14px;
      outline: none;
    }
    #tcfy-channel:focus {
      border-color: #9147ff;
    }
    #tcfy-connect {
      padding: 10px 24px;
      background: #9147ff;
      border: none;
      border-radius: 4px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    #tcfy-connect:hover {
      background: #772ce8;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(panel);

  // Elements
  const header = panel.querySelector('#tcfy-header');
  const minBtn = panel.querySelector('#tcfy-min');
  const closeBtn = panel.querySelector('#tcfy-close');
  const frame = panel.querySelector('#tcfy-frame');
  const setup = panel.querySelector('#tcfy-setup');
  const input = panel.querySelector('#tcfy-channel');
  const connectBtn = panel.querySelector('#tcfy-connect');
  const title = panel.querySelector('#tcfy-title');

  // Connect to channel
  function connect(ch) {
    if (!ch) return;
    frame.src = TWITCH_URL.replace('{ch}', ch.toLowerCase().trim());
    frame.classList.add('active');
    setup.classList.add('hidden');
    title.textContent = '📺 ' + ch;
  }

  // Events
  connectBtn.onclick = () => connect(input.value);
  input.onkeydown = (e) => { if (e.key === 'Enter') connect(input.value); };
  minBtn.onclick = () => panel.classList.toggle('minimized');
  closeBtn.onclick = () => panel.classList.add('hidden');

  // Drag functionality
  let isDragging = false;
  let offsetX, offsetY;

  header.onmousedown = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
  };

  document.onmousemove = (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
    panel.style.right = 'auto';
  };

  document.onmouseup = () => { isDragging = false; };

  // Try to get channel name from page
  setTimeout(() => {
    const ch = document.querySelector('ytd-channel-name a, #channel-name a');
    if (ch?.textContent) {
      const name = ch.textContent.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
      if (name) input.value = name;
    }
  }, 2000);

})();
