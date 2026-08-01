document.addEventListener('DOMContentLoaded', () => {
    const inputData = document.getElementById('input-data');
    const outputData = document.getElementById('output-data');
    const modeSelect = document.getElementById('conversion-mode');
    const delimiterSelect = document.getElementById('csv-delimiter');
    const hasHeaderCheckbox = document.getElementById('csv-has-header');
    const csvOptionsField = document.getElementById('csv-options-field');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
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

    // Mostra/nascondi opzioni CSV in base alla modalità
    function updateUI() {
        if (modeSelect.value === 'csv-to-json') {
            csvOptionsField.style.display = '';
        } else {
            csvOptionsField.style.display = 'none';
        }
    }

    // ==========================================
    // HTML ENTITIES DECODER
    // Converte &quot; &amp; &lt; &gt; ecc. nei caratteri corretti
    // ==========================================
    function decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // ==========================================
    // JSON TO CSV LOGIC
    // ==========================================
    function jsonToCsv(jsonString, delimiter) {
        // Pulisci le entità HTML prima di parsare
        const cleanedJson = decodeHtmlEntities(jsonString);
        
        let data;
        try {
            data = JSON.parse(cleanedJson);
        } catch (e) {
            throw new Error("Invalid JSON format. Please check your input. Make sure to remove any HTML entities like &quot; or &amp;");
        }

        // Se è un singolo oggetto, avvolgilo in un array
        if (!Array.isArray(data)) {
            if (typeof data === 'object' && data !== null) {
                data = [data];
            } else {
                throw new Error("JSON must be an array of objects or a single object.");
            }
        }

        if (data.length === 0) return '';

        // Raccoglie tutte le chiavi uniche da tutti gli oggetti (gestisce strutture non uniformi)
        const allKeys = [...new Set(data.flatMap(Object.keys))];

        // Funzione per escapare le virgolette in CSV
        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const header = allKeys.map(escapeCsv).join(delimiter);
        const rows = data.map(obj => 
            allKeys.map(key => escapeCsv(obj[key])).join(delimiter)
        );

        return [header, ...rows].join('\n');
    }

    // ==========================================
    // CSV TO JSON LOGIC (Robust Parser)
    // ==========================================
    function csvToJson(csvString, delimiter, hasHeader) {
        const lines = csvString.trim().split(/\r?\n/);
        if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
            throw new Error("CSV input is empty.");
        }

        // Parser CSV robusto che gestisce virgolette e delimiter all'interno dei campi
        function parseLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        current += '"';
                        i++; // Salta la virgoletta successiva
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }

        let headers = [];
        let dataStartIndex = 0;

        if (hasHeader) {
            if (lines.length < 2) {
                throw new Error("CSV must have at least a header row and one data row when 'First row contains headers' is checked.");
            }
            headers = parseLine(lines[0]);
            dataStartIndex = 1;
        } else {
            // Genera header generici basati sul numero di colonne della prima riga
            const firstRow = parseLine(lines[0]);
            headers = firstRow.map((_, index) => `col${index + 1}`);
            dataStartIndex = 0;
        }

        const jsonData = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // Salta righe vuote
            
            const values = parseLine(lines[i]);
            const obj = {};
            
            headers.forEach((header, index) => {
                let val = values[index] !== undefined ? values[index] : '';
                
                // Prova a convertire in numero o booleano se sembra tale
                if (val === 'true') val = true;
                else if (val === 'false') val = false;
                else if (val !== '' && !isNaN(val) && val.trim() !== '') {
                    val = Number(val);
                }
                
                obj[header] = val;
            });
            jsonData.push(obj);
        }

        return JSON.stringify(jsonData, null, 2);
    }

    // ==========================================
    // MAIN CONVERT FUNCTION
    // ==========================================
    function convert() {
        hideError();
        const input = inputData.value.trim();
        if (!input) {
            outputData.value = '';
            return;
        }

        const mode = modeSelect.value;
        const delimiter = delimiterSelect.value;
        const hasHeader = hasHeaderCheckbox.checked;

        try {
            if (mode === 'json-to-csv') {
                outputData.value = jsonToCsv(input, delimiter);
            } else {
                outputData.value = csvToJson(input, delimiter, hasHeader);
            }
        } catch (error) {
            showError(error.message);
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    convertBtn.addEventListener('click', convert);
    
    modeSelect.addEventListener('change', () => {
        updateUI();
        inputData.value = '';
        outputData.value = '';
        hideError();
    });
    
    delimiterSelect.addEventListener('change', () => {
        if (inputData.value.trim()) convert();
    });

    hasHeaderCheckbox.addEventListener('change', () => {
        if (inputData.value.trim() && modeSelect.value === 'csv-to-json') {
            convert();
        }
    });

    clearBtn.addEventListener('click', () => {
        inputData.value = '';
        outputData.value = '';
        hideError();
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

    downloadBtn.addEventListener('click', () => {
        const text = outputData.value;
        if (!text) return;
        
        const mode = modeSelect.value;
        const extension = mode === 'json-to-csv' ? 'csv' : 'json';
        const mimeType = mode === 'json-to-csv' ? 'text/csv' : 'application/json';
        
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted-data.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Shortcut: Ctrl+Enter per convertire
    inputData.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            convert();
        }
    });

    // Initial setup
    updateUI();
});
