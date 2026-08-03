let liveChart = null;
let chartLabels = ["12:00", "12:05", "12:10", "12:15", "12:20", "12:25", "12:30"];
let chartDataPoints = [0, 0, 0, 0, 0, 0, 0];
let port, reader;
let isConnected = false;

document.addEventListener('DOMContentLoaded', () => {
    initLiveChart();
    renderPills(0);

    generateFloatingParticles();

    document.querySelectorAll('.side-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.side-nav .nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('href');
            handleNavigation(target);
        });
    });

    document.getElementById('serialConnectBtn').addEventListener('click', connectESP8266Serial);

    document.getElementById('emergencyBtn').addEventListener('click', () => {
        updateSensorState(950, 'danger', 'CRITICAL', 'Emergency manual override triggered.');
    });

    document.getElementById('simulateBtn').addEventListener('click', () => {
        const randomSimVal = Math.floor(Math.random() * 600) + 50;
        let state = 'safe';
        let title = 'Safe';
        let desc = 'Air quality is within normal range.';
        if (randomSimVal >= 400 && randomSimVal < 800) {
            state = 'warning';
            title = 'Warning';
            desc = 'Elevated gas density logged. Ventilation active.';
        } else if (randomSimVal >= 800) {
            state = 'danger';
            title = 'Hazard';
            desc = 'Critical concentrations detected!';
        }
        updateSensorState(randomSimVal, state, title, desc);
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        updateSensorState(45, 'safe', 'Safe', 'System normalized and monitoring.');
    });
});

function handleNavigation(target) {
    if (target === '#home') {
        console.log("Switched to Dashboard View");
    } else if (target === '#hardware') {
        alert("ESP8266 Link Status: Check USB Serial or Wi-Fi connection parameters.");
    } else if (target === '#alerts') {
        alert("Alert Threshold Configuration: Currently set to Warn >= 400ppm, Hazard >= 800ppm.");
    } else if (target === '#settings') {
        alert("System Settings: Adjust baud rate, calibration offsets, or notification parameters here.");
    }
}

function generateFloatingParticles() {
    const container = document.getElementById('particleContainer');
    if (!container) return;
    for (let i = 0; i < 8; i++) {
        const span = document.createElement('span');
        span.className = 'particle';
        span.style.left = `${Math.random() * 95}%`;
        span.style.animationDuration = `${10 + Math.random() * 10}s`;
        span.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(span);
    }
}

async function connectESP8266Serial() {
    if (!('serial' in navigator)) {
        alert('Web Serial API is not supported by your browser. Please use Google Chrome or Edge.');
        return;
    }

    try {
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        
        isConnected = true;
        updateConnectionUI(true);
        readSerialData();
    } catch (error) {
        console.error('Serial connection error:', error);
        isConnected = false;
        updateConnectionUI(false);
    }
}

async function readSerialData() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
        let buffer = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (let line of lines) {
                parseESPData(line.trim());
            }
        }
    } catch (error) {
        console.error('Error reading serial data:', error);
    } finally {
        reader.releaseLock();
    }
}

function parseESPData(dataString) {
    let ppmVal = 0;
    if (dataString.startsWith("PPM:")) {
        ppmVal = parseInt(dataString.split(":")[1]);
    } else {
        ppmVal = parseInt(dataString);
    }

    if (!isNaN(ppmVal)) {
        let state = 'safe';
        let title = 'Safe';
        let desc = 'ESP8266 sensor reporting normal range.';

        if (ppmVal >= 400 && ppmVal < 800) {
            state = 'warning';
            title = 'Warning';
            desc = 'ESP8266 detected moderate gas increase.';
        } else if (ppmVal >= 800) {
            state = 'danger';
            title = 'Hazard';
            desc = 'ESP8266 detected critical hazard levels!';
        }

        updateSensorState(ppmVal, state, title, desc);
    }
}

function updateConnectionUI(connected) {
    const badge = document.getElementById('connectionBadge');
    const text = document.getElementById('connectionText');
    const wifiIcon = document.getElementById('wifiIcon');
    const btn = document.getElementById('serialConnectBtn');

    if (connected) {
        badge.className = 'connection-badge connected';
        text.textContent = 'ESP8266 Connected';
        wifiIcon.style.color = 'var(--accent-green)';
        btn.textContent = 'Connected USB';
    } else {
        badge.className = 'connection-badge disconnected';
        text.textContent = 'ESP8266 Offline';
        wifiIcon.style.color = 'var(--text-muted)';
        btn.textContent = 'Connect USB';
    }
}

function renderPills(ppm) {
    const container = document.getElementById('sensorPillsContainer');
    container.innerHTML = '';

    const pill = document.createElement('div');
    pill.className = 'sensor-pill';
    
    let dotClass = 'green';
    if (ppm >= 400 && ppm < 800) dotClass = 'yellow';
    if (ppm >= 800) dotClass = 'red';

    pill.innerHTML = `
        <div class="dot-status ${dotClass}"></div>
        <span>ESP8266 Node</span>
        <span style="color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">${ppm} ppm</span>
    `;
    container.appendChild(pill);
}

function updateSensorState(ppm, statusType, titleText, descText) {
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const currentPpm = document.getElementById('currentPpm');
    const mainCard = document.getElementById('mainCard');
    const ambientGlow = document.getElementById('ambientGlow');

    statusTitle.classList.remove('pulse-text');
    void statusTitle.offsetWidth; 
    statusTitle.classList.add('pulse-text');

    statusTitle.textContent = titleText;
    statusDesc.textContent = descText;
    currentPpm.textContent = ppm;

    const now = new Date();
    document.getElementById('timestampText').textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    let fillPercent = (ppm / 1500) * 100;
    if (fillPercent > 100) fillPercent = 100;
    
    const sliderFill = document.getElementById('sliderFill');
    sliderFill.style.width = `${fillPercent}%`;

    const statusIconBox = document.getElementById('statusIconBox');
    const heroIcon = document.getElementById('heroIcon');

    mainCard.className = 'card status-display-card';
    if (statusType === 'safe') {
        sliderFill.style.backgroundColor = 'var(--accent-green)';
        statusIconBox.style.background = 'rgba(34, 197, 94, 0.2)';
        statusIconBox.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        statusIconBox.style.color = 'var(--accent-green)';
        heroIcon.className = 'fa-solid fa-heart-pulse';
        ambientGlow.style.background = 'radial-gradient(circle, rgba(34, 197, 94, 0.18) 0%, rgba(0, 0, 0, 0) 70%)';
    } else if (statusType === 'warning') {
        sliderFill.style.backgroundColor = 'var(--accent-yellow)';
        statusIconBox.style.background = 'rgba(245, 158, 11, 0.2)';
        statusIconBox.style.borderColor = 'rgba(245, 158, 11, 0.5)';
        statusIconBox.style.color = 'var(--accent-yellow)';
        heroIcon.className = 'fa-solid fa-triangle-exclamation';
        ambientGlow.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(0, 0, 0, 0) 70%)';
    } else {
        sliderFill.style.backgroundColor = 'var(--accent-red)';
        statusIconBox.style.background = 'rgba(239, 68, 68, 0.2)';
        statusIconBox.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        statusIconBox.style.color = 'var(--accent-red)';
        heroIcon.className = 'fa-solid fa-radiation';
        mainCard.classList.add('state-danger');
        ambientGlow.style.background = 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(0, 0, 0, 0) 70%)';
    }

    renderPills(ppm);
    updateChartStream(ppm);
}

function initLiveChart() {
    const ctx = document.getElementById('liveGasChart').getContext('2d');
    
    liveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartDataPoints,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#06b6d4',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

function updateChartStream(newVal) {
    if (!liveChart) return;
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    chartLabels.shift();
    chartLabels.push(timeLabel);
    
    chartDataPoints.shift();
    chartDataPoints.push(newVal);
    
    liveChart.update('none');
}
