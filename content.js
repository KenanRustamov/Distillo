// Content script for Distillo YouTube to Anki
// Currently not used for core functionality (title is fetched via background script injection)
// Could be used in the future for direct DOM manipulation or transcript scraping.

console.log("Distillo content script loaded (placeholder).");

// Example: Listener for messages from the background script (if needed later)
/*
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSomeDataFromPage") {
    console.log("Content script received request:", request);
    // ... logic to get data from the DOM ...
    const data = document.title; // Example
    sendResponse({ status: "success", data: data });
  }
});
*/ 