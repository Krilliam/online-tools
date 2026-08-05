document.addEventListener('DOMContentLoaded', () => {
    const cmdTypeRadios = document.querySelectorAll('input[name="cmd-type"]');
    const versionSelect = document.getElementById('pg-version');
    const outputEl = document.getElementById('pg-output').querySelector('code');
    const copyBtn = document.getElementById('copy-cmd-btn');
    const validationContainer = document.getElementById('validation-messages');

    // Options specific to pg_dump vs pg_restore
    const dumpOnlyOptions = ['opt-format', 'opt-file', 'opt-compress', 'opt-schema-only', 'opt-data-only', 'opt-inserts'];
    const restoreOnlyOptions = ['opt-clean', 'opt-create'];

    function getCommandType() {
        return document.querySelector('input[name="cmd-type"]:checked').value;
    }

    function getVersion() {
        return parseInt(versionSelect.value, 10);
    }

    // Sanitizes input by trimming whitespace and removing leading dashes
    // This prevents users from accidentally typing the flag itself (e.g., typing "-h" in the host field)
    function sanitizeValue(value) {
        if (!value) return '';
        return value.trim().replace(/^-+/, '');
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

    // ==========================================
    // SYNTAX CONTROLLER / VALIDATOR
    // ==========================================
    function validateCommand(cmd) {
        const errors = [];
        const warnings = [];

        // Skip validation if the command is just the base executable name
        if (!cmd || cmd === 'pg_dump' || cmd === 'pg_restore') {
            return { errors, warnings };
        }

        // 1. Check for unbalanced double quotes (ignoring escaped quotes \")
        let inDoubleQuote = false;
        let inSingleQuote = false;
        for (let i = 0; i < cmd.length; i++) {
            if (cmd[i] === '"' && (i === 0 || cmd[i-1] !== '\\')) {
                inDoubleQuote = !inDoubleQuote;
            }
            if (cmd[i] === "'" && (i === 0 || cmd[i-1] !== '\\')) {
                inSingleQuote = !inSingleQuote;
            }
        }
        
        if (inDoubleQuote) {
            errors.push("Unbalanced double quotes. Ensure every opening quote has a closing quote.");
        }
        if (inSingleQuote) {
            errors.push("Unbalanced single quotes. Ensure every opening quote has a closing quote.");
        }

        // 2. Check for flags that require a value but appear to be missing one
        const flagsNeedingValue = ['-h', '-p', '-U', '-d', '-H', '-f', '-j', '-Z', '-n', '-N', '-t', '-T'];
        flagsNeedingValue.forEach(flag => {
            // Regex looks for the flag followed by a space and then another flag or end of string
            const regex = new RegExp(`${flag}\\s+(-[a-zA-Z]|--\\w+|$)`);
            if (regex.test(cmd)) {
                errors.push(`The flag ${flag} appears to be missing its required value.`);
            }
        });

        // 3. Check for dangerous shell metacharacters that are not quoted
        if (/[;|&<>$`]/.test(cmd)) {
            warnings.push("The command contains shell metacharacters (;, |, &, <, >, $, `). Ensure they are properly quoted, as they may alter command execution or cause errors.");
        }

        // 4. Check for multiple consecutive spaces (often indicates a missing value)
        if (/  +/.test(cmd)) {
            warnings.push("Multiple consecutive spaces detected. This might indicate a missing value for a flag.");
        }

        return { errors, warnings };
    }

    function renderValidationMessages(errors, warnings) {
        validationContainer.innerHTML = '';
        
        errors.forEach(err => {
            const div = document.createElement('div');
            div.className = 'validation-message validation-error';
            div.textContent = `ERROR: ${err}`;
            validationContainer.appendChild(div);
        });

        warnings.forEach(warn => {
            const div = document.createElement('div');
            div.className = 'validation-message validation-warning';
            div.textContent = `WARNING: ${warn}`;
            validationContainer.appendChild(div);
        });
    }

    // ==========================================
    // COMMAND GENERATION
    // ==========================================
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
                const value = sanitizeValue(valEl.value);
                if (value) {
                    const needsQuotes = value.includes(' ');
                    parts.push(`${checkbox.dataset.flag} ${needsQuotes ? '"' + value + '"' : value}`);
                }
            }
        });

        // No password
        if (document.getElementById('opt-no-password').checked) {
            parts.push('-w');
        }

        // Format & Output
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
                const value = sanitizeValue(valEl.value);
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
                const value = sanitizeValue(valEl.value);
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

        // Restore file path (only for pg_restore, last argument)
        if (cmdType === 'pg_restore') {
            const restoreFileCheckbox = document.getElementById('opt-restore-file');
            if (restoreFileCheckbox && restoreFileCheckbox.checked) {
                const restoreFileInput = document.getElementById('val-restore-file');
                const filePath = sanitizeValue(restoreFileInput.value);
                if (filePath) {
                    const needsQuotes = filePath.includes(' ');
                    parts.push(needsQuotes ? `"${filePath}"` : filePath);
                }
            }
        }

        // Generate single-line output
        const finalCommand = parts.join(' ');
        outputEl.textContent = finalCommand;

        // Execute validator and render results
        const { errors, warnings } = validateCommand(finalCommand);
        renderValidationMessages(errors, warnings);
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    cmdTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            updateCommandTypeSpecificOptions();
            updateVersionSpecificOptions();
            updateRestoreFileSection();
            generateCommand();
        });
    });

    versionSelect.addEventListener('change', () => {
        updateVersionSpecificOptions();
        generateCommand();
    });

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

    document.querySelectorAll('input[type="text"], input[type="number"], select').forEach(input => {
        input.addEventListener('input', generateCommand);
        input.addEventListener('change', generateCommand);
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

    // Initial setup
    updateCommandTypeSpecificOptions();
    updateVersionSpecificOptions();
    updateRestoreFileSection();
    generateCommand();
});
