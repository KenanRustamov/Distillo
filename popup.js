document.addEventListener('DOMContentLoaded', function() {
  const convertButton = document.getElementById('convertButton');
  const statusDiv = document.getElementById('status');
  const closeButton = document.getElementById('close-button');
  const settingsButton = document.getElementById('settings-button');
  const flagButton = document.getElementById('flag-button');

  const videoPreviewDiv = document.getElementById('video-preview');
  const videoThumbnail = document.getElementById('video-thumbnail');
  const videoTitleSpan = document.getElementById('video-title');
  const channelNameSpan = document.getElementById('channel-name');

  // Function to update preview display
  function updatePreview(state, data = {}) {
    // Reset classes first
    videoPreviewDiv.classList.remove('loading', 'loaded', 'error-loading');
    videoPreviewDiv.style.display = 'none'; // Hide by default

    if (state === 'loading') {
      videoPreviewDiv.classList.add('loading');
      videoPreviewDiv.style.display = 'block';
      // Hide button while loading info
      convertButton.style.visibility = 'hidden';
    } else if (state === 'loaded') {
      videoThumbnail.src = data.thumbnail_url || '';
      videoThumbnail.alt = data.title ? `Thumbnail for ${data.title}` : 'Video Thumbnail';
      videoTitleSpan.textContent = data.title || 'N/A';
      channelNameSpan.textContent = data.author_name || 'N/A';
      videoPreviewDiv.classList.add('loaded');
      videoPreviewDiv.style.display = 'flex'; // Use flex display when loaded
      // Show button now that info is loaded
      convertButton.style.visibility = 'visible';
    } else if (state === 'error') {
      videoPreviewDiv.classList.add('error-loading');
       // Use specific error message, fallback to default
      videoPreviewDiv.style.setProperty('--error-message', `content: "${data.error || 'Error loading video info.'}"`);
      videoPreviewDiv.style.display = 'block';
       // Hide button on error
      convertButton.style.visibility = 'hidden';
    } else if (state === 'not_youtube') {
         // Keep preview hidden, maybe show message in main status?
         statusDiv.textContent = "Open a YouTube video to use this extension.";
         statusDiv.className = ''; // Reset status class
         convertButton.style.visibility = 'hidden';
    }
  }

  // --- Initial data fetch on popup load ---
  updatePreview('loading');
  chrome.runtime.sendMessage({ action: "getPopupData" }, function(response) {
    if (chrome.runtime.lastError) {
      console.error("Error receiving popup data:", chrome.runtime.lastError.message);
      updatePreview('error', { error: `Error: ${chrome.runtime.lastError.message}` });
      return;
    }

    console.log("Popup received data:", response);

    if (response && response.status === 'success') {
        updatePreview('loaded', response.videoDetails);
    } else if (response && response.status === 'error') {
        updatePreview('error', { error: response.error });
    } else if (response && response.status === 'not_youtube_video') {
        updatePreview('not_youtube');
    } else {
        // Handle unexpected response structure
        updatePreview('error', { error: "Invalid response from background." });
    }
  });

  // Convert Button Listener
  if (convertButton) {
    convertButton.addEventListener('click', function() {
      // Clear previous status and disable button
      statusDiv.textContent = 'Processing...';
      statusDiv.className = ''; // Reset class
      convertButton.disabled = true;
      convertButton.setAttribute('aria-busy', 'true'); // Indicate activity for Pico

      // Send message to background script to start conversion
      chrome.runtime.sendMessage({ action: "convertToAnki" }, function(response) {
        // Re-enable button once response is received
        convertButton.disabled = false;
        convertButton.removeAttribute('aria-busy');

        if (chrome.runtime.lastError) {
          // Handle errors like the background script not being ready
          console.error("Error sending message:", chrome.runtime.lastError.message);
          statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
          statusDiv.className = 'error';
          return;
        }

        if (response) {
          console.log("Response from background:", response);
          statusDiv.textContent = response.message;
          statusDiv.className = response.status; // 'success' or 'error'
        } else {
           // Handle cases where the background script didn't send a response (unexpected)
           console.error("No response received from background script.");
           statusDiv.textContent = 'Error: No response from background.';
           statusDiv.className = 'error';
        }
      });
    });
  }

  // Close Button Listener
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      window.close(); // Standard way to close an extension popup
    });
  }

  // Settings Button Listener (Placeholder Action)
  if (settingsButton) {
    settingsButton.addEventListener('click', function() {
      console.log("Settings button clicked");
      // Example: Open options page if you have one defined in manifest.json
      // if (chrome.runtime.openOptionsPage) {
      //   chrome.runtime.openOptionsPage();
      // } else {
      //   window.open(chrome.runtime.getURL('options.html'));
      // }

      // Or open a specific URL
      // chrome.tabs.create({ url: 'your_settings_url.html' });
      statusDiv.textContent = 'Settings action not implemented yet.';
      statusDiv.className = ''; 
    });
  }

  // Flag Button Listener (Placeholder Action)
  if (flagButton) {
    flagButton.addEventListener('click', function() {
      console.log("Flag button clicked");
      // Example: Open a feedback form URL
      // chrome.tabs.create({ url: 'your_feedback_url_or_mailto:' });
      statusDiv.textContent = 'Flag action not implemented yet.';
      statusDiv.className = ''; 
    });
  }
}); 