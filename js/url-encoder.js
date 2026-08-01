document.addEventListener('DOMContentLoaded', () => {
    console.log("URL Encoder script loaded");

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

    // Controllo di sicurezza: se manca qualcosa, avvisa nella console
    const elements = { inputData, outputData, operationMode, encodingMode, lineByLine, clearBtn, swapBtn, copyBtn, downloadBtn, errorMsg };
    let missingElements = [];
    
    for (const [name, el] of Object.entries(elements)) {
        if (!el) {
            missingElements.push(name);
            console.error(`CRITICAL: Element with id '${name}' is missing from the HTML!`);
        }
    }

    if (missingElements.length > 0) {
        console.error(`Aborting script execution. Missing: ${missingElements.join(', ')}. HARD REFRESH (Ctrl+F5) required!`);
        return; // Ferma l'esecuzione per evitare l'errore "Cannot read properties of null"
    }

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
        return text.replace(/[^A-Za-z0-9\-_.~:/?#\[\]@!$&'()*+,;=]/g, (char) => encodeURIComponent(char));
    }

    function encodeFormUrlEncoded(text) {
        return encodeURIComponent(text).replace(/%20/g, '+');
    }

    // ==========================================
    // DECODE FUNCTIONS
    // ==========================================
    function decodeComponent(text) {
        return decodeURIComponent(text);
    }

    function decodeFullUrl(text) {
        return decodeURIComponent(text);
    }

    function decodeFormUrlEncoded(text) {
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
                const lines = input.split(/\r?\n/);
                const processedLines = lines.map(line => {
                    if (!line.trim()) return line;
                    if (operation === 'encode') {
                        if (mode === 'component') return encodeComponent(line);
                        if (mode === 'full') return encodeFullUrl(line);
                        if (mode === 'form') return encodeFormUrlEncoded(line);
                    } else {
                        if (mode === 'component') return decodeComponent(line);
                        if (mode === 'full') return decodeFullUrl(line);
                        if (mode === 'form') return decodeFormUrlEncoded(line);
                    }
                });
                result = processedLines.join('\n');
            } else {
                if (operation === 'encode') {
                    if (mode === 'component') result = encodeComponent(input);
                    else if (mode === 'full') result = encodeFullUrl(input);
                    else if (mode === 'form') result = encodeFormUrlEncoded(input);
                } else {
                    if (mode === 'component') result = decodeComponent(input);
                    else if (mode === 'full') result = decodeFullUrl(input);
                    else if (mode === 'form') result = decodeFormUrlEncoded(input);
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
