document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('sql-input');
    const outputEl = document.getElementById('sql-output').querySelector('code');
    const dialectEl = document.getElementById('sql-dialect');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    // =============================================
    // SQL TO JXSQL CONVERTER
    // =============================================
    
    function convertToJXSQL(sql, dialect) {
        let result = sql;
        
        // Step 1: Extract table aliases from FROM/JOIN clauses
        // Pattern: FROM tablename alias or JOIN tablename alias
        const tableAliases = extractTableAliases(result);
        
        // Step 2: Convert table references to JXTAB()
        result = convertTableReferences(result, tableAliases);
        
        // Step 3: Convert column references to JXCOL()
        result = convertColumnReferences(result, tableAliases);
        
        // Step 4: Convert concatenations to JXCONCAT()
        result = convertConcatenations(result, dialect);
        
        // Step 5: Convert substring functions to JXSUBSTRING()
        result = convertSubstrings(result, dialect);
        
        return result;
    }
    
    function extractTableAliases(sql) {
        const aliases = {};
        const upperSql = sql.toUpperCase();
        
        // Find FROM and JOIN clauses
        const patterns = [
            /\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi,
            /\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(sql)) !== null) {
                const tableName = match[1];
                const alias = match[2] || tableName;
                aliases[alias] = tableName;
            }
        });
        
        return aliases;
    }
    
    function convertTableReferences(sql, tableAliases) {
        let result = sql;
        
        // Convert FROM tablename alias to FROM JXTAB(tablename:alias)
        result = result.replace(/\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, (match, tableName, alias) => {
            const actualAlias = alias || tableName;
            return `FROM JXTAB(${tableName}:${actualAlias})`;
        });
        
        // Convert JOIN tablename alias to JOIN JXTAB(tablename:alias)
        result = result.replace(/\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, (match, tableName, alias) => {
            const actualAlias = alias || tableName;
            return `JOIN JXTAB(${tableName}:${actualAlias})`;
        });
        
        return result;
    }
    
    function convertColumnReferences(sql, tableAliases) {
        let result = sql;
        
        // Convert alias.column to JXCOL(alias:column)
        result = result.replace(/\b(\w+)\.(\w+)\b/g, (match, alias, column) => {
            // Skip if it's already inside JXTAB, JXCOL, JXCONCAT, or JXSUBSTRING
            const beforeMatch = result.substring(0, result.indexOf(match));
            if (beforeMatch.match(/JX(TAB|COL|CONCAT|SUBSTRING)\s*\([^)]*$/)) {
                return match;
            }
            
            // Check if alias is a known table alias
            if (tableAliases[alias]) {
                return `JXCOL(${alias}:${column})`;
            }
            
            // If not a known alias, treat as generic column reference
            return `JXCOL(${match})`;
        });
        
        // Convert standalone column names (without table prefix) in SELECT clause
        // This is tricky - we'll only convert obvious column references
        const selectMatch = result.match(/SELECT\s+(.*?)\s+FROM/i);
        if (selectMatch) {
            let selectClause = selectMatch[1];
            
            // Convert standalone identifiers to JXCOL()
            // But skip keywords, functions, and already converted JXCOL()
            selectClause = selectClause.replace(/\b([a-zA-Z_]\w*)\b/g, (match, identifier) => {
                const upperId = identifier.toUpperCase();
                const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 
                                 'BETWEEN', 'IS', 'NULL', 'AS', 'DISTINCT', 'CASE', 'WHEN', 
                                 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'ORDER', 'BY', 'GROUP', 
                                 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'EXISTS'];
                
                if (keywords.includes(upperId)) return match;
                if (match.match(/^JXCOL\(/)) return match;
                
                return `JXCOL(${identifier})`;
            });
            
            result = result.replace(selectMatch[1], selectClause);
        }
        
        return result;
    }
    
    function convertConcatenations(sql, dialect) {
        let result = sql;
        
        if (dialect === 'postgresql') {
            // Convert PostgreSQL || concatenation to JXCONCAT()
            // Pattern: JXCOL(...) || JXCOL(...) || ...
            result = result.replace(/(JXCOL\([^)]+\))(?:\s*\|\|\s*(JXCOL\([^)]+\)))+/g, (match) => {
                const parts = match.split(/\s*\|\|\s*/);
                return `JXCONCAT(${parts.join(',')})`;
            });
        } else if (dialect === 'mssql') {
            // Convert MSSQL + concatenation to JXCONCAT()
            // Pattern: JXCOL(...) + JXCOL(...) + ...
            result = result.replace(/(JXCOL\([^)]+\))(?:\s*\+\s*(JXCOL\([^)]+\)))+/g, (match) => {
                const parts = match.split(/\s*\+\s*/);
                return `JXCONCAT(${parts.join(',')})`;
            });
        }
        
        return result;
    }
    
    function convertSubstrings(sql, dialect) {
        let result = sql;
        
        if (dialect === 'postgresql') {
            // Convert PostgreSQL SUBSTRING(col FROM start FOR length) to JXSUBSTRING()
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s+FROM\s+(\d+)\s+FOR\s+(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
            
            // Also handle SUBSTRING(col, start, length)
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
        } else if (dialect === 'mssql') {
            // Convert MSSQL SUBSTRING(col, start, length) to JXSUBSTRING()
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
        }
        
        return result;
    }

    // =============================================
    // UI LOGIC
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

    clearBtn.addEventListener('click', () => {
        inputEl.value = '';
        outputEl.textContent = '';
        inputEl.focus();
    });

    // Convert on Ctrl+Enter
    inputEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            convertBtn.click();
        }
    });
});document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('sql-input');
    const outputEl = document.getElementById('sql-output').querySelector('code');
    const dialectEl = document.getElementById('sql-dialect');
    const convertBtn = document.getElementById('convert-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    // =============================================
    // SQL TO JXSQL CONVERTER
    // =============================================
    
    function convertToJXSQL(sql, dialect) {
        let result = sql;
        
        // Step 1: Extract table aliases from FROM/JOIN clauses
        // Pattern: FROM tablename alias or JOIN tablename alias
        const tableAliases = extractTableAliases(result);
        
        // Step 2: Convert table references to JXTAB()
        result = convertTableReferences(result, tableAliases);
        
        // Step 3: Convert column references to JXCOL()
        result = convertColumnReferences(result, tableAliases);
        
        // Step 4: Convert concatenations to JXCONCAT()
        result = convertConcatenations(result, dialect);
        
        // Step 5: Convert substring functions to JXSUBSTRING()
        result = convertSubstrings(result, dialect);
        
        return result;
    }
    
    function extractTableAliases(sql) {
        const aliases = {};
        const upperSql = sql.toUpperCase();
        
        // Find FROM and JOIN clauses
        const patterns = [
            /\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi,
            /\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(sql)) !== null) {
                const tableName = match[1];
                const alias = match[2] || tableName;
                aliases[alias] = tableName;
            }
        });
        
        return aliases;
    }
    
    function convertTableReferences(sql, tableAliases) {
        let result = sql;
        
        // Convert FROM tablename alias to FROM JXTAB(tablename:alias)
        result = result.replace(/\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, (match, tableName, alias) => {
            const actualAlias = alias || tableName;
            return `FROM JXTAB(${tableName}:${actualAlias})`;
        });
        
        // Convert JOIN tablename alias to JOIN JXTAB(tablename:alias)
        result = result.replace(/\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi, (match, tableName, alias) => {
            const actualAlias = alias || tableName;
            return `JOIN JXTAB(${tableName}:${actualAlias})`;
        });
        
        return result;
    }
    
    function convertColumnReferences(sql, tableAliases) {
        let result = sql;
        
        // Convert alias.column to JXCOL(alias:column)
        result = result.replace(/\b(\w+)\.(\w+)\b/g, (match, alias, column) => {
            // Skip if it's already inside JXTAB, JXCOL, JXCONCAT, or JXSUBSTRING
            const beforeMatch = result.substring(0, result.indexOf(match));
            if (beforeMatch.match(/JX(TAB|COL|CONCAT|SUBSTRING)\s*\([^)]*$/)) {
                return match;
            }
            
            // Check if alias is a known table alias
            if (tableAliases[alias]) {
                return `JXCOL(${alias}:${column})`;
            }
            
            // If not a known alias, treat as generic column reference
            return `JXCOL(${match})`;
        });
        
        // Convert standalone column names (without table prefix) in SELECT clause
        // This is tricky - we'll only convert obvious column references
        const selectMatch = result.match(/SELECT\s+(.*?)\s+FROM/i);
        if (selectMatch) {
            let selectClause = selectMatch[1];
            
            // Convert standalone identifiers to JXCOL()
            // But skip keywords, functions, and already converted JXCOL()
            selectClause = selectClause.replace(/\b([a-zA-Z_]\w*)\b/g, (match, identifier) => {
                const upperId = identifier.toUpperCase();
                const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 
                                 'BETWEEN', 'IS', 'NULL', 'AS', 'DISTINCT', 'CASE', 'WHEN', 
                                 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'ORDER', 'BY', 'GROUP', 
                                 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'EXISTS'];
                
                if (keywords.includes(upperId)) return match;
                if (match.match(/^JXCOL\(/)) return match;
                
                return `JXCOL(${identifier})`;
            });
            
            result = result.replace(selectMatch[1], selectClause);
        }
        
        return result;
    }
    
    function convertConcatenations(sql, dialect) {
        let result = sql;
        
        if (dialect === 'postgresql') {
            // Convert PostgreSQL || concatenation to JXCONCAT()
            // Pattern: JXCOL(...) || JXCOL(...) || ...
            result = result.replace(/(JXCOL\([^)]+\))(?:\s*\|\|\s*(JXCOL\([^)]+\)))+/g, (match) => {
                const parts = match.split(/\s*\|\|\s*/);
                return `JXCONCAT(${parts.join(',')})`;
            });
        } else if (dialect === 'mssql') {
            // Convert MSSQL + concatenation to JXCONCAT()
            // Pattern: JXCOL(...) + JXCOL(...) + ...
            result = result.replace(/(JXCOL\([^)]+\))(?:\s*\+\s*(JXCOL\([^)]+\)))+/g, (match) => {
                const parts = match.split(/\s*\+\s*/);
                return `JXCONCAT(${parts.join(',')})`;
            });
        }
        
        return result;
    }
    
    function convertSubstrings(sql, dialect) {
        let result = sql;
        
        if (dialect === 'postgresql') {
            // Convert PostgreSQL SUBSTRING(col FROM start FOR length) to JXSUBSTRING()
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s+FROM\s+(\d+)\s+FOR\s+(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
            
            // Also handle SUBSTRING(col, start, length)
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
        } else if (dialect === 'mssql') {
            // Convert MSSQL SUBSTRING(col, start, length) to JXSUBSTRING()
            result = result.replace(/SUBSTRING\s*\(\s*(JXCOL\([^)]+\))\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, 
                (match, col, start, length) => {
                    const end = parseInt(start) + parseInt(length) - 1;
                    return `JXSUBSTRING(${col},${start},${end})`;
                });
        }
        
        return result;
    }

    // =============================================
    // UI LOGIC
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

    clearBtn.addEventListener('click', () => {
        inputEl.value = '';
        outputEl.textContent = '';
        inputEl.focus();
    });

    // Convert on Ctrl+Enter
    inputEl.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            convertBtn.click();
        }
    });
});
