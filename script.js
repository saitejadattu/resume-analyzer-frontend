// Backend URL — make sure your backend is running on this address
const API_URL = "https://resume-analyzer-backend-eik7.onrender.com/api/review";

// Grab references to all the DOM elements we will use
const resumeInput = document.getElementById("resumeInput");
const reviewBtn = document.getElementById("reviewBtn");
const validationMessage = document.getElementById("validationMessage");
const errorBox = document.getElementById("errorBox");
const results = document.getElementById("results");

const scoreEl = document.getElementById("score");
const strengthsList = document.getElementById("strengthsList");
const weaknessesList = document.getElementById("weaknessesList");
const improvementsList = document.getElementById("improvementsList");
const summaryText = document.getElementById("summaryText");

// When the "Review My Resume" button is clicked, run the handler
reviewBtn.addEventListener("click", handleReview);

async function handleReview() {
  const resumeText = resumeInput.value.trim();

  // Clear any old messages before starting a new request
  hideValidation();
  hideError();
  hideResults();

  // Empty textarea → inline validation, stop here
  if (!resumeText) {
    showValidation();
    return;
  }

  setLoading(true);

  try {
    // Send POST request to the backend with the resume text
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText }),
    });

    if (!response.ok) {
      showError("Something went wrong. Please try again in a moment.");
      return;
    }

    const data = await response.json();
    const parsed = parseFeedback(data.feedback);
    renderResults(parsed);
  } catch (err) {
    // Network failure — backend offline or no internet
    console.error(err);
    showError("Could not connect to the server. Make sure the backend is running.");
  } finally {
    setLoading(false);
  }
}

// Parse the structured text from Gemini into an object with each section
function parseFeedback(text) {
  return {
    score: extractSection(text, /SCORE:/i, /STRENGTHS:/i),
    strengths: extractSection(text, /STRENGTHS:/i, /WEAKNESSES:/i),
    weaknesses: extractSection(text, /WEAKNESSES:/i, /IMPROVEMENTS:/i),
    improvements: extractSection(text, /IMPROVEMENTS:/i, /SUMMARY:/i),
    summary: extractSection(text, /SUMMARY:/i, null),
  };
}

// Pull out the text between a start header and the next header
function extractSection(text, startRegex, endRegex) {
  const startIdx = text.search(startRegex);
  if (startIdx === -1) return "";

  const afterHeader = text.slice(startIdx).replace(startRegex, "");

  if (endRegex) {
    const endIdx = afterHeader.search(endRegex);
    if (endIdx !== -1) return afterHeader.slice(0, endIdx).trim();
  }
  return afterHeader.trim();
}

// Turn bullet lines into an array of strings (without the leading "-")
function parseBullets(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("•"))
    .map((line) => line.replace(/^[-•]\s*/, ""))
    .filter((line) => line.length > 0);
}

// Show the parsed sections in the results UI
function renderResults(parsed) {
  scoreEl.textContent = parsed.score || "-/10";

  fillList(strengthsList, parseBullets(parsed.strengths));
  fillList(weaknessesList, parseBullets(parsed.weaknesses));
  fillList(improvementsList, parseBullets(parsed.improvements));

  summaryText.innerHTML = cleanMarkdown(parsed.summary || "");

  results.classList.remove("hidden");
}

// Empty a <ul> and add a new <li> for each item
function fillList(ul, items) {
  ul.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    // Use innerHTML so the bold/italic tags from cleanMarkdown actually render
    li.innerHTML = cleanMarkdown(item);
    ul.appendChild(li);
  });
}

// Convert **bold** and *italic* into real HTML tags.
// Escape any raw HTML first so user input can't inject markup.
function cleanMarkdown(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Toggle the loading state on the button
function setLoading(isLoading) {
  reviewBtn.disabled = isLoading;
  reviewBtn.textContent = isLoading ? "Reviewing..." : "Review My Resume";
}

// Show/hide helpers
function showValidation() { validationMessage.classList.remove("hidden"); }
function hideValidation() { validationMessage.classList.add("hidden"); }

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
function hideError() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function hideResults() { results.classList.add("hidden"); }
