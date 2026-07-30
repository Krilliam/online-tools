async function loadTools() {
    try {
        const response = await fetch('tools.json');
        const data = await response.json();
        const tools = data.tools;

        const categories = [...new Set(tools.map(t => t.category))];
        const filtersContainer = document.getElementById('category-filters');
        
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.category = cat;
            btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            btn.addEventListener('click', () => filterTools(cat, tools));
            filtersContainer.appendChild(btn);
        });

        renderTools(tools);

        document.querySelector('[data-category="all"]')
            .addEventListener('click', () => filterTools('all', tools));

    } catch (error) {
        console.error('Error loading tools:', error);
    }
}

function renderTools(tools) {
    const grid = document.getElementById('tools-grid');
    const noscript = grid.querySelector('noscript');
    grid.innerHTML = '';
    if (noscript) grid.appendChild(noscript);

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
        grid.appendChild(card);
    });
}

function filterTools(category, tools) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    const filtered = category === 'all'
        ? tools
        : tools.filter(t => t.category === category);

    renderTools(filtered);
}

document.addEventListener('DOMContentLoaded', loadTools);
