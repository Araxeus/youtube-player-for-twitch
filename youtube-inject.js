(() => {
    setTimeout(init, 50);

    function init() {
        const shouldForceQuality = new URLSearchParams(
            window.location.search,
        ).get('forcequality');

        if (shouldForceQuality === '1') {
            setMaxQuality();
        }
    }

    function setMaxQuality() {
        const api = document.querySelector('#movie_player');
        const maxQuality = api.getAvailableQualityLevels()[0];
        api.setPlaybackQualityRange(maxQuality);
        console.log('Set youtube quality to', maxQuality);
    }
})();
