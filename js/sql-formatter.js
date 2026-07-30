document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('sql-input');
    const outputEl = document.getElementById('sql-output').querySelector('code');
    const dialectEl = document.getElementById('sql-dialect');
    const formatBtn = document.getElementById('format-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    // Format button
    formatBtn.addEventListener('click', () => {
        const query = inputEl.value.trim();
        
        if (!query) {
            outputEl.textContent = '';
            return;
        }

        try {
            const dialect = dialectEl.value;
            const formatted = window.sqlFormatter.format(query, {
                language: dialect,
                tabWidth: 2,
                keywordCase: 'upper',
                linesBetweenQueries: 2
            });
            outputEl.textContent = formatted;
        } catch (error) {
            outputEl.textContent = `Error: ${error.message}`;
        }
    });

    // Copy button
    copyBtn.addEventListener('click', async () => {
        const text = outputEl.textContent;
        
        if (!text) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.disabled = true;
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    });

    // Clear button
    clearBtn.addEventListener('click', () => {
        inputEl.value = '';
        outputEl.textContent = '';
        inputEl.focus();
    });

    // Format on Ctrl+Enter
    inputEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            formatBtn.click();
        }
    });
});
