// Listen Content Script - Shadow DOM Version

class ListenApp {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.container = null;
    this.floatIcon = null;
    this.miniPlayer = null;
    this.selectedText = '';
    this.isReading = false;
    this.audioPlayer = null;
    this.currentRate = 1.0;
    this.tesseractWorker = null;
    this.tesseractLoaded = false;

    this.init();
  }

  init() {
    this.createShadowDOM();
    this.bindEvents();
    this.listenToMessages();
  }

  createShadowDOM() {
    // Create host element
    this.host = document.createElement('div');
    this.host.id = 'listen-extension-host';
    // Ensure host is always on top but doesn't block clicks initially
    Object.assign(this.host.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      zIndex: '2147483647',
      pointerEvents: 'none'
    });
    document.body.appendChild(this.host);

    // Create Shadow Root
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Inject Styles
    const styleLink1 = document.createElement('link');
    styleLink1.rel = 'stylesheet';
    styleLink1.href = chrome.runtime.getURL('css/design-system.css');

    const styleLink2 = document.createElement('link');
    styleLink2.rel = 'stylesheet';
    styleLink2.href = chrome.runtime.getURL('css/content.css');

    this.shadow.appendChild(styleLink1);
    this.shadow.appendChild(styleLink2);

    // Create Container
    this.container = document.createElement('div');
    this.container.id = 'listen-container';
    this.shadow.appendChild(this.container);

    // Create UI Elements
    this.createUI();
  }

  createUI() {
    // Float Icon
    this.floatIcon = document.createElement('div');
    this.floatIcon.className = 'listen-float-icon';
    this.floatIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    this.container.appendChild(this.floatIcon);

    // Mini Player
    this.miniPlayer = document.createElement('div');
    this.miniPlayer.className = 'listen-mini-player';

    // Play/Pause Button (Start with Play Icon)
    this.playPauseBtn = document.createElement('button');
    this.playPauseBtn.className = 'listen-btn listen-btn-primary';
    this.playPauseBtn.id = 'listen-play-pause';
    this.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

    // Visualizer
    const visualizer = document.createElement('div');
    visualizer.className = 'listen-visualizer';
    for (let i = 0; i < 4; i++) {
      const bar = document.createElement('div');
      bar.className = 'listen-bar';
      visualizer.appendChild(bar);
    }

    // Speed Toggle
    this.speedToggle = document.createElement('div');
    this.speedToggle.className = 'listen-speed';
    this.speedToggle.id = 'listen-speed-toggle';
    this.speedToggle.textContent = '1.0x';

    // Close Button
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'listen-btn listen-close';
    this.closeBtn.id = 'listen-close-btn';
    // Use explicit commands and spaces to avoid parsing errors
    this.closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41 L17.59 5 L12 10.59 L6.41 5 L5 6.41 L10.59 12 L5 17.59 L6.41 19 L12 13.41 L17.59 19 L19 17.59 L13.41 12 Z"/></svg>';

    // Append all to miniPlayer
    this.miniPlayer.appendChild(this.playPauseBtn);
    this.miniPlayer.appendChild(visualizer);
    this.miniPlayer.appendChild(this.speedToggle);
    this.miniPlayer.appendChild(this.closeBtn);

    this.container.appendChild(this.miniPlayer);
  }

  bindEvents() {
    // Selection (Listen on document, handle in Shadow)
    document.addEventListener('mouseup', (e) => this.handleSelection(e));
    // Handle clicks outside to close
    document.addEventListener('mousedown', (e) => this.handleClickOutside(e));

    // UI Interactions (Inside Shadow DOM)
    this.floatIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expandPlayer();
      this.playText(this.selectedText);
    });

    this.playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.speedToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleSpeed();
    });

    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.stop();
      this.hidePlayer();
    });
  }

  handleSelection(e) {
    // Ignore clicks inside our own UI
    if (this.host.contains(e.target)) return;

    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text) {
        this.selectedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate position relative to viewport
        const x = rect.right;
        const y = rect.top;

        // Pass viewport coordinates to showIcon
        this.showIcon(x, y);
      } else {
        if (!this.isReading) {
          this.hideIcon();
        }
      }
    }, 10);
  }

  handleClickOutside(e) {
    if (!this.host.contains(e.target) && !this.isReading) {
      this.hideIcon();
      this.hidePlayer();
    }
  }

  showIcon(clientX, clientY) {
    // Use viewport coordinates with pageX/Y offsets for accurate positioning
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Position relative to viewport (fixed positioning)
    let left = clientX + 10;
    let top = clientY - 40; // Show above the end of selection

    // Safety check for viewport edges
    if (top < 10) top = clientY + 20; // Show below if too high
    if (left > window.innerWidth - 60) left = clientX - 60;
    if (left < 10) left = 10;

    this.floatIcon.style.left = `${left}px`;
    this.floatIcon.style.top = `${top}px`;
    this.floatIcon.classList.add('visible');
    this.miniPlayer.classList.remove('active');
  }

  hideIcon() {
    this.floatIcon.classList.remove('visible');
  }

  expandPlayer() {
    // Get current icon position
    const iconLeft = this.floatIcon.style.left;
    const iconTop = this.floatIcon.style.top;

    this.miniPlayer.style.left = iconLeft;
    this.miniPlayer.style.top = iconTop;

    this.hideIcon();
    this.miniPlayer.classList.add('active');
  }

  hidePlayer() {
    this.miniPlayer.classList.remove('active');
  }

  updatePlayIcon(isPlaying) {
    const path = isPlaying
      ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z"
      : "M8 5v14l11-7z";
    this.playPauseBtn.querySelector('path').setAttribute('d', path);

    if (isPlaying) {
      this.miniPlayer.classList.add('playing');
    } else {
      this.miniPlayer.classList.remove('playing');
    }
  }

  cycleSpeed() {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(this.currentRate);
    this.currentRate = speeds[(idx + 1) % speeds.length];
    this.speedToggle.textContent = `${this.currentRate}x`;
    if (this.audioPlayer) {
      this.audioPlayer.playbackRate = this.currentRate;
    }
  }

  async playText(text) {
    if (!text) return;
    this.stop();
    this.isReading = true;
    this.updatePlayIcon(true);

    try {
      // Check if context is valid before sending
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated');
      }

      chrome.runtime.sendMessage({ action: 'generateTTS', text }, (resp) => {
        // Check for runtime error (e.g. context invalidated during request)
        if (chrome.runtime.lastError) {
          console.error('Runtime Error:', chrome.runtime.lastError);
          this.handleContextInvalidated();
          return;
        }

        if (!resp || !resp.success) {
          console.error('TTS Failed:', resp?.error);
          this.stop();
          return;
        }
        this.playAudio(resp);
      });
    } catch (e) {
      console.error(e);
      if (e.message.includes('Extension context invalidated')) {
        this.handleContextInvalidated();
      }
      this.stop();
    }
  }

  handleContextInvalidated() {
    this.stop();
    // Show a small toast or visual indicator in the mini-player
    const visualizer = this.miniPlayer.querySelector('.listen-visualizer');
    if (visualizer) {
      visualizer.innerHTML = '<span style="font-size:10px;color:#ff4444;white-space:nowrap;">请刷新页面</span>';
    }
  }

  playAudio(resp) {
    const mime = resp.mimeType || 'audio/wav';
    let blob;
    if (resp.audioB64) {
      const byteChars = atob(resp.audioB64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
    } else {
      blob = new Blob([new Uint8Array(resp.audioData)], { type: mime });
    }

    const url = URL.createObjectURL(blob);
    this.audioPlayer = new Audio(url);
    this.audioPlayer.playbackRate = this.currentRate;

    this.audioPlayer.onended = () => {
      this.stop();
      this.hidePlayer(); // Auto-hide when playback completes
    };
    this.audioPlayer.onerror = () => this.stop();

    this.audioPlayer.play().catch(e => {
      console.error('Play failed', e);
      this.stop();
    });
  }

  togglePlay() {
    if (this.isReading && this.audioPlayer) {
      if (this.audioPlayer.paused) {
        this.audioPlayer.play();
        this.updatePlayIcon(true);
      } else {
        this.audioPlayer.pause();
        this.updatePlayIcon(false);
      }
    } else {
      this.playText(this.selectedText);
    }
  }

  stop() {
    this.isReading = false;
    this.updatePlayIcon(false);
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
  }

  listenToMessages() {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      console.log('[Listen] Received message:', req.action);

      if (req.action === 'ping') {
        // Simple ping to check if content script is loaded
        sendResponse({ success: true });
        return true;
      } else if (req.action === 'readText') {
        this.selectedText = req.text;
        this.expandPlayer();
        this.playText(req.text);
        sendResponse({ success: true });
        return true;
      } else if (req.action === 'captureScreen') {
        console.log('[Listen] Starting screen capture...');
        this.startScreenCapture();
        sendResponse({ success: true });
        return true;
      }
    });
  }

  startScreenCapture() {
    console.log('[Listen] startScreenCapture called');
    // Create overlay for screenshot selection
    this.createCaptureOverlay();
  }

  createCaptureOverlay() {
    console.log('[Listen] createCaptureOverlay called');
    // Remove existing overlay if any
    if (this.captureOverlay) {
      console.log('[Listen] Removing existing overlay');
      this.captureOverlay.remove();
    }

    // Create overlay container
    this.captureOverlay = document.createElement('div');
    this.captureOverlay.id = 'listen-capture-overlay';
    this.captureOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      cursor: crosshair;
    `;

    // Create selection box
    this.selectionBox = document.createElement('div');
    this.selectionBox.id = 'listen-selection-box';
    this.selectionBox.style.cssText = `
      position: absolute;
      border: 2px solid #1ADB87;
      background: rgba(26, 219, 135, 0.1);
      display: none;
      pointer-events: none;
    `;
    this.captureOverlay.appendChild(this.selectionBox);

    // Create hint text
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 18px;
      font-family: sans-serif;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      pointer-events: none;
    `;
    hint.textContent = '拖拽选择要识别的区域，按 ESC 取消';
    this.captureOverlay.appendChild(hint);

    document.body.appendChild(this.captureOverlay);

    // Selection state
    let isSelecting = false;
    let startX, startY;

    // Mouse down - start selection
    const onMouseDown = (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      this.selectionBox.style.left = startX + 'px';
      this.selectionBox.style.top = startY + 'px';
      this.selectionBox.style.width = '0px';
      this.selectionBox.style.height = '0px';
      this.selectionBox.style.display = 'block';
      hint.style.display = 'none';
    };

    // Mouse move - update selection
    const onMouseMove = (e) => {
      if (!isSelecting) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);

      this.selectionBox.style.left = left + 'px';
      this.selectionBox.style.top = top + 'px';
      this.selectionBox.style.width = width + 'px';
      this.selectionBox.style.height = height + 'px';
    };

    // Mouse up - capture region
    const onMouseUp = async (e) => {
      if (!isSelecting) return;
      isSelecting = false;

      const width = parseInt(this.selectionBox.style.width);
      const height = parseInt(this.selectionBox.style.height);

      if (width < 10 || height < 10) {
        this.captureOverlay.remove();
        this.captureOverlay = null;
        return;
      }

      const rect = {
        x: parseInt(this.selectionBox.style.left),
        y: parseInt(this.selectionBox.style.top),
        width,
        height
      };

      // Show loading indicator
      hint.textContent = '正在识别文字...';
      hint.style.display = 'block';
      this.selectionBox.style.display = 'none';

      try {
        await this.captureAndProcess(rect);
      } catch (error) {
        console.error('Capture error:', error);
        alert('OCR识别失败: ' + error.message);
      }

      this.captureOverlay.remove();
      this.captureOverlay = null;
    };

    // ESC to cancel
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.captureOverlay.remove();
        this.captureOverlay = null;
      }
    };

    this.captureOverlay.addEventListener('mousedown', onMouseDown);
    this.captureOverlay.addEventListener('mousemove', onMouseMove);
    this.captureOverlay.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown, { once: true });
  }

  async captureAndProcess(rect) {
    // Request screenshot capture from background
    const response = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });

    if (!response.success) {
      throw new Error(response.error || '截图失败');
    }

    // Crop the selected region
    const croppedImage = await this.cropImage(response.dataUrl, rect);

    // Send to background for cloud OCR
    console.log('[Listen] Using cloud OCR...');
    const ocrResponse = await chrome.runtime.sendMessage({
      action: 'processScreenshot',
      imageData: croppedImage
    });

    if (!ocrResponse.success) {
      throw new Error(ocrResponse.error || 'OCR识别失败');
    }

    // Play the extracted text
    this.selectedText = ocrResponse.text;
    this.expandPlayer();
    this.playText(ocrResponse.text);
  }

  cropImage(dataUrl, rect) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Account for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.drawImage(
          img,
          rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr,
          0, 0, rect.width * dpr, rect.height * dpr
        );

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  async loadTesseract() {
    if (this.tesseractLoaded) return;

    console.log('[Listen] Loading Tesseract.js...');

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('lib/tesseract.min.js');
      script.onload = () => {
        console.log('[Listen] Tesseract.js loaded');
        // Wait a bit for Tesseract to be available globally
        setTimeout(() => {
          if (typeof Tesseract !== 'undefined') {
            this.tesseractLoaded = true;
            resolve();
          } else {
            reject(new Error('Tesseract global object not found'));
          }
        }, 100);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Tesseract.js'));
      };
      document.head.appendChild(script);
    });
  }

  async processWithTesseract(imageData, language = 'chi_sim+eng') {
    try {
      // Load Tesseract if not already loaded
      if (!this.tesseractLoaded) {
        await this.loadTesseract();
      }

      // Check if Tesseract is available
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract library not loaded');
      }

      // Initialize worker if needed
      if (!this.tesseractWorker) {
        console.log('[Listen] Creating Tesseract worker...');
        const { createWorker } = Tesseract;
        this.tesseractWorker = await createWorker(language, 1, {
          logger: m => console.log('[Tesseract]', m),
          langPath: 'https://tessdata.projectnaptha.com/4.0.0'
        });
        console.log('[Listen] Tesseract worker created');
      }

      // Perform OCR
      console.log('[Listen] Running OCR with language:', language);
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(imageData);

      console.log('[Listen] OCR completed, confidence:', confidence);

      if (!text || text.trim().length === 0) {
        throw new Error('未识别到文字内容');
      }

      return text.trim();
    } catch (error) {
      console.error('[Listen] Tesseract OCR failed:', error);
      throw new Error('本地OCR识别失败: ' + error.message);
    }
  }
}

// Initialize
new ListenApp();
