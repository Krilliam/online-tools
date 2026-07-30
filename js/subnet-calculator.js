document.addEventListener('DOMContentLoaded', () => {
    const ipInput = document.getElementById('subnet-ip');
    const cidrSelect = document.getElementById('subnet-cidr');
    const errorMsg = document.getElementById('subnet-error');
    const resultsDiv = document.getElementById('subnet-results');
    
    // Popolate CIDR dropdown (1 to 32)
    for (let i = 1; i <= 32; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `/${i}`;
        if (i === 24) option.selected = true;
        cidrSelect.appendChild(option);
    }

    function ipToInt(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    }

    function intToIp(int) {
        return [
            (int >>> 24) & 255,
            (int >>> 16) & 255,
            (int >>> 8) & 255,
            int & 255
        ].join('.');
    }

    function toBinary(ip) {
        return ip.split('.').map(octet => parseInt(octet, 10).toString(2).padStart(8, '0')).join('.');
    }

    function calculate() {
        const ip = ipInput.value.trim();
        const cidr = parseInt(cidrSelect.value, 10);
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

        if (!ipRegex.test(ip)) {
            errorMsg.style.display = 'block';
            resultsDiv.style.opacity = '0.5';
            resultsDiv.style.pointerEvents = 'none';
            return;
        }

        errorMsg.style.display = 'none';
        resultsDiv.style.opacity = '1';
        resultsDiv.style.pointerEvents = 'auto';

        const ipInt = ipToInt(ip);
        const maskInt = (-1 << (32 - cidr)) >>> 0;
        const networkInt = (ipInt & maskInt) >>> 0;
        const broadcastInt = (ipInt | ~maskInt) >>> 0;
        
        const totalHosts = Math.pow(2, 32 - cidr);
        let usableHosts = totalHosts - 2;
        if (cidr === 32) usableHosts = 1;
        else if (cidr === 31) usableHosts = 2;

        const firstHostInt = cidr >= 31 ? networkInt : (networkInt + 1) >>> 0;
        const lastHostInt = cidr >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;

        // Update DOM
        document.getElementById('res-network').textContent = intToIp(networkInt);
        document.getElementById('res-broadcast').textContent = intToIp(broadcastInt);
        document.getElementById('res-mask').textContent = intToIp(maskInt);
        document.getElementById('res-first').textContent = intToIp(firstHostInt);
        document.getElementById('res-last').textContent = intToIp(lastHostInt);
        document.getElementById('res-total').textContent = totalHosts.toLocaleString();
        document.getElementById('res-usable').textContent = usableHosts.toLocaleString();

        // Binary representation
        const binIp = toBinary(ip);
        const binMask = toBinary(intToIp(maskInt));
        const binNet = toBinary(intToIp(networkInt));
        
        document.getElementById('binary-output').textContent = 
            `IP:     ${binIp}\n` +
            `Mask:   ${binMask}\n` +
            `Network:${binNet}`;
    }

    // Event listeners
    ipInput.addEventListener('input', calculate);
    cidrSelect.addEventListener('change', calculate);

    // Copy individual rows
    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.dataset.target;
            const text = document.getElementById(targetId).textContent;
            await copyFeedback(btn, text);
        });
    });

    // Copy all
    document.getElementById('copy-all-btn').addEventListener('click', async () => {
        const rows = document.querySelectorAll('.result-row');
        let text = 'Subnet Calculation Results:\n';
        rows.forEach(row => {
            const label = row.querySelector('.result-label').textContent;
            const value = row.querySelector('.result-value').textContent;
            text += `${label}: ${value}\n`;
        });
        const btn = document.getElementById('copy-all-btn');
        await copyFeedback(btn, text);
    });

    async function copyFeedback(btn, text) {
        try {
            await navigator.clipboard.writeText(text);
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = original;
                btn.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Copy failed', err);
        }
    }

    // Initial calculation
    calculate();
});
