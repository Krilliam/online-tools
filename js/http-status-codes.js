document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('http-search');
    const resultsContainer = document.getElementById('http-results');
    const resultsCount = document.getElementById('http-results-count');
    const categoryRadios = document.querySelectorAll('input[name="category-filter"]');

    let allCodes = [];
    let activeCategory = 'all';
    let searchQuery = '';

    // ==========================================
    // LOAD STATUS CODES DATABASE
    // ==========================================
    async function loadCodes() {
        try {
            const response = await fetch('http-status-codes.json');
            const data = await response.json();
            allCodes = data.codes;
            renderResults(allCodes);
        } catch (error) {
            console.error('Error loading status codes:', error);
            resultsContainer.innerHTML = '<p class="http-error">Error loading status codes database.</p>';
        }
    }

    // ==========================================
    // SEARCH AND FILTER LOGIC
    // ==========================================
    function matchesSearch(code, query) {
        if (!query) return true;
        const q = query.toLowerCase();

        // Exact code match
        if (code.code.toString() === q) return true;

        // Partial code match
        if (code.code.toString().includes(q)) return true;

        // Name match
        if (code.name.toLowerCase().includes(q)) return true;

        // Description match
        if (code.description.toLowerCase().includes(q)) return true;

        // Usage match
        if (code.usage.toLowerCase().includes(q)) return true;

        return false;
    }

    function getFilteredCodes() {
        let filtered = allCodes;

        // Apply category filter
        if (activeCategory !== 'all') {
            filtered = filtered.filter(c => c.category === activeCategory);
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(c => matchesSearch(c, searchQuery));
        }

        return filtered;
    }

    // ==========================================
    // RENDER RESULTS
    // ==========================================
    function renderResults(codes) {
        if (codes.length === 0) {
            resultsContainer.innerHTML = '<p class="http-empty">No status codes match your search.</p>';
            resultsCount.textContent = '0 results';
            return;
        }

        resultsContainer.innerHTML = '';
        codes.forEach(code => {
            const card = document.createElement('div');
            card.className = `http-card http-category-${code.category}`;
            
            const highlightedName = highlightMatch(code.name, searchQuery);
            const highlightedDesc = highlightMatch(code.description, searchQuery);
            const highlightedUsage = highlightMatch(code.usage, searchQuery);

            card.innerHTML = `
                <div class="http-card-header">
                    <span class="http-code">${code.code}</span>
                    <span class="http-name">${highlightedName}</span>
                </div>
                <div class="http-card-body">
                    <p class="http-description">${highlightedDesc}</p>
                    <div class="http-usage">
                        <strong>Usage:</strong> ${highlightedUsage}
                    </div>
                </div>
            `;
            resultsContainer.appendChild(card);
        });

        resultsCount.textContent = `${codes.length} result${codes.length !== 1 ? 's' : ''}`;
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
    // EVENT LISTENERS
    // ==========================================
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        renderResults(getFilteredCodes());
    });

    categoryRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            activeCategory = radio.value;
            renderResults(getFilteredCodes());
        });
    });

    // Initial load
    loadCodes();
});
