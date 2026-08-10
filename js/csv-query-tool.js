document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // DOM ELEMENTS
    // ==========================================
    const delimiterSelect = document.getElementById('csv-delimiter');
    const delimiterCustom = document.getElementById('csv-delimiter-custom');
    const hasHeaderCheckbox = document.getElementById('csv-has-header');
    const dropZone = document.getElementById('csv-drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const fileList = document.getElementById('csv-file-list');
    const previewSection = document.getElementById('csv-preview-section');
    const previewSelect = document.getElementById('csv-preview-select');
    const previewTable = document.getElementById('csv-preview-table');
    const sqlInput = document.getElementById('csv-sql-input');
    const runBtn = document.getElementById('csv-run-btn');
    const clearBtn = document.getElementById('csv-clear-btn');
    const examplesBtn = document.getElementById('csv-examples-btn');
    const examplesDropdown = document.getElementById('csv-examples-dropdown');
    const resultsSection = document.getElementById('csv-results-section');
    const resultsInfo = document.getElementById('csv-results-info');
    const resultsTable = document.getElementById('csv-results-table');
    const exportCsvBtn = document.getElementById('csv-export-csv-btn');
    const exportJsonBtn = document.getElementById('csv-export-json-btn');
    const copyBtn = document.getElementById('csv-copy-btn');
    const columnToolsSection = document.getElementById('csv-column-tools-section');
    const extractColumnSelect = document.getElementById('csv-extract-column-select');
    const extractModeRadios = document.querySelectorAll('input[name="csv-extract-mode"]');
    const extractSeparatorSection = document.getElementById('csv-extract-separator-section');
    const extractSeparator = document.getElementById('csv-extract-separator');
    const extractSeparatorCustom = document.getElementById('csv-extract-separator-custom');
    const extractBtn = document.getElementById('csv-extract-btn');
    const extractOutput = document.getElementById('csv-extract-output');
    const reorderList = document.getElementById('csv-reorder-list');
    const reorderApplyBtn = document.getElementById('csv-reorder-apply-btn');
    const errorEl = document.getElementById('csv-error');

    // ==========================================
    // STATE
    // ==========================================
    const csvFiles = new Map(); // Map<filename, {headers: string[], rows: any[][], delimiter: string, hasHeader: boolean}>
    let lastQueryResult = null;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    // ==========================================
    // CSV PARSER
    // ==========================================
    function parseCSV(text, delimiter, hasHeader) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) throw new Error('CSV file is empty');

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
                        i++;
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
                throw new Error('CSV must have at least a header row and one data row when "First row contains headers" is checked.');
            }
            headers = parseLine(lines[0]);
            dataStartIndex = 1;
        } else {
            // Generate generic headers based on first row column count
            const firstRow = parseLine(lines[0]);
            headers = firstRow.map((_, index) => `col${index + 1}`);
            dataStartIndex = 0;
        }

        const rows = [];
        for (let i = dataStartIndex; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseLine(lines[i]);
            
            // Type inference
            const typedValues = values.map(val => {
                if (val === '') return null;
                if (val === 'true') return true;
                if (val === 'false') return false;
                if (!isNaN(val) && val.trim() !== '') return Number(val);
                return val;
            });
            
            rows.push(typedValues);
        }

        return { headers, rows };
    }

    // ==========================================
    // DELIMITER SETTINGS
    // ==========================================
    delimiterSelect.addEventListener('change', () => {
        delimiterCustom.style.display = delimiterSelect.value === 'custom' ? '' : 'none';
    });

    function getDelimiter() {
        if (delimiterSelect.value === 'custom') {
            return delimiterCustom.value || ',';
        }
        return delimiterSelect.value;
    }

    // ==========================================
    // FILE UPLOAD HANDLING
    // ==========================================
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('csv-drop-zone-active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('csv-drop-zone-active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('csv-drop-zone-active');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        const delimiter = getDelimiter();
        const hasHeader = hasHeaderCheckbox.checked;

        Array.from(files).forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                showError(`File "${file.name}" exceeds 50MB limit`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = parseCSV(e.target.result, delimiter, hasHeader);
                    csvFiles.set(file.name, {
                        ...data,
                        delimiter: delimiter,
                        hasHeader: hasHeader
                    });
                    updateFileList();
                    updatePreviewSelect();
                    updateColumnTools();
                    hideError();
                } catch (error) {
                    showError(`Error parsing "${file.name}": ${error.message}`);
                }
            };
            reader.readAsText(file);
        });
    }

    function updateFileList() {
        fileList.innerHTML = '';
        csvFiles.forEach((data, filename) => {
            const item = document.createElement('div');
            item.className = 'csv-file-item';
            
            const delimiterDisplay = data.delimiter === '\t' ? 'Tab' : 
                                    data.delimiter === ',' ? 'Comma' : 
                                    data.delimiter === ';' ? 'Semicolon' : 
                                    data.delimiter === '|' ? 'Pipe' : 
                                    `"${data.delimiter}"`;
            
            const headerDisplay = data.hasHeader ? 'With header' : 'No header';
            
            item.innerHTML = `
                <div class="csv-file-info">
                    <span class="csv-file-name">✓ ${filename}</span>
                    <span class="csv-file-stats">(${data.rows.length} rows, ${data.headers.length} columns)</span>
                    <span class="csv-file-settings">${delimiterDisplay} | ${headerDisplay}</span>
                </div>
                <button class="csv-file-remove" data-filename="${filename}">Remove</button>
            `;
            fileList.appendChild(item);
        });

        fileList.querySelectorAll('.csv-file-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                csvFiles.delete(btn.dataset.filename);
                updateFileList();
                updatePreviewSelect();
                updateColumnTools();
            });
        });

        if (csvFiles.size > 0) {
            previewSection.style.display = '';
            columnToolsSection.style.display = '';
        } else {
            previewSection.style.display = 'none';
            columnToolsSection.style.display = 'none';
        }
    }

    function updatePreviewSelect() {
        previewSelect.innerHTML = '<option value="">Select a file to preview</option>';
        csvFiles.forEach((data, filename) => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            previewSelect.appendChild(option);
        });
    }

    previewSelect.addEventListener('change', () => {
        const filename = previewSelect.value;
        if (!filename) {
            previewTable.innerHTML = '';
            return;
        }
        const data = csvFiles.get(filename);
        renderTable(data.headers, data.rows.slice(0, 100), previewTable, true);
    });

    // ==========================================
    // TABLE RENDERING
    // ==========================================
    function renderTable(headers, rows, container, isPreview = false) {
        if (rows.length === 0) {
            container.innerHTML = '<p class="csv-empty">No data</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'csv-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const maxRows = isPreview ? 100 : rows.length;
        for (let i = 0; i < Math.min(maxRows, rows.length); i++) {
            const tr = document.createElement('tr');
            rows[i].forEach(val => {
                const td = document.createElement('td');
                td.textContent = val === null ? 'NULL' : val;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        container.innerHTML = '';
        container.appendChild(table);

        if (isPreview && rows.length > 100) {
            const note = document.createElement('p');
            note.className = 'csv-preview-note';
            note.textContent = `Showing first 100 of ${rows.length} rows`;
            container.appendChild(note);
        }
    }

    // ==========================================
    // SQL PARSER (Simplified)
    // ==========================================
    function tokenize(sql) {
        const tokens = [];
        let current = '';
        let inString = false;
        let stringChar = '';

        for (let i = 0; i < sql.length; i++) {
            const char = sql[i];
            const nextChar = sql[i + 1];

            if (inString) {
                if (char === stringChar && nextChar === stringChar) {
                    current += char;
                    i++;
                } else if (char === stringChar) {
                    tokens.push({ type: 'string', value: current });
                    current = '';
                    inString = false;
                } else {
                    current += char;
                }
            } else if (char === "'" || char === '"') {
                if (current.trim()) tokens.push({ type: 'word', value: current.trim() });
                current = '';
                inString = true;
                stringChar = char;
            } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                if (current.trim()) tokens.push({ type: 'word', value: current.trim() });
                current = '';
            } else if (',()=<>!'.includes(char)) {
                if (current.trim()) tokens.push({ type: 'word', value: current.trim() });
                current = '';
                if (char === '<' && nextChar === '=') {
                    tokens.push({ type: 'operator', value: '<=' });
                    i++;
                } else if (char === '>' && nextChar === '=') {
                    tokens.push({ type: 'operator', value: '>=' });
                    i++;
                } else if (char === '!' && nextChar === '=') {
                    tokens.push({ type: 'operator', value: '!=' });
                    i++;
                } else {
                    tokens.push({ type: 'operator', value: char });
                }
            } else {
                current += char;
            }
        }
        if (current.trim()) tokens.push({ type: 'word', value: current.trim() });

        return tokens;
    }

    function parseSQL(sql) {
        const tokens = tokenize(sql.toUpperCase());
        const ast = {
            select: [],
            from: [],
            where: null,
            groupBy: [],
            having: null,
            orderBy: [],
            limit: null,
            offset: null,
            distinct: false
        };

        let i = 0;
        let currentClause = null;

        while (i < tokens.length) {
            const token = tokens[i];

            if (token.value === 'SELECT') {
                currentClause = 'select';
                i++;
                if (tokens[i]?.value === 'DISTINCT') {
                    ast.distinct = true;
                    i++;
                }
            } else if (token.value === 'FROM') {
                currentClause = 'from';
                i++;
            } else if (token.value === 'WHERE') {
                currentClause = 'where';
                i++;
            } else if (token.value === 'GROUP') {
                if (tokens[i + 1]?.value === 'BY') {
                    currentClause = 'groupBy';
                    i += 2;
                }
            } else if (token.value === 'HAVING') {
                currentClause = 'having';
                i++;
            } else if (token.value === 'ORDER') {
                if (tokens[i + 1]?.value === 'BY') {
                    currentClause = 'orderBy';
                    i += 2;
                }
            } else if (token.value === 'LIMIT') {
                currentClause = 'limit';
                i++;
            } else if (token.value === 'OFFSET') {
                currentClause = 'offset';
                i++;
            } else if (token.value === 'JOIN' || token.value === 'LEFT' || token.value === 'RIGHT' || token.value === 'INNER') {
                currentClause = 'from';
                i++;
            } else {
                if (currentClause === 'select') {
                    ast.select.push(token.value);
                } else if (currentClause === 'from') {
                    ast.from.push(token.value);
                } else if (currentClause === 'where') {
                    ast.where = (ast.where || '') + ' ' + token.value;
                } else if (currentClause === 'groupBy') {
                    ast.groupBy.push(token.value);
                } else if (currentClause === 'having') {
                    ast.having = (ast.having || '') + ' ' + token.value;
                } else if (currentClause === 'orderBy') {
                    ast.orderBy.push(token.value);
                } else if (currentClause === 'limit') {
                    ast.limit = parseInt(token.value);
                } else if (currentClause === 'offset') {
                    ast.offset = parseInt(token.value);
                }
                i++;
            }
        }

        return ast;
    }

    // ==========================================
    // QUERY EXECUTOR (Simplified)
    // ==========================================
    function executeQuery(ast) {
        if (ast.from.length === 0) throw new Error('FROM clause is required');

        const tableName = ast.from[0];
        if (!csvFiles.has(tableName)) {
            throw new Error(`Table "${tableName}" not found. Available tables: ${Array.from(csvFiles.keys()).join(', ')}`);
        }

        const data = csvFiles.get(tableName);
        let rows = data.rows.map(row => {
            const obj = {};
            data.headers.forEach((h, i) => {
                obj[h] = row[i];
            });
            return obj;
        });

        // WHERE
        if (ast.where) {
            rows = rows.filter(row => evaluateWhere(row, ast.where.trim()));
        }

        // GROUP BY
        if (ast.groupBy.length > 0) {
            const groups = new Map();
            rows.forEach(row => {
                const key = ast.groupBy.map(col => row[col]).join('|');
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(row);
            });

            rows = Array.from(groups.values()).map(group => {
                const result = {};
                ast.groupBy.forEach(col => result[col] = group[0][col]);
                
                ast.select.forEach(sel => {
                    const match = sel.match(/(COUNT|SUM|AVG|MIN|MAX)\((\*|\w+)\)/i);
                    if (match) {
                        const func = match[1].toUpperCase();
                        const col = match[2];
                        const values = group.map(r => col === '*' ? 1 : r[col]).filter(v => v !== null);
                        
                        if (func === 'COUNT') result[sel] = group.length;
                        else if (func === 'SUM') result[sel] = values.reduce((a, b) => a + (Number(b) || 0), 0);
                        else if (func === 'AVG') result[sel] = values.length > 0 ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length : 0;
                        else if (func === 'MIN') result[sel] = Math.min(...values.map(Number));
                        else if (func === 'MAX') result[sel] = Math.max(...values.map(Number));
                    }
                });

                return result;
            });
        }

        // HAVING
        if (ast.having) {
            rows = rows.filter(row => evaluateWhere(row, ast.having.trim()));
        }

        // ORDER BY
        if (ast.orderBy.length > 0) {
            const col = ast.orderBy[0];
            const desc = ast.orderBy[1]?.toUpperCase() === 'DESC';
            rows.sort((a, b) => {
                const va = a[col], vb = b[col];
                if (va < vb) return desc ? 1 : -1;
                if (va > vb) return desc ? -1 : 1;
                return 0;
            });
        }

        // LIMIT/OFFSET
        if (ast.offset) rows = rows.slice(ast.offset);
        if (ast.limit) rows = rows.slice(0, ast.limit);

        // SELECT columns
        if (ast.select[0] !== '*') {
            rows = rows.map(row => {
                const result = {};
                ast.select.forEach(sel => {
                    if (sel.includes('(')) {
                        result[sel] = row[sel];
                    } else {
                        result[sel] = row[sel];
                    }
                });
                return result;
            });
        }

        // DISTINCT
        if (ast.distinct) {
            const seen = new Set();
            rows = rows.filter(row => {
                const key = JSON.stringify(row);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        return rows;
    }

    function evaluateWhere(row, condition) {
        const match = condition.match(/^(\w+)\s*(=|!=|<|>|<=|>=|LIKE)\s*'?([^']*)'?$/i);
        if (match) {
            const [, col, op, val] = match;
            const rowVal = row[col];
            const compareVal = isNaN(val) ? val : Number(val);

            switch (op.toUpperCase()) {
                case '=': return rowVal == compareVal;
                case '!=': return rowVal != compareVal;
                case '<': return rowVal < compareVal;
                case '>': return rowVal > compareVal;
                case '<=': return rowVal <= compareVal;
                case '>=': return rowVal >= compareVal;
                case 'LIKE': return String(rowVal).includes(String(compareVal).replace(/%/g, ''));
            }
        }

        if (/IS NULL$/i.test(condition)) {
            const col = condition.split(/\s+/)[0];
            return row[col] === null || row[col] === undefined;
        }

        if (/IS NOT NULL$/i.test(condition)) {
            const col = condition.split(/\s+/)[0];
            return row[col] !== null && row[col] !== undefined;
        }

        return true;
    }

    // ==========================================
    // QUERY EXECUTION
    // ==========================================
    runBtn.addEventListener('click', () => {
        const sql = sqlInput.value.trim();
        if (!sql) {
            showError('Please enter a SQL query');
            return;
        }

        if (csvFiles.size === 0) {
            showError('Please upload at least one CSV file');
            return;
        }

        try {
            const ast = parseSQL(sql);
            const results = executeQuery(ast);
            lastQueryResult = results;

            if (results.length === 0) {
                resultsInfo.textContent = 'Query returned 0 rows';
                resultsTable.innerHTML = '<p class="csv-empty">No results</p>';
            } else {
                const headers = Object.keys(results[0]);
                resultsInfo.textContent = `Query returned ${results.length} row${results.length !== 1 ? 's' : ''}`;
                renderTable(headers, results, resultsTable);
            }

            resultsSection.style.display = '';
            hideError();
        } catch (error) {
            showError(`Query error: ${error.message}`);
            resultsSection.style.display = 'none';
        }
    });

    clearBtn.addEventListener('click', () => {
        sqlInput.value = '';
        resultsSection.style.display = 'none';
        hideError();
    });

    examplesBtn.addEventListener('click', () => {
        examplesDropdown.style.display = examplesDropdown.style.display === 'none' ? '' : 'none';
    });

    examplesDropdown.querySelectorAll('.csv-example-item').forEach(item => {
        item.addEventListener('click', () => {
            sqlInput.value = item.dataset.query;
            examplesDropdown.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.csv-query-controls')) {
            examplesDropdown.style.display = 'none';
        }
    });

    // ==========================================
    // EXPORT FUNCTIONS
    // ==========================================
    exportCsvBtn.addEventListener('click', () => {
        if (!lastQueryResult || lastQueryResult.length === 0) return;
        const headers = Object.keys(lastQueryResult[0]);
        const csv = [
            headers.join(','),
            ...lastQueryResult.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
        ].join('\n');
        downloadFile(csv, 'query-results.csv', 'text/csv');
    });

    exportJsonBtn.addEventListener('click', () => {
        if (!lastQueryResult) return;
        const json = JSON.stringify(lastQueryResult, null, 2);
        downloadFile(json, 'query-results.json', 'application/json');
    });

    copyBtn.addEventListener('click', async () => {
        if (!lastQueryResult) return;
        const text = JSON.stringify(lastQueryResult, null, 2);
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

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // COLUMN TOOLS
    // ==========================================
    function updateColumnTools() {
        if (csvFiles.size === 0) return;

        const firstFile = csvFiles.values().next().value;
        const headers = firstFile.headers;

        extractColumnSelect.innerHTML = '<option value="">Select column</option>';
        headers.forEach(h => {
            const option = document.createElement('option');
            option.value = h;
            option.textContent = h;
            extractColumnSelect.appendChild(option);
        });

        reorderList.innerHTML = '';
        headers.forEach(h => {
            const item = document.createElement('div');
            item.className = 'csv-reorder-item';
            item.draggable = true;
            item.dataset.column = h;
            item.textContent = h;
            reorderList.appendChild(item);
        });

        let draggedItem = null;
        reorderList.querySelectorAll('.csv-reorder-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                setTimeout(() => item.style.display = 'none', 0);
            });

            item.addEventListener('dragend', () => {
                item.style.display = '';
                draggedItem = null;
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    if (e.clientY < midpoint) {
                        reorderList.insertBefore(draggedItem, item);
                    } else {
                        reorderList.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
        });
    }

    extractModeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            extractSeparatorSection.style.display = radio.value === 'string' && radio.checked ? '' : 'none';
        });
    });

    extractSeparator.addEventListener('change', () => {
        extractSeparatorCustom.style.display = extractSeparator.value === 'custom' ? '' : 'none';
    });

    extractBtn.addEventListener('click', () => {
        const column = extractColumnSelect.value;
        if (!column) {
            showError('Please select a column');
            return;
        }

        const firstFile = csvFiles.values().next().value;
        const colIndex = firstFile.headers.indexOf(column);
        const values = firstFile.rows.map(row => row[colIndex]);

        const mode = document.querySelector('input[name="csv-extract-mode"]:checked').value;

        if (mode === 'column') {
            const result = values.map(v => [v]);
            renderTable([column], result, extractOutput);
            extractOutput.style.display = '';
        } else {
            let separator = extractSeparator.value;
            if (separator === 'custom') {
                separator = extractSeparatorCustom.value;
            } else if (separator === '\\n') {
                separator = '\n';
            }

            const result = values.join(separator);
            extractOutput.innerHTML = `<textarea class="csv-extract-textarea" readonly>${result}</textarea>`;
            extractOutput.style.display = '';
        }
    });

    reorderApplyBtn.addEventListener('click', () => {
        const newOrder = Array.from(reorderList.querySelectorAll('.csv-reorder-item')).map(item => item.dataset.column);
        const sql = `SELECT ${newOrder.join(', ')} FROM ${csvFiles.keys().next().value}`;
        sqlInput.value = sql;
        runBtn.click();
    });

    // ==========================================
    // ERROR HANDLING
    // ==========================================
    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }

    function hideError() {
        errorEl.style.display = 'none';
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    sqlInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            runBtn.click();
        }
    });
});
