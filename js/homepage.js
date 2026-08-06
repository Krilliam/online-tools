document.addEventListener('DOMContentLoaded', () => {
    let allTools = [];
    let activeCategory = 'all';
    let searchQuery = '';

    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-dropdown');
    const toolsGrid = document.getElementById('tools-grid');
    const categoryFilters = document.getElementById('category-filters');

    // ==========================================
    // LOAD TOOLS FROM JSON
    // ==========================================
    async function loadTools() {
        try {
            const response = await fetch('tools.json');
            const data = await response.json();
            allTools = data.tools;

            // Build category filter buttons
            const categories = [...new Set(allTools.map(t => t.category))];
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.dataset.category = cat;
                btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                btn.addEventListener('click', () => {
                    setActiveCategory(cat);
                });
                categoryFilters.appendChild(btn);
            });

            // "All" button listener
            document.querySelector('[data-category="all"]')
                .addEventListener('click', () => setActiveCategory('all'));

            // Initial render
            renderTools(allTools);
        } catch (error) {
            console.error('Error loading tools:', error);
        }
    }

    // ==========================================
    // SEARCH LOGIC
    // ==========================================
    function matchesSearch(tool, query) {
        if (!query) return true;
        const q = query.toLowerCase();

        // Search in name, description, tags, and category
        if (tool.name.toLowerCase().includes(q)) return true;
        if (tool.description.toLowerCase().includes(q)) return true;
        if (tool.category.toLowerCase().includes(q)) return true;
        if (tool.tags && tool.tags.some(tag => tag.toLowerCase().includes(q))) return true;

        return false;
    }

    function getFilteredTools() {
        let filtered = allTools;

        // Apply category filter
        if (activeCategory !== 'all') {
            filtered = filtered.filter(t => t.category === activeCategory);
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(t => matchesSearch(t, searchQuery));
        }

        return filtered;
    }

    // ==========================================
    // SEARCH DROPDOWN (Steam-style)
    // ==========================================
    function renderSearchDropdown(query) {
        if (!query || query.trim().length === 0) {
            searchDropdown.style.display = 'none';
            return;
        }

        const results = allTools.filter(t => matchesSearch(t, query));

        if (results.length === 0) {
            searchDropdown.innerHTML = '<div class="search-dropdown-empty">No tools found.</div>';
            searchDropdown.style.display = 'block';
            return;
        }

        searchDropdown.innerHTML = '';
        results.forEach(tool => {
            const item = document.createElement('a');
            item.href = tool.status === 'live' ? tool.url : '#';
            item.className = `search-dropdown-item ${tool.status === 'wip' ? 'search-dropdown-item-wip' : ''}`;

            // Highlight matching text in name
            const highlightedName = highlightMatch(tool.name, query);

            item.innerHTML = `
                <span class="search-dropdown-category">${tool.category}</span>
                <span class="search-dropdown-name">${highlightedName}</span>
                <span class="search-dropdown-desc">${tool.description}</span>
                ${tool.status === 'wip' ? '<span class="search-dropdown-badge">Coming Soon</span>' : ''}
            `;

            if (tool.status === 'wip') {
                item.addEventListener('click', (e) => e.preventDefault());
            }

            searchDropdown.appendChild(item);
        });

        searchDropdown.style.display = 'block';
    }

    // Highlights the matching portion of text with a <mark> tag
    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ==========================================
    // RENDER TOOLS GRID
    // ==========================================
    function renderTools(tools) {
        const noscript = toolsGrid.querySelector('noscript');
        toolsGrid.innerHTML = '';
        if (noscript) toolsGrid.appendChild(noscript);

        if (tools.length === 0) {
            toolsGrid.innerHTML = '<p class="no-results">No tools match your search.</p>';
            return;
        }

        tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = `tool-card ${tool.status === 'wip' ? 'tool-wip' : ''}`;
            card.innerHTML = `
                <span class="tool-category">${tool.category}</span>
                <h2>${tool.name}</h2>
                <p>${tool.description}</p>
                ${tool.status === 'live'
                    ? `<a href="${tool.url}" class="tool-link">Use tool &rarr;</a>`
                    : `<span class="tool-badge">Coming Soon</span>`
                }
            `;
            toolsGrid.appendChild(card);
        });
    }

    // ==========================================
    // CATEGORY FILTER
    // ==========================================
    function setActiveCategory(category) {
        activeCategory = category;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        renderTools(getFilteredTools());
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    // Search input: updates dropdown and grid in real time
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        renderSearchDropdown(searchQuery);
        renderTools(getFilteredTools());
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            searchDropdown.style.display = 'none';
        }
    });

    // Close dropdown on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchDropdown.style.display = 'none';
            searchInput.blur();
        }
    });

    // Reopen dropdown on focus if there is a query
    searchInput.addEventListener('focus', () => {
        if (searchQuery) {
            renderSearchDropdown(searchQuery);
        }
    });

    // Initial load
    loadTools();
});
