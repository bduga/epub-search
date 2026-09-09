/**
 * EPUB Search Engine UI Coordinator (with Full Accessibility & Multi-Select Filtering)
 */
document.addEventListener('DOMContentLoaded', async () => {
    const appContainer = document.getElementById('app-container');
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
    const a11yAnnouncer = document.getElementById('a11y-announcer');

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

    // Track previously focused element for accessible modal focus restoration
    let previouslyFocusedElement = null;

    // Dedicated Polite Screen Reader Announcer
    let announcerTimeout = null;
    function announce(message) {
        if (!a11yAnnouncer || !message) return;
        clearTimeout(announcerTimeout);
        announcerTimeout = setTimeout(() => {
            a11yAnnouncer.textContent = '';
            setTimeout(() => {
                if (a11yAnnouncer) a11yAnnouncer.textContent = message;
            }, 50);
        }, 120);
    }

    // 1. Initialize Theme with Accessible State
    function initTheme() {
        const savedTheme = localStorage.getItem('epub-search-theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);
    }

    function updateThemeToggleIcon(theme) {
        if (!themeToggleBtn) return;
        const isDark = theme === 'dark';
        themeToggleBtn.innerHTML = isDark ? '☀️ Light' : '🌙 Dark';
        themeToggleBtn.setAttribute('aria-pressed', String(isDark));
        themeToggleBtn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('epub-search-theme', next);
            updateThemeToggleIcon(next);
            announce(`Theme changed to ${next} mode.`);
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

        const sortedVals = Object.keys(counts).sort();

        sortedVals.forEach((val, idx) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-option';

            const inputId = `filter-${filterKey}-${val.replace(/[^a-zA-Z0-9]/g, '-')}`;
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = inputId;
            checkbox.value = val;
            checkbox.checked = selectedSet.has(val);
            checkbox.setAttribute('aria-label', `${val} (${counts[val]} results)`);

            const label = document.createElement('label');
            label.htmlFor = inputId;

            const textSpan = document.createElement('span');
            textSpan.textContent = val;

            const countSpan = document.createElement('span');
            countSpan.className = 'option-count';
            countSpan.setAttribute('aria-hidden', 'true');
            countSpan.textContent = counts[val];

            label.appendChild(textSpan);
            label.appendChild(countSpan);

            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(label);

            // Arrow key navigation between options
            checkbox.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextOption = optionDiv.nextElementSibling?.querySelector('input[type="checkbox"]');
                    if (nextOption) nextOption.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevOption = optionDiv.previousElementSibling?.querySelector('input[type="checkbox"]');
                    if (prevOption) {
                        prevOption.focus();
                    } else {
                        // Move back to "Clear" or "Select All"
                        const parentMenu = listEl.closest('.dropdown-menu');
                        const clearActionBtn = parentMenu?.querySelector('.action-clear');
                        if (clearActionBtn) clearActionBtn.focus();
                    }
                }
            });

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedSet.add(val);
                    announce(`Filter added: ${val}`);
                } else {
                    selectedSet.delete(val);
                    announce(`Filter removed: ${val}`);
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

    // Dropdown Trigger UI, Disclosure & Keyboard Navigation
    const dropdownWrappers = document.querySelectorAll('.dropdown-multiselect');
    dropdownWrappers.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        if (!trigger || !menu) return;

        function closeDropdown(returnFocus = false) {
            dropdown.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
            if (returnFocus) trigger.focus();
        }

        function openDropdown() {
            // Close all other dropdowns first
            dropdownWrappers.forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    d.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                }
            });
            dropdown.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('open');
            if (isOpen) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        // Keyboard navigation on trigger
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                if (!dropdown.classList.contains('open')) {
                    e.preventDefault();
                    openDropdown();
                    // Focus first interactive control in menu
                    const firstInteractive = menu.querySelector('button, input[type="checkbox"]');
                    if (firstInteractive) firstInteractive.focus();
                }
            } else if (e.key === 'Escape' && dropdown.classList.contains('open')) {
                e.preventDefault();
                closeDropdown(true);
            }
        });

        // Keyboard handling within the menu
        menu.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeDropdown(true);
            }
        });

        // Close on focusout when focus leaves the entire dropdown container
        dropdown.addEventListener('focusout', (e) => {
            if (!dropdown.contains(e.relatedTarget)) {
                closeDropdown();
            }
        });

        // Prevent clicks inside dropdown menu from closing it
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Close dropdowns on outside document click
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
            let set, counts, containerId, targetName;

            if (target === 'type') {
                set = selectedTypes;
                counts = facets.types;
                containerId = 'options-type';
                targetName = 'Document Types';
            } else if (target === 'category') {
                set = selectedCategories;
                counts = facets.categories;
                containerId = 'options-category';
                targetName = 'Topics';
            } else if (target === 'publisher') {
                set = selectedPublishers;
                counts = facets.publishers;
                containerId = 'options-publisher';
                targetName = 'Publishers';
            }

            if (!set) return;

            if (isSelectAll) {
                Object.keys(counts).forEach(k => set.add(k));
                announce(`Selected all ${targetName}.`);
            } else {
                set.clear();
                announce(`Cleared all ${targetName}.`);
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

    const triggerLabels = {
        type: 'Document Types',
        category: 'Topics / Categories',
        publisher: 'Publishers / Groups'
    };

    function updateDropdownTriggerState(target, set) {
        const badge = document.getElementById(`badge-count-${target}`);
        const trigger = document.getElementById(`trigger-${target}`);
        if (!badge || !trigger) return;

        const baseLabel = triggerLabels[target] || target;

        if (set.size > 0) {
            badge.style.display = 'inline-block';
            badge.innerHTML = `${set.size}<span class="sr-only"> selected</span>`;
            trigger.classList.add('has-selection');
            trigger.setAttribute('aria-label', `${baseLabel} (${set.size} selected)`);
        } else {
            badge.style.display = 'none';
            trigger.classList.remove('has-selection');
            trigger.removeAttribute('aria-label');
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
                announce(`Removed filter ${item.display}`);

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
                if (trigger) {
                    trigger.classList.remove('has-selection');
                    trigger.removeAttribute('aria-label');
                }
            });

            announce('All active filters cleared.');
            renderActiveFilterPills();
            render();
        });
    }

    // 5. Render Results with Accessible Announcements
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

        // Dynamic Document Title
        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            document.title = `${results.length} results for "${trimmedQuery}" — EPUB Documentation Search`;
        } else if (selectedCategories.size > 0 || selectedTypes.size > 0 || selectedPublishers.size > 0) {
            document.title = `${results.length} filtered results — EPUB Documentation Search`;
        } else {
            document.title = 'EPUB Official Documentation Search Engine';
        }

        // Announce search result count politely
        const hasFilters = selectedCategories.size > 0 || selectedTypes.size > 0 || selectedPublishers.size > 0;
        if (trimmedQuery || hasFilters) {
            const countStr = results.length === 1 ? '1 result found' : `${results.length} results found`;
            announce(`${countStr}${trimmedQuery ? ` for "${trimmedQuery}"` : ''}.`);
        }

        if (parsedQueryPill) {
            const hasAdvancedSyntax = /["'():*]|(\b(AND|OR|NOT)\b)|(\b(type|pub|publisher|cat|category|title|sec|section|req|rfc|rfc2119):)|(^[+-]|\s[+-])/.test(query);
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
                        <div class="empty-icon" aria-hidden="true">📖</div>
                        <h3>Explore Official EPUB Specifications</h3>
                        <p>Type a search term above, use <code>AND</code> / <code>OR</code> / <code>NOT</code> syntax, or click one of the quick searches to explore 38 official specifications and 2,100+ deep sections.</p>
                    </div>
                `;
            } else {
                resultsContainer.innerHTML = `
                    <div class="empty-state" role="status">
                        <div class="empty-icon" aria-hidden="true">🔍</div>
                        <h3>No matching documents or sections found</h3>
                        <p>Try refining your query, clearing some active filters, or using broader boolean expressions.</p>
                    </div>
                `;
            }
            return;
        }

        resultsContainer.innerHTML = results.map((doc, index) => {
            const isSection = doc.docType === 'section';
            const highlightedTitle = EpubSearchEngine.highlightText(escapeHtml(doc.title), query);
            const highlightedDesc = EpubSearchEngine.highlightText(escapeHtml(doc.description), query);
            const typeBadgeClass = getTypeBadgeClass(doc.type);

            return `
                <article class="result-card ${isSection ? 'result-section' : 'result-source'}" aria-labelledby="card-title-${index}">
                    <div class="card-header">
                        <div class="card-badges" role="group" aria-label="Document Metadata">
                            <span class="badge badge-type ${typeBadgeClass}"><span class="sr-only">Document Type: </span>${escapeHtml(doc.type)}</span>
                            <span class="badge badge-pub"><span class="sr-only">Publisher: </span>${escapeHtml(doc.publisher)}</span>
                            <span class="badge badge-cat"><span class="sr-only">Category: </span>${escapeHtml(doc.category)}</span>
                            ${doc.version ? `<span class="badge badge-ver"><span class="sr-only">Version: </span>v${escapeHtml(doc.version)}</span>` : ''}
                            ${isSection ? `<span class="badge badge-sec"><span class="sr-only">Section: </span>${escapeHtml(doc.section || 'Section')}</span>` : ''}
                        </div>
                        <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer" class="external-link-btn" aria-label="Open official specification: ${escapeHtml(doc.title)} (opens in new window)">
                            Open Official <span aria-hidden="true">↗</span><span class="sr-only"> (opens in new window)</span>
                        </a>
                    </div>

                    <h3 class="card-title" id="card-title-${index}">
                        <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">
                            ${highlightedTitle}
                            <span class="sr-only"> (opens in new window)</span>
                        </a>
                    </h3>

                    ${isSection && doc.parentTitle ? `
                        <div class="parent-source-note">
                            From: <strong>${escapeHtml(doc.parentTitle)}</strong>
                        </div>
                    ` : ''}

                    <p class="card-desc">${highlightedDesc}</p>

                    ${doc.rfc2119 && doc.rfc2119.length > 0 ? `
                        <div class="card-rfc-container" role="group" aria-label="Normative RFC 2119 Requirements">
                            <span class="rfc-title" id="rfc-title-${index}">Requirements:</span>
                            <div class="rfc-badges">
                                ${doc.rfc2119.map(req => {
                                    const reqLower = req.toLowerCase();
                                    const filterVal = reqLower === 'must not' ? '"must not"' : (reqLower === 'should not' ? '"should not"' : reqLower);
                                    return `<button type="button" class="badge-rfc badge-rfc-${reqLower.replace(/\s+/g, '-')}" aria-label="Filter results by requirement: ${escapeHtml(req)}" data-req="${escapeHtml(filterVal)}">${escapeHtml(req)}</button>`;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${doc.keywords && doc.keywords.length > 0 ? `
                        <div class="card-keywords" role="group" aria-label="Keywords">
                            ${doc.keywords.slice(0, 6).map(kw => `<span class="kw-tag">${escapeHtml(kw)}</span>`).join('')}
                        </div>
                    ` : ''}

                    <div class="card-footer">
                        <span class="doc-url" title="${escapeHtml(doc.url)}">${escapeHtml(doc.url)}</span>
                        <button type="button" class="copy-link-btn" aria-label="Copy link for ${escapeHtml(doc.title)}" data-url="${escapeHtml(doc.url)}" data-title="${escapeHtml(doc.title)}">
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

    // 6. Event Listeners & Search Inputs
    let debounceTimer = null;
    searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(render, 60);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            announce('Search cleared.');
            render();
        });
    }

    // Scope button listeners with aria-pressed management
    scopeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            scopeButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
            currentScope = btn.dataset.scope;
            const label = btn.textContent.trim();
            announce(`Scope changed to ${label}.`);
            render();
        });
    });

    // Quick tag buttons
    quickTags.forEach(tag => {
        tag.addEventListener('click', () => {
            searchInput.value = tag.dataset.query;
            if (clearBtn) clearBtn.style.display = 'block';
            announce(`Quick search query applied: ${tag.dataset.query}`);
            render();
            searchInput.focus();
        });
    });

    // Delegated click handler on results container (Copy Link & RFC Badges)
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            // Copy Link
            const copyBtn = e.target.closest('.copy-link-btn');
            if (copyBtn) {
                const url = copyBtn.getAttribute('data-url');
                const title = copyBtn.getAttribute('data-title');
                if (url) {
                    navigator.clipboard.writeText(url).then(() => {
                        copyBtn.textContent = 'Copied!';
                        announce(`Link copied to clipboard for: ${title}`);
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy Link';
                        }, 1600);
                    }).catch(() => {
                        announce('Failed to copy link.');
                    });
                }
                return;
            }

            // RFC 2119 requirement badge click
            const rfcBtn = e.target.closest('.badge-rfc');
            if (rfcBtn) {
                const reqVal = rfcBtn.getAttribute('data-req');
                if (reqVal) {
                    searchInput.value = `req:${reqVal}`;
                    if (clearBtn) clearBtn.style.display = 'block';
                    announce(`Filter applied: req:${reqVal}`);
                    searchInput.focus();
                    render();
                }
            }
        });
    }

    // 7. Syntax Modal Dialog Controls & Focus Trap
    function openSyntaxModal() {
        if (!syntaxModal) return;
        previouslyFocusedElement = document.activeElement;
        syntaxModal.classList.add('open');
        syntaxModal.setAttribute('aria-hidden', 'false');

        // Inert the background container for screen readers
        if (appContainer) {
            appContainer.setAttribute('aria-hidden', 'true');
            if ('inert' in appContainer) {
                appContainer.inert = true;
            }
        }

        if (syntaxGuideBtn) syntaxGuideBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';

        // Move initial focus to close button
        if (closeModalBtn) {
            setTimeout(() => closeModalBtn.focus(), 50);
        }
        announce('Advanced search syntax guide dialog opened. Press Escape to close.');
    }

    function closeSyntaxModal() {
        if (!syntaxModal) return;
        syntaxModal.classList.remove('open');
        syntaxModal.setAttribute('aria-hidden', 'true');

        // Restore background container
        if (appContainer) {
            appContainer.removeAttribute('aria-hidden');
            if ('inert' in appContainer) {
                appContainer.inert = false;
            }
        }

        if (syntaxGuideBtn) syntaxGuideBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';

        // Restore focus to opening button
        if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
            previouslyFocusedElement.focus();
        } else if (syntaxGuideBtn) {
            syntaxGuideBtn.focus();
        }
        announce('Syntax guide dialog closed.');
    }

    if (syntaxGuideBtn) syntaxGuideBtn.addEventListener('click', openSyntaxModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeSyntaxModal);
    if (modalGotItBtn) modalGotItBtn.addEventListener('click', closeSyntaxModal);

    if (syntaxModal) {
        syntaxModal.addEventListener('click', (e) => {
            if (e.target === syntaxModal) closeSyntaxModal();
        });

        // Modal Focus Trap
        syntaxModal.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusables = syntaxModal.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    document.querySelectorAll('.use-example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            if (query && searchInput) {
                searchInput.value = query;
                if (clearBtn) clearBtn.style.display = 'block';
                closeSyntaxModal();
                announce(`Example query applied: ${query}`);
                render();
                searchInput.focus();
            }
        });
    });

    // 8. Global Keyboard Shortcuts
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
                const trigger = openDropdown.querySelector('.dropdown-trigger');
                trigger?.setAttribute('aria-expanded', 'false');
                trigger?.focus();
                return;
            }
        }

        // Press '/' to search (prevent hijacking if typing in another input/textarea)
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
                               document.activeElement?.isContentEditable;

        if (e.key === '/' && !isInputFocused && (!syntaxModal || !syntaxModal.classList.contains('open'))) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }

        // Press 'Escape' in search input to clear
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            if (searchInput.value) {
                searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
                announce('Search input cleared.');
                render();
            }
            searchInput.blur();
        }
    });

    // Initial render
    render();
});
