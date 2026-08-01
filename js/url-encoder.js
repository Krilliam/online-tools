document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('input-data');
    const outputData = document.getElementById('output-data');
    const operationMode = document.getElementById('operation-mode');
    const encodingMode = document.getElementById('encoding-mode');
    const lineByLine = document.getElementById('line-by-line');
    const clearBtn = document.getElementById('clear-btn');
    const swapBtn = document.getElementById('swap-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const errorMsg = document.getElementById('error-message');

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        outputData.value = '';
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    // ==========================================
    // ENCODE FUNCTIONS
    // ==========================================
    function encodeComponent(text) {
        return encodeURIComponent(text);
    }

    function encodeFullUrl(text) {
        // Preserva :/?#[]@!$&'()*+,;=
        // Codifica tutto il resto
        return text.replace(/[^A-Za-z0-9\-_.~:/?#\[\]@!$&'()*+,;=]/g, (char) => {
            const encoded = encodeURIComponent(char);
            return encoded;
        });
    }

    function encodeFormUrlEncoded(text) {
        // encodeURIComponent + sostituisci %20 con +
        return encodeURIComponent(text).replace(/%20/g, '+');
    }

    // ==========================================
    // DECODE FUNCTIONS
    // ==========================================
    function decodeComponent(text) {
        return decodeURIComponent(text);
    }

    function decodeFullUrl(text) {
        // decodeURIComponent gestisce già tutto correttamente
        return decodeURIComponent(text);
    }

    function decodeFormUrlEncoded(text) {
        // Sostituisci + con %20 prima di decodificare
        return decodeURIComponent(text.replace(/\+/g, '%20'));
    }

    // ==========================================
    // MAIN PROCESS FUNCTION
    // ==========================================
    function process() {
        hideError();
        const input = inputData.value;
        
        if (!input) {
            outputData.value = '';
            return;
        }

        const operation = operationMode.value;
        const mode = encodingMode.value;
        const batch = lineByLine.checked;

        try {
            let result;

            if (batch) {
                // Processa riga per riga
                const lines = input.split(/\r?\n/);
                const processedLines = lines.map(line => {
                    if (!line.trim()) return line; // Mantieni righe vuote
                    
                    if (operation === 'encode') {
                        switch (mode) {
                            case 'component': return encodeComponent(line);
                            case 'full': return encodeFullUrl(line);
                            case 'form': return encodeFormUrlEncoded(line);
                        }
                    } else {
                        switch (mode) {
                            case 'component': return decodeComponent(line);
                            case 'full': return decodeFullUrl(line);
                            case 'form': return decodeFormUrlEncoded(line);
                        }
                    }
                });
                result = processedLines.join('\n');
            } else {
                // Processa tutto il testo
                if (operation === 'encode') {
                    switch (mode) {
                        case 'component': result = encodeComponent(input); break;
                        case 'full': result = encodeFullUrl(input); break;
                        case 'form': result = encodeFormUrlEncoded(input); break;
                    }
                } else {
                    switch (mode) {
                        case 'component': result = decodeComponent(input); break;
                        case 'full': result = decodeFullUrl(input); break;
                        case 'form': result = decodeFormUrlEncoded(input); break;
                    }
                }
            }

            outputData.value = result;
        } catch (error) {
            if (error.message.includes('URI malformed')) {
                showError("Invalid encoded string. The input contains invalid percent-encoding sequences.");
            } else {
                showError(`Error: ${error.message}`);
            }
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    
    // Processa automaticamente al cambio di qualsiasi opzione o input
    [inputData, operationMode, encodingMode, lineByLine].forEach(el => {
        el.addEventListener('input', process);
        el.addEventListener('change', process);
    });

    clearBtn.addEventListener('click', () => {
        inputData.value = '';
        outputData.value = '';
        hideError();
        inputData.focus();
    });

    swapBtn.addEventListener('click', () => {
        const temp = inputData.value;
        inputData.value = outputData.value;
        outputData.value = temp;
        
        // Inverti anche l'operazione
        operationMode.value = operationMode.value === 'encode' ? 'decode' : 'encode';
        process();
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

    downloadBtn.addEventListener('click', () => {
        const text = outputData.value;
        if (!text) return;
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'url-converted.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial process
    process();
});
