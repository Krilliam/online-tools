document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('ts-input');
    const timezoneSelect = document.getElementById('ts-timezone');
    const resultsContainer = document.getElementById('ts-results');
    const detectedFormatEl = document.getElementById('detected-format');
    const currentTimeEl = document.getElementById('current-time-utc');
    const setNowBtn = document.getElementById('set-now-btn');
    const relativeSection = document.getElementById('ts-relative-section');
    const relativeTextEl = document.getElementById('ts-relative');
    const errorEl = document.getElementById('ts-error');

    let currentDate = null;

    // ==========================================
    // CURRENT TIME DISPLAY
    // ==========================================
    function updateCurrentTime() {
        const now = new Date();
        currentTimeEl.textContent = now.toISOString() + ' (' + Math.floor(now.getTime() / 1000) + ')';
    }

    // ==========================================
    // INTELLIGENT PARSER
    // ==========================================
    function parseTimestamp(input) {
        if (!input || !input.trim()) {
            return { date: null, format: 'none' };
        }

        const trimmed = input.trim();

        // 1. Pure numeric: Unix timestamp
        if (/^-?\d+$/.test(trimmed)) {
            const num = parseInt(trimmed, 10);
            if (Math.abs(num) > 1e11) {
                const date = new Date(num);
                if (!isNaN(date.getTime())) {
                    return { date, format: 'Unix timestamp (milliseconds)' };
                }
            } else {
                const date = new Date(num * 1000);
                if (!isNaN(date.getTime())) {
                    return { date, format: 'Unix timestamp (seconds)' };
                }
            }
        }

        // 2. Numeric with decimal: Unix timestamp with fractional seconds
        if (/^-?\d+\.\d+$/.test(trimmed)) {
            const num = parseFloat(trimmed);
            const date = new Date(num * 1000);
            if (!isNaN(date.getTime())) {
                return { date, format: 'Unix timestamp (seconds with decimals)' };
            }
        }

        // 3. ISO 8601 format
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                return { date, format: 'ISO 8601' };
            }
        }

        // 4. Date only: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const date = new Date(trimmed + 'T00:00:00Z');
            if (!isNaN(date.getTime())) {
                return { date, format: 'Date (YYYY-MM-DD)' };
            }
        }

        // 5. European format: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
        const euMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (euMatch) {
            const [, day, month, year, hour = '0', minute = '0', second = '0'] = euMatch;
            const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}Z`;
            const date = new Date(iso);
            if (!isNaN(date.getTime())) {
                return { date, format: 'Date (DD/MM/YYYY)' };
            }
        }

        // 6. US format: MM/DD/YYYY
        const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (usMatch) {
            const [, month, day, year, hour = '0', minute = '0', second = '0'] = usMatch;
            const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}Z`;
            const date = new Date(iso);
            if (!isNaN(date.getTime())) {
                return { date, format: 'Date (MM/DD/YYYY)' };
            }
        }

        // 7. RFC 2822 format
        if (/^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/.test(trimmed)) {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                return { date, format: 'RFC 2822' };
            }
        }

        // 8. Natural language dates
        const date = new Date(trimmed);
        if (!isNaN(date.getTime())) {
            return { date, format: 'Natural language date' };
        }

        return { date: null, format: 'unrecognized' };
    }

    // ==========================================
    // FORMAT FUNCTIONS
    // ==========================================
    function getConversions(date, timezone) {
        const unixSeconds = Math.floor(date.getTime() / 1000);
        const unixMillis = date.getTime();

        let tzDate;
        try {
            const tzString = date.toLocaleString('en-US', { timeZone: timezone });
            tzDate = new Date(tzString);
        } catch (e) {
            tzDate = date;
        }

        const tzOffsetHours = (tzDate.getTime() - date.getTime()) / 3600000;
        const tzOffsetStr = (tzOffsetHours >= 0 ? '+' : '') + tzOffsetHours + ':00';

        const year = tzDate.getUTCFullYear();
        const month = String(tzDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(tzDate.getUTCDate()).padStart(2, '0');
        const hour = String(tzDate.getUTCHours()).padStart(2, '0');
        const minute = String(tzDate.getUTCMinutes()).padStart(2, '0');
        const second = String(tzDate.getUTCSeconds()).padStart(2, '0');

        return [
            { label: 'Unix timestamp (seconds)', value: unixSeconds.toString() },
            { label: 'Unix timestamp (milliseconds)', value: unixMillis.toString() },
            { label: 'ISO 8601 (UTC)', value: date.toISOString() },
            { label: 'ISO 8601 (with timezone offset)', value: `${year}-${month}-${day}T${hour}:${minute}:${second}${tzOffsetStr}` },
            { label: 'UTC string', value: date.toUTCString() },
            { label: 'Locale string', value: date.toLocaleString() },
            { label: 'YYYY-MM-DD HH:MM:SS (UTC)', value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}` },
            { label: `YYYY-MM-DD HH:MM:SS (${timezone})`, value: `${year}-${month}-${day} ${hour}:${minute}:${second}` },
            { label: 'DD/MM/YYYY HH:MM:SS', value: `${day}/${month}/${year} ${hour}:${minute}:${second}` },
            { label: 'MM/DD/YYYY HH:MM:SS', value: `${month}/${day}/${year} ${hour}:${minute}:${second}` },
            { label: 'RFC 2822', value: date.toUTCString() },
            { label: 'Date only (YYYY-MM-DD)', value: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}` },
            { label: 'Time only (HH:MM:SS UTC)', value: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}` },
            { label: 'Day of week', value: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }) },
            { label: 'Day of year', value: getDayOfYear(date).toString() },
            { label: 'Week number (ISO)', value: getWeekNumber(date).toString() }
        ];
    }

    function getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    function getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ==========================================
    // RELATIVE TIME (FIXED)
    // ==========================================
    function getRelativeTime(date) {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const absDiff = Math.abs(diffMs);
        const isFuture = diffMs > 0;

        const seconds = Math.floor(absDiff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        
        // Use actual calendar months and years for better accuracy
        const months = Math.floor(days / 30.44); // Average days per month
        const years = Math.floor(days / 365.25); // Average days per year (accounting for leap years)

        let text;
        if (seconds < 60) {
            text = `${seconds} second${seconds !== 1 ? 's' : ''}`;
        } else if (minutes < 60) {
            text = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (hours < 24) {
            text = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else if (days < 7) {
            text = `${days} day${days !== 1 ? 's' : ''}`;
        } else if (weeks < 4) {
            text = `${weeks} week${weeks !== 1 ? 's' : ''}`;
        } else if (months < 12) {
            text = `${months} month${months !== 1 ? 's' : ''}`;
        } else {
            // Ensure we never show "0 years" - if we're here, it's at least 1 year
            const finalYears = Math.max(1, years);
            text = `${finalYears} year${finalYears !== 1 ? 's' : ''}`;
        }

        return isFuture ? `in ${text}` : `${text} ago`;
    }

    // ==========================================
    // RENDER
    // ==========================================
    function renderResults(conversions) {
        resultsContainer.innerHTML = '';
        
        conversions.forEach(conv => {
            const row = document.createElement('div');
            row.className = 'ts-result-row';
            row.innerHTML = `
                <span class="ts-result-label">${conv.label}</span>
                <span class="ts-result-value">${conv.value}</span>
                <button class="ts-copy-btn" data-value="${conv.value.replace(/"/g, '&quot;')}">Copy</button>
            `;
            resultsContainer.appendChild(row);
        });

        resultsContainer.querySelectorAll('.ts-copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const value = btn.dataset.value;
                try {
                    await navigator.clipboard.writeText(value);
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
            });
        });
    }

    // ==========================================
    // MAIN PROCESS FUNCTION
    // ==========================================
    function process() {
        errorEl.style.display = 'none';
        const input = inputEl.value.trim();

        if (!input) {
            currentDate = null;
            resultsContainer.innerHTML = '<p class="ts-empty">Enter a timestamp above to see all conversions.</p>';
            detectedFormatEl.textContent = 'Detected format: none';
            relativeSection.style.display = 'none';
            return;
        }

        const { date, format } = parseTimestamp(input);

        if (!date) {
            detectedFormatEl.textContent = 'Detected format: unrecognized';
            errorEl.textContent = 'Could not parse the input. Please enter a valid Unix timestamp, ISO 8601 string, or date format.';
            errorEl.style.display = 'block';
            resultsContainer.innerHTML = '';
            relativeSection.style.display = 'none';
            currentDate = null;
            return;
        }

        currentDate = date;
        detectedFormatEl.textContent = `Detected format: ${format}`;

        const timezone = timezoneSelect.value === 'local' 
            ? Intl.DateTimeFormat().resolvedOptions().timeZone 
            : timezoneSelect.value;

        const conversions = getConversions(date, timezone);
        renderResults(conversions);

        relativeTextEl.textContent = getRelativeTime(date);
        relativeSection.style.display = '';
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    inputEl.addEventListener('input', process);

    timezoneSelect.addEventListener('change', () => {
        if (currentDate) process();
    });

    setNowBtn.addEventListener('click', () => {
        const now = new Date();
        inputEl.value = Math.floor(now.getTime() / 1000).toString();
        process();
    });

    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    process();
});
