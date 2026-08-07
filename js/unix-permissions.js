document.addEventListener('DOMContentLoaded', () => {
    const modeRadios = document.querySelectorAll('input[name="perm-mode"]');
    const numericInput = document.getElementById('perm-numeric');
    const symbolicDisplay = document.getElementById('perm-symbolic');
    const numericDisplay = document.getElementById('perm-numeric-display');
    const chmodCode = document.getElementById('perm-chmod');
    const copyBtn = document.getElementById('copy-chmod-btn');
    const showSpecialCheckbox = document.getElementById('show-special-bits');
    const specialBitsSection = document.getElementById('special-bits-section');
    const setuidCheckbox = document.getElementById('setuid');
    const setgidCheckbox = document.getElementById('setgid');
    const stickyCheckbox = document.getElementById('sticky');
    const explanationEl = document.getElementById('perm-explanation');
    const permCheckboxes = document.querySelectorAll('.perm-checkbox');
    const presetBtns = document.querySelectorAll('.preset-btn');

    let currentMode = 'checkbox'; // 'checkbox' or 'numeric'

    // Permission values
    const PERM_VALUES = { read: 4, write: 2, execute: 1 };

    // ==========================================
    // MODE SWITCHING
    // ==========================================
    function setMode(mode) {
        currentMode = mode;
        
        // Enable/disable inputs based on mode
        permCheckboxes.forEach(cb => {
            cb.disabled = (mode === 'numeric');
        });
        numericInput.disabled = (mode === 'checkbox');
        
        // Visual feedback
        if (mode === 'numeric') {
            numericInput.focus();
        }
    }

    // ==========================================
    // PERMISSION CALCULATIONS
    // ==========================================
    function getPermissionsFromCheckboxes() {
        const perms = { user: 0, group: 0, other: 0 };
        
        permCheckboxes.forEach(cb => {
            if (cb.checked) {
                const scope = cb.dataset.scope;
                const perm = cb.dataset.perm;
                perms[scope] += PERM_VALUES[perm];
            }
        });
        
        return perms;
    }

    function getSpecialBits() {
        let special = 0;
        if (setuidCheckbox.checked) special += 4;
        if (setgidCheckbox.checked) special += 2;
        if (stickyCheckbox.checked) special += 1;
        return special;
    }

    function permsToSymbolic(perms, special) {
        const permChar = (value, hasExecute, scope, specialBit) => {
            let chars = '';
            chars += (value & 4) ? 'r' : '-';
            chars += (value & 2) ? 'w' : '-';
            
            // Handle special bits that affect execute position
            if (specialBit && (value & 1)) {
                chars += specialBit; // 's' for setuid/setgid, 't' for sticky
            } else if (specialBit && !(value & 1)) {
                chars += specialBit.toUpperCase(); // 'S', 'S', 'T' when execute is not set
            } else {
                chars += (value & 1) ? 'x' : '-';
            }
            
            return chars;
        };
        
        let symbolic = '';
        symbolic += permChar(perms.user, true, 'user', 
            (special & 4) ? 's' : null);
        symbolic += permChar(perms.group, true, 'group', 
            (special & 2) ? 's' : null);
        symbolic += permChar(perms.other, true, 'other', 
            (special & 1) ? 't' : null);
        
        return symbolic;
    }

    function numericToPerms(numeric) {
        // Parse numeric value (3 or 4 digits)
        const str = numeric.toString().padStart(3, '0');
        let special = 0;
        let user, group, other;
        
        if (str.length === 4) {
            special = parseInt(str[0], 10) || 0;
            user = parseInt(str[1], 10) || 0;
            group = parseInt(str[2], 10) || 0;
            other = parseInt(str[3], 10) || 0;
        } else {
            user = parseInt(str[0], 10) || 0;
            group = parseInt(str[1], 10) || 0;
            other = parseInt(str[2], 10) || 0;
        }
        
        // Validate ranges
        if (user > 7 || group > 7 || other > 7 || special > 7) {
            return null;
        }
        
        return { user, group, other, special };
    }

    function setCheckboxesFromPerms(perms) {
        permCheckboxes.forEach(cb => {
            const scope = cb.dataset.scope;
            const perm = cb.dataset.perm;
            const value = perms[scope];
            cb.checked = (value & PERM_VALUES[perm]) !== 0;
        });
        
        // Set special bits
        setuidCheckbox.checked = (perms.special & 4) !== 0;
        setgidCheckbox.checked = (perms.special & 2) !== 0;
        stickyCheckbox.checked = (perms.special & 1) !== 0;
    }

    // ==========================================
    // UPDATE DISPLAY
    // ==========================================
    function updateDisplay(perms, special) {
        // Symbolic format
        const symbolic = permsToSymbolic(perms, special);
        symbolicDisplay.textContent = symbolic;
        
        // Color-code the symbolic display
        symbolicDisplay.innerHTML = 
            `<span class="perm-scope-user">${symbolic.substring(0, 3)}</span>` +
            `<span class="perm-scope-group">${symbolic.substring(3, 6)}</span>` +
            `<span class="perm-scope-other">${symbolic.substring(6, 9)}</span>`;
        
        // Numeric format
        const numericStr = special > 0 
            ? `${special}${perms.user}${perms.group}${perms.other}`
            : `${perms.user}${perms.group}${perms.other}`;
        numericDisplay.textContent = numericStr;
        
        // Chmod command
        chmodCode.textContent = `chmod ${numericStr} filename`;
        
        // Update explanation
        renderExplanation(perms, special);
    }

    function renderExplanation(perms, special) {
        const scopeDescriptions = {
            user: { name: 'Owner (User)', color: 'perm-scope-user' },
            group: { name: 'Group', color: 'perm-scope-group' },
            other: { name: 'Others', color: 'perm-scope-other' }
        };
        
        let html = '<div class="perm-explanation-grid">';
        
        ['user', 'group', 'other'].forEach(scope => {
            const value = perms[scope];
            const info = scopeDescriptions[scope];
            const canRead = (value & 4) !== 0;
            const canWrite = (value & 2) !== 0;
            const canExec = (value & 1) !== 0;
            
            html += `
                <div class="perm-explanation-item">
                    <div class="perm-explanation-scope ${info.color}">${info.name}</div>
                    <div class="perm-explanation-value">${value}</div>
                    <ul class="perm-explanation-list">
                        <li class="${canRead ? 'perm-granted' : 'perm-denied'}">${canRead ? '✓' : '✗'} Read - can view file contents / list directory</li>
                        <li class="${canWrite ? 'perm-granted' : 'perm-denied'}">${canWrite ? '✓' : '✗'} Write - can modify file / add/remove files in directory</li>
                        <li class="${canExec ? 'perm-granted' : 'perm-denied'}">${canExec ? '✓' : '✗'} Execute - can run file as program / enter directory</li>
                    </ul>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Special bits explanation
        if (special > 0) {
            html += '<div class="perm-special-explanation">';
            html += '<strong>Special bits active:</strong><ul>';
            if (special & 4) html += '<li><strong>SetUID:</strong> When executed, the process runs with the file owner\'s privileges (not the user\'s). Commonly used for programs like passwd.</li>';
            if (special & 2) html += '<li><strong>SetGID:</strong> When executed, the process runs with the file group\'s privileges. On directories, new files inherit the directory\'s group.</li>';
            if (special & 1) html += '<li><strong>Sticky bit:</strong> On directories (like /tmp), only the file owner, directory owner, or root can delete/rename files.</li>';
            html += '</ul></div>';
        }
        
        explanationEl.innerHTML = html;
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================
    function handleCheckboxChange() {
        if (currentMode !== 'checkbox') return;
        
        const perms = getPermissionsFromCheckboxes();
        const special = getSpecialBits();
        
        // Update numeric input to reflect current state
        const numericStr = special > 0 
            ? `${special}${perms.user}${perms.group}${perms.other}`
            : `${perms.user}${perms.group}${perms.other}`;
        numericInput.value = numericStr;
        
        updateDisplay(perms, special);
    }

    function handleNumericInput() {
        if (currentMode !== 'numeric') return;
        
        const raw = numericInput.value.trim();
        
        // Allow empty input
        if (!raw) {
            updateDisplay({ user: 0, group: 0, other: 0 }, 0);
            return;
        }
        
        // Validate: only digits, 3-4 characters
        if (!/^\d{1,4}$/.test(raw)) {
            numericInput.classList.add('perm-input-error');
            return;
        }
        
        const perms = numericToPerms(raw);
        if (!perms) {
            numericInput.classList.add('perm-input-error');
            return;
        }
        
        numericInput.classList.remove('perm-input-error');
        setCheckboxesFromPerms(perms);
        updateDisplay(perms, perms.special);
    }

    function handlePresetClick(value) {
        // Apply preset regardless of mode
        const perms = numericToPerms(value);
        if (!perms) return;
        
        setCheckboxesFromPerms(perms);
        const numericStr = perms.special > 0 
            ? `${perms.special}${perms.user}${perms.group}${perms.other}`
            : `${perms.user}${perms.group}${perms.other}`;
        numericInput.value = numericStr;
        updateDisplay(perms, perms.special);
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            setMode(radio.value);
        });
    });

    permCheckboxes.forEach(cb => {
        cb.addEventListener('change', handleCheckboxChange);
    });

    numericInput.addEventListener('input', handleNumericInput);

    showSpecialCheckbox.addEventListener('change', () => {
        specialBitsSection.style.display = showSpecialCheckbox.checked ? '' : 'none';
        if (!showSpecialCheckbox.checked) {
            setuidCheckbox.checked = false;
            setgidCheckbox.checked = false;
            stickyCheckbox.checked = false;
            handleCheckboxChange();
        }
    });

    [setuidCheckbox, setgidCheckbox, stickyCheckbox].forEach(cb => {
        cb.addEventListener('change', handleCheckboxChange);
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            handlePresetClick(btn.dataset.value);
        });
    });

    copyBtn.addEventListener('click', async () => {
        const text = chmodCode.textContent;
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

    // ==========================================
    // INITIALIZATION
    // ==========================================
    // Set default to 755 (rwxr-xr-x)
    handlePresetClick('755');
    setMode('checkbox');
});
