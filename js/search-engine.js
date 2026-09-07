/**
 * Advanced Query & Search Engine for EPUB Documentation
 * Supports:
 * - Boolean Operators: AND (&&), OR (||), NOT (!)
 * - Implicit AND for multiple space-separated terms
 * - Exact Quoted Phrases: "..." or '...'
 * - Prefix Wildcards: term*
 * - Negation Shorthand: -term
 * - Field-Specific Qualifiers: type:, pub:, cat:, title:, sec:
 * - Parentheses Grouping: (a OR b) AND c
 * - Syntax-Aware Snippet Highlighting (excludes operators)
 * - Zero external dependencies (runs in Node.js, browser, and file://)
 */

class QueryLexer {
    static tokenize(queryStr) {
        if (!queryStr || typeof queryStr !== 'string') return [];
        const str = queryStr.trim();
        const tokens = [];
        let i = 0;

        const isWhitespace = (ch) => /\s/.test(ch);
        const isWordChar = (ch) => /[^\s()":]/.test(ch);

        while (i < str.length) {
            const ch = str[i];

            // 1. Skip whitespace
            if (isWhitespace(ch)) {
                i++;
                continue;
            }

            // 2. Parentheses
            if (ch === '(') {
                tokens.push({ type: 'LPAREN', value: '(' });
                i++;
                continue;
            }
            if (ch === ')') {
                tokens.push({ type: 'RPAREN', value: ')' });
                i++;
                continue;
            }

            // 3. Quoted Phrases ("..." or '...')
            if (ch === '"' || ch === "'") {
                const quoteChar = ch;
                i++; // Skip open quote
                let phrase = '';
                while (i < str.length && str[i] !== quoteChar) {
                    phrase += str[i];
                    i++;
                }
                if (i < str.length && str[i] === quoteChar) {
                    i++; // Skip closing quote
                }
                phrase = phrase.trim();
                if (phrase.length > 0) {
                    tokens.push({ type: 'PHRASE', value: phrase.toLowerCase() });
                }
                continue;
            }

            // 4. Shorthand negation with hyphen/minus: e.g. -legacy, -draft
            if (ch === '-' && i + 1 < str.length && !isWhitespace(str[i + 1])) {
                tokens.push({ type: 'NOT', value: 'NOT' });
                i++;
                continue;
            }

            // 5. Shorthand plus (explicit required): e.g. +manifest
            if (ch === '+' && i + 1 < str.length && !isWhitespace(str[i + 1])) {
                i++;
                continue;
            }

            // 6. Words, Operators, or Field Specifiers
            let word = '';
            while (i < str.length && isWordChar(str[i])) {
                word += str[i];
                i++;
            }

            // Check if followed by colon ':' for field qualifier (e.g. type:Recommendation, cat:A11y, pub:PMWG)
            if (i < str.length && str[i] === ':') {
                const fieldName = word.toLowerCase();
                i++; // skip ':'

                // Field value could be a quoted phrase or a single word
                if (i < str.length && (str[i] === '"' || str[i] === "'")) {
                    const quoteChar = str[i];
                    i++;
                    let phraseVal = '';
                    while (i < str.length && str[i] !== quoteChar) {
                        phraseVal += str[i];
                        i++;
                    }
                    if (i < str.length && str[i] === quoteChar) i++;
                    tokens.push({
                        type: 'FIELD',
                        field: fieldName,
                        value: phraseVal.trim().toLowerCase(),
                        isPhrase: true
                    });
                } else {
                    let fieldVal = '';
                    while (i < str.length && isWordChar(str[i])) {
                        fieldVal += str[i];
                        i++;
                    }
                    if (fieldVal.length > 0) {
                        tokens.push({
                            type: 'FIELD',
                            field: fieldName,
                            value: fieldVal.toLowerCase(),
                            isPhrase: false
                        });
                    }
                }
                continue;
            }

            const upper = word.toUpperCase();
            if (upper === 'AND' || word === '&&') {
                tokens.push({ type: 'AND', value: 'AND' });
            } else if (upper === 'OR' || word === '||') {
                tokens.push({ type: 'OR', value: 'OR' });
            } else if (upper === 'NOT' || word === '!') {
                tokens.push({ type: 'NOT', value: 'NOT' });
            } else if (word.length > 0) {
                const isPrefix = word.endsWith('*');
                const cleanWord = isPrefix ? word.slice(0, -1).toLowerCase() : word.toLowerCase();
                if (cleanWord.length > 0) {
                    tokens.push({
                        type: 'TERM',
                        value: cleanWord,
                        isPrefix
                    });
                }
            }
        }

        return tokens;
    }
}

class QueryParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.tokens[this.pos] || null;
    }

    consume() {
        return this.tokens[this.pos++] || null;
    }

    parse() {
        if (!this.tokens || this.tokens.length === 0) return null;
        const expr = this.parseOr();
        return expr;
    }

    // OrExpression -> AndExpression ( ('OR') AndExpression )*
    parseOr() {
        let left = this.parseAnd();
        if (!left) return null;

        while (this.peek() && this.peek().type === 'OR') {
            this.consume(); // consume 'OR'
            const right = this.parseAnd();
            if (right) {
                if (left.type === 'OR') {
                    left.children.push(right);
                } else {
                    left = { type: 'OR', children: [left, right] };
                }
            }
        }
        return left;
    }

    // AndExpression -> NotExpression ( ('AND' | implicit) NotExpression )*
    parseAnd() {
        let left = this.parseNot();
        if (!left) return null;

        while (this.peek()) {
            const nextType = this.peek().type;
            if (nextType === 'OR' || nextType === 'RPAREN') {
                break; // Break up to parent rule
            }

            if (nextType === 'AND') {
                this.consume(); // consume 'AND'
            }

            const right = this.parseNot();
            if (right) {
                if (left.type === 'AND') {
                    left.children.push(right);
                } else {
                    left = { type: 'AND', children: [left, right] };
                }
            } else {
                break;
            }
        }
        return left;
    }

    // NotExpression -> ('NOT') NotExpression | Primary
    parseNot() {
        if (this.peek() && this.peek().type === 'NOT') {
            this.consume(); // consume 'NOT'
            const child = this.parseNot();
            if (child) {
                return { type: 'NOT', child };
            }
            return null;
        }
        return this.parsePrimary();
    }

    // Primary -> '(' Expression ')' | PHRASE | FIELD | TERM
    parsePrimary() {
        const token = this.peek();
        if (!token) return null;

        if (token.type === 'LPAREN') {
            this.consume(); // consume '('
            const expr = this.parseOr();
            if (this.peek() && this.peek().type === 'RPAREN') {
                this.consume(); // consume ')'
            }
            return expr;
        }

        if (token.type === 'PHRASE') {
            this.consume();
            return { type: 'PHRASE', value: token.value };
        }

        if (token.type === 'FIELD') {
            this.consume();
            return {
                type: 'FIELD',
                field: token.field,
                value: token.value,
                isPhrase: token.isPhrase
            };
        }

        if (token.type === 'TERM') {
            this.consume();
            return {
                type: 'TERM',
                value: token.value,
                isPrefix: token.isPrefix
            };
        }

        // Skip unexpected tokens to prevent infinite loops
        this.consume();
        return null;
    }
}

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
            const raw = `${src.title} ${src.description || ''} ${src.type || ''} ${src.publisher || ''} ${src.category || ''} ${src.version || ''} ${src.url || ''}`.toLowerCase();
            this.documents.push({
                docType: 'source',
                id: src.id,
                title: src.title || '',
                url: src.url || '',
                type: src.type || '',
                publisher: src.publisher || '',
                category: src.category || '',
                version: src.version || '',
                description: src.description || '',
                keywords: [src.title, src.type, src.publisher, src.category, src.version].filter(Boolean),
                rawText: raw,
                tokens: this.tokenize(raw)
            });
        });

        // 2. Ingest Deep Spec Entries
        this.entries.forEach(entry => {
            const parentSource = this.sources.find(s => s.id === entry.sourceId);
            const parentTitle = parentSource ? parentSource.title : '';
            const raw = `${entry.title || ''} ${entry.section || ''} ${entry.summary || ''} ${(entry.keywords || []).join(' ')} ${entry.category || ''} ${entry.type || ''} ${entry.publisher || ''} ${parentTitle}`.toLowerCase();
            this.documents.push({
                docType: 'section',
                id: entry.id,
                sourceId: entry.sourceId,
                parentTitle: parentTitle,
                title: entry.title || '',
                section: entry.section || '',
                anchor: entry.anchor || '',
                url: entry.url || '',
                type: entry.type || '',
                publisher: entry.publisher || '',
                category: entry.category || '',
                version: parentSource ? parentSource.version : '',
                description: entry.summary || '',
                keywords: entry.keywords || [],
                rawText: raw,
                tokens: this.tokenize(raw)
            });
        });

        // 3. Build Inverted Index
        this.documents.forEach((doc, idx) => {
            doc.tokens.forEach(token => {
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
     * Parse query string into AST
     */
    parseQuery(queryStr) {
        const tokens = QueryLexer.tokenize(queryStr);
        const parser = new QueryParser(tokens);
        return parser.parse();
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

        const categorySet = categories instanceof Set ? categories : new Set(
            Array.isArray(categories) ? categories : (categories && categories !== 'all' ? [categories] : [])
        );
        const typeSet = types instanceof Set ? types : new Set(
            Array.isArray(types) ? types : (types && types !== 'all' ? [types] : [])
        );
        const publisherSet = publishers instanceof Set ? publishers : new Set(
            Array.isArray(publishers) ? publishers : (publishers && publishers !== 'all' ? [publishers] : [])
        );

        const trimmed = (query || '').trim();
        const ast = trimmed ? this.parseQuery(trimmed) : null;
        const hasActiveFacetFilters = categorySet.size > 0 || typeSet.size > 0 || publisherSet.size > 0;

        // If search query is empty and no facet filters are active, show no results
        if (!ast && !hasActiveFacetFilters) {
            return [];
        }

        const results = [];

        for (let i = 0; i < this.documents.length; i++) {
            const doc = this.documents[i];

            // Scope filter
            if (scope === 'sources' && doc.docType !== 'source') continue;
            if (scope === 'sections' && doc.docType !== 'section') continue;

            // Facet filters
            if (categorySet.size > 0 && !categorySet.has(doc.category)) continue;
            if (typeSet.size > 0 && !typeSet.has(doc.type)) continue;
            if (publisherSet.size > 0 && !publisherSet.has(doc.publisher)) continue;

            if (!ast) {
                // When facet filters are active without a search query: status-based sorting
                let score = 0;
                if (doc.type === 'Recommendation' || doc.type === 'Standard') score += 10;
                else if (doc.type === 'Candidate Standard') score += 8;
                else if (doc.type === 'Note') score += 5;
                else if (doc.type === 'Working Draft') score += 4;
                else score += 1;

                results.push({ doc, score });
                continue;
            }

            // Evaluate AST match against document
            const evalResult = this.evaluateNode(ast, doc);
            if (evalResult.matches) {
                let score = evalResult.score;

                // Status bonus for authoritative specs
                if (doc.type === 'Recommendation' || doc.type === 'Standard') score += 4;
                else if (doc.type === 'Candidate Standard') score += 2;

                results.push({ doc, score });
            }
        }

        // Sort descending by score, then alphabetically by title
        results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.doc.title.localeCompare(b.doc.title);
        });

        return results.map(r => r.doc);
    }

    /**
     * Evaluate an AST node against a single document
     */
    evaluateNode(node, doc) {
        if (!node) return { matches: true, score: 0 };

        switch (node.type) {
            case 'TERM': {
                const term = node.value;
                const isPrefix = node.isPrefix;
                const titleLower = doc.title.toLowerCase();
                const descLower = doc.description.toLowerCase();
                const catLower = doc.category.toLowerCase();
                const typeLower = doc.type.toLowerCase();
                const pubLower = doc.publisher.toLowerCase();
                const secLower = (doc.section || '').toLowerCase();
                const kwTokens = (doc.keywords || []).flatMap(k => this.tokenize(k));

                let matched = false;
                let score = 0;

                const matchFn = (target) => {
                    if (isPrefix) return target.startsWith(term);
                    return target === term;
                };

                const substringFn = (target) => {
                    return target.includes(term);
                };

                // Title match (highest weight)
                if (substringFn(titleLower)) {
                    matched = true;
                    score += 25;
                    if (titleLower === term || titleLower.startsWith(term + ' ')) score += 15;
                }

                // Section match
                if (secLower && substringFn(secLower)) {
                    matched = true;
                    score += 15;
                }

                // Keywords match
                if (kwTokens.some(matchFn)) {
                    matched = true;
                    score += 15;
                }

                // Category, Type, Publisher match
                if (substringFn(catLower)) { matched = true; score += 8; }
                if (substringFn(typeLower)) { matched = true; score += 8; }
                if (substringFn(pubLower)) { matched = true; score += 8; }

                // Description match
                if (substringFn(descLower)) {
                    matched = true;
                    score += 5;
                }

                // Fallback check in rawText tokens
                if (!matched && doc.tokens.some(matchFn)) {
                    matched = true;
                    score += 3;
                }

                return { matches: matched, score };
            }

            case 'PHRASE': {
                const phrase = node.value;
                const titleLower = doc.title.toLowerCase();
                const descLower = doc.description.toLowerCase();
                const secLower = (doc.section || '').toLowerCase();
                const raw = doc.rawText;

                let matched = false;
                let score = 0;

                if (titleLower.includes(phrase)) {
                    matched = true;
                    score += 40;
                }
                if (secLower && secLower.includes(phrase)) {
                    matched = true;
                    score += 25;
                }
                if (descLower.includes(phrase)) {
                    matched = true;
                    score += 20;
                }
                if (!matched && raw.includes(phrase)) {
                    matched = true;
                    score += 10;
                }

                return { matches: matched, score };
            }

            case 'FIELD': {
                const field = node.field.toLowerCase();
                const val = node.value;
                let target = '';

                if (field === 'type') target = doc.type.toLowerCase();
                else if (field === 'pub' || field === 'publisher') target = doc.publisher.toLowerCase();
                else if (field === 'cat' || field === 'category') target = doc.category.toLowerCase();
                else if (field === 'title') target = doc.title.toLowerCase();
                else if (field === 'sec' || field === 'section') target = (doc.section || '').toLowerCase();
                else if (field === 'version') target = (doc.version || '').toLowerCase();
                else target = doc.rawText;

                const matched = target.includes(val);
                return { matches: matched, score: matched ? 30 : 0 };
            }

            case 'NOT': {
                const res = this.evaluateNode(node.child, doc);
                return {
                    matches: !res.matches,
                    score: 0
                };
            }

            case 'AND': {
                let totalScore = 0;
                for (const child of node.children) {
                    const res = this.evaluateNode(child, doc);
                    if (!res.matches) {
                        return { matches: false, score: 0 };
                    }
                    totalScore += res.score;
                }
                return { matches: true, score: totalScore + 10 }; // Bonus for satisfying all AND criteria
            }

            case 'OR': {
                let anyMatched = false;
                let maxScore = 0;
                for (const child of node.children) {
                    const res = this.evaluateNode(child, doc);
                    if (res.matches) {
                        anyMatched = true;
                        maxScore = Math.max(maxScore, res.score);
                    }
                }
                return { matches: anyMatched, score: maxScore };
            }

            default:
                return { matches: true, score: 0 };
        }
    }

    /**
     * Extract positive terms and phrases from query for highlighting
     */
    static extractHighlightTokens(query) {
        if (!query || typeof query !== 'string') return { phrases: [], terms: [] };

        const tokens = QueryLexer.tokenize(query);
        const phrases = [];
        const terms = [];

        // Check if token is preceded by NOT
        let skipNext = false;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.type === 'NOT') {
                skipNext = true;
                continue;
            }
            if (skipNext) {
                skipNext = false;
                continue;
            }

            if (t.type === 'PHRASE') {
                phrases.push(t.value);
            } else if (t.type === 'FIELD') {
                if (t.isPhrase) phrases.push(t.value);
                else terms.push(t.value);
            } else if (t.type === 'TERM') {
                terms.push(t.value);
            }
        }

        return { phrases, terms };
    }

    /**
     * Highlight matching terms and phrases in text, avoiding operators (AND/OR/NOT)
     */
    static highlightText(text, query) {
        if (!text || !query || !query.trim()) return text;

        const { phrases, terms } = EpubSearchEngine.extractHighlightTokens(query);
        if (phrases.length === 0 && terms.length === 0) return text;

        // Combine all items, sorted by length descending so longer phrases match first
        const allTargets = [...phrases, ...terms]
            .map(s => s.trim())
            .filter(s => s.length > 1)
            .sort((a, b) => b.length - a.length);

        if (allTargets.length === 0) return text;

        // Remove duplicates
        const uniqueTargets = Array.from(new Set(allTargets));

        const pattern = new RegExp(
            `(${uniqueTargets.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'gi'
        );

        return text.replace(pattern, '<mark>$1</mark>');
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

        return {
            categories,
            types,
            publishers,
            totalSources: this.sources.length,
            totalEntries: this.entries.length
        };
    }
}

// Support both Node.js (CommonJS / testing) and Browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QueryLexer,
        QueryParser,
        EpubSearchEngine
    };
}
if (typeof window !== 'undefined') {
    window.QueryLexer = QueryLexer;
    window.QueryParser = QueryParser;
    window.EpubSearchEngine = EpubSearchEngine;
}
