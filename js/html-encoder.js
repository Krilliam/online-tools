document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('input-data');
    const outputData = document.getElementById('output-data');
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');

    // Funzione magica del browser per decodificare qualsiasi entità HTML
    function decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
        // Questo trasforma automaticamente:
        // &quot; -> "
        // &amp; -> &
        // &lt; -> <
        // &gt; -> >
        // &#39; -> '
        // ecc.
    }

    function process() {
        const input = inputData.value;
        if (!input) {
            outputData.value = '';
            return;
        }
        outputData.value = decodeHtmlEntities(input);
    }

    // Aggiorna in tempo reale
    inputData.addEventListener('input', process);

    clearBtn.addEventListener('click', () => {
        inputData.value = '';
        outputData.value = '';
        inputData.focus();
    });

    copyBtn.addEventListener('click', async () => {
        const text = outputData.value;
        if (!text) return;
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

    // Initial process
    process();
});