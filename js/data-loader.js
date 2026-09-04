/**
 * Data Loader for EPUB Search Sources & Index
 */
class EpubDataLoader {
    static async load() {
        let sources = [];
        let entries = [];

        // 1. Check window globals (works seamlessly with file:// protocol)
        if (window.EPUB_SOURCES && Array.isArray(window.EPUB_SOURCES)) {
            sources = window.EPUB_SOURCES;
        }
        if (window.EPUB_ENTRIES && Array.isArray(window.EPUB_ENTRIES)) {
            entries = window.EPUB_ENTRIES;
        }

        // 2. If globals are not loaded, try fetch
        if (sources.length === 0 || entries.length === 0) {
            try {
                const [srcRes, entRes] = await Promise.all([
                    fetch('data/sources.json').then(r => r.json()),
                    fetch('data/index-entries.json').then(r => r.json())
                ]);
                sources = srcRes;
                entries = entRes;
            } catch (err) {
                console.warn('Direct fetch failed, checking fallback variables:', err);
            }
        }

        return { sources, entries };
    }
}

window.EpubDataLoader = EpubDataLoader;
