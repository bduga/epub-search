/**
 * EPUB Search Engine UI Coordinator (with Multi-Select Filtering)
 */
document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultCountEl = document.getElementById('result-count');
    const searchTimeEl = document.getElementById('search-time');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const syntaxGuideBtn = document.getElementById('syntax-guide-btn');
    const syntaxModal = document.getElementById('syntax-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalGotItBtn = document.getElementById('modal-got-it-btn');
    const parsedQueryPill = document.getElementById('parsed-query-pill');

    // Filter controls
    const scopeButtons = document.querySelectorAll('.scope-btn');
    const quickTags = document.querySelectorAll('.quick-tag');
    const activeFiltersBar = document.getElementById('active-filters-bar');
    const activeFilterChips = document.getElementById('active-filter-chips');
    const clearAllFiltersBtn = document.getElementById('clear-all-filters-btn');

    // Multi-select state
    const selectedTypes = new Set();
    const selectedCategories = new Set();
    const selectedPublishers = new Set();
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

    // 3. Facets & Dropdown Population
    const facets = engine.getFacetCounts();

    // Update Header Stats
    const totalSourcesEl = document.getElementById('total-sources-count');
    const totalEntriesEl = document.getElementById('total-entries-count');
    if (totalSourcesEl) totalSourcesEl.textContent = facets.totalSources;
    if (totalEntriesEl) totalEntriesEl.textContent = facets.totalEntries;

    function populateMultiSelect(containerId, counts, selectedSet, filterKey) {
        const listEl = document.getElementById(containerId);
        if (!listEl) return;
        listEl.innerHTML = '';

        Object.keys(counts).sort().forEach(val => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-option';

            const inputId = `filter-${filterKey}-${val.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = inputId;
            checkbox.value = val;
            checkbox.checked = selectedSet.has(val);

            const label = document.createElement('label');
            label.htmlFor = inputId;

            const textSpan = document.createElement('span');
            textSpan.textContent = val;

            const countSpan = document.createElement('span');
            countSpan.className = 'option-count';
            countSpan.textContent = counts[val];

            label.appendChild(textSpan);
            label.appendChild(countSpan);

            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(label);

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedSet.add(val);
                } else {
                    selectedSet.delete(val);
                }
                updateDropdownTriggerState(filterKey, selectedSet);
                renderActiveFilterPills();
                render();
            });

            listEl.appendChild(optionDiv);
        });
    }

    populateMultiSelect('options-type', facets.types, selectedTypes, 'type');
    populateMultiSelect('options-category', facets.categories, selectedCategories, 'category');
    populateMultiSelect('options-publisher', facets.publishers, selectedPublishers, 'publisher');

    // Dropdown Trigger UI & Toggle Listeners
    const dropdownWrappers = document.querySelectorAll('.dropdown-multiselect');
    dropdownWrappers.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        if (!trigger) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            // Close all other dropdowns
            dropdownWrappers.forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    d.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                }
            });

            dropdown.classList.toggle('open', !isOpen);
            trigger.setAttribute('aria-expanded', String(!isOpen));
        });

        // Prevent clicks inside dropdown menu from closing it
        dropdown.querySelector('.dropdown-menu')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        dropdownWrappers.forEach(d => {
            d.classList.remove('open');
            d.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        });
    });

    // "Select All" and "Clear" in dropdown headers
    document.querySelectorAll('.dropdown-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const isSelectAll = btn.classList.contains('action-select-all');
            let set, counts, containerId;

            if (target === 'type') {
                set = selectedTypes;
                counts = facets.types;
                containerId = 'options-type';
            } else if (target === 'category') {
                set = selectedCategories;
                counts = facets.categories;
                containerId = 'options-category';
            } else if (target === 'publisher') {
                set = selectedPublishers;
                counts = facets.publishers;
                containerId = 'options-publisher';
            }

            if (!set) return;

            if (isSelectAll) {
                Object.keys(counts).forEach(k => set.add(k));
            } else {
                set.clear();
            }

            // Sync checkboxes
            const container = document.getElementById(containerId);
            if (container) {
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = set.has(cb.value);
                });
            }

            updateDropdownTriggerState(target, set);
            renderActiveFilterPills();
            render();
        });
    });

    function updateDropdownTriggerState(target, set) {
        const badge = document.getElementById(`badge-count-${target}`);
        const trigger = document.getElementById(`trigger-${target}`);
        if (!badge || !trigger) return;

        if (set.size > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = set.size;
            trigger.classList.add('has-selection');
        } else {
            badge.style.display = 'none';
            trigger.classList.remove('has-selection');
        }
    }

    // 4. Active Filters Bar
    function renderActiveFilterPills() {
        if (!activeFiltersBar || !activeFilterChips) return;
        activeFilterChips.innerHTML = '';

        const allFilters = [
            ...Array.from(selectedTypes).map(v => ({ type: 'type', label: v, display: `Type: ${v}` })),
            ...Array.from(selectedCategories).map(v => ({ type: 'category', label: v, display: `Topic: ${v}` })),
            ...Array.from(selectedPublishers).map(v => ({ type: 'publisher', label: v, display: `Publisher: ${v}` }))
        ];

        if (allFilters.length === 0) {
            activeFiltersBar.style.display = 'none';
            return;
        }

        activeFiltersBar.style.display = 'flex';

        allFilters.forEach(item => {
            const chip = document.createElement('span');
            chip.className = 'active-chip';

            const text = document.createElement('span');
            text.textContent = item.display;

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'active-chip-remove';
            removeBtn.innerHTML = '✕';
            removeBtn.setAttribute('aria-label', `Remove filter ${item.display}`);

            removeBtn.addEventListener('click', () => {
                let set, containerId;
                if (item.type === 'type') { set = selectedTypes; containerId = 'options-type'; }
                else if (item.type === 'category') { set = selectedCategories; containerId = 'options-category'; }
                else if (item.type === 'publisher') { set = selectedPublishers; containerId = 'options-publisher'; }

                set.delete(item.label);

                // Uncheck corresponding checkbox
                const cb = document.querySelector(`#${containerId} input[value="${CSS.escape(item.label)}"]`);
                if (cb) cb.checked = false;

                updateDropdownTriggerState(item.type, set);
                renderActiveFilterPills();
                render();
            });

            chip.appendChild(text);
            chip.appendChild(removeBtn);
            activeFilterChips.appendChild(chip);
        });
    }

    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener('click', () => {
            selectedTypes.clear();
            selectedCategories.clear();
            selectedPublishers.clear();

            document.querySelectorAll('.dropdown-options-list input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });

            ['type', 'category', 'publisher'].forEach(t => {
                const badge = document.getElementById(`badge-count-${t}`);
                const trigger = document.getElementById(`trigger-${t}`);
                if (badge) badge.style.display = 'none';
                if (trigger) trigger.classList.remove('has-selection');
            });

            renderActiveFilterPills();
            render();
        });
    }

    // 5. Render Results
    function render() {
        const startTime = performance.now();
        const query = searchInput.value;
        const filters = {
            categories: selectedCategories,
            types: selectedTypes,
            publishers: selectedPublishers,
            scope: currentScope
        };

        const results = engine.search(query, filters);
        const duration = (performance.now() - startTime).toFixed(1);

        if (searchTimeEl) searchTimeEl.textContent = `${duration}ms`;
        if (resultCountEl) resultCountEl.textContent = results.length;

        if (parsedQueryPill) {
            const hasAdvancedSyntax = /["'():*]|(\b(AND|OR|NOT)\b)|(\b(type|pub|publisher|cat|category|title|sec):)|(^[+-]|\s[+-])/.test(query);
            if (hasAdvancedSyntax && query.trim()) {
                parsedQueryPill.style.display = 'inline-flex';
                parsedQueryPill.textContent = '⚡ Advanced Syntax Active';
            } else {
                parsedQueryPill.style.display = 'none';
            }
        }

        if (results.length === 0) {
            const hasQueryOrFilters = query.trim().length > 0 || selectedCategories.size > 0 || selectedTypes.size > 0 || selectedPublishers.size > 0;
            if (!hasQueryOrFilters) {
                resultsContainer.innerHTML = `
                    <div class="empty-state initial-prompt-state">
                        <div class="empty-icon">📖</div>
                        <h3>Explore Official EPUB Specifications</h3>
                        <p>Type a search term above, use <code>AND</code> / <code>OR</code> / <code>NOT</code> syntax, or click one of the quick searches to explore 38 official specifications and 2,100+ deep sections.</p>
                    </div>
                `;
            } else {
                resultsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>No matching documents or sections found</h3>
                        <p>Try refining your query, clearing some active filters, or using broader boolean expressions.</p>
                    </div>
                `;
            }
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
        if (t.includes('recommendation') || (t.includes('standard') && !t.includes('candidate') && !t.includes('draft') && !t.includes('working'))) return 'badge-standard';
        if (t.includes('candidate')) return 'badge-candidate';
        if (t.includes('working') || t.includes('draft')) return 'badge-draft';
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

    // 6. Event Listeners
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

    // 7. Syntax Modal Controls & Interactive Examples
    function openSyntaxModal() {
        if (!syntaxModal) return;
        syntaxModal.classList.add('open');
        syntaxModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeSyntaxModal() {
        if (!syntaxModal) return;
        syntaxModal.classList.remove('open');
        syntaxModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (syntaxGuideBtn) syntaxGuideBtn.addEventListener('click', openSyntaxModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeSyntaxModal);
    if (modalGotItBtn) modalGotItBtn.addEventListener('click', closeSyntaxModal);

    if (syntaxModal) {
        syntaxModal.addEventListener('click', (e) => {
            if (e.target === syntaxModal) closeSyntaxModal();
        });
    }

    document.querySelectorAll('.use-example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            if (query && searchInput) {
                searchInput.value = query;
                if (clearBtn) clearBtn.style.display = 'block';
                closeSyntaxModal();
                render();
                searchInput.focus();
            }
        });
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        // Press Escape: close open modal or open dropdown first
        if (e.key === 'Escape') {
            if (syntaxModal && syntaxModal.classList.contains('open')) {
                closeSyntaxModal();
                return;
            }
            const openDropdown = document.querySelector('.dropdown-multiselect.open');
            if (openDropdown) {
                openDropdown.classList.remove('open');
                openDropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                return;
            }
        }

        // Press '/' to search (when modal isn't open)
        if (e.key === '/' && document.activeElement !== searchInput && (!syntaxModal || !syntaxModal.classList.contains('open'))) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        // Press 'Escape' in search input to clear
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

