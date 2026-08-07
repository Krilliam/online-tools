document.addEventListener('DOMContentLoaded', () => {
    const gradientTypeRadios = document.querySelectorAll('input[name="gradient-type"]');
    const linearOptions = document.getElementById('linear-options');
    const radialOptions = document.getElementById('radial-options');
    const angleSlider = document.getElementById('gradient-angle');
    const angleInput = document.getElementById('gradient-angle-input');
    const radialShape = document.getElementById('radial-shape');
    const radialPosition = document.getElementById('radial-position');
    const colorStopsContainer = document.getElementById('color-stops');
    const addStopBtn = document.getElementById('add-stop-btn');
    const previewEl = document.getElementById('gradient-preview');
    const cssOutputEl = document.getElementById('gradient-css').querySelector('code');
    const copyBtn = document.getElementById('copy-css-btn');

    let colorStops = [
        { color: '#0066cc', position: 0 },
        { color: '#00ccff', position: 100 }
    ];

    // ==========================================
    // GRADIENT TYPE SWITCHING
    // ==========================================
    function updateGradientType() {
        const type = document.querySelector('input[name="gradient-type"]:checked').value;
        if (type === 'linear') {
            linearOptions.style.display = '';
            radialOptions.style.display = 'none';
        } else {
            linearOptions.style.display = 'none';
            radialOptions.style.display = '';
        }
        updateGradient();
    }

    // ==========================================
    // COLOR STOPS MANAGEMENT
    // ==========================================
    function renderColorStops() {
        colorStopsContainer.innerHTML = '';
        
        colorStops.forEach((stop, index) => {
            const stopEl = document.createElement('div');
            stopEl.className = 'gradient-color-stop';
            stopEl.innerHTML = `
                <input type="color" value="${stop.color}" data-index="${index}" class="gradient-color-picker">
                <input type="range" min="0" max="100" value="${stop.position}" data-index="${index}" class="gradient-position-slider">
                <input type="number" min="0" max="100" value="${stop.position}" data-index="${index}" class="gradient-position-input">
                <span class="gradient-position-unit">%</span>
                ${colorStops.length > 2 ? `<button data-index="${index}" class="gradient-remove-btn">Remove</button>` : ''}
            `;
            colorStopsContainer.appendChild(stopEl);
        });

        // Attach event listeners
        colorStopsContainer.querySelectorAll('.gradient-color-picker').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                colorStops[index].color = e.target.value;
                updateGradient();
            });
        });

        colorStopsContainer.querySelectorAll('.gradient-position-slider').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const value = parseInt(e.target.value);
                colorStops[index].position = value;
                // Sync with number input
                const numberInput = colorStopsContainer.querySelector(`.gradient-position-input[data-index="${index}"]`);
                if (numberInput) numberInput.value = value;
                updateGradient();
            });
        });

        colorStopsContainer.querySelectorAll('.gradient-position-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                colorStops[index].position = value;
                // Sync with slider
                const slider = colorStopsContainer.querySelector(`.gradient-position-slider[data-index="${index}"]`);
                if (slider) slider.value = value;
                updateGradient();
            });
        });

        colorStopsContainer.querySelectorAll('.gradient-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                colorStops.splice(index, 1);
                renderColorStops();
                updateGradient();
            });
        });
    }

    function addColorStop() {
        // Calculate average position between last two stops
        const lastStop = colorStops[colorStops.length - 1];
        const secondLastStop = colorStops[colorStops.length - 2];
        const newPosition = Math.round((lastStop.position + secondLastStop.position) / 2);
        
        // Generate a random color
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        
        colorStops.push({ color: randomColor, position: newPosition });
        // Sort by position
        colorStops.sort((a, b) => a.position - b.position);
        renderColorStops();
        updateGradient();
    }

    // ==========================================
    // GRADIENT GENERATION
    // ==========================================
    function generateGradientCSS() {
        const type = document.querySelector('input[name="gradient-type"]:checked').value;
        
        // Sort stops by position
        const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
        const stopsString = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');

        if (type === 'linear') {
            const angle = angleInput.value;
            return `linear-gradient(${angle}deg, ${stopsString})`;
        } else {
            const shape = radialShape.value;
            const position = radialPosition.value;
            return `radial-gradient(${shape} at ${position}, ${stopsString})`;
        }
    }

    function updateGradient() {
        const gradientCSS = generateGradientCSS();
        previewEl.style.background = gradientCSS;
        cssOutputEl.textContent = `background: ${gradientCSS};`;
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    gradientTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateGradientType);
    });

    angleSlider.addEventListener('input', () => {
        angleInput.value = angleSlider.value;
        updateGradient();
    });

    angleInput.addEventListener('input', () => {
        const value = Math.max(0, Math.min(360, parseInt(angleInput.value) || 0));
        angleSlider.value = value;
        angleInput.value = value;
        updateGradient();
    });

    radialShape.addEventListener('change', updateGradient);
    radialPosition.addEventListener('change', updateGradient);

    addStopBtn.addEventListener('click', addColorStop);

    copyBtn.addEventListener('click', async () => {
        const text = cssOutputEl.textContent;
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
    renderColorStops();
    updateGradient();
});
