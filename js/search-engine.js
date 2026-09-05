/**
 * Fast Client-Side Search Engine for EPUB Documentation
 */
class EpubSearchEngine {
    constructor() {
        this.sources = [];
        this.entries = [];
        this.documents = []; // unified searchable corpus
        this.index = new Map(); // term -> Set(docIndex)
    }

    /**
     * Load sources and deep index entries
     */
    initialize(sources = [], entries = []) {
        this.sources = sources;
        this.entries = entries;
        this.documents = [];
        this.index.clear();

        // 1. Ingest Master Sources
        this.sources.forEach(src => {
            this.documents.push({
                docType: 'source',
                id: src.id,
                title: src.title,
                url: src.url,
                type: src.type,
                publisher: src.publisher,
                category: src.category,
                version: src.version || '',
                description: src.description || '',
                keywords: [src.title, src.type, src.publisher, src.category, src.version].filter(Boolean),
                rawText: `${src.title} ${src.description} ${src.type} ${src.publisher} ${src.category} ${src.version} ${src.url}`.toLowerCase()
            });
        });

        // 2. Ingest Deep Spec Entries
        this.entries.forEach(entry => {
            const parentSource = this.sources.find(s => s.id === entry.sourceId);
            const parentTitle = parentSource ? parentSource.title : '';
            this.documents.push({
                docType: 'section',
                id: entry.id,
                sourceId: entry.sourceId,
                parentTitle: parentTitle,
                title: entry.title,
                section: entry.section,
                anchor: entry.anchor,
                url: entry.url,
                type: entry.type,
                publisher: entry.publisher,
                category: entry.category,
                version: parentSource ? parentSource.version : '',
                description: entry.summary,
                keywords: entry.keywords || [],
                rawText: `${entry.title} ${entry.section} ${entry.summary} ${(entry.keywords || []).join(' ')} ${entry.category} ${entry.type} ${entry.publisher} ${parentTitle}`.toLowerCase()
            });
        });

        // 3. Build Inverted Index
        this.documents.forEach((doc, idx) => {
            const tokens = this.tokenize(doc.rawText);
            tokens.forEach(token => {
                if (!this.index.has(token)) {
                    this.index.set(token, new Set());
                }
                this.index.get(token).add(idx);
            });
        });
    }

    /**
     * Tokenize text into normalized tokens
     */
    tokenize(text) {
        if (!text) return [];
        return text
            .toLowerCase()
            .replace(/[^\w\s\-\:]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 1);
    }

    /**
     * Search with query and multi-select facet filters
     */
    search(query = '', filters = {}) {
        const {
            categories = [],
            types = [],
            publishers = [],
            scope = 'all' // 'all' | 'sources' | 'sections'
        } = filters;

        // Support both Set/Array or single string for backwards compatibility
        const categorySet = categories instanceof Set ? categories : new Set(
            Array.isArray(categories) ? categories : (categories && categories !== 'all' ? [categories] : [])
        );
        const typeSet = types instanceof Set ? types : new Set(
            Array.isArray(types) ? types : (types && types !== 'all' ? [types] : [])
        );
        const publisherSet = publishers instanceof Set ? publishers : new Set(
            Array.isArray(publishers) ? publishers : (publishers && publishers !== 'all' ? [publishers] : [])
        );

        const trimmed = query.trim().toLowerCase();
        const queryTokens = this.tokenize(trimmed);

        let candidateIndices = null;

        if (queryTokens.length === 0) {
            // No search query: all docs
            candidateIndices = new Set(this.documents.map((_, i) => i));
        } else {
            // Find docs matching ANY or ALL query tokens (with prefix matching)
            const tokenMatches = queryTokens.map(token => {
                const matches = new Set();
                for (const [indexedToken, docIndices] of this.index.entries()) {
                    if (indexedToken === token || indexedToken.startsWith(token)) {
                        docIndices.forEach(idx => matches.add(idx));
                    }
                }
                return matches;
            });

            // Union of all token matches
            candidateIndices = new Set();
            tokenMatches.forEach(set => {
                set.forEach(idx => candidateIndices.add(idx));
            });
        }

        // Apply filters & calculate relevance score
        const results = [];
        candidateIndices.forEach(idx => {
            const doc = this.documents[idx];

            // Scope filter
            if (scope === 'sources' && doc.docType !== 'source') return;
            if (scope === 'sections' && doc.docType !== 'section') return;

            // Multi-select Category filter
            if (categorySet.size > 0 && !categorySet.has(doc.category)) return;

            // Multi-select Type filter
            if (typeSet.size > 0 && !typeSet.has(doc.type)) return;

            // Multi-select Publisher filter
            if (publisherSet.size > 0 && !publisherSet.has(doc.publisher)) return;

            // Compute score
            let score = 0;
            if (queryTokens.length > 0) {
                const titleLower = doc.title.toLowerCase();
                const descLower = doc.description.toLowerCase();
                const catLower = doc.category.toLowerCase();
                const typeLower = doc.type.toLowerCase();
                const pubLower = doc.publisher.toLowerCase();
                const kwTokens = (doc.keywords || []).flatMap(k => this.tokenize(k));

                // Exact full-phrase match in title (evaluated once)
                if (titleLower.includes(trimmed)) score += 30;

                queryTokens.forEach(qt => {
                    if (titleLower.includes(qt)) score += 10;
                    if (kwTokens.some(k => k === qt || k.startsWith(qt))) score += 8;
                    if (descLower.includes(qt)) score += 3;
                    if (catLower.includes(qt)) score += 4;
                    if (typeLower.includes(qt)) score += 4;
                    if (pubLower.includes(qt)) score += 3;
                });

                // Boost official recommendations
                if (doc.type === 'Standard') score += 2;
                if (doc.type === 'Candidate Standard') score += 1.5;
            } else {
                // Default sorting order when no search term
                if (doc.type === 'Standard') score += 10;
                else if (doc.type === 'Candidate Standard') score += 8;
                else if (doc.type === 'Note') score += 5;
                else score += 1;
            }

            results.push({
                doc,
                score
            });
        });

        // Sort descending by score, then title
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.doc.title.localeCompare(b.doc.title);
        });

        return results.map(r => r.doc);
    }

    /**
     * Get facet counts for current dataset
     */
    getFacetCounts() {
        const categories = {};
        const types = {};
        const publishers = {};

        this.documents.forEach(doc => {
            categories[doc.category] = (categories[doc.category] || 0) + 1;
            types[doc.type] = (types[doc.type] || 0) + 1;
            publishers[doc.publisher] = (publishers[doc.publisher] || 0) + 1;
        });

        return { categories, types, publishers, totalSources: this.sources.length, totalEntries: this.entries.length };
    }

    /**
     * Helper to highlight matching terms in text
     */
    static highlightText(text, query) {
        if (!text || !query || !query.trim()) return text;
        const tokens = query.trim().split(/\s+/).filter(t => t.length > 1);
        if (tokens.length === 0) return text;

        const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
        return text.replace(pattern, '<mark>$1</mark>');
    }
}

window.EpubSearchEngine = EpubSearchEngine;

