/**
 * YouTube on Twitch - Background Script
 * Handles cross-origin requests and logic
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SEARCH_YOUTUBE') {
        handleSearch(request.query)
            .then(sendResponse)
            .catch(err => sendResponse({ error: err.message }));
        return true; // Keep channel open for async response
    }
});

async function handleSearch(query) {
    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgJAAQ%3D%3D`;
        const response = await fetch(searchUrl);
        const html = await response.text();

        // extract ytInitialData
        // Try multiple regex patterns to be robust
        let match = html.match(/var ytInitialData\s*=\s*({.*?});/);
        if (!match) {
            match = html.match(/window\["ytInitialData"\]\s*=\s*({.*?});/);
        }

        if (!match) return { error: 'Could not parse YouTube results' };

        const data = JSON.parse(match[1]);
        const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;

        if (!contents) return { error: 'No results found' };

        // Map results to a simplified format
        const results = contents
            .filter(item => item.videoRenderer)
            .map(item => {
                const v = item.videoRenderer;
                const isLive = v.badges?.some(b =>
                    b.metadataBadgeRenderer?.label?.toLowerCase().includes('live')
                );

                return {
                    videoId: v.videoId,
                    title: v.title?.runs?.[0]?.text || '',
                    channel: v.ownerText?.runs?.[0]?.text || '',
                    isLive: !!isLive
                };
            })
            .filter(r => r.isLive); // Only return live stuff

        return { results };

    } catch (err) {
        console.error('Search error:', err);
        return { error: err.message };
    }
}
