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
    // 1. ESTRAE MAPPA: identifica tabelle, schemi e alias
    // =============================================
    function extractTableMap(sql) {
        const map = {}; // Mappa: qualsiasi identificatore (alias o nome tabella) -> alias da usare in JXCOL
        
        // Regex: FROM/JOIN [opzionale: schema.] tableName [AS] [alias]
        // Gruppo 1: FROM/JOIN
        // Gruppo 2: (opzionale) schema
        // Gruppo 3: nome tabella
        // Gruppo 4: (opzionale) alias
        const pattern = /\b(FROM|JOIN)\s+(?:(\w+)\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
        let match;
        
        while ((match = pattern.exec(sql)) !== null) {
            const tableName = match[3];
            let alias = match[4];

            // Se l'alias è in realtà una keyword SQL (es. FROM tabella WHERE...), lo ignoriamo
            if (alias && SQL_KEYWORDS.has(alias.toUpperCase())) {
                alias = null;
            }

            const identifierToUse = alias || tableName;
            
            // Mappiamo sia il nome della tabella che l'alias all'identificatore finale da usare
            map[tableName] = identifierToUse;
            if (alias) {
                map[alias] = identifierToUse;
            }
        }
        
        return { map };
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
    // 3. CONVERTI RIFERIMENTI A COLONNE (inclusi schemi)
    // =============================================
    function convertColumns(sql, tableMap) {
        // Match: [schema.]table_or_alias.column_or_star
        return sql.replace(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.(\w+|\*)\b/g, (match, prefixChain, column) => {
            const parts = prefixChain.split('.');
            const lastPart = parts[parts.length - 1]; // L'ultima parte è la tabella o l'alias
            
            // Se l'ultima parte è riconosciuta come tabella o alias nella nostra mappa
            if (tableMap.map[lastPart] !== undefined) {
                return `JXCOL(${tableMap.map[lastPart]}:${column})`;
            }
            
            return match; // Se non riconosciuto, lascia invariato
        });
    }

    // =============================================
    // 4. CONVERTI ASTERISCO STANDALONE (*)
    // =============================================
    function convertStandaloneStar(sql, tableMap) {
        const aliases = Object.values(tableMap.map);
        const uniqueAliases = [...new Set(aliases)];
        
        // Se c'è una sola tabella/alias nella query, possiamo assumere che * si riferisca a quello
        if (uniqueAliases.length === 1) {
            const alias = uniqueAliases[0];
            // Sostituisce "SELECT *"
            sql = sql.replace(/\b(SELECT\s+)\*\b/gi, `$1JXCOL(${alias}:*)`);
            // Sostituisce ", *" (es. SELECT col1, *)
            sql = sql.replace(/,\s*\*/g, `, JXCOL(${alias}:*)`);
        }
        return sql;
    }

    // =============================================
    // 5. CONVERTI RIFERIMENTI A TABELLE (ignorando lo schema)
    // =============================================
    function convertTables(sql) {
        return sql.replace(/\b(FROM|JOIN)\s+(?:(\w+)\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, 
            (match, keyword, schema, tableName, alias) => {
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
    // 6. CONVERTI CONCATENAZIONI IN JXCONCAT
    // =============================================
    function convertConcat(sql, dialect) {
        const operator = dialect === 'postgresql' ? '\\|\\|' : '\\+';
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
    // 7. CONVERTI SUBSTRING IN JXSUBSTRING
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
        
        // Step 1: Estrai mappa tabelle/alias
        const { map } = extractTableMap(protected_sql);
        
        // Step 2: Converti colonne (gestisce anche schema.tabella.colonna)
        let result = convertColumns(protected_sql, { map });
        
        // Step 3: Converti asterisco standalone (*) se c'è una sola tabella
        result = convertStandaloneStar(result, { map });
        
        // Step 4: Converti tabelle (ignora lo schema, usa solo tabella e alias)
        result = convertTables(result);
        
        // Step 5: Converti concatenazioni
        result = convertConcat(result, dialect);
        
        // Step 6: Converti substring
        result = convertSubstring(result, dialect);
        
        // Step 7: Ripristina stringhe letterali
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
