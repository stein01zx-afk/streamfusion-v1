(() => {
  const STORAGE_KEY = "streamfusion.realtimevoice.v1";
  const SETTINGS_KEY = "streamfusion.realtimevoice.settings.v1";
const VOICE_CATALOG = {
      verity: { label: "Verity", id: "5e503fc64ded446a9f8636b6009db547" },
      naruto: { label: "Naruto Shippuden", id: "96d74deaad0e4fd2b38308e012bcc554" },
      goku: { label: "Goku", id: "9f850ee9ada24b20a6866825eaefd3f8" },
      vegeta: { label: "Vegeta", id: "86bc0bf60af340a887cfb9629bd7047a" },
      bob_esponja: { label: "Bob Esponja", id: "2358f01cb5b940008c7449c81fff95ad" },
      calamardo: { label: "Calamardo", id: "dac19523253641b49b61b3d1d244172d" },
      patricio_estrella: { label: "Patricio Estrella", id: "d0ef732d99b1469bad26e7cc4d4f0795" },
      narrador_esqueleto: { label: "Narrador Esqueleto", id: "bdd40ec2edde4942936f9462b650cc32" },
      l_death_note: { label: "L (Death Note)", id: "c5afca9b5d034454a96e5423bb26596f" },
      light_death_note: { label: "Light (Death Note)", id: "a3469e5cae5b446ab6a85915ee14c2f8" },
      ryuk_death_note: { label: "Ryuk (Death Note)", id: "53ff84820342480786e31f1001e298e7" },
      darwin_gumball: { label: "Darwin de Gumball", id: "70dc5a496c4347bd8cd0ea1f03a40333" },
      caine_circo_digital: { label: "Caine (Circo Digital)", id: "b38d657d5c254c5a903ff38db82624f7" },
      jax_circo_digital: { label: "Jax (Circo Digital)", id: "2efc3874f31547a1adaa340f6a0f5789" },
      kratos_gow3: { label: "Kratos (GOW 3)", id: "00e9d7ee37ff43d28486b7b42cbffbe9" },
      spiderman_ultimate: { label: "Spiderman Ultimate", id: "a90258f4e6344e8fb890356a9a85a205" },
      capitan_america: { label: "Capitán América", id: "57105c5b8a0b4d16853f6e08916b746d" },
      loquendo: { label: "Loquendo", id: "f3617f37b9e4453d84d6da6324ab3510" },
      locutor: { label: "Locutor", id: "3f45a7fd7a614655a61eb7027b955783" },
      el_dui_malcolm: { label: "El Dui de Malcolm", id: "37d28ffbfe0b483da35fef6c72ad70a6" },
      ponmi_dc: { label: "Ponmi DC", id: "4d344f4a9b704b4bafa8cde7652577a3" },
      falsity: { label: "Falsity", id: "6ff20006e383497fba3aa52719c9a729" },
      alastor: { label: "Alastor", id: "b94a93bc73ee4ddc93652e3a54f2a22d" },
      denji: { label: "Denji", id: "075f4afe629b49ecabed6debd3be1190" },
      reze: { label: "Reze", id: "514d8e8fbcbf460d9cc5cf8e7655643e" },
      morty_smith: { label: "Morty Smith", id: "172802891fb24f50a4558325e48dc48d" },
      rick_sanchez: { label: "Rick Sanchez", id: "c1569d1992204996802bb99a026bf64c" },
      shrek: { label: "Shrek", id: "0bf1d759a4d342548d108fb2513413cc" },
      mario_bros: { label: "Mario Bros", id: "89b244992a804bdd99ada9ee9a8d10bb" },
      gato_con_botas: { label: "Gato con botas", id: "464ca191f6db4af6951037893e640ee4" },
      jake_el_perro: { label: "Jake el perro", id: "c84062f178574341ba5fd2cf9c17c75b" },
      fin_el_humano: { label: "Fin el humano", id: "1b668294dbaf4c31984decbabcd9bcb6" },
      rey_helado: { label: "Rey Helado", id: "ec2a5e444c88404abfbbcd9520557301" },
      mickey_mouse: { label: "Mickey Mouse", id: "a73c21076a8b47b7a17883ccb8a3e3a4" },
      kasane_teto: { label: "Kasane Teto", id: "0118a35dcb604837abe7961a43e13ba8" },
      miku_hatsune: { label: "Miku Hatsune", id: "ef1d3957caf2433db755f6cd9990e778" },
      phineas: { label: "Phineas", id: "2c595c27e6464ad3aec645ea129e6064" },
      dr_doofenshmirtz: { label: "Dr Doofenshmirtz", id: "ec480d6a1edd449f857b209c6a388e50" },
      krilin_dbz: { label: "Krilin DBZ", id: "af9e344349214d4e9b18ec760ba2f992" },
      piccoro_dbz: { label: "Piccoro DBZ", id: "bd6408c1d0b8469ea89b83c5a5b15abd" },
      missa_death_note: { label: "Missa Death Note", id: "c6aad54044814847aa2e9c272a2b4815c" },
      missasinfonia_yt: { label: "Missasinfonia YT", id: "a41ea09d4e214ef8841e47057b43f622" },
      tony_stark: { label: "Tony Stark", id: "cc5584d3bd7645b68615df1aa401f364" },
      adam_sandler: { label: "Adam Sandler", id: "61edac17635d47b3adaed31570be4902" },
      abrahaham_yt: { label: "Abrahaham YT", id: "62e4c757e0024cdba0b3f0bae795818b" },
      farid_dieck_yt: { label: "Farid Dieck YT", id: "dfa5b230c8054f429e434f4a6e9bbdec" },
      german_garmendia: { label: "German Garmendia", id: "e3dc6e29fcc94fbbb523cb2b3d7b4c62" },
      auronplay: { label: "Auronplay", id: "379d2b2fd78943bc86b94a5aca6ff35b" },
      elrubius: { label: "ElRubius", id: "39382efbc7584d428f0f789d882cd3b8" },
      fernanfloo: { label: "Fernanfloo", id: "5549e2e3308845f084af794ce31d5770" },
      ibai: { label: "Ibai", id: "dada7de849e641b79911c9c553c122b3" },
      messi: { label: "Messi", id: "18d5dcc7904945569b728b88ddf0a1a1" },
      cr7: { label: "CR7", id: "251a9aeff7eb4e789917131416ce1a0b" },
      paisana_jacinta: { label: "Paisana Jacinta", id: "61e907797ce848be99652566fe145125" },
      pible: { label: "Pible", id: "f828b14f6d2a4aa18ea77a3cfd1b9c85" },
      town: { label: "Town", id: "e8c7c137434b40adb559d6d4e96fe0bd" },
      aldeano_minecraft: { label: "Aldeano Minecraft", id: "7db6092cb252421ebd11f0f53e25d5d6" },
      woody: { label: "Woody", id: "7a7f36e4f1ae439ab6aee441b4243385" },
      buzz_lightyear: { label: "Buzz Lightyear", id: "fc156f0b530f4e759050f6ff62f61e79" },
      homero_simpson: { label: "Homero Simpson", id: "f7dbe26038174d828b15a64f4da65486" },
      bart_simpson: { label: "Bart Simpson", id: "8c367f956a4c426c8382cf1517d9dea4" },
      milo_j: { label: "Milo J", id: "654b0dfed3f441e7836d09359cef0b44" },

    };

  const $$ = (id) => document.getElementById(id);

  const els = {
    openBtn: $$("openRealtimeVoiceBtn"),
    modal: $$("realtimeVoiceModal"),
    closeBtn: $$("closeRealtimeVoiceBtn"),
    closeBtnBottom: $$("closeRealtimeVoiceBtnBottom"),
    connectBtn: $$("realtimeConnectBtn"),
    disconnectBtn: $$("realtimeDisconnectBtn"),
    micSelect: $$("realtimeMicSelect"),
    outputSelect: $$("realtimeOutputSelect"),
    voiceSearch: $$("realtimeVoiceSearch"),
    voiceSelect: $$("realtimeVoiceSelect"),
    voiceLabel: $$("realtimeVoiceLabel"),
    statePill: $$("realtimeStatePill"),
    motorPill: $$("realtimeMotorPill"),
    latencyValue: $$("realtimeLatencyValue"),
    modeValue: $$("realtimeModeValue"),
    liveText: $$("realtimeLiveText"),
    inputFill: $$("realtimeInputFill"),
    outputFill: $$("realtimeOutputFill"),
    hotkeysToggle: $$("realtimeHotkeysToggle"),
    hotkeyCaptureBtn: $$("realtimeHotkeyCaptureBtn"),
    hotkeyList: $$("realtimeHotkeyList"),
    wsUrl: $$("realtimeWsUrl"),
    directToggle: $$("realtimeDirectToggle"),
    refreshDevicesBtn: $$("realtimeRefreshDevicesBtn"),
    clearHotkeysBtn: $$("realtimeClearHotkeysBtn"),
    note: $$("realtimeNote"),
  };

  const state = loadState();
  let micStream = null;
  let micCtx = null;
  let micAnalyser = null;
  let meterAnim = 0;
  let playbackCtx = null;
  let playbackAnalyser = null;
  let playbackAudio = null;
  let recognition = null;
  let recognitionTimer = 0;
  let recognitionBuffer = "";
  let speechQueue = [];
  let speechBusy = false;
  let directSocket = null;
  let recorder = null;
  let captureShortcutForVoice = "";

  function loadState() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {};
    } catch {
      stored = {};
    }
    const base = {
      micId: "",
      outputId: "",
      voiceKey: "verity",
      hotkeysEnabled: false,
      shortcuts: {},
      wsUrl: "",
      useDirect: false,
      showHints: true,
    };
    const merged = Object.assign(base, stored || {});
    merged.shortcuts = merged.shortcuts && typeof merged.shortcuts === "object" ? merged.shortcuts : {};
    return merged;
  }

  function saveState() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        micId: state.micId,
        outputId: state.outputId,
        voiceKey: state.voiceKey,
        hotkeysEnabled: state.hotkeysEnabled,
        shortcuts: state.shortcuts,
        wsUrl: state.wsUrl,
        useDirect: state.useDirect,
        showHints: state.showHints,
      }));
    } catch {}
  }

  function voicesArray() {
    return Object.entries(VOICE_CATALOG).map(([key, voice]) => ({
      key,
      id: voice.id,
      label: voice.label,
    }));
  }

  function voiceLabel(key) {
    return VOICE_CATALOG[key]?.label || "Verity";
  }

  function voiceId(key) {
    return VOICE_CATALOG[key]?.id || VOICE_CATALOG.verity.id;
  }

  function normalizeKeyLabel(event) {
    if (!event) return "";
    if (event.code) return event.code;
    if (event.key) return String(event.key).toUpperCase();
    return "";
  }

  function displayKeyLabel(code) {
    if (!code) return "";
    const map = {
      Digit1: "1",
      Digit2: "2",
      Digit3: "3",
      Digit4: "4",
      Digit5: "5",
      Digit6: "6",
      Digit7: "7",
      Digit8: "8",
      Digit9: "9",
      Digit0: "0",
      Space: "Espacio",
      Enter: "Enter",
      Numpad1: "Num 1",
      Numpad2: "Num 2",
      Numpad3: "Num 3",
      Numpad4: "Num 4",
      Numpad5: "Num 5",
      Numpad6: "Num 6",
      Numpad7: "Num 7",
      Numpad8: "Num 8",
      Numpad9: "Num 9",
      Numpad0: "Num 0",
    };
    if (map[code]) return map[code];
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("F")) return code;
    return code.replace(/^Numpad/, "Num ");
  }

  function selectedVoiceKey() {
    const key = String(els.voiceSelect?.value || state.voiceKey || "verity");
    return key in VOICE_CATALOG ? key : "verity";
  }

  function selectedMicId() {
    return String(els.micSelect?.value || state.micId || "");
  }

  function selectedOutputId() {
    return String(els.outputSelect?.value || state.outputId || "");
  }

  function setStatus(kind, text) {
    if (!els.statePill) return;
    els.statePill.dataset.state = kind;
    els.statePill.textContent = text;
  }

  function setMotorPill(text) {
    if (els.motorPill) els.motorPill.textContent = text;
  }

  function setModeValue(text) {
    if (els.modeValue) els.modeValue.textContent = text;
  }

  function setLatency(ms) {
    if (els.latencyValue) els.latencyValue.textContent = `${Math.max(0, Math.round(ms || 0))} ms`;
  }

  function setVoiceLabel() {
    if (els.voiceLabel) els.voiceLabel.textContent = voiceLabel(selectedVoiceKey());
  }

  function setLiveText(text) {
    if (els.liveText) els.liveText.textContent = text || "—";
  }

  function setNote(text) {
    if (els.note) els.note.textContent = text || "";
  }

  function populateVoiceSelect(filter = "") {
    const q = String(filter || "").trim().toLowerCase();
    const list = voicesArray().filter((item) => !q || item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q));
    if (!els.voiceSelect) return;
    const current = selectedVoiceKey();
    els.voiceSelect.innerHTML = list.map((item) => `<option value="${item.key}">${item.label}</option>`).join("");
    if ([...els.voiceSelect.options].some((opt) => opt.value === current)) {
      els.voiceSelect.value = current;
    } else if (els.voiceSelect.options.length) {
      els.voiceSelect.value = els.voiceSelect.options[0].value;
      state.voiceKey = els.voiceSelect.value;
    }
  }

  function renderHotkeys() {
    if (!els.hotkeyList) return;
    const entries = Object.entries(state.shortcuts || {})
      .filter(([, voice]) => voice in VOICE_CATALOG)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
      els.hotkeyList.innerHTML = `<div class="realtimeEmpty">Todavía no hay atajos asignados.</div>`;
      return;
    }
    els.hotkeyList.innerHTML = entries.map(([code, voiceKey]) => `
      <div class="realtimeHotkeyRow">
        <div class="realtimeHotkeyMain">
          <strong>${voiceLabel(voiceKey)}</strong>
          <span>${displayKeyLabel(code) || code}</span>
        </div>
        <button type="button" class="ghostBtn realtimeTinyBtn" data-unassign-hotkey="${code}">Quitar</button>
      </div>
    `).join("");
  }

  async function enumerateDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const mics = devices.filter((d) => d.kind === "audioinput");
    const outs = devices.filter((d) => d.kind === "audiooutput");

    if (els.micSelect) {
      const current = selectedMicId();
      els.micSelect.innerHTML = [
        `<option value="">Micrófono predeterminado</option>`,
        ...mics.map((d, i) => `<option value="${d.deviceId}">${d.label || `Micrófono ${i + 1}`}</option>`),
      ].join("");
      if ([...els.micSelect.options].some((opt) => opt.value === current)) els.micSelect.value = current;
    }

    if (els.outputSelect) {
      const current = selectedOutputId();
      els.outputSelect.innerHTML = [
        `<option value="">Salida predeterminada</option>`,
        ...outs.map((d, i) => `<option value="${d.deviceId}">${d.label || `Salida ${i + 1}`}</option>`),
      ].join("");
      if ([...els.outputSelect.options].some((opt) => opt.value === current)) els.outputSelect.value = current;
    }
  }

  async function ensureMicPermission() {
    if (navigator.mediaDevices?.getUserMedia == null) {
      throw new Error("Tu navegador no soporta captura de micrófono.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: selectedMicId() ? { deviceId: { exact: selectedMicId() } } : true
    });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  }

  function ensurePlaybackAudio() {
    if (playbackAudio) return playbackAudio;
    playbackAudio = new Audio();
    playbackAudio.preload = "auto";
    playbackAudio.autoplay = false;
    playbackAudio.controls = false;
    playbackAudio.volume = 1;
    try {
      playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
      playbackAnalyser = playbackCtx.createAnalyser();
      playbackAnalyser.fftSize = 256;
      const source = playbackCtx.createMediaElementSource(playbackAudio);
      source.connect(playbackAnalyser);
      playbackAnalyser.connect(playbackCtx.destination);
    } catch {}
    return playbackAudio;
  }

  async function setPlaybackSinkId() {
    if (!playbackAudio || !selectedOutputId()) return;
    if (typeof playbackAudio.setSinkId === "function") {
      try {
        await playbackAudio.setSinkId(selectedOutputId());
      } catch (err) {
        console.warn("No se pudo cambiar la salida de audio.", err);
      }
    }
  }

  async function startMeters() {
    if (!micStream) return;
    if (!micCtx) {
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = micCtx.createMediaStreamSource(micStream);
      micAnalyser = micCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      source.connect(micAnalyser);
    }
    if (playbackCtx && playbackCtx.state === "suspended") {
      try { await playbackCtx.resume(); } catch {}
    }
    if (micCtx && micCtx.state === "suspended") {
      try { await micCtx.resume(); } catch {}
    }
    cancelAnimationFrame(meterAnim);
    const micData = new Uint8Array(micAnalyser?.frequencyBinCount || 128);
    const outData = new Uint8Array(playbackAnalyser?.frequencyBinCount || 128);
    const tick = () => {
      if (micAnalyser && els.inputFill) {
        micAnalyser.getByteFrequencyData(micData);
        const micLevel = micData.reduce((acc, val) => acc + val, 0) / (micData.length * 255);
        els.inputFill.style.width = `${Math.max(6, Math.round(micLevel * 100))}%`;
      }
      if (playbackAnalyser && els.outputFill) {
        playbackAnalyser.getByteFrequencyData(outData);
        const outLevel = outData.reduce((acc, val) => acc + val, 0) / (outData.length * 255);
        els.outputFill.style.width = `${Math.max(4, Math.round(outLevel * 100))}%`;
      } else if (els.outputFill) {
        const pulse = Math.sin(Date.now() / 220) * 0.5 + 0.5;
        els.outputFill.style.width = `${Math.max(8, Math.round(((playbackAudio && !playbackAudio.paused ? 0.65 : 0.15 + pulse * 0.2)) * 100))}%`;
      }
      meterAnim = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopMeters() {
    cancelAnimationFrame(meterAnim);
    meterAnim = 0;
    if (els.inputFill) els.inputFill.style.width = "0%";
    if (els.outputFill) els.outputFill.style.width = "0%";
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.onend = null; recognition.stop(); } catch {}
      recognition = null;
    }
    clearTimeout(recognitionTimer);
    recognitionTimer = 0;
    recognitionBuffer = "";
    if (els.liveText) els.liveText.textContent = "—";
  }

  function createRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    return rec;
  }

  function scheduleFlush() {
    clearTimeout(recognitionTimer);
    recognitionTimer = window.setTimeout(() => flushRecognitionBuffer(true), 420);
  }

  function appendRecognitionText(text) {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    recognitionBuffer = [recognitionBuffer, cleaned].filter(Boolean).join(" ");
    setLiveText(recognitionBuffer);
    scheduleFlush();
  }

  async function flushRecognitionBuffer(force = false) {
    const text = String(recognitionBuffer || "").trim();
    if (!text) return;
    if (!force && text.length < 12 && !/[.!?¿¡]$/.test(text)) return;
    recognitionBuffer = "";
    setLiveText("Procesando...");
    enqueueSpeech(text);
  }

  function startRecognition() {
    const rec = createRecognition();
    if (!rec) {
      throw new Error("Tu navegador no soporta reconocimiento de voz en vivo.");
    }
    recognition = rec;
    rec.onresult = (event) => {
      let finalChunk = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";
        if (result.isFinal) finalChunk += `${transcript} `;
        else interim += `${transcript} `;
      }
      const preview = `${recognitionBuffer} ${interim} ${finalChunk}`.replace(/\s+/g, " ").trim();
      if (preview) setLiveText(preview);
      if (finalChunk.trim()) appendRecognitionText(finalChunk);
    };
    rec.onerror = (event) => {
      console.warn("SpeechRecognition error", event?.error || event);
      if (state.connected) setLiveText(`Reconocimiento: ${event?.error || "error"}`);
    };
    rec.onend = () => {
      if (!state.connected || state.useDirect) return;
      try {
        rec.start();
      } catch (err) {
        console.warn("No se pudo reiniciar reconocimiento.", err);
      }
    };
    rec.start();
  }

  function buildSpeechText(text) {
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, 220);
  }

  function fetchVoiceAudio(text, vId) {
    return fetch("/api/voicebot/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voiceId: vId,
        profanityFilter: false,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `TTS error ${res.status}`);
      }
      return await res.blob();
    });
  }

  async function playBlob(blob) {
    const audio = ensurePlaybackAudio();
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise(async (resolve, reject) => {
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        audio.onended = null;
        audio.onerror = null;
      };
      try {
        await setPlaybackSinkId();
      } catch {}
      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("No se pudo reproducir el audio."));
      };
      audio.src = objectUrl;
      audio.currentTime = 0;
      try {
        const started = audio.play();
        if (started && typeof started.then === "function") await started;
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  async function drainSpeechQueue() {
    if (speechBusy || !state.connected) return;
    const next = speechQueue.shift();
    if (!next) return;
    speechBusy = true;
    try {
      setModeValue("Transcripción + Fish Audio");
      setVoiceLabel();
      const started = performance.now();
      const blob = await fetchVoiceAudio(buildSpeechText(next), voiceId(selectedVoiceKey()));
      setLatency(performance.now() - started);
      await playBlob(blob);
    } catch (err) {
      console.error(err);
      setStatus("error", "Error");
      setLiveText(err?.message || "No se pudo generar audio.");
      toastFeedback("No se pudo convertir la voz.", err?.message || "Revisa el motor seleccionado.");
      if (state.useDirect && directSocket?.readyState === WebSocket.OPEN) {
        try { directSocket.close(); } catch {}
      }
    } finally {
      speechBusy = false;
      if (speechQueue.length) drainSpeechQueue();
    }
  }

  function enqueueSpeech(text) {
    const clean = buildSpeechText(text);
    if (!clean) return;
    speechQueue.push(clean);
    drainSpeechQueue();
  }

  function stopAudioPlayback() {
    if (playbackAudio) {
      try {
        playbackAudio.pause();
        playbackAudio.currentTime = 0;
      } catch {}
    }
    speechQueue = [];
    speechBusy = false;
  }

  function stopDirectTransport() {
    if (recorder) {
      try { recorder.stop(); } catch {}
      recorder = null;
    }
    if (directSocket) {
      try { directSocket.close(1000, "disconnect"); } catch {}
      directSocket = null;
    }
  }

  async function startDirectTransport() {
    const wsUrl = String(state.wsUrl || "").trim();
    if (!wsUrl) throw new Error("Falta la URL websocket del motor directo.");
    if (!micStream) throw new Error("No hay micrófono activo.");

    stopDirectTransport();
    directSocket = new WebSocket(wsUrl);
    directSocket.binaryType = "arraybuffer";
    directSocket.onopen = () => {
      setStatus("live", "Conectado");
      setMotorPill("Motor directo");
      setModeValue("WebSocket realtime");
      setNote("Motor directo activo.");
      try {
        directSocket?.send(JSON.stringify({
          event: "start",
          voiceId: selectedVoiceId(),
          voiceKey: selectedVoiceKey(),
          format: "webm/opus",
          sampleRate: micCtx?.sampleRate || 48000,
          source: "streamfusion-realtime-voice",
        }));
      } catch (err) {
        console.warn("No se pudo enviar inicio de sesión.", err);
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
      recorder = mimeType
        ? new MediaRecorder(micStream, { mimeType })
        : new MediaRecorder(micStream);
      recorder.ondataavailable = async (ev) => {
        if (!ev.data || !ev.data.size || directSocket?.readyState !== WebSocket.OPEN) return;
        try {
          const buf = await ev.data.arrayBuffer();
          directSocket.send(buf);
        } catch (err) {
          console.warn("No se pudo enviar chunk.", err);
        }
      };
      try {
        recorder.start(240);
      } catch (err) {
        console.warn("No se pudo iniciar recorder.", err);
      }
    };
    directSocket.onmessage = async (ev) => {
      const data = ev.data;
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg?.type === "latency" && msg.value != null) setLatency(msg.value);
          if (msg?.type === "status" && msg.message) setLiveText(msg.message);
          if (msg?.audio) {
            const audioBlob = typeof msg.audio === "string"
              ? base64ToBlob(msg.audio, msg.contentType || "audio/mpeg")
              : new Blob([msg.audio], { type: msg.contentType || "audio/mpeg" });
            if (audioBlob) await playBlob(audioBlob);
          }
        } catch {}
        return;
      }
      if (data instanceof ArrayBuffer) {
        await playBlob(new Blob([data], { type: "audio/mpeg" }));
        return;
      }
      if (data instanceof Blob) {
        await playBlob(data);
      }
    };
    directSocket.onerror = (ev) => {
      console.warn("WebSocket error", ev);
      setStatus("error", "Error");
      setModeValue("Motor directo");
      setNote("No se pudo conectar al websocket.");
    };
    directSocket.onclose = () => {
      if (state.connected) {
        setStatus("waiting", "Esperando");
        setNote("Motor directo desconectado.");
      }
      directSocket = null;
      if (recorder) {
        try { recorder.stop(); } catch {}
        recorder = null;
      }
    };
  }

  function base64ToBlob(base64, type = "audio/mpeg") {
    try {
      const raw = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
      const bin = atob(raw);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) buf[i] = bin.charCodeAt(i);
      return new Blob([buf], { type });
    } catch (err) {
      console.warn("No se pudo decodificar base64.", err);
      return null;
    }
  }

  async function connect() {
    try {
      setNote("Solicitando permisos de micrófono...");
      await ensureMicPermission();
      if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
      }
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId() ? { deviceId: { exact: selectedMicId() } } : true
      });
      await enumerateDevices();
      ensurePlaybackAudio();
      await startMeters();
      state.connected = true;
      setStatus("live", "Conectado");
      setVoiceLabel();
      setMotorPill(state.useDirect ? "Motor directo" : "Motor automático");
      setModeValue(state.useDirect ? "WebSocket realtime" : "Transcripción + Fish Audio");
      setLatency(0);
      setLiveText("Escuchando...");
      setNote(state.useDirect
        ? "El motor directo está activo."
        : "Modo de respaldo activo: captura tu voz y la reproduce con Fish Audio en la web.");
      if (state.useDirect && state.wsUrl) {
        await startDirectTransport();
      } else {
        startRecognition();
      }
      toastFeedback("Voz en tiempo real activa", "Ya puedes hablar y cambiar de voz sin afectar el overlay.");
    } catch (err) {
      console.error(err);
      state.connected = false;
      setStatus("error", "Error");
      setModeValue("Sin conexión");
      setNote(err?.message || "No se pudo iniciar.");
      toastFeedback("No se pudo iniciar la voz en tiempo real.", err?.message || "Revisa permisos y navegador.");
      stop();
    }
  }

  function stop() {
    state.connected = false;
    stopRecognition();
    stopAudioPlayback();
    stopDirectTransport();
    stopMeters();
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (micCtx) {
      try { micCtx.close(); } catch {}
      micCtx = null;
      micAnalyser = null;
    }
    if (playbackCtx) {
      try { playbackCtx.close(); } catch {}
      playbackCtx = null;
      playbackAnalyser = null;
    }
    setStatus("offline", "Desconectado");
    setMotorPill("Motor automático");
    setModeValue("Inactivo");
    setLatency(0);
    setNote("Separado del overlay chat.");
    setLiveText("—");
  }

  function applySelectedVoice() {
    state.voiceKey = selectedVoiceKey();
    saveState();
    setVoiceLabel();
    toastFeedback("Voz actualizada", voiceLabel(state.voiceKey));
    if (state.connected && state.useDirect && directSocket?.readyState === WebSocket.OPEN) {
      try {
        directSocket.send(JSON.stringify({
          event: "voice",
          voiceId: selectedVoiceId(),
          voiceKey: selectedVoiceKey(),
        }));
      } catch (err) {
        console.warn("No se pudo enviar cambio de voz al motor directo.", err);
      }
    }
  }

  function toastFeedback(title, message) {
    const wrap = document.createElement("div");
    wrap.className = "toast";
    wrap.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    document.body.appendChild(wrap);
    setTimeout(() => wrap.classList.add("show"), 10);
    setTimeout(() => {
      wrap.classList.remove("show");
      setTimeout(() => wrap.remove(), 250);
    }, 2600);
  }

  async function handleHotkeyCapture() {
    captureShortcutForVoice = selectedVoiceKey();
    setNote(`Presiona una tecla para asignarla a ${voiceLabel(captureShortcutForVoice)}.`);
    toastFeedback("Captura de tecla", `Pulsa la tecla para ${voiceLabel(captureShortcutForVoice)}.`);
  }

  function unassignHotkey(code) {
    if (!code) return;
    delete state.shortcuts[code];
    saveState();
    renderHotkeys();
    toastFeedback("Atajo eliminado", displayKeyLabel(code) || code);
  }

  function assignHotkey(code, voiceKey) {
    if (!code || !voiceKey) return;
    const currentOwner = Object.entries(state.shortcuts).find(([, v]) => v === voiceKey);
    if (currentOwner && currentOwner[0] !== code) delete state.shortcuts[currentOwner[0]];
    const conflict = state.shortcuts[code] && state.shortcuts[code] !== voiceKey;
    if (conflict) {
      const replace = window.confirm(`La tecla ${displayKeyLabel(code)} ya está asignada a ${voiceLabel(state.shortcuts[code])}. ¿Quieres reemplazarla?`);
      if (!replace) return;
    }
    state.shortcuts[code] = voiceKey;
    saveState();
    renderHotkeys();
    toastFeedback("Atajo guardado", `${displayKeyLabel(code)} → ${voiceLabel(voiceKey)}`);
  }

  function syncUI() {
    if (els.micSelect) els.micSelect.value = state.micId || "";
    if (els.outputSelect) els.outputSelect.value = state.outputId || "";
    if (els.hotkeysToggle) els.hotkeysToggle.checked = Boolean(state.hotkeysEnabled);
    if (els.directToggle) els.directToggle.checked = Boolean(state.useDirect);
    if (els.wsUrl) els.wsUrl.value = state.wsUrl || "";
    populateVoiceSelect(voiceSearch);
    if (els.voiceSelect) els.voiceSelect.value = state.voiceKey in VOICE_CATALOG ? state.voiceKey : "verity";
    setVoiceLabel();
    renderHotkeys();
    setModeValue(state.connected ? (state.useDirect ? "WebSocket realtime" : "Transcripción + Fish Audio") : "Inactivo");
    setMotorPill(state.useDirect ? "Motor directo" : "Motor automático");
    setStatus(state.connected ? "live" : "offline", state.connected ? "Conectado" : "Desconectado");
    if (els.note) {
      els.note.textContent = state.showHints
        ? "Este módulo es independiente del overlay chat."
        : "";
    }
  }

  async function openModal() {
    const url = "/voice-overlay.html";
    const win = window.open(url, "StreamFusionVoiceOverlay", "noopener,noreferrer");
    if (!win) {
      window.location.href = url;
    }
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.classList.remove("show");
    els.modal.setAttribute("aria-hidden", "true");
  }

  function bindEvents() {
    els.openBtn?.addEventListener("click", openModal);
    els.closeBtn?.addEventListener("click", closeModal);
    els.closeBtnBottom?.addEventListener("click", closeModal);
    els.connectBtn?.addEventListener("click", connect);
    els.disconnectBtn?.addEventListener("click", stop);
    els.refreshDevicesBtn?.addEventListener("click", async () => {
      await enumerateDevices();
      toastFeedback("Dispositivos actualizados", "Se recargaron micrófonos y salidas.");
    });
    els.clearHotkeysBtn?.addEventListener("click", () => {
      state.shortcuts = {};
      saveState();
      renderHotkeys();
      toastFeedback("Atajos borrados", "Se eliminaron todos los atajos.");
    });
    els.voiceSearch?.addEventListener("input", (ev) => {
      voiceSearch = String(ev.target.value || "");
      populateVoiceSelect(voiceSearch);
    });
    els.voiceSelect?.addEventListener("change", () => {
      state.voiceKey = selectedVoiceKey();
      saveState();
      setVoiceLabel();
      applySelectedVoice();
    });
    els.micSelect?.addEventListener("change", () => {
      state.micId = String(els.micSelect.value || "");
      saveState();
    });
    els.outputSelect?.addEventListener("change", async () => {
      state.outputId = String(els.outputSelect.value || "");
      saveState();
      await setPlaybackSinkId();
    });
    els.hotkeysToggle?.addEventListener("change", (ev) => {
      state.hotkeysEnabled = Boolean(ev.target.checked);
      saveState();
      toastFeedback("Atajos", state.hotkeysEnabled ? "Atajos activados" : "Atajos desactivados");
    });
    els.hotkeyCaptureBtn?.addEventListener("click", handleHotkeyCapture);
    els.directToggle?.addEventListener("change", (ev) => {
      state.useDirect = Boolean(ev.target.checked);
      saveState();
      setMotorPill(state.useDirect ? "Motor directo" : "Motor automático");
      if (state.connected) {
        stop();
        connect();
      }
    });
    els.wsUrl?.addEventListener("input", (ev) => {
      state.wsUrl = String(ev.target.value || "").trim();
      saveState();
    });
    els.modal?.addEventListener("click", (ev) => {
      if (ev.target === els.modal) closeModal();
    });
    els.hotkeyList?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-unassign-hotkey]");
      if (!btn) return;
      unassignHotkey(btn.dataset.unassign-hotkey);
    });

    document.addEventListener("keydown", (ev) => {
      if (!els.modal?.classList.contains("show")) return;
      if (ev.repeat) return;
      const isTypingTarget = ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
      if (captureShortcutForVoice) {
        ev.preventDefault();
        ev.stopPropagation();
        const code = normalizeKeyLabel(ev);
        if (code) assignHotkey(code, captureShortcutForVoice);
        captureShortcutForVoice = "";
        setNote("Atajo guardado.");
        return;
      }
      if (!state.hotkeysEnabled || isTypingTarget) return;
      const code = normalizeKeyLabel(ev);
      const mappedVoice = state.shortcuts?.[code];
      if (!mappedVoice || !(mappedVoice in VOICE_CATALOG)) return;
      ev.preventDefault();
      state.voiceKey = mappedVoice;
      if (els.voiceSelect) els.voiceSelect.value = mappedVoice;
      saveState();
      setVoiceLabel();
      applySelectedVoice();
    });
  }

  async function init() {
    bindEvents();
    syncUI();
    try {
      await enumerateDevices();
      syncUI();
    } catch (err) {
      console.warn("No se pudieron listar dispositivos al inicio.", err);
    }
  }

  window.addEventListener("beforeunload", () => stop());
  document.addEventListener("DOMContentLoaded", init, { once: true });

  window.StreamFusionRealtimeVoice = { open: openModal, close: closeModal, start: connect, stop, state };
})();
