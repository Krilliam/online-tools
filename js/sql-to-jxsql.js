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
        const map = {};
        
        const pattern = /\b(FROM|JOIN)\s+(?:(\w+)\.)?(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
        let match;
        
        while ((match = pattern.exec(sql)) !== null) {
            const tableName = match[3];
            let alias = match[4];

            if (alias && SQL_KEYWORDS.has(alias.toUpperCase())) {
                alias = null;
            }

            const identifierToUse = alias || tableName;
            
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
    // FIX: rimosso \b finale che falliva con *
    // =============================================
    function convertColumns(sql, tableMap) {
        return sql.replace(/\b([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.(\w+|\*)/g, (match, prefixChain, column) => {
            const parts = prefixChain.split('.');
            const lastPart = parts[parts.length - 1];
            
            if (tableMap.map[lastPart] !== undefined) {
                return `JXCOL(${tableMap.map[lastPart]}:${column})`;
            }
            
            return match;
        });
    }

    // =============================================
    // 4. CONVERTI ASTERISCO STANDALONE (*)
    // FIX: rimosso \b finale dopo *
    // =============================================
    function convertStandaloneStar(sql, tableMap) {
        const aliases = Object.values(tableMap.map);
        const uniqueAliases = [...new Set(aliases)];
        
        if (uniqueAliases.length === 1) {
            const alias = uniqueAliases[0];
            sql = sql.replace(/\b(SELECT\s+)\*/gi, `$1JXCOL(${alias}:*)`);
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
        
        result = result.replace(
            /SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s+FROM\s+(\d+)\s+FOR\s+(\d+)\s*\)/gi,
            (match, col, start, length) => {
                const end = parseInt(start) + parseInt(length) - 1;
                return `JXSUBSTRING(${col},${start},${end})`;
            }
        );
        
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
        const { protected_sql, strings } = protectStrings(sql);
        const { map } = extractTableMap(protected_sql);
        
        let result = convertColumns(protected_sql, { map });
        result = convertStandaloneStar(result, { map });
        result = convertTables(result);
        result = convertConcat(result, dialect);
        result = convertSubstring(result, dialect);
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
