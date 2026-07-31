function injectLayout() {
    // Aggiungi favicon dinamicamente
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (!existingFavicon) {
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/x-icon';
        favicon.href = '/favicon.ico';
        document.head.appendChild(favicon);
    }

    // Header
    const header = document.getElementById('header');
    if (header) {
        header.innerHTML = `
            <nav class="main-nav">
                <a href="index.html" class="nav-logo">Online Tools</a>
                <a href="https://github.com/Krilliam/online-tools" target="_blank" class="nav-link">GitHub</a>
            </nav>
        `;
    }

    // Footer
    const footer = document.getElementById('footer');
    if (footer) {
        footer.innerHTML = `
            <footer class="main-footer">
                <p>&copy; ${new Date().getFullYear()} Online Tools - All calculations happen in your browser.</p>
            </footer>
        `;
    }
}

document.addEventListener('DOMContentLoaded', injectLayout);
