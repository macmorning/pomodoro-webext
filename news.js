// What's New functionality
const newsManager = {
    currentVersion: null,
    newsData: null,

    init: async () => {
        try {
            // Get current version from manifest
            const manifest = chrome.runtime.getManifest();
            newsManager.currentVersion = manifest.version;
            document.getElementById('currentVersion').textContent = `Version ${newsManager.currentVersion}`;

            // Load news data
            await newsManager.loadNews();
            newsManager.displayNews();



        } catch (error) {
            console.error('Error initializing news:', error);
            newsManager.showError();
        }
    },

    loadNews: async () => {
        try {
            const response = await fetch('news.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            newsManager.newsData = await response.json();

            // Validate news data structure
            if (!newsManager.newsData.news) {
                throw new Error('Invalid news data structure');
            }
        } catch (error) {
            console.error('Error loading news:', error);
            throw error;
        }
    },

    displayNews: () => {
        const container = document.getElementById('newsContainer');

        if (!newsManager.newsData || !newsManager.newsData.news || newsManager.newsData.news.length === 0) {
            container.innerHTML = '<div class="no-news">No news available</div>';
            return;
        }

        let html = '';

        newsManager.newsData.news.forEach((item, index) => {
            const isCurrentVersion = item.version === newsManager.currentVersion;
            const itemClass = isCurrentVersion ? 'news-item current-version' : 'news-item';

            html += `
                <div class="${itemClass}">
                    <h2>${item.title}</h2>
                    <div class="news-meta">
                        <span class="version-badge">v${item.version}</span>
                        <span>${newsManager.formatDate(item.date)}</span>
                        ${isCurrentVersion ? '<span class="current-version-indicator">• Current Version</span>' : ''}
                    </div>
                    <ul class="news-items">
                        ${item.items.map(newsItem => `<li>${newsItem}</li>`).join('')}
                    </ul>
                </div>
            `;
        });

        container.innerHTML = html;

        // Mark this news version as seen
        newsManager.markNewsAsSeen();
    },

    formatDate: (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    },

    showError: () => {
        const container = document.getElementById('newsContainer');
        container.innerHTML = '<div class="no-news">Error loading news</div>';
    },

    markNewsAsSeen: async () => {
        try {
            if (newsManager.newsData && newsManager.newsData.news) {
                const availableVersions = newsManager.newsData.news.map(item => item.version);


                // Save to chrome.storage only
                try {
                    await chrome.storage.local.set({ seenNewsVersions: availableVersions });

                } catch (chromeError) {
                    console.error('Chrome storage save failed:', chromeError);
                }
            }
        } catch (error) {
            console.error('Error marking news as seen:', error);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', newsManager.init);