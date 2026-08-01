document.addEventListener('DOMContentLoaded', () => {
    const taskNameInput = document.getElementById('task-name');
    const cronExprInput = document.getElementById('cron-expr');
    const execCmdInput = document.getElementById('exec-cmd');
    const execUserInput = document.getElementById('exec-user');
    
    const outputService = document.getElementById('output-service').querySelector('code');
    const outputTimer = document.getElementById('output-timer').querySelector('code');
    const outputInstall = document.getElementById('output-install').querySelector('code');
    
    const filenameService = document.getElementById('filename-service');
    const filenameTimer = document.getElementById('filename-timer');
    
    const copyAllBtn = document.getElementById('copy-all-btn');

    // Mappa giorni della settimana da cron (0-7, dove 0 e 7 sono Domenica) a systemd
    const dowMap = {
        '0': 'Sun', '7': 'Sun',
        '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
        '*': '*'
    };

    function convertCronToOnCalendar(cron) {
        const parts = cron.trim().split(/\s+/);
        if (parts.length !== 5) return null;

        const [min, hour, dom, mon, dow] = parts;

        // Traduzione semplificata ma robusta per i casi più comuni
        const sDow = dow === '*' ? '*' : dow.split(',').map(d => dowMap[d] || d).join(',');
        const sMon = mon === '*' ? '*' : mon;
        const sDom = dom === '*' ? '*' : dom;
        
        // Systemd richiede formato HH:MM:SS. Se è *, usiamo *. Altrimenti pad con zero.
        const sHour = hour === '*' || hour.includes('/') ? hour : hour.padStart(2, '0');
        const sMin = min === '*' || min.includes('/') ? min : min.padStart(2, '0');

        // Formato systemd: DOW YYYY-MM-DD HH:MM:SS
        return `${sDow} *-*-${sDom} ${sMon} ${sHour}:${sMin}:00`;
    }

    function generate() {
        const taskName = taskNameInput.value.trim().replace(/\s+/g, '-') || 'mytask';
        const cronExpr = cronExprInput.value.trim();
        const execCmd = execCmdInput.value.trim() || '/usr/local/bin/script.sh';
        const execUser = execUserInput.value.trim() || 'root';

        filenameService.textContent = `${taskName}.service`;
        filenameTimer.textContent = `${taskName}.timer`;

        if (cronExpr.toLowerCase() === '@reboot') {
            // Caso speciale @reboot: non serve il timer, si abilita solo il servizio
            outputService.textContent = `[Unit]
Description=${taskName} execution at boot

[Service]
Type=oneshot
User=${execUser}
ExecStart=${execCmd}
RemainAfterExit=no

[Install]
WantedBy=multi-user.target`;
            
            outputTimer.textContent = `# No timer file needed for @reboot.
# The service is enabled directly to run at boot.`;
            
            outputInstall.textContent = `# 1. Move files to systemd directory
sudo mv ${taskName}.service /etc/systemd/system/

# 2. Reload systemd daemon
sudo systemctl daemon-reload

# 3. Enable and start the service
sudo systemctl enable --now ${taskName}.service

# 4. Verify status
sudo systemctl status ${taskName}.service`;
            return;
        }

        const onCalendar = convertCronToOnCalendar(cronExpr);
        
        if (!onCalendar) {
            outputService.textContent = '# Error: Invalid cron expression. Please use standard 5-field format (e.g., 0 2 * * *) or @reboot';
            outputTimer.textContent = '';
            outputInstall.textContent = '';
            return;
        }

        // Generazione file standard
        outputService.textContent = `[Unit]
Description=${taskName} scheduled task

[Service]
Type=oneshot
User=${execUser}
ExecStart=${execCmd}
RemainAfterExit=no`;

        outputTimer.textContent = `[Unit]
Description=Run ${taskName} on schedule

[Timer]
OnCalendar=${onCalendar}
Persistent=true

[Install]
WantedBy=timers.target`;

        outputInstall.textContent = `# 1. Move files to systemd directory
sudo mv ${taskName}.service ${taskName}.timer /etc/systemd/system/

# 2. Reload systemd daemon to recognize new files
sudo systemctl daemon-reload

# 3. Enable and start the TIMER (not the service)
sudo systemctl enable --now ${taskName}.timer

# 4. Verify timer status and next trigger
sudo systemctl status ${taskName}.timer
sudo systemctl list-timers --all | grep ${taskName}`;
    }

    // Event listeners per aggiornamento in tempo reale
    [taskNameInput, cronExprInput, execCmdInput, execUserInput].forEach(input => {
        input.addEventListener('input', generate);
    });

    // Copy All functionality
    copyAllBtn.addEventListener('click', async () => {
        const text = `--- ${filenameService.textContent} ---\n${outputService.textContent}\n\n--- ${filenameTimer.textContent} ---\n${outputTimer.textContent}\n\n--- INSTALLATION ---\n${outputInstall.textContent}`;
        try {
            await navigator.clipboard.writeText(text);
            const originalText = copyAllBtn.textContent;
            copyAllBtn.textContent = 'Copied All!';
            copyAllBtn.disabled = true;
            setTimeout(() => {
                copyAllBtn.textContent = originalText;
                copyAllBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    });

    // Initial generation
    generate();
});
