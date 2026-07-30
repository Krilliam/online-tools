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

    // =============================================
    // CRON MATCHER (pure JS, zero dependencies)
    // =============================================
    function matchesField(fieldValue, actualValue) {
        if (fieldValue === '*') return true;
        if (fieldValue.startsWith('*/')) {
            const step = parseInt(fieldValue.substring(2), 10);
            return actualValue % step === 0;
        }
        if (fieldValue.includes(',')) {
            return fieldValue.split(',').some(v => parseInt(v, 10) === actualValue);
        }
        if (fieldValue.includes('-')) {
            const [start, end] = fieldValue.split('-').map(Number);
            return actualValue >= start && actualValue <= end;
        }
        return parseInt(fieldValue, 10) === actualValue;
    }

    function getNextCronRuns(expression, count) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) return [];

        const [fMin, fHour, fDom, fMonth, fDow] = parts;
        const results = [];
        const now = new Date();
        
        // Start from the next minute
        const current = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0);
        
        // Safety limit: don't search more than 4 years ahead
        const maxIterations = 525960 * 4; // ~4 years in minutes
        let iterations = 0;

        while (results.length < count && iterations < maxIterations) {
            iterations++;

            const min = current.getMinutes();
            const hour = current.getHours();
            const dom = current.getDate();
            const month = current.getMonth() + 1; // JS months are 0-based
            const dow = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            if (matchesField(fMonth, month) &&
                matchesField(fDom, dom) &&
                matchesField(fDow, dow) &&
                matchesField(fHour, hour) &&
                matchesField(fMin, min)) {
                results.push(new Date(current));
            }

            // Advance by 1 minute
            current.setMinutes(current.getMinutes() + 1);
        }

        return results;
    }

    // =============================================
    // UI LOGIC
    // =============================================
    function updateCron() {
        const expression = `${selects.min.value} ${selects.hour.value} ${selects.dom.value} ${selects.month.value} ${selects.dow.value}`;
        inputEl.value = expression;
        evaluateCron(expression);
    }

    function evaluateCron(expression) {
        // 1. Human readable description
        try {
            if (typeof cronstrue !== 'undefined') {
                descEl.textContent = cronstrue.toString(expression, { verbose: true });
            } else {
                descEl.textContent = expression;
            }
            descEl.style.color = '';
        } catch (e) {
            descEl.textContent = expression;
        }

        // 2. Next executions (pure JS, no external library)
        try {
            const runs = getNextCronRuns(expression, 5);
            if (runs.length === 0) {
                nextRunsEl.textContent = 'No matching dates found within the next 4 years.';
                return;
            }
            nextRunsEl.textContent = runs.map((date, i) => {
                return `${i + 1}. ${date.toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            }).join('\n');
        } catch (e) {
            console.error('Cron calculation error:', e);
            nextRunsEl.textContent = 'Error calculating next runs.';
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
        const text = `Expression: ${inputEl.value}\nDescription: ${descEl.textContent}\n\nNext runs:\n${nextRunsEl.textContent}`;
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
