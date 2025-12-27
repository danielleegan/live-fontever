document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("textInput");
  const output = document.getElementById("output");
  const downloadBtn = document.getElementById("download");
  const downloadTransparentBtn = document.getElementById("downloadTransparent");

  if (!input || !output || !downloadBtn || !downloadTransparentBtn) {
    console.error("Required elements not found!");
    return;
  }

  // Parallax scrolling effect for background images
  const parallaxLeft = document.querySelector('.parallax-left');
  const parallaxRight = document.querySelector('.parallax-right');
  
  function updateParallax() {
    const scrolled = window.pageYOffset;
    const isMobile = window.innerWidth <= 768;
    
    // More dramatic parallax on mobile, but not so much they disappear
    const parallaxSpeed = isMobile ? 0.6 : 0.3;
    
    if (parallaxLeft) {
      // Left image moves down as you scroll
      parallaxLeft.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
    }
    
    if (parallaxRight) {
      // Right image moves up as you scroll (opposite direction)
      parallaxRight.style.transform = `translateY(${-scrolled * parallaxSpeed}px)`;
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
  
  // Initial call
  updateParallax();

  // Set a cache-busting version that only changes on page load, not on every keystroke
  const imageVersion = Date.now();

  // Helper function to check if character is valid and get filename
  function getImageFilename(char) {
    if (char >= "A" && char <= "Z") {
      return `${char}.png`;
    } else if (char === "!") {
      return "!.png";
    } else if (char === ".") {
      return "period.png";
    }
    return null; // Invalid character
  }

  // Helper function to check if character is valid
  function isValidChar(char) {
    return (char >= "A" && char <= "Z") || char === "!" || char === ".";
  }

  // Function to update output
  function updateOutput() {
    // Use requestAnimationFrame to batch DOM updates and prevent flashing
    requestAnimationFrame(() => {
      output.innerHTML = "";

      const text = input.value.toUpperCase();
      
      // Split text into words (by spaces) to keep words together
      const words = text.split(/(\s+)/);
      // Calculate max width accounting for mobile padding
      const isMobile = window.innerWidth <= 768;
      const padding = isMobile ? 40 : 80;
      const maxWidth = output.offsetWidth || (window.innerWidth - padding);
      
      for (const word of words) {
        if (word.trim() === "") {
          // This is whitespace - create space element
          const spaceDiv = document.createElement("div");
          // Smaller spaces for web, keep mobile sizes
          const isMobile = window.innerWidth <= 768;
          const spaceWidth = isMobile ? 100 : 100;
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
          wordContainer.style.display = "inline-flex";
          wordContainer.style.flexWrap = "nowrap";
          wordContainer.style.flexShrink = "1";
          wordContainer.style.minWidth = "0";
          wordContainer.className = "word-container";
          
          for (const char of word) {
            if (isValidChar(char)) {
              const filename = getImageFilename(char);
              if (filename) {
                const img = document.createElement("img");
                img.src = `letters/${filename}?v=${imageVersion}`;
                img.dataset.char = char;
                img.className = "letter";
                wordContainer.appendChild(img);
              }
            }
          }
          
          if (wordContainer.children.length > 0) {
            output.appendChild(wordContainer);
            
            // Check if word is longer than the line after images load
            const checkWordWidth = () => {
              requestAnimationFrame(() => {
                const wordWidth = wordContainer.offsetWidth;
                if (wordWidth > maxWidth) {
                  // Word is longer than line - allow it to break by removing nowrap
                  wordContainer.style.flexWrap = "wrap";
                }
              });
            };
            
            // Trigger check after all images in the word load
            const images = Array.from(wordContainer.querySelectorAll('img'));
            let loadedCount = 0;
            if (images.length === 0) {
              checkWordWidth();
            } else {
              images.forEach(img => {
                if (img.complete) {
                  loadedCount++;
                  if (loadedCount === images.length) {
                    checkWordWidth();
                  }
                } else {
                  img.onload = () => {
                    loadedCount++;
                    if (loadedCount === images.length) {
                      checkWordWidth();
                    }
                  };
                }
              });
            }
          }
        }
      }
      
    });
  }

  // Listen for input changes
  input.addEventListener("input", updateOutput);
  
  // Trigger initial output with default value
  updateOutput();

  // Function to handle download with optional background
  const downloadImage = (includeBackground) => {
    console.log("Download button clicked", includeBackground ? "(with background)" : "(transparent)");
    const text = input.value.toUpperCase();
    if (!text.trim()) {
      alert("Please type something first!");
      return;
    }
    console.log("Processing text:", text);

    // Get all elements from the output container to preserve the exact layout
    const elements = Array.from(output.children);
    if (elements.length === 0) {
      alert("No content to download!");
      return;
    }

    // Group elements by line (based on their top position)
    const lines = [];
    let currentLine = [];
    let currentTop = null;

    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const top = rect.top;

      if (currentTop === null || Math.abs(top - currentTop) < 10) {
        // Same line
        currentLine.push({ element, rect });
        if (currentTop === null) currentTop = top;
      } else {
        // New line
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = [{ element, rect }];
        currentTop = top;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    if (lines.length === 0) {
      alert("No content to download!");
      return;
    }

    // First pass: calculate scale factor from images
    let totalScale = 0;
    let scaleCount = 0;
    for (const line of lines) {
      for (const { element } of line) {
        if (element.tagName === "SPAN" && element.classList.contains("word-container")) {
          const images = Array.from(element.querySelectorAll("img"));
          for (const img of images) {
            if (img.complete && img.naturalWidth > 0) {
              const imgRect = img.getBoundingClientRect();
              const displayedWidth = imgRect.width;
              const naturalWidth = img.naturalWidth;
              if (displayedWidth > 0) {
                totalScale += naturalWidth / displayedWidth;
                scaleCount++;
              }
            }
          }
        } else if (element.tagName === "IMG") {
          if (element.complete && element.naturalWidth > 0) {
            const imgRect = element.getBoundingClientRect();
            const displayedWidth = imgRect.width;
            const naturalWidth = element.naturalWidth;
            if (displayedWidth > 0) {
              totalScale += naturalWidth / displayedWidth;
              scaleCount++;
            }
          }
        }
      }
    }
    // Use average scale factor, or default to 2x for quality if no images
    const qualityScale = scaleCount > 0 ? totalScale / scaleCount : 2;

    // Calculate dimensions for each line and overall canvas
    const lineData = [];
    let maxLineWidth = 0;
    let totalHeight = 0;

    for (const line of lines) {
      let lineWidth = 0;
      let lineMaxHeight = 0;
      const lineElements = [];

      for (const { element, rect } of line) {
        if (element.dataset.isSpace === "true" || element.classList.contains("word-space")) {
          // Space element - scale up for quality
          const spaceWidth = (rect.width || 150) * qualityScale;
          lineWidth += spaceWidth;
          lineElements.push({ isSpace: true, width: spaceWidth, height: 0 });
        } else if (element.tagName === "SPAN" && element.classList.contains("word-container")) {
          // Word container - get all images inside
          const images = Array.from(element.querySelectorAll("img"));
          for (const img of images) {
            if (img.complete && img.naturalWidth > 0) {
              // Use natural dimensions for better quality
              const naturalWidth = img.naturalWidth;
              const naturalHeight = img.naturalHeight;
              lineWidth += naturalWidth;
              lineMaxHeight = Math.max(lineMaxHeight, naturalHeight);
              lineElements.push({ 
                isSpace: false, 
                img: img, 
                width: naturalWidth, 
                height: naturalHeight
              });
            }
          }
        } else if (element.tagName === "IMG") {
          // Direct image
          if (element.complete && element.naturalWidth > 0) {
            // Use natural dimensions for better quality
            const naturalWidth = element.naturalWidth;
            const naturalHeight = element.naturalHeight;
            lineWidth += naturalWidth;
            lineMaxHeight = Math.max(lineMaxHeight, naturalHeight);
            lineElements.push({ 
              isSpace: false, 
              img: element, 
              width: naturalWidth, 
              height: naturalHeight
            });
          }
        }
      }

      if (lineElements.length > 0) {
        lineData.push({ elements: lineElements, width: lineWidth, height: lineMaxHeight });
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
        totalHeight += lineMaxHeight;
      }
    }

    if (lineData.length === 0) {
      alert("No valid content to download!");
      return;
    }
    
    // Line spacing constant (matches CSS row-gap) - scale up for quality
    const lineSpacing = 20 * qualityScale;
    const watermarkPadding = 25 * qualityScale; // Padding above and below watermark text
    const imagePadding = 30 * qualityScale; // Padding around the entire image

    // Calculate content dimensions (already using natural dimensions)
    const contentHeight = totalHeight + (lineData.length - 1) * lineSpacing;
    const contentWidth = maxLineWidth;

    // Calculate watermark dimensions only if background is included
    let watermarkHeight = 0;
    let fontSize = 14 * qualityScale; // Scale font size for quality
    if (includeBackground) {
      const watermarkText = "these bryans were brought to you by livefontever.com";
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.font = `${fontSize}px sans-serif`;
      const tempTextMetrics = tempCtx.measureText(watermarkText);
      const targetWidth = contentWidth; // Full content width
      if (tempTextMetrics.width > 0) {
        fontSize = Math.floor((fontSize * targetWidth) / tempTextMetrics.width);
        tempCtx.font = `${fontSize}px sans-serif`;
      }
      const watermarkTextHeight = fontSize; // Approximate text height
      watermarkHeight = watermarkPadding + watermarkTextHeight; // Spacing above + text height
    }
    
    // Calculate total content height including watermark (if any)
    const totalContentHeight = contentHeight + watermarkHeight;

    // Create canvas with padding around the entire image (at high resolution)
    const canvas = document.createElement("canvas");
    canvas.width = contentWidth + imagePadding * 2;
    canvas.height = totalContentHeight + imagePadding * 2;
    const ctx = canvas.getContext("2d");
    
    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill background with radial gradient (only if includeBackground is true)
    if (includeBackground) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      // Calculate radius to reach corners (diagonal distance)
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, "#334F97"); // Center color
      gradient.addColorStop(1, "#171B3C"); // Edge color
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw each line (offset by padding)
    let y = imagePadding;
    for (let i = 0; i < lineData.length; i++) {
      const line = lineData[i];
      let x = imagePadding; // Start x at padding position for uniform spacing
      for (const item of line.elements) {
        try {
          if (item.isSpace) {
            // Space - just advance x position without drawing anything
            x += item.width;
          } else {
            ctx.drawImage(item.img, x, y, item.width, item.height);
            x += item.width;
          }
        } catch (error) {
          console.error("Error drawing image:", error);
        }
      }
      y += line.height;
      // Add spacing after each line except the last one
      if (i < lineData.length - 1) {
        y += lineSpacing;
      }
    }

    // Draw watermark at the bottom only if background is included
    if (includeBackground) {
      const watermarkText = "these bryans were brought to you by livefontever.com";
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      // Draw text left-aligned (offset by padding for uniform spacing)
      ctx.fillStyle = "#FFFFFF"; // White text
      const watermarkY = imagePadding + contentHeight + watermarkPadding;
      ctx.fillText(watermarkText, imagePadding, watermarkY);
    }

    // Download as PNG
    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Error creating image. Please check the browser console for details.");
        console.error("Failed to create blob from canvas");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = includeBackground ? "" : "_transparent";
      a.download = `${text.replace(/\s+/g, "_")}${suffix}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  downloadBtn.addEventListener("click", () => downloadImage(true));
  downloadTransparentBtn.addEventListener("click", () => downloadImage(false));

  // Share button functionality
  const shareButton = document.getElementById("shareButton");
  if (shareButton) {
    shareButton.addEventListener("click", () => {
      const message = "hey man, i thought you specifically would enjoy looking at this little naked man as a font livefontever.com";
      const smsLink = `sms:?body=${encodeURIComponent(message)}`;
      window.location.href = smsLink;
    });
  }

  // Scroll reveal animation for individual elements (works both ways)
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
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
});
