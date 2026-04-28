(() => {
    if (!document.referrer.startsWith('https://www.twitch.tv')) return;
    const $ = document.querySelector.bind(document);
    const browserApi = globalThis.browser ?? globalThis.chrome ?? undefined;

    window.addEventListener('message', receiveMessage, false);
    try {
        sendMessageToParent({ iframeLoaded: true });
    } catch (err) {
        console.error('Error sending message to parent:', err);
    }

    const theaterSvg = /*html*/ `
          <svg width="24" height="24" viewBox="0 0 24 24" focusable="false" aria-hidden="true" role="presentation" fill="currentColor">
              <path fill-rule="evenodd"
                  d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5Zm14 0h4v14h-4V5Zm-2 0H4v14h10V5Z"
                  clip-rule="evenodd">
              </path>
          </svg>
          `;

    injectScript();

    // allow the alt+t shortcut to work even when the focus is inside the youtube iframe
    window.addEventListener('keydown', e => {
        if (e.altKey && e.key.toLowerCase() === 't') {
            toggleTheaterMode();
        }
    });

    function sendMessageToParent(data) {
        const msg = typeof data === 'string' ? { msg: data } : data;
        window.parent.postMessage(
            { type: 'YPFT_IFRAME', ...msg },
            'https://www.twitch.tv',
        );
    }

    function receiveMessage(event) {
        if (
            event.source !== window.parent ||
            event.origin !== 'https://www.twitch.tv' ||
            event.data?.type !== 'YPFT_IFRAME'
        )
            return;
        if (event.data.mouseLeave) {
            $('div#player-control-overlay')?.classList.remove('fadein');
        } else if (event.data.mouseEnter) {
            $('div#player-control-overlay')?.classList.add('fadein');
        } else if (event.data.loadTheaterButton) {
            retry(insertTheaterButton)
                .then(theatreButton => {
                    if (theatreButton) {
                        console.log('Theater mode button added successfully');
                        moveFullscreenButtonToBottomLeft();
                    } else {
                        console.warn(
                            'Failed to add theater mode button after multiple attempts',
                        );
                    }
                })
                .catch(console.error);
        }
    }

    async function retry(fn, timeout = 5000) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const res = fn();
                if (res) {
                    clearInterval(interval);
                    resolve(res);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(
                        new Error(
                            `function "${fn.name || 'anonymous function'}" not found within ${timeout}ms`,
                        ),
                    );
                }
            }, 150);
        });
    }

    function toggleTheaterMode() {
        sendMessageToParent({ toggleTheaterMode: true });
    }

    function moveFullscreenButtonToBottomLeft() {
        // **** Move fullscreen button to player controls **** //
        const fullscreenButton = $('div.player-controls-bottom-right');
        if (!fullscreenButton) {
            console.log(
                'Fullscreen button not found, cannot move it to bottom left',
            );
            return;
        }
        $('div.action-menu-engagement-buttons-wrapper')?.append(
            fullscreenButton,
        );
        fullscreenButton.style.display = 'contents'; /* position: static; */
        const button = fullscreenButton.querySelector('button');
        if (button) {
            Object.assign(button.style, {
                height: '44px',
                'padding-top': '8px',
                'padding-left': 0,
            });
        }
        const buttonInside = button.querySelector(
            'div.player-bottom-controls-fullscreen-icon-visible-area',
        );
        if (!buttonInside) return;
        // to align with the other buttons
        Object.assign(buttonInside.style, {
            width: '40px',
            padding: '0',
            background: 'unset',
        });

        // **** Move players controls to the right **** //
        $('div.fullscreen-action-menu')?.moveBefore(
            $('div.quick-actions-wrapper'),
            $('div.action-menu-engagement-buttons-wrapper'),
        );
    }

    function insertTheaterButton() {
        const watchlaterButton = document
            .querySelectorAll(
                'ytm-slim-metadata-button-renderer.ytmSlimMetadataButtonRendererHost',
            )
            ?.item(1);
        if (!watchlaterButton) {
            return insertTheaterButtonLegacy();
        }
        const theaterButton = watchlaterButton.cloneNode(true);
        watchlaterButton.insertAdjacentElement('afterend', theaterButton);
        theaterButton.querySelector('svg').outerHTML = theaterSvg;
        theaterButton.addEventListener('click', toggleTheaterMode);
        return theaterButton;
    }

    function insertTheaterButtonLegacy() {
        const fullscreenButton = $(
            'div.ytp-right-controls>button.ytp-fullscreen-button',
        );
        if (!fullscreenButton) {
            return null;
        }
        const theaterButton = fullscreenButton.cloneNode(true);
        theaterButton.classList.remove('ytp-fullscreen-button');
        theaterButton.classList.add('ypft-theater-button');
        theaterButton.setAttribute('aria-label', 'Theater mode');
        theaterButton.innerHTML = theaterSvg;
        fullscreenButton.parentNode.insertBefore(
            theaterButton,
            fullscreenButton,
        );
        theaterButton.addEventListener('click', toggleTheaterMode);
        return theaterButton;
    }

    function injectScript() {
        const script = document.createElement('script');
        script.src = browserApi.runtime.getURL('youtube-inject.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = function () {
            this.remove();
        };
    }
})();
