/**
 * EPUB Search Engine UI Coordinator
 */
document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultCountEl = document.getElementById('result-count');
    const searchTimeEl = document.getElementById('search-time');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Facet selects / radios
    const typeFilter = document.getElementById('filter-type');
    const categoryFilter = document.getElementById('filter-category');
    const publisherFilter = document.getElementById('filter-publisher');
    const scopeButtons = document.querySelectorAll('.scope-btn');
    const quickTags = document.querySelectorAll('.quick-tag');

    let currentScope = 'all';
    const engine = new EpubSearchEngine();

    // 1. Initialize Theme
    function initTheme() {
        const savedTheme = localStorage.getItem('epub-search-theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);
    }

    function updateThemeToggleIcon(theme) {
        if (!themeToggleBtn) return;
        themeToggleBtn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('epub-search-theme', next);
            updateThemeToggleIcon(next);
        });
    }

    initTheme();

    // 2. Load Data
    const { sources, entries } = await EpubDataLoader.load();
    engine.initialize(sources, entries);

    // 3. Populate Facet Dropdowns
    const facets = engine.getFacetCounts();

    function populateSelect(selectEl, counts, defaultLabel) {
        if (!selectEl) return;
        selectEl.innerHTML = `<option value="all">${defaultLabel}</option>`;
        Object.keys(counts).sort().forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = `${val} (${counts[val]})`;
            selectEl.appendChild(opt);
        });
    }

    populateSelect(typeFilter, facets.types, 'All Document Types');
    populateSelect(categoryFilter, facets.categories, 'All Topics / Categories');
    populateSelect(publisherFilter, facets.publishers, 'All Publishers / Groups');

    // Update Header Stats
    const totalSourcesEl = document.getElementById('total-sources-count');
    const totalEntriesEl = document.getElementById('total-entries-count');
    if (totalSourcesEl) totalSourcesEl.textContent = facets.totalSources;
    if (totalEntriesEl) totalEntriesEl.textContent = facets.totalEntries;

    // 4. Render Results
    function render() {
        const startTime = performance.now();
        const query = searchInput.value;
        const filters = {
            category: categoryFilter ? categoryFilter.value : 'all',
            type: typeFilter ? typeFilter.value : 'all',
            publisher: publisherFilter ? publisherFilter.value : 'all',
            scope: currentScope
        };

        const results = engine.search(query, filters);
        const duration = (performance.now() - startTime).toFixed(1);

        if (searchTimeEl) searchTimeEl.textContent = `${duration}ms`;
        if (resultCountEl) resultCountEl.textContent = results.length;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No matching documents or sections found</h3>
                    <p>Try broadening your query, adjusting the filters, or searching for terms like <code>manifest</code>, <code>accessibility</code>, or <code>spine</code>.</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.map(doc => {
            const isSection = doc.docType === 'section';
            const highlightedTitle = EpubSearchEngine.highlightText(escapeHtml(doc.title), query);
            const highlightedDesc = EpubSearchEngine.highlightText(escapeHtml(doc.description), query);
            const typeBadgeClass = getTypeBadgeClass(doc.type);

            return `
                <article class="result-card ${isSection ? 'result-section' : 'result-source'}">
                    <div class="card-header">
                        <div class="card-badges">
                            <span class="badge badge-type ${typeBadgeClass}">${escapeHtml(doc.type)}</span>
                            <span class="badge badge-pub">${escapeHtml(doc.publisher)}</span>
                            <span class="badge badge-cat">${escapeHtml(doc.category)}</span>
                            ${doc.version ? `<span class="badge badge-ver">v${escapeHtml(doc.version)}</span>` : ''}
                            ${isSection ? `<span class="badge badge-sec">${escapeHtml(doc.section || 'Section')}</span>` : ''}
                        </div>
                        <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer" class="external-link-btn" title="Open official document">
                            Open Official ↗
                        </a>
                    </div>

                    <h3 class="card-title">
                        <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">
                            ${highlightedTitle}
                        </a>
                    </h3>

                    ${isSection && doc.parentTitle ? `
                        <div class="parent-source-note">
                            From: <strong>${escapeHtml(doc.parentTitle)}</strong>
                        </div>
                    ` : ''}

                    <p class="card-desc">${highlightedDesc}</p>

                    ${doc.keywords && doc.keywords.length > 0 ? `
                        <div class="card-keywords">
                            ${doc.keywords.slice(0, 6).map(kw => `<span class="kw-tag">${escapeHtml(kw)}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="card-footer">
                        <span class="doc-url" title="${escapeHtml(doc.url)}">${escapeHtml(doc.url)}</span>
                        <button class="copy-link-btn" onclick="navigator.clipboard.writeText('${escapeHtml(doc.url)}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy Link', 1500)">
                            Copy Link
                        </button>
                    </div>
                </article>
            `;
        }).join('');
    }

    function getTypeBadgeClass(type) {
        if (!type) return '';
        const t = type.toLowerCase();
        if (t.includes('standard') && !t.includes('candidate') && !t.includes('draft')) return 'badge-standard';
        if (t.includes('candidate')) return 'badge-candidate';
        if (t.includes('note')) return 'badge-note';
        if (t.includes('report')) return 'badge-report';
        if (t.includes('legacy')) return 'badge-legacy';
        return 'badge-other';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 5. Event Listeners
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(render, 50);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            render();
        });
    }

    // Facet listeners
    [typeFilter, categoryFilter, publisherFilter].forEach(sel => {
        if (sel) sel.addEventListener('change', render);
    });

    // Scope button listeners
    scopeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            scopeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentScope = btn.dataset.scope;
            render();
        });
    });

    // Quick tag pills
    quickTags.forEach(tag => {
        tag.addEventListener('click', () => {
            searchInput.value = tag.dataset.query;
            if (clearBtn) clearBtn.style.display = 'block';
            render();
        });
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        // Press '/' to search
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        // Press 'Escape' to clear
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            if (clearBtn) clearBtn.style.display = 'none';
            render();
            searchInput.blur();
        }
    });

    // Initial render
    render();
});
