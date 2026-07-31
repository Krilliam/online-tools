document.addEventListener('DOMContentLoaded', () => {
    const cmdTypeRadios = document.querySelectorAll('input[name="cmd-type"]');
    const versionSelect = document.getElementById('pg-version');
    const outputEl = document.getElementById('pg-output').querySelector('code');
    const copyBtn = document.getElementById('copy-cmd-btn');

    // Opzioni specifiche per pg_dump vs pg_restore
    const dumpOnlyOptions = ['opt-format', 'opt-file', 'opt-compress', 'opt-schema-only', 'opt-data-only', 'opt-inserts'];
    const restoreOnlyOptions = ['opt-clean', 'opt-create'];

    function getCommandType() {
        return document.querySelector('input[name="cmd-type"]:checked').value;
    }

    function getVersion() {
        return parseInt(versionSelect.value, 10);
    }

    function updateVersionSpecificOptions() {
        const version = getVersion();
        document.querySelectorAll('.version-specific').forEach(el => {
            const minVersion = parseInt(el.dataset.minVersion, 10);
            if (version >= minVersion) {
                el.style.display = '';
            } else {
                el.style.display = 'none';
                const checkbox = el.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.checked = false;
                const input = el.querySelector('input[type="text"], input[type="number"], select');
                if (input) input.disabled = true;
            }
        });
    }

    function updateCommandTypeSpecificOptions() {
        const cmdType = getCommandType();
        
        dumpOnlyOptions.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const parent = el.closest('.pg-field, .checkbox-label');
                if (parent) {
                    parent.style.display = cmdType === 'pg_dump' ? '' : 'none';
                    if (cmdType !== 'pg_dump') {
                        el.checked = false;
                        const input = parent.querySelector('input[type="text"], input[type="number"], select');
                        if (input) input.disabled = true;
                    }
                }
            }
        });

        restoreOnlyOptions.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const parent = el.closest('.checkbox-label');
                if (parent) {
                    parent.style.display = cmdType === 'pg_restore' ? '' : 'none';
                    if (cmdType !== 'pg_restore') {
                        el.checked = false;
                    }
                }
            }
        });
    }

    function updateRestoreFileSection() {
        const cmdType = getCommandType();
        const restoreFileSection = document.getElementById('restore-file-section');
        if (restoreFileSection) {
            restoreFileSection.style.display = cmdType === 'pg_restore' ? '' : 'none';
            if (cmdType !== 'pg_restore') {
                const checkbox = document.getElementById('opt-restore-file');
                if (checkbox) {
                    checkbox.checked = false;
                    const input = document.getElementById('val-restore-file');
                    if (input) {
                        input.disabled = true;
                        input.value = '';
                    }
                }
            }
        }
    }

    function generateCommand() {
        const cmdType = getCommandType();
        const parts = [cmdType];

        // Connection options
        const connectionOpts = [
            { id: 'opt-host', valId: 'val-host' },
            { id: 'opt-port', valId: 'val-port' },
            { id: 'opt-user', valId: 'val-user' },
            { id: 'opt-dbname', valId: 'val-dbname' },
            { id: 'opt-hostaddr', valId: 'val-hostaddr' }
        ];

        connectionOpts.forEach(opt => {
            const checkbox = document.getElementById(opt.id);
            if (checkbox && checkbox.checked) {
                const valEl = document.getElementById(opt.valId);
                const value = valEl.value.trim();
                if (value) {
                    // Aggiungi quotes se il valore contiene spazi
                    const needsQuotes = value.includes(' ');
                    parts.push(`${checkbox.dataset.flag} ${needsQuotes ? '"' + value + '"' : value}`);
                }
            }
        });

        // No password
        if (document.getElementById('opt-no-password').checked) {
            parts.push('-w');
        }

        // Format & Output (incluso -j per entrambi i comandi)
        const formatOpts = [
            { id: 'opt-format', valId: 'val-format' },
            { id: 'opt-file', valId: 'val-file' },
            { id: 'opt-jobs', valId: 'val-jobs' },
            { id: 'opt-compress', valId: 'val-compress' }
        ];

        formatOpts.forEach(opt => {
            const checkbox = document.getElementById(opt.id);
            if (checkbox && checkbox.checked) {
                const valEl = document.getElementById(opt.valId);
                const value = valEl.value.trim();
                if (value) {
                    parts.push(`${checkbox.dataset.flag} ${value}`);
                }
            }
        });

        // Content filter
        const filterOpts = [
            { id: 'opt-schema', valId: 'val-schema' },
            { id: 'opt-exclude-schema', valId: 'val-exclude-schema' },
            { id: 'opt-table', valId: 'val-table' },
            { id: 'opt-exclude-table', valId: 'val-exclude-table' },
            { id: 'opt-filter', valId: 'val-filter' }
        ];

        filterOpts.forEach(opt => {
            const checkbox = document.getElementById(opt.id);
            if (checkbox && checkbox.checked) {
                const valEl = document.getElementById(opt.valId);
                const value = valEl.value.trim();
                if (value) {
                    if (opt.id === 'opt-filter') {
                        parts.push(`--filter=${value}`);
                    } else {
                        parts.push(`${checkbox.dataset.flag} ${value}`);
                    }
                }
            }
        });

        // Behavior options
        const behaviorOpts = [
            { id: 'opt-clean', flag: '-c' },
            { id: 'opt-create', flag: '-C' },
            { id: 'opt-no-owner', flag: '-O' },
            { id: 'opt-no-privileges', flag: '-x' },
            { id: 'opt-schema-only', flag: '--schema-only' },
            { id: 'opt-data-only', flag: '--data-only' },
            { id: 'opt-inserts', flag: '--inserts' },
            { id: 'opt-verbose', flag: '-v' },
            { id: 'opt-no-sync', flag: '--no-sync' },
            { id: 'opt-no-publications', flag: '--no-publications' },
            { id: 'opt-no-comments', flag: '--no-comments' },
            { id: 'opt-no-role-passwords', flag: '--no-role-passwords' },
            { id: 'opt-no-toast-compression', flag: '--no-toast-compression' },
            { id: 'opt-no-unlogged-table-data', flag: '--no-unlogged-table-data' }
        ];

        behaviorOpts.forEach(opt => {
            const checkbox = document.getElementById(opt.id);
            if (checkbox && checkbox.checked) {
                parts.push(opt.flag);
            }
        });

        // Restore file path (solo per pg_restore, ultimo argomento)
        if (cmdType === 'pg_restore') {
            const restoreFileCheckbox = document.getElementById('opt-restore-file');
            if (restoreFileCheckbox && restoreFileCheckbox.checked) {
                const restoreFileInput = document.getElementById('val-restore-file');
                const filePath = restoreFileInput.value.trim();
                if (filePath) {
                    // Aggiungi quotes se il path contiene spazi
                    const needsQuotes = filePath.includes(' ');
                    parts.push(needsQuotes ? `"${filePath}"` : filePath);
                }
            }
        }

        // Output su SINGOLA RIGA
        outputEl.textContent = parts.join(' ');
    }

    // Event listeners per tipo comando
    cmdTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateCommandTypeSpecificOptions();
            updateVersionSpecificOptions();
            updateRestoreFileSection();
            generateCommand();
        });
    });

    // Event listener per versione
    versionSelect.addEventListener('change', () => {
        updateVersionSpecificOptions();
        generateCommand();
    });

    // Checkbox listeners per abilitare/disabilitare input
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const parent = checkbox.closest('.pg-field');
            if (parent) {
                const input = parent.querySelector('input[type="text"], input[type="number"], select');
                if (input) {
                    input.disabled = !checkbox.checked;
                    if (!checkbox.checked) {
                        input.value = '';
                    }
                }
            }
            generateCommand();
        });
    });

    // Input listeners
    document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(input => {
        input.addEventListener('input', generateCommand);
        input.addEventListener('change', generateCommand);
    });

    // Copy button
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

    // Initial setup
    updateCommandTypeSpecificOptions();
    updateVersionSpecificOptions();
    updateRestoreFileSection();
    generateCommand();
});
