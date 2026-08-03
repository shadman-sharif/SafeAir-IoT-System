document.addEventListener('DOMContentLoaded', () => {
    const connectionBadge = document.getElementById('connectionBadge');
    const connectionText = document.getElementById('connectionText');
    const serialConnectBtn = document.getElementById('serialConnectBtn');
    const currentPpmEl = document.getElementById('currentPpm');
    const timestampText = document.getElementById('timestampText');
    const sliderFill = document.getElementById('sliderFill');
    const statusTitle = document.getElementById('statusTitle');
    const statusDesc = document.getElementById('statusDesc');
    const heroIcon = document.getElementById('heroIcon');
    const statusIconBox = document.getElementById('statusIconBox');
    const mainCard = document.getElementById('mainCard');
    const ambientGlow = document.getElementById('ambientGlow');
    const wifiIcon = document.getElementById('wifiIcon');
    const sensorPillsContainer = document.getElementById('sensorPillsContainer');

    const emergencyBtn = document.getElementById('emergencyBtn');
    const simulateBtn = document.getElementById('simulateBtn');
    const resetBtn = document.getElementById('resetBtn');

    let port;
    let reader;
    let inputDone;
    let inputStream;
    let isSimulating = false;
    let simulationInterval = null;

    const initialPills = [
        { label: 'MQ-2 Gas', status: 'green', ppm: '0 ppm' },
        { label: 'ESP8266 Wi-Fi', status: 'yellow', ppm: 'Standby' },
        { label: 'System Temp', status: 'green', ppm: '28.4°C' }
    ];
    renderSensorPills(initialPills);

    const ctx = document.getElementById('liveGasChart').getContext('2d');
    const maxDataPoints = 20;
    
    const liveGasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Gas Concentration (PPM)',
                data: [],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointBackgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 200 },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8', font: { size: 10, family: 'JetBrains Mono' } }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 1000,
                    grid: { color: 'rgba(255, 255, 255, 0.08)' },
                    ticks: { color: '#94a3b8', font: { size: 10, family: 'JetBrains Mono' } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(5, 7, 12, 0.95)',
                    titleFont: { family: 'JetBrains Mono' },
                    bodyFont: { family: 'JetBrains Mono' },
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            }
        }
    });

    serialConnectBtn.addEventListener('click', async () => {
        if (!('serial' in navigator)) {
            alert('Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
            return;
        }

        try {
            if (!port) {
                port = await navigator.serial.requestPort();
                await port.open({ baudRate: 115200 });

                updateConnectionState(true);
                readSerialData();
            } else {
                await closeSerialConnection();
            }
        } catch (error) {
            console.error('Serial connection error:', error);
            updateConnectionState(false);
        }
    });

    async function readSerialData() {
        const textDecoder = new TextDecoderStream();
        inputDone = port.readable.pipeTo(textDecoder.writable);
        inputStream = textDecoder.readable;
        reader = inputStream.getReader();

        try {
            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    buffer += value;
                    let lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (let line of lines) {
                        parseIncomingData(line.trim());
                    }
                }
            }
        } catch (error) {
            console.error('Read error:', error);
        } finally {
            reader.releaseLock();
        }
    }

    async function closeSerialConnection() {
        if (reader) {
            await reader.cancel();
            await inputDone.catch(() => {});
        }
        if (port) {
            await port.close();
            port = null;
        }
        updateConnectionState(false);
    }

    function updateConnectionState(isConnected) {
        if (isConnected) {
            connectionBadge.className = 'connection-badge connected';
            connectionText.textContent = 'ESP8266 Online (USB)';
            serialConnectBtn.innerHTML = '<i class="fa-solid fa-plug-circle-xmark"></i> Disconnect';
            wifiIcon.style.color = 'var(--accent-green)';
        } else {
            connectionBadge.className = 'connection-badge disconnected';
            connectionText.textContent = 'ESP8266 Offline';
            serialConnectBtn.innerHTML = '<i class="fa-solid fa-plug"></i> Connect USB';
            wifiIcon.style.color = 'inherit';
        }
    }

    function parseIncomingData(dataStr) {
        if (!dataStr) return;
        let ppmValue = 0;

        if (dataStr.includes(':')) {
            const parts = dataStr.split(':');
            ppmValue = parseFloat(parts[1]);
        } else {
            ppmValue = parseFloat(dataStr);
        }

        if (!isNaN(ppmValue)) {
            updateDashboardValues(ppmValue);
        }
    }

    function updateDashboardValues(ppm) {
        const timeString = new Date().toLocaleTimeString();
        currentPpmEl.textContent = Math.round(ppm);
        timestampText.textContent = `Synced at ${timeString}`;

        const sliderPct = Math.min(Math.max((ppm / 2000) * 100, 2), 100);
        sliderFill.style.width = `${sliderPct}%`;

        if (ppm < 400) {
            setSafeState(ppm);
        } else if (ppm >= 400 && ppm < 800) {
            setWarningState(ppm);
        } else {
            setDangerState(ppm);
        }

        updateChart(timeString, ppm);
    }

    function setSafeState(ppm) {
        statusTitle.textContent = 'Safe';
        statusDesc.textContent = 'Air quality levels are normal. No hazardous gas detected.';
        heroIcon.className = 'fa-solid fa-shield-heart';
        statusIconBox.style.background = 'rgba(34, 197, 94, 0.2)';
        statusIconBox.style.borderColor = 'rgba(34, 197, 94, 0.6)';
        statusIconBox.style.color = 'var(--accent-green)';
        statusIconBox.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.3)';
        sliderFill.style.background = 'var(--accent-green)';
        sliderFill.style.boxShadow = '0 0 10px var(--accent-green)';
        ambientGlow.style.background = 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(0, 0, 0, 0) 70%)';
        mainCard.classList.remove('state-danger');
        updateChartColor('#22c55e', 'rgba(34, 197, 94, 0.15)');
        updateSensorPillsStatus('green', `${Math.round(ppm)} ppm`);
    }

    function setWarningState(ppm) {
        statusTitle.textContent = 'Caution';
        statusDesc.textContent = 'Elevated gas concentration detected. Monitor area closely.';
        heroIcon.className = 'fa-solid fa-triangle-exclamation';
        statusIconBox.style.background = 'rgba(245, 158, 11, 0.2)';
        statusIconBox.style.borderColor = 'rgba(245, 158, 11, 0.6)';
        statusIconBox.style.color = 'var(--accent-yellow)';
        statusIconBox.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.3)';
        sliderFill.style.background = 'var(--accent-yellow)';
        sliderFill.style.boxShadow = '0 0 10px var(--accent-yellow)';
        ambientGlow.style.background = 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(0, 0, 0, 0) 70%)';
        mainCard.classList.remove('state-danger');
        updateChartColor('#f59e0b', 'rgba(245, 158, 11, 0.15)');
        updateSensorPillsStatus('yellow', `${Math.round(ppm)} ppm`);
    }

    function setDangerState(ppm) {
        statusTitle.textContent = 'Danger!';
        statusDesc.textContent = 'CRITICAL GAS SPIKE! Immediate ventilation or evacuation required!';
        heroIcon.className = 'fa-solid fa-radiation';
        statusIconBox.style.background = 'rgba(239, 68, 68, 0.25)';
        statusIconBox.style.borderColor = 'rgba(239, 68, 68, 0.8)';
        statusIconBox.style.color = 'var(--accent-red)';
        statusIconBox.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.5)';
        sliderFill.style.background = 'var(--accent-red)';
        sliderFill.style.boxShadow = '0 0 12px var(--accent-red)';
        ambientGlow.style.background = 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(0, 0, 0, 0) 70%)';
        mainCard.classList.add('state-danger');
        updateChartColor('#ef4444', 'rgba(239, 68, 68, 0.15)');
        updateSensorPillsStatus('red', `${Math.round(ppm)} ppm`);
    }

    function updateChart(label, value) {
        liveGasChart.data.labels.push(label);
        liveGasChart.data.datasets[0].data.push(value);

        if (liveGasChart.data.labels.length > maxDataPoints) {
            liveGasChart.data.labels.shift();
            liveGasChart.data.datasets[0].data.shift();
        }
        liveGasChart.update();
    }

    function updateChartColor(borderColor, bgColor) {
        liveGasChart.data.datasets[0].borderColor = borderColor;
        liveGasChart.data.datasets[0].pointBackgroundColor = borderColor;
        liveGasChart.data.datasets[0].backgroundColor = bgColor;
    }

    function renderSensorPills(pills) {
        sensorPillsContainer.innerHTML = pills.map(p => `
            <div class="sensor-pill">
                <span class="dot-status ${p.status}"></span>
                <span>${p.label}: <strong>${p.ppm}</strong></span>
            </div>
        `).join('');
    }

    function updateSensorPillsStatus(statusColor, ppmText) {
        const pills = [
            { label: 'MQ-2 Gas', status: statusColor, ppm: ppmText },
            { label: 'ESP8266 Wi-Fi', status: port ? 'green' : 'yellow', ppm: port ? 'Connected' : 'Standby' },
            { label: 'System Temp', status: 'green', ppm: '28.4°C' }
        ];
        renderSensorPills(pills);
    }

    emergencyBtn.addEventListener('click', () => {
        stopSimulation();
        updateDashboardValues(1650);
    });

    simulateBtn.addEventListener('click', () => {
        if (isSimulating) {
            stopSimulation();
            simulateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Simulate data';
            simulateBtn.style.background = 'rgba(245, 158, 11, 0.2)';
        } else {
            startSimulation();
            simulateBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Simulation';
            simulateBtn.style.background = 'rgba(245, 158, 11, 0.4)';
        }
    });

    resetBtn.addEventListener('click', () => {
        stopSimulation();
        simulateBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Simulate data';
        simulateBtn.style.background = 'rgba(245, 158, 11, 0.2)';
        updateDashboardValues(120);
    });

    function startSimulation() {
        isSimulating = true;
        let basePpm = 250;
        simulationInterval = setInterval(() => {
            let delta = (Math.random() - 0.45) * 80;
            basePpm = Math.min(Math.max(basePpm + delta, 80), 1300);
            updateDashboardValues(basePpm);
        }, 1500);
    }

    function stopSimulation() {
        isSimulating = false;
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    }
});
