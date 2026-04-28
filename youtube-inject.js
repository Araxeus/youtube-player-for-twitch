(() => {
    const $ = document.querySelector.bind(document);
    init();

    function init() {
        const api = $('#movie_player');

        if (!api?.getAvailableQualityLevels()?.[0]) {
            console.log('YouTube player API not found, trying again');
            setTimeout(init, 50);
            return;
        }

        const shouldForceQuality = new URLSearchParams(
            window.location.search,
        ).get('forcequality');
        if (shouldForceQuality === '1') {
            setMaxQuality(api);
        }

        waitForElement([
            'div.ytp-time-display.ytp-live',
            'div.ytwPlayerTimeDisplayPill',
        ])
            .then(el => {
                el.addEventListener('click', () => {
                    setTimeout(() => api.setPlaybackRate(99), 50);
                });
                return false;
            })
            .catch(console.error);
    }

    function setMaxQuality(api) {
        const maxQuality = api.getAvailableQualityLevels()[0];
        api.setPlaybackQualityRange(maxQuality);
        console.log('Set youtube quality to', maxQuality);
    }

    async function waitForElement(selectorOrSelectors, timeout = 5000) {
        const startTime = Date.now();
        const selectors = Array.isArray(selectorOrSelectors)
            ? selectorOrSelectors
            : [selectorOrSelectors];
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const res = selectors
                    .map(sel => document.querySelector(sel))
                    .find(el => el);
                if (res) {
                    clearInterval(interval);
                    resolve(res);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(
                        new Error(
                            `Element with selector "${selectors.join(', ')}" not found within ${timeout}ms`,
                        ),
                    );
                }
            }, 150);
        });
    }
})();
