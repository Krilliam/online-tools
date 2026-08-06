document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('port-search');
    const tableBody = document.getElementById('port-table-body');
    const resultsCount = document.getElementById('port-results-count');
    const protocolRadios = document.querySelectorAll('input[name="protocol-filter"]');
    const statusRadios = document.querySelectorAll('input[name="status-filter"]');

    let allPorts = [];
    let activeProtocol = 'all';
    let activeStatus = 'all';
    let searchQuery = '';

    // ==========================================
    // LOAD PORTS DATABASE
    // ==========================================
    async function loadPorts() {
        try {
            const response = await fetch('ports.json');
            const data = await response.json();
            allPorts = data.ports;
            renderTable(allPorts);
        } catch (error) {
            console.error('Error loading ports:', error);
            tableBody.innerHTML = '<tr><td colspan="5" class="port-error">Error loading port database.</td></tr>';
        }
    }

    // ==========================================
    // SEARCH AND FILTER LOGIC
    // ==========================================
    function matchesSearch(port, query) {
        if (!query) return true;
        const q = query.toLowerCase();

        // Exact port number match
        if (port.port.toString() === q) return true;

        // Partial port number match
        if (port.port.toString().includes(q)) return true;

        // Service name match
        if (port.service.toLowerCase().includes(q)) return true;

        // Description match
        if (port.description.toLowerCase().includes(q)) return true;

        // Protocol match
        if (port.protocol.toLowerCase().includes(q)) return true;

        return false;
    }

    function getFilteredPorts() {
        let filtered = allPorts;

        // Apply protocol filter
        if (activeProtocol !== 'all') {
            filtered = filtered.filter(p => p.protocol === activeProtocol);
        }

        // Apply status filter
        if (activeStatus !== 'all') {
            filtered = filtered.filter(p => p.status === activeStatus);
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(p => matchesSearch(p, searchQuery));
        }

        return filtered;
    }

    // ==========================================
    // RENDER TABLE
    // ==========================================
    function renderTable(ports) {
        if (ports.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="port-empty">No ports match your search.</td></tr>';
            resultsCount.textContent = '0 results';
            return;
        }

        tableBody.innerHTML = '';
        ports.forEach(port => {
            const row = document.createElement('tr');
            row.className = 'port-row';
            row.innerHTML = `
                <td class="port-number">${port.port}</td>
                <td><span class="port-protocol port-protocol-${port.protocol}">${port.protocol.toUpperCase()}</span></td>
                <td class="port-service">${highlightMatch(port.service, searchQuery)}</td>
                <td class="port-description">${highlightMatch(port.description, searchQuery)}</td>
                <td><span class="port-status port-status-${port.status}">${port.status}</span></td>
            `;
            tableBody.appendChild(row);
        });

        resultsCount.textContent = `${ports.length} result${ports.length !== 1 ? 's' : ''}`;
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
        renderTable(getFilteredPorts());
    });

    protocolRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            activeProtocol = radio.value;
            renderTable(getFilteredPorts());
        });
    });

    statusRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            activeStatus = radio.value;
            renderTable(getFilteredPorts());
        });
    });

    // Initial load
    loadPorts();
});
