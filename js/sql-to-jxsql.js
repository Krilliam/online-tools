document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('sql-input');
    const outputEl = document.getElementById('sql-output').querySelector('code');
    const dialectEl = document.getElementById('sql-dialect');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    const SQL_KEYWORDS = new Set([
        'SELECT','FROM','WHERE','AND','OR','NOT','IN','LIKE','BETWEEN','IS','NULL',
        'AS','DISTINCT','CASE','WHEN','THEN','ELSE','END','ASC','DESC','ORDER','BY',
        'GROUP','HAVING','LIMIT','OFFSET','UNION','ALL','EXISTS','INSERT','INTO','VALUES',
        'UPDATE','SET','DELETE','CREATE','DROP','ALTER','TABLE','INDEX','ON','JOIN',
        'LEFT','RIGHT','INNER','OUTER','CROSS','FULL','TRUE','FALSE','TOP','WITH','NOLOCK'
    ]);

    // =============================================
    // 1. ESTRAE MAPPA ALIAS -> NOME TABELLA
    // =============================================
    function extractTableMap(sql) {
        const map = {};          // alias -> tableName
        const noAliasTables = []; // tabelle senza alias
        
        // Pattern: FROM/JOIN tablename [AS] [alias]
        // L'alias NON deve essere una keyword SQL successiva (WHERE, ON, JOIN, ecc.)
        const pattern = /\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
        let match;
        while ((match = pattern.exec(sql)) !== null) {
            const tableName = match[2];
            let alias = match[3];
            
            if (alias && SQL_KEYWORDS.has(alias.toUpperCase())) {
                alias = null;
            }
            
            if (alias) {
                map[alias] = tableName;
            } else {
                // Tabella senza alias: useremo il nome della tabella come "alias" nelle JXCOL
                map[tableName] = tableName;
                noAliasTables.push(tableName);
            }
        }
        
        return { map, noAliasTables };
    }

    // =============================================
    // 2. PROTEGGE LE STRINGHE LETTERALI
    // =============================================
    function protectStrings(sql) {
        const strings = [];
        const protected_sql = sql.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
            strings.push(match);
            return `__STR${strings.length - 1}__`;
        });
        return { protected_sql, strings };
    }

    function restoreStrings(sql, strings) {
        return sql.replace(/__STR(\d+)__/g, (match, idx) => strings[parseInt(idx)]);
    }

    // =============================================
    // 3. CONVERTI RIFERIMENTI A COLONNE
    // =============================================
    function convertColumns(sql, tableMap) {
        // Pattern: alias.colonna -> JXCOL(alias:colonna)
        // Gestisce anche alias.* -> JXCOL(alias:*)
        return sql.replace(/\b([a-zA-Z_]\w*)\.(\w+|\*)\b/g, (match, prefix, column) => {
            // Se il prefisso è un alias noto o un nome di tabella noto
            if (tableMap.map[prefix] !== undefined) {
                return `JXCOL(${prefix}:${column})`;
            }
            // Altrimenti lascia stare (potrebbe essere schema.tabella o altro)
            return match;
        });
    }

    // =============================================
    // 4. CONVERTI RIFERIMENTI A TABELLE
    // =============================================
    function convertTables(sql) {
        return sql.replace(/\b(FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, 
            (match, keyword, tableName, alias) => {
                if (alias && SQL_KEYWORDS.has(alias.toUpperCase())) {
                    alias = null;
                }
                
                if (alias) {
                    return `${keyword} JXTAB(${tableName}:${alias})`;
                } else {
                    return `${keyword} JXTAB(${tableName})`;
                }
            });
    }

    // =============================================
    // 5. CONVERTI CONCATENAZIONI IN JXCONCAT
    // =============================================
    function convertConcat(sql, dialect) {
        const operator = dialect === 'postgresql' ? '\\|\\|' : '\\+';
        // Match: JXCOL(...) OP JXCOL(...) OP JXCOL(...) ...
        const regex = new RegExp(
            `(JXCOL\\([^)]+\\))(?:\\s*${operator}\\s*(JXCOL\\([^)]+\\)|'[^']*'|\\"[^"]*\\"|\\d+))+`,
            'g'
        );
        
        return sql.replace(regex, (match) => {
            const parts = match.split(new RegExp(`\\s*${operator}\\s*`));
            return `JXCONCAT(${parts.join(',')})`;
        });
    }

    // =============================================
    // 6. CONVERTI SUBSTRING IN JXSUBSTRING
    // =============================================
    function convertSubstring(sql, dialect) {
        let result = sql;
        
        // PostgreSQL: SUBSTRING(col FROM start FOR length)
        result = result.replace(
            /SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s+FROM\s+(\d+)\s+FOR\s+(\d+)\s*\)/gi,
            (match, col, start, length) => {
                const end = parseInt(start) + parseInt(length) - 1;
                return `JXSUBSTRING(${col},${start},${end})`;
            }
        );
        
        // MSSQL/PG: SUBSTRING(col, start, length)
        result = result.replace(
            /SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi,
            (match, col, start, length) => {
                const end = parseInt(start) + parseInt(length) - 1;
                return `JXSUBSTRING(${col},${start},${end})`;
            }
        );
        
        return result;
    }

    // =============================================
    // PIPELINE PRINCIPALE
    // =============================================
    function convertToJXSQL(sql, dialect) {
        // Step 0: Proteggi le stringhe letterali
        const { protected_sql, strings } = protectStrings(sql);
        
        // Step 1: Estrai mappa alias/tabelle
        const { map } = extractTableMap(protected_sql);
        
        // Step 2: Converti colonne (PRIMA delle tabelle, così preserviamo alias.col)
        let result = convertColumns(protected_sql, { map });
        
        // Step 3: Converti tabelle (FROM/JOIN)
        result = convertTables(result);
        
        // Step 4: Converti concatenazioni
        result = convertConcat(result, dialect);
        
        // Step 5: Converti substring
        result = convertSubstring(result, dialect);
        
        // Step 6: Ripristina stringhe letterali
        result = restoreStrings(result, strings);
        
        return result;
    }

    // =============================================
    // UI
    // =============================================
    convertBtn.addEventListener('click', () => {
        const query = inputEl.value.trim();
        if (!query) {
            outputEl.textContent = '';
            return;
        }
        try {
            const dialect = dialectEl.value;
            const converted = convertToJXSQL(query, dialect);
            outputEl.textContent = converted;
        } catch (error) {
            outputEl.textContent = `Error: ${error.message}`;
        }
    });

    copyBtn.addEventListener('click', async () => {
        const text = outputEl.textContent;
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

    clearBtn.addEventListener('click', () => {
        inputEl.value = '';
        outputEl.textContent = '';
        inputEl.focus();
    });

    inputEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            convertBtn.click();
        }
    });
});
