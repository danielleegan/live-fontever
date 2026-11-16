// Fixed export measurements keep messages consistent across phones and computers.
function createMessageCanvas(text, letterImages, { includeWatermark = true, blueBackground = false } = {}) {
  const exportScale = 3;
  const maxWidth = 1200;
  const padding = 24;
  const letterHeight = 120;
  const lineGap = 40;
  const wordGap = 72;
  const contentLimit = maxWidth - padding * 2;
  const words = text.toUpperCase().trim().split(/\s+/)
    .map(word => Array.from(word).filter(char => /^[A-Z!.?]$/.test(char)))
    .filter(word => word.length > 0);

  if (!words.length) {
    throw new Error("Please use letters A–Z or ! . ? to create a message.");
  }

  const lines = [];
  let line = { letters: [], width: 0 };
  const finishLine = () => {
    if (line.letters.length) lines.push(line);
    line = { letters: [], width: 0 };
  };

  for (const word of words) {
    const letters = word.map(char => {
      const img = letterImages.get(char);
      if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
        throw new Error("The letters are still loading. Please try again in a moment.");
      }
      return { img, width: img.naturalWidth / img.naturalHeight * letterHeight };
    });
    const wordWidth = letters.reduce((sum, letter) => sum + letter.width, 0);
    if (line.letters.length && line.width + wordGap + wordWidth > contentLimit) {
      finishLine();
    }
    if (line.letters.length) line.width += wordGap;

    // Only words wider than an entire line are broken between letters.
    for (const letter of letters) {
      if (line.width + letter.width > contentLimit) finishLine();
      line.letters.push({ ...letter, x: line.width });
      line.width += letter.width;
    }
  }
  finishLine();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create the message image. Please try again.");
  const watermark = "livefontever.com";
  const contentWidth = Math.max(...lines.map(line => line.width));
  const contentHeight = lines.length * letterHeight + (lines.length - 1) * lineGap;
  const watermarkSize = Math.max(14, Math.ceil(contentWidth / 32));
  const watermarkGap = 16;
  const exportWidth = Math.ceil(contentWidth + padding * 2) * exportScale;
  const exportHeight = (padding * 2 + contentHeight + (includeWatermark ? watermarkGap + watermarkSize : 0)) * exportScale;
  // Reject oversized exports before allocating a large bitmap on a phone.
  if (exportWidth * exportHeight > 16000000 || exportHeight > 16384) {
    throw new Error("This message is too long for one image. Please shorten it and try again.");
  }
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  if (blueBackground) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#334F97');
    gradient.addColorStop(1, '#171B3C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Draw from the original assets at 3× resolution without changing wrapping or proportions.
  ctx.scale(exportScale, exportScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  lines.forEach((line, index) => {
    const y = padding + index * (letterHeight + lineGap);
    line.letters.forEach(letter => {
      ctx.drawImage(letter.img, padding + letter.x, y, letter.width, letterHeight);
    });
  });

  // Plain white credit sits below the message, aligned to the bottom right.
  if (includeWatermark) {
    ctx.save();
    ctx.font = `${watermarkSize}px "Work Sans", sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(watermark, canvas.width / exportScale - padding, padding + contentHeight + watermarkGap, contentWidth);
    ctx.restore();
  }
  return canvas;
}

function downloadBlob(blob, filename) {
  if (!blob) throw new Error('Unable to create the image. Please try again.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Browsers may consume the file after click() returns, especially on mobile.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const alphabetPlay = document.getElementById('alphabet-play');
  const controls = document.getElementById('alphabet-controls');
  const toggle = document.getElementById('alphabet-toggle');
  const toggleLabel = toggle.querySelector('.alphabet-toggle-label');
  let alphabetPlayer = null;
  const setPlaybackState = state => {
    const playing = [1, 3].includes(state);
    toggle.dataset.state = playing ? 'pause' : 'play';
    toggleLabel.textContent = playing ? 'pause' : state === 0 ? 'replay' : 'play';
    toggle.setAttribute('aria-label', playing ? 'Pause alphabet video' : state === 0 ? 'Replay alphabet video' : 'Play alphabet video');
  };
  toggle.addEventListener('click', () => {
    if (!alphabetPlayer) alphabetPlay.click();
    else if ([1, 3].includes(alphabetPlayer.getPlayerState())) alphabetPlayer.pauseVideo();
    else alphabetPlayer.playVideo();
  });
  alphabetPlay?.addEventListener('click', () => {
    const display = document.getElementById('alphabet-display');
    const status = document.getElementById('alphabet-video-status');
    const imac = document.getElementById('alphabet-imac');
    const mute = document.getElementById('alphabet-mute');
    const restart = document.getElementById('alphabet-restart');
    alphabetPlay.disabled = true;
    toggle.disabled = true;
    status.hidden = true;
    status.textContent = '';

    const showVideoError = () => {
      controls.hidden = true;
      status.hidden = false;
      status.replaceChildren(document.createTextNode('Unable to load the video. '));
      const link = document.createElement('a');
      link.href = 'https://www.youtube.com/watch?v=RdZYQ8fPMB0';
      link.textContent = 'Watch on YouTube';
      status.append(link);
    };

    let loadTimeout = setTimeout(showVideoError, 20000);
    const createPlayer = () => {
      clearTimeout(loadTimeout);
      loadTimeout = setTimeout(showVideoError, 20000);
      const target = document.createElement('div');
      target.id = 'alphabet-player';
      display.replaceChildren(target);
      imac.classList.add('is-playing');
      new YT.Player(target, {
        videoId: 'RdZYQ8fPMB0',
        playerVars: {
          autoplay: 0,
          loop: 0,
          rel: 0,
          // Match the mobile mouse-control layout in style.css.
          controls: window.matchMedia('(max-width: 768px)').matches ? 0 : 1,
          playsinline: 1,
          origin: window.location.origin,
          // Do not force captions on. YouTube may honor a viewer's saved preference.
        },
        events: {
          onReady: (event) => {
            clearTimeout(loadTimeout);
            status.hidden = true;
            const frame = event.target.getIframe();
            frame.classList.add('alphabet-video');
            frame.title = 'Learn the alphabet with Bryan';
            const player = event.target;
            alphabetPlayer = player;
            toggle.disabled = false;
            const syncPlaybackControls = () => {
              setPlaybackState(player.getPlayerState());
              mute.textContent = player.isMuted() ? 'unmute' : 'mute';
            };
            mute.addEventListener('click', () => {
              const wasMuted = player.isMuted();
              if (wasMuted) player.unMute();
              else player.mute();
              mute.textContent = wasMuted ? 'mute' : 'unmute';
            });
            restart.addEventListener('click', () => {
              player.seekTo(0, true);
              player.playVideo();
            });
            controls.hidden = false;
            controls.dataset.ready = 'true';
            syncPlaybackControls();
            if (window.matchMedia('(max-width: 768px)').matches) {
              toggle.focus({ preventScroll: true });
            }
            // Playback follows the visitor's explicit Play click, never page load.
            event.target.playVideo();
          },
          onError: () => { clearTimeout(loadTimeout); showVideoError(); },
          onAutoplayBlocked: () => {
            status.hidden = false;
            status.textContent = 'Tap play to start the video.';
            setPlaybackState(-1);
          },
          onStateChange: (event) => {
            if (event.data === 1) status.hidden = true;
            setPlaybackState(event.data);
          }
        }
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
      const api = document.createElement('script');
      api.src = 'https://www.youtube.com/iframe_api';
      api.onerror = () => { clearTimeout(loadTimeout); showVideoError(); };
      document.head.append(api);
    }
  }, { once: true });

  const input = document.getElementById("textInput");
  const output = document.getElementById("output");
  
  const downloadBtn = document.getElementById("download");

  if (!input || !output || !downloadBtn) {
    console.error("Required elements not found!");
    return;
  }

  // Select on entry so a phone's first keystroke replaces the existing message.
  // Later taps in the focused field still let the visitor position the cursor.
  const selectsOnEntry = () => window.matchMedia('(max-width: 768px)').matches;
  let selectAfterTap = false;
  input.addEventListener('pointerdown', () => {
    selectAfterTap = selectsOnEntry() && document.activeElement !== input;
  });
  input.addEventListener('focus', () => {
    if (selectsOnEntry()) input.select();
  });
  input.addEventListener('click', () => {
    // A touch click can reposition the caret after the focus event.
    if (selectAfterTap) input.select();
    selectAfterTap = false;
  });
  input.addEventListener('blur', () => { selectAfterTap = false; });

  // PostHog tracking variables
  let hasTyped = false;
  let inputCount = 0;
  let downloadCount = 0;
  
  // Helper function to safely track events
  function trackEvent(eventName, properties = {}) {
    if (typeof posthog !== 'undefined' && posthog.capture) {
      posthog.capture(eventName, properties);
    }
  }

  // Parallax scrolling effect for background images
  const parallaxLeft = document.querySelector('.parallax-left');
  const parallaxRight = document.querySelector('.parallax-right');
  
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateParallax() {
    if (reducedMotion.matches) {
      [parallaxLeft, parallaxRight].forEach(image => { if (image) image.style.transform = 'none'; });
      return;
    }
    const scrolled = window.pageYOffset;
    const isMobile = window.innerWidth <= 768;
    
    // More dramatic parallax on mobile, but not so much they disappear
    // Use the same speed for both images to ensure symmetric movement
    const parallaxSpeed = isMobile ? 0.6 : 0.3;
    const moveDistance = scrolled * parallaxSpeed;
    
    if (parallaxLeft) {
      // Left image moves down as you scroll
      // Use translate3d for better hardware acceleration on mobile
      parallaxLeft.style.transform = `translate3d(0, ${moveDistance}px, 0)`;
    }
    
    if (parallaxRight) {
      // Right image moves up as you scroll (opposite direction, same distance)
      // Use translate3d for better hardware acceleration on mobile
      parallaxRight.style.transform = `translate3d(0, ${-moveDistance}px, 0)`;
    }
  }
  
  // Throttle scroll events for better performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateParallax();
        ticking = false;
      });
      ticking = true;
    }
  });
  
  reducedMotion.addEventListener('change', updateParallax);
  // Initial call
  updateParallax();

  // Bump only when the letter assets change so repeat visits can use the cache.
  const imageVersion = "2";

  // Helper function to check if character is valid and get filename
  function getImageFilename(char) {
    if (char >= "A" && char <= "Z") {
      return `${char}.png`;
    } else if (char === "!") {
      return "!.png";
    } else if (char === ".") {
      return "period.png";
    } else if (char === "?") {
      return "question.png";
    }
    return null; // Invalid character
  }

  // Helper function to check if character is valid
  function isValidChar(char) {
    return (char >= "A" && char <= "Z") || char === "!" || char === "." || char === "?";
  }

  // Function to update output
  function updateOutput() {
    // Use requestAnimationFrame to batch DOM updates and prevent flashing
    requestAnimationFrame(() => {
      output.innerHTML = "";

      const text = input.value.toUpperCase();
      
      // Split text into words (by spaces) to keep words together
      const words = text.split(/(\s+)/);
      output.setAttribute('aria-label', text.replace(/[^A-Z!.?\s]/g, '').trim() || 'Your message preview');
      
      for (const word of words) {
        if (word.trim() === "") {
          // This is whitespace - create space element
          const spaceDiv = document.createElement("div");
          // Smaller spaces for web, keep mobile sizes
          const isMobile = window.innerWidth <= 768;
          const spaceWidth = 100;
          const spaceHeight = isMobile ? 80 : 100;
          spaceDiv.style.width = `${spaceWidth}px`;
          spaceDiv.style.height = `${spaceHeight}px`;
          spaceDiv.style.display = "block";
          spaceDiv.style.flexShrink = "0";
          spaceDiv.dataset.isSpace = "true";
          spaceDiv.className = "word-space";
          output.appendChild(spaceDiv);
        } else {
          // This is a word - wrap it in a container to keep letters together
          const wordContainer = document.createElement("span");
          wordContainer.className = "word-container";
          
          for (const char of word) {
            if (isValidChar(char)) {
              const filename = getImageFilename(char);
              if (filename) {
                const img = document.createElement("img");
                img.crossOrigin = "anonymous";
                // URL encode the filename to handle special characters like "?" in the filename
                const encodedFilename = encodeURIComponent(filename);
                img.src = `letters/${encodedFilename}?v=${imageVersion}`;
                img.alt = "";
                img.dataset.char = char;
                img.className = "letter";
                wordContainer.appendChild(img);
              }
            }
          }
          
          if (wordContainer.children.length > 0) {
            output.appendChild(wordContainer);
            

          }
        }
      }
      
    });
  }

  // Listen for input changes
  // Track input events
  input.addEventListener("input", () => {
    const text = input.value.trim();
    
    // Track first time user types
    if (!hasTyped && text.length > 0) {
      hasTyped = true;
      trackEvent('user_started_typing', {
        initial_text_length: text.length
      });
    }
    
    // Track each input change (debounced to avoid too many events)
    if (text.length > 0) {
      inputCount++;
      // Only track every 5th character change to avoid spam
      if (inputCount % 5 === 0 || text.length === 1) {
        trackEvent('user_typing', {
          text_length: text.length,
          input_count: inputCount
        });
      }
    }
    
    updateOutput();
  });
  
  // Pick once per page load, independently of analytics or feature-flag timing.
  const defaultMessages = [
    'will you be my bloodboy?',
    'i am lowkey scared of death',
    'hello my name is bryan johnson',
    'kate and i stayed up past bedtime last night'
  ];
  input.value = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
  updateOutput();

  // Compose the exported message independently of the webpage's responsive layout.
  const downloadImage = (message = input.value, preparedLetterImages = null) => {
    const text = message.toUpperCase();
    if (!text.trim()) {
      alert("Please type something first!");
      return;
    }

    const letterImages = preparedLetterImages || new Map(
      Array.from(output.querySelectorAll("img[data-char]"), img => [img.dataset.char, img])
    );
    let canvas;
    try {
      canvas = createMessageCanvas(text, letterImages);
    } catch (error) {
      alert(error.message);
      return;
    }

    const filename = `${text.replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'livefontever'}.png`;
    const reportError = error => {
      console.error('Unable to share or download image:', error);
      alert('Unable to save the image. Please try again.');
    };
    const saveImage = blob => {
      try { downloadBlob(blob, filename); }
      catch (error) { reportError(error); }
    };

    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      try {
        // Encode synchronously so the native share sheet keeps the original tap gesture.
        const dataURL = canvas.toDataURL('image/png');
        const bytes = Uint8Array.from(atob(dataURL.split(',')[1]), char => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'image/png' });
        const file = new File([blob], filename, { type: 'image/png' });
        try {
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file] }).catch(error => {
              if (error.name !== 'AbortError') saveImage(blob);
            });
          } else {
            saveImage(blob);
          }
        } catch (error) {
          // A blocked share API can still fall back to the already prepared image.
          if (error.name !== 'AbortError') saveImage(blob);
        }
        return;
      } catch (error) {
        // If synchronous encoding fails, try the browser's Blob encoder below.
        console.warn('Preparing image for download instead:', error);
      }
    }

    try { canvas.toBlob(saveImage, 'image/png'); }
    catch (error) { reportError(error); }
  };

  downloadBtn.addEventListener("click", () => {
    downloadCount++;
    trackEvent('download_clicked', {
      download_type: 'transparent',
      download_number: downloadCount,
      text_length: input.value.trim().length,
      has_typed: hasTyped
    });
    downloadImage();
  });

  const createTweetBtn = document.getElementById('createTweet');
  createTweetBtn.addEventListener('click', () => {
    if (!input.value.trim()) {
      alert('Please type something first!');
      return;
    }
    const letterImages = new Map(
      Array.from(output.querySelectorAll('img[data-char]'), img => [img.dataset.char, img])
    );
    try {
      const canvas = createMessageCanvas(input.value, letterImages, { blueBackground: true });
      createTweetBtn.disabled = true;
      canvas.toBlob(blob => {
        createTweetBtn.disabled = false;
        if (!blob) {
          alert('Unable to create the image. Please try again.');
          return;
        }
        try { downloadBlob(blob, 'livefontever-tweet.png'); }
        catch (error) { alert(error.message); }
      }, 'image/png');
    } catch (error) {
      createTweetBtn.disabled = false;
      alert(error.message);
    }
  });

  // Preload preset letters so sharing stays within the original click gesture.
  const presets = Array.from(document.querySelectorAll('.preset-message'));
  const presetImages = new Map();
  const presetChars = new Set(presets.flatMap(preset =>
    Array.from(preset.dataset.message.toUpperCase()).filter(isValidChar)
  ));
  Promise.all(Array.from(presetChars, char => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = () => reject(new Error(`Unable to load ${char}`));
    presetImages.set(char, img);
    img.src = `letters/${getImageFilename(char)}?v=${imageVersion}`;
  }))).then(() => {
    presets.forEach(preset => {
      const message = preset.dataset.message;
      const canvas = createMessageCanvas(message, presetImages, { includeWatermark: false });
      canvas.style.width = `${canvas.width / 3 * 0.38}px`;
      canvas.setAttribute('aria-hidden', 'true');
      preset.appendChild(canvas);
      preset.disabled = false;
      preset.addEventListener('click', () => {
        downloadImage(message, presetImages);
      });
    });
    const status = document.querySelector('.preset-status');
    if (status) status.hidden = true;
  }).catch(error => {
    console.error('Preset messages failed to load:', error);
    const status = document.querySelector('.preset-status');
    if (status) status.textContent = 'Messages could not load. Refresh to try again.';
  });

  // Share button functionality
  const shareButton = document.getElementById("shareButton");
  if (shareButton) {
    shareButton.addEventListener("click", () => {
      trackEvent('share_clicked', {
        text_length: input.value.trim().length,
        has_typed: hasTyped,
        input_count: inputCount
      });
      const message = "hey man, i thought you specifically would enjoy looking at this little naked man as a font https://livefontever.com";
      const smsLink = `sms:?body=${encodeURIComponent(message)}`;
      window.location.href = smsLink;
    });
  }

  // Scroll reveal animation for individual elements (works both ways)
  // Use a larger threshold and rootMargin to prevent glitchy behavior at edges
  const observerOptions = {
    threshold: [0, 0.15], // Trigger at 0% and 15% visibility for smoother transitions
    rootMargin: '50px 0px 50px 0px' // Add margin to create buffer zone and prevent edge flickering
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Use a higher threshold check to prevent rapid toggling at edges
      const isVisible = entry.intersectionRatio >= 0.15 || entry.isIntersecting;
      
      if (isVisible) {
        entry.target.classList.add('visible');
      } else {
        // Only remove visible if element is significantly out of view
        // This prevents flickering when element is right at the edge
        if (entry.intersectionRatio === 0) {
          entry.target.classList.remove('visible');
        }
      }
    });
  }, observerOptions);

  // Observe all elements with scroll-reveal class
  const scrollRevealElements = document.querySelectorAll('.scroll-reveal');

  // Set up observers after a short delay to ensure DOM is ready
  setTimeout(() => {
    scrollRevealElements.forEach(element => {
      // Check if already in viewport
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add('visible');
      }
      observer.observe(element);
    });
  }, 200);

  // Prevent all downloads/interactions from output area
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Prevent context menu on images in output
  output.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('#output')) {
      e.preventDefault();
    }
  }, true);
  
  // Prevent image dragging
  output.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
  
  // Mobile: prevent all image interactions (click, touch, etc.)
  if (isMobile) {
    output.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('#output')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    
    output.addEventListener('touchstart', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('#output')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
  // Desktop: Allow default right-click menu (including "Save image as")
  
});
