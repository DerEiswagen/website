/**
 * Der Eiswagen — Serving Cold Beats
 * Interactive Frontend Controller & Audio Synthesis Engine
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       1. UI Selectors
       ========================================== */
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.menu-section');
    const playlistItems = document.querySelectorAll('.playlist-item');
    const bookingForm = document.getElementById('booking-form');
    const toast = document.getElementById('toast-message');

    // Whiteboard / Player controls
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playSvg = document.getElementById('play-svg');
    const pauseSvg = document.getElementById('pause-svg');
    const currentTrackText = document.getElementById('current-track');
    const playerStatusText = document.getElementById('player-status');
    const timerDisplay = document.getElementById('timer-display');

    /* ==========================================
       2. Sidebar Drawer Navigation
       ========================================== */
    function toggleSidebar() {
        sidebarMenu.classList.toggle('open');
    }

    menuToggle.addEventListener('click', toggleSidebar);
    closeMenu.addEventListener('click', toggleSidebar);

    // Switch between sections inside the drawer
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update nav links active class
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show target section
            const targetSection = item.getAttribute('data-section');
            sections.forEach(sec => {
                sec.classList.remove('active-section');
                if (sec.id === `section-${targetSection}`) {
                    sec.classList.add('active-section');
                }
            });
        });
    });

    /* ==========================================
       3. Google Sheets Live Events Integration
       ========================================== */
    const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2kXVooaxeclIuN_nraihakRFcU_FGNwlfVlFpMQ_7V9SWSsVdUWfe7hnbMMFVe9uT_g6NR-q4qdns/pub?output=csv";

    const eventDateEl = document.getElementById('event-date');
    const eventTimeEl = document.getElementById('event-time');
    const eventTitleEl = document.getElementById('event-title');
    const eventGenresEl = document.getElementById('event-genres');
    const eventLocationEl = document.getElementById('event-location');
    const tourListEl = document.getElementById('tour-list');

    function parseCSVLine(line) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                result.push(cur);
                cur = '';
            } else {
                cur += c;
            }
        }
        result.push(cur);
        return result;
    }

    function parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];

        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('datum'));
        const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('zeit') || h.includes('uhrzeit'));
        const titleIdx = headers.findIndex(h => h.includes('titel') || h.includes('title') || h.includes('name'));
        const genresIdx = headers.findIndex(h => h.includes('genre') || h.includes('desc') || h.includes('beschreibung'));
        const locIdx = headers.findIndex(h => (h.includes('location') || h.includes('ort') || h.includes('platz')) && !h.includes('link') && !h.includes('url'));
        const linkIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('map'));

        const events = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = parseCSVLine(lines[i]);
            const dateStr = (dateIdx >= 0 && row[dateIdx] ? row[dateIdx] : '').trim();
            const timeStr = (timeIdx >= 0 && row[timeIdx] ? row[timeIdx] : '').trim();
            const titleStr = (titleIdx >= 0 && row[titleIdx] ? row[titleIdx] : '').trim();
            const genresStr = (genresIdx >= 0 && row[genresIdx] ? row[genresIdx] : '').trim();
            const locStr = (locIdx >= 0 && row[locIdx] ? row[locIdx] : '').trim();
            const linkStr = (linkIdx >= 0 && row[linkIdx] ? row[linkIdx] : '').trim();

            if (!dateStr && !locStr && !titleStr) continue;

            const { start, end } = parseEventDateTime(dateStr, timeStr);

            events.push({
                dateStr,
                time: timeStr || '16:00 - 20:00',
                title: titleStr || 'Live DJ Set',
                genres: genresStr,
                location: locStr || titleStr || 'München',
                locationLink: linkStr || (locStr ? `https://maps.google.com/?q=${encodeURIComponent(locStr + ' München')}` : 'https://maps.google.com/?q=Muenchen'),
                start,
                end
            });
        }

        return events;
    }

    function parseEventDateTime(dateStr, timeStr) {
        if (!dateStr) {
            return { start: new Date(8640000000000000), end: new Date(8640000000000000) };
        }

        let year, month, day;
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        } else if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
        } else {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                year = d.getFullYear();
                month = d.getMonth();
                day = d.getDate();
            } else {
                return { start: new Date(8640000000000000), end: new Date(8640000000000000) };
            }
        }

        let startH = 12, startM = 0;
        let endH = 23, endM = 59;

        if (timeStr) {
            const times = timeStr.match(/(\d{1,2})[:.](\d{2})/g);
            if (times && times.length >= 1) {
                const sParts = times[0].replace('.', ':').split(':');
                startH = parseInt(sParts[0], 10);
                startM = parseInt(sParts[1], 10);

                if (times.length >= 2) {
                    const eParts = times[1].replace('.', ':').split(':');
                    endH = parseInt(eParts[0], 10);
                    endM = parseInt(eParts[1], 10);
                } else {
                    endH = Math.min(23, startH + 3);
                    endM = startM;
                }
            }
        }

        const start = new Date(year, month, day, startH, startM, 0);
        const end = new Date(year, month, day, endH, endM, 59);
        return { start, end };
    }

    function getEventTag(startDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const diffDays = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'HEUTE';
        if (diffDays === 1) return 'MORGEN';

        const weekdays = ['SONNTAG', 'MONTAG', 'DIENSTAG', 'MITTWOCH', 'DONNERSTAG', 'FREITAG', 'SAMSTAG'];
        if (diffDays > 1 && diffDays < 7) {
            return weekdays[startDate.getDay()];
        }

        const d = String(startDate.getDate()).padStart(2, '0');
        const m = String(startDate.getMonth() + 1).padStart(2, '0');
        const shortDays = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
        return `${shortDays[startDate.getDay()]}, ${d}.${m}.`;
    }

    async function loadGoogleSheetEvents() {
        try {
            const fetchUrl = `${GOOGLE_SHEETS_CSV_URL}&_nocache=${Date.now()}`;
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const csvText = await response.text();
            const allEvents = parseCSV(csvText);

            if (!allEvents || allEvents.length === 0) return;

            const now = new Date();
            // Filter upcoming events (where end time is >= current time)
            let upcoming = allEvents.filter(ev => ev.end >= now);

            // Sort by start date & time ascending
            upcoming.sort((a, b) => a.start - b.start);

            // If no future events exist, display all events sorted chronologically
            const displayEvents = upcoming.length > 0 ? upcoming : allEvents.sort((a, b) => a.start - b.start);

            // 1. Update Whiteboard with the next upcoming event
            const nextEvent = displayEvents[0];
            if (nextEvent) {
                if (eventDateEl) {
                    if (nextEvent.start && !isNaN(nextEvent.start.getTime()) && nextEvent.start.getFullYear() < 3000) {
                        const d = String(nextEvent.start.getDate()).padStart(2, '0');
                        const m = String(nextEvent.start.getMonth() + 1).padStart(2, '0');
                        const y = nextEvent.start.getFullYear();
                        eventDateEl.textContent = `${d}.${m}.${y}`;
                    } else {
                        eventDateEl.textContent = nextEvent.dateStr || '';
                    }
                }
                if (eventTimeEl) eventTimeEl.textContent = nextEvent.time;
                if (eventTitleEl) eventTitleEl.textContent = nextEvent.title;
                if (eventGenresEl) eventGenresEl.textContent = nextEvent.genres || '';
                if (eventLocationEl) {
                    eventLocationEl.innerHTML = `
                        ${nextEvent.location}
                        <svg viewBox="0 0 24 24" class="location-pin">
                            <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    `;
                    if (nextEvent.locationLink) {
                        eventLocationEl.href = nextEvent.locationLink;
                    }
                }
            }

            // 2. Update Tour Dates in the Menu (Up to 3 upcoming events)
            if (tourListEl) {
                const menuEvents = displayEvents.slice(0, 3);
                tourListEl.innerHTML = menuEvents.map((ev, index) => {
                    const tag = getEventTag(ev.start);
                    const isCurrent = index === 0;
                    const genresHtml = ev.genres ? `<small class="row-desc row-genres">${ev.genres}</small>` : '';
                    const locHtml = ev.location ? `<small class="row-desc row-loc">${ev.location}</small>` : '';

                    return `
                        <li>
                            <a href="${ev.locationLink}" target="_blank" rel="noopener noreferrer" class="vintage-menu-row ${isCurrent ? 'current-stop' : ''}">
                                <div class="row-left">
                                    <span class="row-tag">${tag}</span>
                                    <span class="row-title">${ev.title}</span>
                                    ${genresHtml}
                                    ${locHtml}
                                </div>
                                <div class="row-dots"></div>
                                <div class="row-price">${ev.time}</div>
                            </a>
                        </li>
                    `;
                }).join('');
            }

        } catch (err) {
            console.warn('Could not load events from Google Sheet:', err);
            if (eventTitleEl) eventTitleEl.textContent = 'hier könnte Ihre Werbung stehen';
            if (eventDateEl) eventDateEl.textContent = '--.--.----';
            if (eventTimeEl) eventTimeEl.textContent = '--:--';
            if (eventGenresEl) eventGenresEl.textContent = '';
            if (eventLocationEl) eventLocationEl.innerHTML = 'München';
        }
    }

    // Load events on startup
    loadGoogleSheetEvents();

    /* ==========================================
       4. Booking Form & Notifications
       ========================================== */
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientName = document.getElementById('name').value;
        
        showToast(`🍦 Danke ${clientName}! Deine Anfrage wurde gesendet.`);
        bookingForm.reset();
        
        // Auto-close sidebar after submission
        setTimeout(() => {
            sidebarMenu.classList.remove('open');
        }, 1500);
    });

    // Social Links Toasts
    document.getElementById('btn-telegram').addEventListener('click', (e) => {
        e.preventDefault();
        showToast("💬 Öffne Telegram-Kanal von Der Eiswagen...");
    });
    
    document.getElementById('btn-instagram').addEventListener('click', (e) => {
        e.preventDefault();
        showToast("📸 Öffne Instagram-Profil von Der Eiswagen...");
    });

    /* ==========================================
       5. Web Audio API Lo-Fi Synth & Playlist Engine
       ========================================== */
    class EiswagenAudioEngine {
        constructor() {
            this.ctx = null;
            this.isPlaying = false;
            this.currentTrackId = 0;
            this.schedulerTimerId = null;
            this.tempo = 72; // BPM
            this.nextNoteTime = 0.0;
            this.currentBeat = 0;
            
            // Gain nodes
            this.masterVolume = null;
            this.crackleVolume = null;
            
            // Tracks configuration
            this.tracks = [
                {
                    name: "Cold Beats Session #1 (Ambient Lo-Fi)",
                    tempo: 72,
                    chords: [
                        [57, 60, 64, 67], // Am7 (A3, C4, E4, G4)
                        [50, 53, 57, 60], // Dm7 (D3, F3, A3, C4)
                        [55, 59, 62, 65], // G7 (G3, B3, D4, F4)
                        [48, 52, 55, 59]  // Cmaj7 (C3, E3, G3, B3)
                    ],
                    bassline: [45, 38, 43, 36], // Bass notes matching chords
                    drumPattern: ['K', 'H', 'S', 'H', 'K', 'H', 'S', 'H'] // K=Kick, H=Hat, S=Snare
                },
                {
                    name: "Sunny Gelato Mix (Chill Deep House)",
                    tempo: 112,
                    chords: [
                        [53, 57, 60, 64], // Fmaj7
                        [55, 59, 62, 65], // G7
                        [57, 60, 64, 67], // Am7
                        [57, 60, 64, 67]  // Am7
                    ],
                    bassline: [41, 43, 45, 45],
                    drumPattern: ['K', 'H', 'KS', 'H', 'K', 'H', 'KS', 'H']
                },
                {
                    name: "Midnight Scoop (Synthwave Lounge)",
                    tempo: 90,
                    chords: [
                        [50, 53, 57, 61], // DmMaj7
                        [46, 50, 53, 57], // Bbmaj7
                        [48, 52, 55, 58], // C7
                        [50, 53, 57, 60]  // Dm7
                    ],
                    bassline: [38, 34, 36, 38],
                    drumPattern: ['K', 'H', 'S', 'H', 'K', 'K', 'S', 'H']
                }
            ];
        }

        initContext() {
            if (!this.ctx) {
                // Initialize standard context or webkit version
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Set up volume control
                this.masterVolume = this.ctx.createGain();
                this.masterVolume.gain.value = 0.45; // Safe default volume
                this.masterVolume.connect(this.ctx.destination);
                
                // Add ambient vinyl crackle
                this.setupVinylCrackle();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        setupVinylCrackle() {
            const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            // Fill buffer with static pink/white noise crackle
            for (let i = 0; i < bufferSize; i++) {
                let white = Math.random() * 2 - 1;
                // Add pop sound intermittently
                let pop = Math.random() > 0.9995 ? (Math.random() > 0.5 ? 0.3 : -0.3) : 0;
                output[i] = white * 0.015 + pop;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuffer;
            noise.loop = true;
            
            // Filter noise to sound warm & low
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1000;
            filter.Q.value = 0.5;
            
            this.crackleVolume = this.ctx.createGain();
            this.crackleVolume.gain.value = 0.12; // crackle volume
            
            noise.connect(filter);
            filter.connect(this.crackleVolume);
            this.crackleVolume.connect(this.masterVolume);
            noise.start(0);
            this.vinylSource = noise;
        }

        playKick(time) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterVolume);

            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);

            gain.gain.setValueAtTime(1.0, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

            osc.start(time);
            osc.stop(time + 0.16);
        }

        playSnare(time) {
            // White noise burst for snare body
            const bufferSize = this.ctx.sampleRate * 0.18;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = noiseBuffer;

            // Bandpass filter to make it snare-like
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 950;
            filter.Q.value = 1.8;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.35, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

            noiseNode.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            noiseNode.start(time);
            noiseNode.stop(time + 0.18);
        }

        playHihat(time) {
            // Tiny white noise burst for hi-hat
            const bufferSize = this.ctx.sampleRate * 0.04;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 8000;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.07, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

            noiseNode.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterVolume);

            noiseNode.start(time);
            noiseNode.stop(time + 0.04);
        }

        // Plays chords synth
        playChord(notes, time, duration) {
            const voices = [];
            
            // We use standard triangle waves for a cozy, round Rhodes-like sound
            notes.forEach(midiNote => {
                const osc = this.ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(this.midiToFreq(midiNote), time);
                
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.0, time);
                // Soft attack
                gain.gain.linearRampToValueAtTime(0.09, time + 0.08);
                // Long sustain decay
                gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.05);

                // Add a lowpass filter to warm the synth
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 650;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterVolume);

                osc.start(time);
                osc.stop(time + duration);
                voices.push(osc);
            });
        }

        // Plays bass note
        playBass(midiNote, time, duration) {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(this.midiToFreq(midiNote), time);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.0, time);
            gain.gain.linearRampToValueAtTime(0.18, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);

            osc.connect(gain);
            gain.connect(this.masterVolume);

            osc.start(time);
            osc.stop(time + duration);
        }

        midiToFreq(midi) {
            return 440 * Math.pow(2, (midi - 69) / 12);
        }

        scheduler() {
            const lookahead = 0.1; // schedule notes 100ms early
            const scheduleInterval = 25.0; // run scheduler every 25ms

            while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
                this.scheduleBeat(this.currentBeat, this.nextNoteTime);
                this.advanceBeat();
            }

            this.schedulerTimerId = setTimeout(() => this.scheduler(), scheduleInterval);
        }

        scheduleBeat(beatIndex, time) {
            const track = this.tracks[this.currentTrackId];
            const pattern = track.drumPattern;
            const currentElement = pattern[beatIndex % pattern.length];
            
            // Every 8 beats is 1 measure. Chords change every measure (8 beats)
            const measureLengthBeats = 8;
            const currentMeasure = Math.floor(beatIndex / measureLengthBeats) % track.chords.length;

            // 1. Drums Scheduling
            if (currentElement.includes('K')) {
                this.playKick(time);
            }
            if (currentElement.includes('S')) {
                this.playSnare(time);
            }
            if (currentElement.includes('H')) {
                this.playHihat(time);
            }

            // 2. Chord Progression Scheduling (on beat 0 of every measure)
            if (beatIndex % measureLengthBeats === 0) {
                const chord = track.chords[currentMeasure];
                const noteDuration = (60.0 / this.tempo) * 7.5; // Lasts almost 8 beats
                this.playChord(chord, time, noteDuration);
            }

            // 3. Bassline Scheduling (on beats 0 and 4 of every measure)
            if (beatIndex % 4 === 0) {
                const bassNote = track.bassline[currentMeasure];
                const bassDuration = (60.0 / this.tempo) * 3.5; // Lasts almost 4 beats
                
                // Vary bass note slightly on beat 4 for movement
                const finalBassNote = (beatIndex % 8 === 4) ? bassNote + 7 : bassNote;
                this.playBass(finalBassNote, time, bassDuration);
            }
        }

        advanceBeat() {
            const secondsPerBeat = 60.0 / this.tempo;
            // 8th note spacing for scheduler
            this.nextNoteTime += 0.5 * secondsPerBeat; 
            this.currentBeat++;
        }

        start() {
            this.initContext();
            this.isPlaying = true;
            this.nextNoteTime = this.ctx.currentTime + 0.05;
            this.currentBeat = 0;
            this.scheduler();
        }

        stop() {
            this.isPlaying = false;
            clearTimeout(this.schedulerTimerId);
        }

        changeTrack(trackId) {
            this.currentTrackId = trackId;
            const track = this.tracks[trackId];
            this.tempo = track.tempo;
            
            if (this.isPlaying) {
                this.stop();
                this.start();
            }
        }
    }

    // Instantiate audio controller
    const audioEngine = new EiswagenAudioEngine();

    function updatePlayerUI() {
        const currentTrack = audioEngine.tracks[audioEngine.currentTrackId];
        currentTrackText.textContent = currentTrack.name;
        
        if (audioEngine.isPlaying) {
            playSvg.classList.add('hidden');
            pauseSvg.classList.remove('hidden');
            playerStatusText.textContent = `DJ Booth Live: Playing (${currentTrack.tempo} BPM)`;
            playerStatusText.style.color = '#ff007f';
        } else {
            playSvg.classList.remove('hidden');
            pauseSvg.classList.add('hidden');
            playerStatusText.textContent = "DJ Booth Offline";
            playerStatusText.style.color = '#777777';
        }
    }

    if (playPauseBtn) playPauseBtn.addEventListener('click', () => {
        try {
            if (audioEngine.isPlaying) {
                audioEngine.stop();
                showToast("⏹ DJ Set angehalten.");
            } else {
                audioEngine.start();
                showToast("🎧 DJ Set gestartet (Web Audio API Synthesizer)");
            }
            updatePlayerUI();
        } catch (e) {
            console.error(e);
            showToast("⚠️ Fehler beim Starten des Audio-Synthesizers.");
        }
    });

    // Playlist Selector logic
    playlistItems.forEach(item => {
        item.addEventListener('click', () => {
            const trackId = parseInt(item.getAttribute('data-track-id'));
            
            playlistItems.forEach(p => p.classList.remove('active-track'));
            item.classList.add('active-track');

            audioEngine.changeTrack(trackId);
            updatePlayerUI();
            
            showToast(`🎵 Gewählt: ${audioEngine.tracks[trackId].name}`);
        });
    });

    // Synchronize playbacks inside menu and dashboard
    const navBeatsBtn = document.querySelector('[data-section="beats"]');
    if (navBeatsBtn) navBeatsBtn.addEventListener('click', () => {
        // Just sync layout
    });

});
