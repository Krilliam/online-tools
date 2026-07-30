document.addEventListener('DOMContentLoaded', () => {
    const selects = {
        min: document.getElementById('cron-min'),
        hour: document.getElementById('cron-hour'),
        dom: document.getElementById('cron-dom'),
        month: document.getElementById('cron-month'),
        dow: document.getElementById('cron-dow')
    };
    const inputEl = document.getElementById('cron-input');
    const descEl = document.getElementById('cron-description');
    const nextRunsEl = document.getElementById('cron-next-runs').querySelector('code');
    const copyCronBtn = document.getElementById('copy-cron-btn');
    const copyScheduleBtn = document.getElementById('copy-schedule-btn');

    function updateCron() {
        const expression = `${selects.min.value} ${selects.hour.value} ${selects.dom.value} ${selects.month.value} ${selects.dow.value}`;
        inputEl.value = expression;
        evaluateCron(expression);
    }

    function evaluateCron(expression) {
        // 1. Human readable description
        try {
            descEl.textContent = cronstrue.toString(expression, { verbose: true });
            descEl.style.color = 'var(--text-primary)';
        } catch (e) {
            descEl.textContent = 'Invalid cron expression';
            descEl.style.color = '#dc3545';
            nextRunsEl.textContent = '';
            return;
        }

        // 2. Next executions
        try {
            const interval = cronParser.parseExpression(expression);
            let runs = [];
            for (let i = 0; i < 5; i++) {
                runs.push(interval.next().toDate().toLocaleString('en-US', { 
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                }));
            }
            nextRunsEl.textContent = runs.join('\n');
        } catch (e) {
            nextRunsEl.textContent = 'Could not calculate next runs.';
        }
    }

    // Attach listeners to all selects
    Object.values(selects).forEach(select => {
        select.addEventListener('change', updateCron);
    });

    // Copy expression
    copyCronBtn.addEventListener('click', async () => {
        await copyToClipboard(inputEl.value, copyCronBtn);
    });

    // Copy schedule
    copyScheduleBtn.addEventListener('click', async () => {
        const text = `Expression: ${inputEl.value}\nDescription: ${descEl.textContent}\nNext runs:\n${nextRunsEl.textContent}`;
        await copyToClipboard(text, copyScheduleBtn);
    });

    // Helper for copy feedback
    async function copyToClipboard(text, btn) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    // Initial evaluation
    updateCron();
});
