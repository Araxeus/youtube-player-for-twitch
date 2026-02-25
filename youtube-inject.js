(() => {
    const $ = document.querySelector.bind(document);
    setTimeout(init, 50);

    function init() {
        const api = $('#movie_player');

        const shouldForceQuality = new URLSearchParams(
            window.location.search,
        ).get('forcequality');
        if (shouldForceQuality === '1') {
            setMaxQuality(api);
        }

        $('div.ytp-time-display.ytp-live').addEventListener('click', () => {
            setTimeout(() => api.setPlaybackRate(99), 50);
        });
    }

    function setMaxQuality(api) {
        const maxQuality = api.getAvailableQualityLevels()[0];
        api.setPlaybackQualityRange(maxQuality);
        console.log('Set youtube quality to', maxQuality);
    }
})();
