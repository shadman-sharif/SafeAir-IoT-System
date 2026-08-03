# SafeAir - ESP8266 IoT Gas Detection Dashboard

A modern, high-performance, real-time IoT web dashboard designed to monitor gas concentration telemetry (PPM) from an ESP8266 microcontroller. Featuring a glassmorphism dark-mode UI, live Chart.js data streaming, Web Serial API hardware integration, and responsive sidebar navigation.

---

## Features

* **Real-Time Hardware Telemetry:** Connects directly to your ESP8266 board over USB via the browser's Web Serial API at 115200 baud.
* **Live Charting:** Dynamic, smooth-scrolling data visualization powered by Chart.js.
* **Dynamic Status Indication:** Automatically shifts visual states (Safe, Warning, Critical Hazard) based on PPM thresholds with ambient glow effects.
* **Interactive Controls:** Includes simulation toggles, manual emergency overrides, and system reset commands.
* **Modern UI/UX:** Built with CSS glassmorphism, responsive grid layouts, custom typography (*Plus Jakarta Sans* & *JetBrains Mono*), and floating ambient particle animations.

---

## Project Structure

```text
├── index.html   # Main dashboard layout and component markup
├── style.css    # Custom styling, variables, animations, and glassmorphism effects
└── script.js    # Web Serial API handler, data parser, chart logic, and UI controllers
