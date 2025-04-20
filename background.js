const YOUTUBE_WATCH_REGEX = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=/;

// Function to update the extension icon based on the URL
function updateIcon(tabId, url) {
  if (!url) return; // Prevent errors if URL is undefined

  const isYouTubeWatch = YOUTUBE_WATCH_REGEX.test(url);
  let singleIconPath = ""; // Store single path string

  if (isYouTubeWatch) {
      singleIconPath = "icons/icon48.png";
      console.log(`Updating icon for YouTube tab ${tabId} to COLOR (48px):`, singleIconPath);
  } else {
      singleIconPath = "icons/icon48-grey.png";
      console.log(`Updating icon for non-YouTube tab ${tabId} to GREY (48px):`, singleIconPath);
  }

  // Test using single path string instead of object
  chrome.action.setIcon({ path: singleIconPath, tabId: tabId }).catch(error => {
      if (error && error.message && !error.message.includes("No tab with id")) {
          console.error(`Error setting icon for tab ${tabId} (single path attempt):`, error);
      }
  });
}

// Listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Prioritize changeInfo.url, fallback to tab.url when status is complete
  const url = changeInfo.url || (changeInfo.status === 'complete' ? tab.url : null);

  if (url) {
    // Update the icon regardless
    updateIcon(tabId, url);

    // Prefetch video details if it's a YouTube video page
    if (YOUTUBE_WATCH_REGEX.test(url)) {
      console.log(`Prefetching details for YouTube video: ${url}`);
      // Call getVideoDetails, but don't need to wait for it or use the result here.
      // The function handles caching internally.
      getVideoDetails(url).catch(error => {
        // Log prefetch errors silently in the background
        console.warn(`Background prefetch failed for ${url}: ${error.message}`);
      });
    }
  }
});

// Listener for when the active tab changes (Ensure icon is correct)
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
        // console.warn(`Error getting tab info on activation: ${chrome.runtime.lastError.message}`);
        return;
    }
    if (tab && tab.url) {
      updateIcon(tab.id, tab.url);
      // We *could* prefetch here too, but onUpdated is generally sufficient
      // and avoids fetching if the user just switches tabs without navigation.
    }
  });
});

// Ensure icon is set correctly when Chrome starts or extension is installed/updated
chrome.runtime.onStartup.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            updateIcon(tabs[0].id, tabs[0].url);
        }
    });
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
             if (tab.url) updateIcon(tab.id, tab.url);
        });
    });
});

// Function to fetch video details from YouTube oEmbed, with session caching
async function getVideoDetails(videoUrl) {
  const videoId = new URL(videoUrl).searchParams.get('v');
  if (!videoId) {
    throw new Error("Invalid video URL: Missing video ID.");
  }

  const cacheKey = `video_details_${videoId}`;

  try {
    // 1. Check cache first
    const cachedData = await chrome.storage.session.get(cacheKey);
    if (cachedData && cachedData[cacheKey]) {
      console.log("Retrieved video details from cache for:", videoId);
      return cachedData[cacheKey];
    }
  } catch (error) {
    console.warn("Error accessing session storage for cache read:", error);
    // Proceed to fetch if cache read fails
  }

  // 2. If not cached, fetch from oEmbed
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  console.log("Fetching oEmbed data from:", oembedUrl);
  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
       console.error(`oEmbed fetch failed: ${response.status} ${response.statusText}`);
       let errorMessage = `Could not fetch video details (Status: ${response.status}).`;
       if (response.status === 404) errorMessage = "Video not found or private.";
       if (response.status === 401 || response.status === 403) errorMessage = "Access denied to video details.";
       try {
         const errorBody = await response.text(); console.error("oEmbed error body:", errorBody);
       } catch {}
       throw new Error(errorMessage);
    }
    const data = await response.json();
    console.log("oEmbed data received:", data);

    const detailsToCache = {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url
    };

    // 3. Store fetched data in cache
    try {
      await chrome.storage.session.set({ [cacheKey]: detailsToCache });
      console.log("Stored video details in cache for:", videoId);
    } catch (error) {
      console.warn("Error accessing session storage for cache write:", error);
      // Continue even if caching fails
    }

    return detailsToCache;

  } catch (error) {
    console.error("Error fetching or parsing oEmbed data:", error);
    throw new Error(error.message || "Failed to fetch video details.");
  }
}

// Listener for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "convertToAnki") {
    console.log("Received request to convert to Anki");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
          console.error(`Error querying tabs: ${chrome.runtime.lastError.message}`);
          sendResponse({ status: "error", message: "Could not get current tab info."}) ;
          return;
      }

      const currentTab = tabs[0];
      if (currentTab && currentTab.url && YOUTUBE_WATCH_REGEX.test(currentTab.url)) {
        const videoUrl = currentTab.url;
        const videoId = new URL(videoUrl).searchParams.get('v');
        const tabId = currentTab.id;
        console.log(`Processing video ID: ${videoId} from tab ${tabId}`);

        // --- Transcript Fetching and Processing Logic --- 
        // This part needs implementation. 
        // Option 1: Use youtube-transcript library (requires network requests, potentially CORS issues if called from content script directly, better from background)
        // Option 2: Inject content script to scrape DOM (more brittle)
        // Option 3: Call a dedicated API (requires separate server)

        // Example using youtube-transcript (conceptual - requires library/API call)
        // fetchTranscript(videoId).then(transcript => { ... }); 

        // Placeholder for actual implementation:
        console.log("TODO: Implement transcript fetching for video:", videoId);
        const transcriptText = "This is line 1.\nThis is line 2.\nAnother line follows.\nFinal line."; // Replace with actual fetched transcript

        console.log("TODO: Implement Anki deck generation from transcript:", transcriptText);
        // Simple CSV generation: Each line becomes a card (Front=Line Number, Back=Text)
        const lines = transcriptText.split('\n').filter(line => line.trim() !== '');
        let csvContent = "Front,Back\n"; // Anki default CSV header
        lines.forEach((line, index) => {
            // Escape double quotes for CSV
            const formattedLine = line.replace(/"/g, '""'); 
            csvContent += `"Line ${index + 1}","${formattedLine}"\n`;
        });
        
        console.log("Generated CSV content:", csvContent);

        console.log("TODO: Implement file download using chrome.downloads.download");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);

        // Attempt to get video title using scripting API
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => document.title.replace(/ - YouTube$/, '').replace(/[^\w\s]/gi, '_') // Basic title cleanup
        }).then(injectionResults => {
            let filename = `anki_deck_${videoId || 'youtube'}.csv`; // Default filename
            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                filename = `${injectionResults[0].result}_anki.csv`;
            }

            chrome.downloads.download({
                url: downloadUrl,
                filename: filename,
                saveAs: true // Prompt user for save location
            }).then(downloadId => {
                 console.log(`Download started with ID: ${downloadId}`);
                 URL.revokeObjectURL(downloadUrl); // Clean up blob URL
                 sendResponse({ status: "success", message: "Anki deck CSV generated and download started." });
            }).catch(error => {
                 console.error(`Download failed: ${error}`);
                 URL.revokeObjectURL(downloadUrl); // Clean up blob URL
                 sendResponse({ status: "error", message: `Download failed: ${error.message}` });
            });

        }).catch(scriptingError => {
            console.warn(`Could not get video title via scripting: ${scriptingError}. Using default filename.`);
             // Proceed with download using default filename if title fetch fails
            chrome.downloads.download({
                url: downloadUrl,
                filename: `anki_deck_${videoId || 'youtube'}.csv`,
                saveAs: true
            }).then(downloadId => {
                 console.log(`Download started with ID: ${downloadId} (default name)`);
                 URL.revokeObjectURL(downloadUrl); // Clean up blob URL
                 sendResponse({ status: "success", message: "Anki deck CSV generated (default name) and download started." });
            }).catch(error => {
                 console.error(`Download failed (default name): ${error}`);
                 URL.revokeObjectURL(downloadUrl); // Clean up blob URL
                 sendResponse({ status: "error", message: `Download failed: ${error.message}` });
            });
        });

      } else {
        console.log("Not a valid YouTube video page or tab info unavailable.");
        sendResponse({ status: "error", message: "Extension can only be used on a YouTube video page." });
      }
    });
    return true; // Indicates response will be sent asynchronously
  }

  // --- New handler for popup data ---
  if (request.action === "getPopupData") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error(`Error querying tabs for popup data: ${chrome.runtime.lastError.message}`);
        sendResponse({ status: "error", error: "Could not get current tab info." });
        return;
      }

      const currentTab = tabs[0];
      if (currentTab && currentTab.url && YOUTUBE_WATCH_REGEX.test(currentTab.url)) {
        const videoUrl = currentTab.url;
        // Fetch video details asynchronously
        getVideoDetails(videoUrl)
          .then(details => {
            sendResponse({ status: "success", videoDetails: details });
          })
          .catch(error => {
            console.error(`Failed to get video details for ${videoUrl}:`, error);
            sendResponse({ status: "error", error: error.message || "Failed to get video details." });
          });
      } else {
        // Not on a YouTube video page
        sendResponse({ status: "not_youtube_video" });
      }
    });
    return true; // Required for async response
  }

  // Potential future handlers below
}); 