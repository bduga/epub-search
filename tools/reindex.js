/**
 * Cross-Platform W3C Spec Crawler & Automated Re-Indexing Tool
 * Zero external dependencies (uses only Node.js standard library).
 * Compatible with Windows, macOS, and Linux/Unix.
 *
 * Usage:
 *   node tools/reindex.js
 *   node tools/reindex.js --refresh
 *   node tools/reindex.js --source epub-33
 *   npm run reindex
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const projectRoot = path.resolve(__dirname, '..');
const dataPath = path.join(projectRoot, 'data');
const cachePath = path.join(dataPath, 'cache');
const sourcesJsonPath = path.join(dataPath, 'sources.json');
const entriesJsonPath = path.join(dataPath, 'index-entries.json');
const sourcesJsPath = path.join(dataPath, 'sources.js');
const entriesJsPath = path.join(dataPath, 'index-entries.js');
const sourcesCsvPath = path.join(dataPath, 'sources.csv');

// HTTP fetch fallback for Node versions < 18 without global fetch
function fetchUrl(targetUrl) {
    return new Promise((resolve, reject) => {
        if (typeof fetch === 'function') {
            fetch(targetUrl, {
                headers: { 'User-Agent': 'EPUB-Search-Indexer/1.0 (+https://github.com/duga/epub-search)' }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
                    return res.text();
                })
                .then(resolve)
                .catch(reject);
            return;
        }

        const client = targetUrl.startsWith('https') ? https : http;
        const req = client.get(targetUrl, {
            headers: { 'User-Agent': 'EPUB-Search-Indexer/1.0 (+https://github.com/duga/epub-search)' },
            timeout: 30000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                fetchUrl(res.headers.location).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}`));
                return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
    });
}

function cleanHtmlText(text) {
    if (!text) return '';
    return text
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'each', 'must', 'should', 'may',
    'can', 'not', 'have', 'has', 'are', 'were', 'been', 'will', 'would', 'which', 'when',
    'what', 'where', 'into', 'than', 'more', 'also', 'some', 'such', 'only', 'about',
    'div', 'span', 'true', 'false', 'http', 'https', 'null', 'string', 'number', 'none',
    'see', 'note', 'section', 'appendix', 'table', 'example', 'using', 'used', 'defined'
]);

// Canonical RFC 2119 requirement keywords
const VALID_RFC2119 = new Set([
    'MAY', 'MUST', 'MUST NOT', 'OPTIONAL', 'RECOMMENDED', 'REQUIRED', 'SHOULD', 'SHOULD NOT'
]);

async function reindex(options = {}) {
    const startTime = Date.now();
    const {
        refreshCache = false,
        sourceId = '',
        maxPerDoc = 0
    } = options;

    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
    }

    if (!fs.existsSync(sourcesJsonPath)) {
        console.error(`Error: Cannot find sources catalog at: ${sourcesJsonPath}`);
        process.exit(1);
    }

    let sources = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf8'));

    if (sourceId) {
        const filtered = sources.filter(s => s.id === sourceId);
        if (filtered.length === 0) {
            console.error(`Error: Source ID '${sourceId}' not found in sources.json`);
            process.exit(1);
        }
        sources = filtered;
    }

    console.log(`\n========================================================`);
    console.log(` EPUB Documentation Crawler & Automated Indexer (Node)`);
    console.log(` Target Sources: ${sources.length}`);
    console.log(` Cache Mode:     ${refreshCache ? 'Refresh (Re-downloading)' : 'Enabled (data/cache/)'}`);
    console.log(`========================================================\n`);

    const allEntries = [];

    for (let i = 0; i < sources.length; i++) {
        const src = sources[i];
        const cacheFile = path.join(cachePath, `${src.id}.html`);
        let html = '';

        process.stdout.write(`[${i + 1}/${sources.length}] ${src.id} (${src.type})\n`);

        const needsDownload = refreshCache || !fs.existsSync(cacheFile);

        if (needsDownload) {
            try {
                process.stdout.write(`    Downloading ${src.url}... `);
                html = await fetchUrl(src.url);
                fs.writeFileSync(cacheFile, html, 'utf8');
                console.log(`OK (${(html.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.log(`FAILED: ${err.message}`);
                if (fs.existsSync(cacheFile)) {
                    console.log(`    Using existing cache file fallback.`);
                    html = fs.readFileSync(cacheFile, 'utf8');
                } else {
                    continue;
                }
            }
        } else {
            html = fs.readFileSync(cacheFile, 'utf8');
            console.log(`    Loaded from cache (${(html.length / 1024).toFixed(1)} KB)`);
        }

        if (!html) continue;

        // Semantic section extraction
        const secRegex = /<(?:section|div\b[^>]*class="[^"]*section[^"]*")\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)(?=(?:<(?:section|div\b[^>]*class="[^"]*section[^"]*")\b[^>]*\bid=)|(?:<footer\b)|(?:<\/body>)|$)/gi;
        const seenAnchors = new Set();
        let srcExtracted = 0;
        let match;

        while ((match = secRegex.exec(html)) !== null) {
            const secId = match[1].trim();
            const secContent = match[2];

            if (seenAnchors.has(secId)) continue;

            // Filter out administrative boilerplate
            if (/^(?:abstract|sotd|status|toc|table-of-contents|references|normative-references|informative-references|acknowledgments|acknowledgements|change-log|changes|index|index-of-terms|index-terms|terms-index|privacy|security-considerations|privacy-considerations)$/i.test(secId)) {
                continue;
            }

            // Extract heading
            const hMatch = secContent.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
            if (!hMatch) continue;

            const rawHeading = cleanHtmlText(hMatch[1]);
            if (rawHeading.length < 2) continue;

            if (/^(Table of Contents|References|Normative References|Informative References|Acknowledgments|Changes|Index|Status of This Document)$/i.test(rawHeading)) {
                continue;
            }

            let secNumber = 'Section';
            let cleanTitle = rawHeading;

            const numMatch = rawHeading.match(/^(\d+(\.\d+)*)\s+(.*)$/);
            const appMatch = rawHeading.match(/^(Appendix\s+[A-Z](\.\d+)*)\s+(.*)$/i);

            if (numMatch) {
                secNumber = `Section ${numMatch[1]}`;
                cleanTitle = numMatch[3];
            } else if (appMatch) {
                secNumber = appMatch[1];
                cleanTitle = appMatch[3];
            }

            // Extract first meaningful paragraph summary
            let summary = '';
            const pMatches = secContent.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi);
            for (const pm of pMatches) {
                const cleanP = cleanHtmlText(pm[1]);
                if (cleanP.length > 35 && !/^(This section is non-normative|Status of this document|Copyright|All Rights Reserved)/i.test(cleanP)) {
                    summary = cleanP;
                    break;
                }
            }

            if (!summary) {
                summary = `${cleanTitle} in official ${src.title}.`;
            } else if (summary.length > 240) {
                summary = summary.substring(0, 237) + '...';
            }

            // Extract keyword terms
            const keywords = [];
            const titleWords = cleanTitle.replace(/[^\w\-\:]/g, ' ').split(/\s+/);
            for (const tw of titleWords) {
                const twLower = tw.toLowerCase();
                if (twLower.length >= 3 && !STOP_WORDS.has(twLower) && !keywords.includes(twLower)) {
                    keywords.push(twLower);
                }
            }

            const kwMatches = secContent.matchAll(/<(?:dfn|code|var|span\b[^>]*class="[^"]*(?:attribute|property|element)[^"]*")\b[^>]*>([\s\S]*?)<\/(?:dfn|code|var|span)>/gi);
            for (const km of kwMatches) {
                const kw = cleanHtmlText(km[1]);
                const kwLower = kw.toLowerCase();
                if (kw.length >= 3 && kw.length <= 35 && !STOP_WORDS.has(kwLower)) {
                    if (!keywords.includes(kw)) {
                        keywords.push(kw);
                        if (keywords.length >= 8) break;
                    }
                }
            }

            // Extract RFC 2119 requirement keywords (strictly elements with class="rfc2119")
            const rfcMatches = secContent.matchAll(/<([a-z0-9]+)\b[^>]*class="[^"]*\brfc2119\b[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi);
            const rfcSet = new Set();
            for (const rm of rfcMatches) {
                const term = cleanHtmlText(rm[2]).toUpperCase();
                if (VALID_RFC2119.has(term)) {
                    rfcSet.add(term);
                }
            }
            const rfcTerms = Array.from(rfcSet).sort();

            const baseUrl = src.url.replace(/\/+$/, '');
            const anchorUrl = `${baseUrl}/#${secId}`;

            allEntries.push({
                id: `${src.id}-${secId}`,
                sourceId: src.id,
                title: cleanTitle,
                section: secNumber,
                anchor: `#${secId}`,
                url: anchorUrl,
                category: src.category,
                type: src.type,
                publisher: src.publisher,
                keywords: keywords,
                rfc2119: rfcTerms,
                summary: summary
            });

            seenAnchors.add(secId);
            srcExtracted++;

            if (maxPerDoc > 0 && srcExtracted >= maxPerDoc) break;
        }

        console.log(`    -> Extracted ${srcExtracted} deep sections.`);
    }

    // Merge if partial re-index
    let finalEntries = allEntries;
    if (sourceId && fs.existsSync(entriesJsonPath)) {
        console.log(`\nMerging updated entries for ${sourceId} with existing catalog...`);
        const existing = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf8'));
        const kept = existing.filter(e => e.sourceId !== sourceId);
        finalEntries = [...kept, ...allEntries];
    }

    console.log(`\nWriting generated index files...`);

    // 1. data/index-entries.json
    const entriesJson = JSON.stringify(finalEntries, null, 4);
    fs.writeFileSync(entriesJsonPath, entriesJson, 'utf8');
    console.log(`  [OK] data/index-entries.json (${finalEntries.length} deep entries)`);

    // 2. data/index-entries.js (companion for file:// execution)
    fs.writeFileSync(entriesJsPath, `window.EPUB_ENTRIES = ${entriesJson};`, 'utf8');
    console.log(`  [OK] data/index-entries.js`);

    // 3. data/sources.js (companion for file:// execution)
    const fullSourcesRaw = fs.readFileSync(sourcesJsonPath, 'utf8');
    fs.writeFileSync(sourcesJsPath, `window.EPUB_SOURCES = ${fullSourcesRaw};`, 'utf8');
    console.log(`  [OK] data/sources.js`);

    // 4. data/sources.csv (clean formatted CSV)
    const fullSources = JSON.parse(fullSourcesRaw);
    const csvHeader = ['id', 'title', 'url', 'type', 'publisher', 'category', 'version', 'description'];
    const csvRows = fullSources.map(s => {
        return csvHeader.map(field => {
            const val = String(s[field] || '').replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    });
    const csvContent = [csvHeader.map(f => `"${f}"`).join(','), ...csvRows].join('\n');
    fs.writeFileSync(sourcesCsvPath, csvContent, 'utf8');
    console.log(`  [OK] data/sources.csv (${fullSources.length} sources)`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n========================================================`);
    console.log(` Re-Indexing Complete in ${elapsed} seconds`);
    console.log(` Indexed Documents:  ${fullSources.length}`);
    console.log(` Indexed Sections:   ${finalEntries.length}`);
    console.log(`========================================================\n`);

    return { totalSources: fullSources.length, totalSections: finalEntries.length };
}

// Direct CLI invocation
if (require.main === module) {
    const args = process.argv.slice(2);
    const refreshCache = args.includes('--refresh') || args.includes('-r');
    let sourceId = '';
    const srcIdx = args.findIndex(a => a === '--source' || a === '-s');
    if (srcIdx !== -1 && args[srcIdx + 1]) {
        sourceId = args[srcIdx + 1];
    }

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Usage:
  node tools/reindex.js [options]

Options:
  -r, --refresh      Force re-download of spec HTML files from W3C
  -s, --source <id>  Re-index only a specific document source ID
  -h, --help         Show this help screen
        `);
        process.exit(0);
    }

    reindex({ refreshCache, sourceId }).catch(err => {
        console.error('Reindexing failed:', err);
        process.exit(1);
    });
}

module.exports = { reindex };
