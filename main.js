const HUGGINGFACE_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

const fileInput   = document.getElementById("fileInput");
const uploadArea  = document.getElementById("uploadArea");
const previewWrap = document.getElementById("previewWrap");
const preview     = document.getElementById("preview");
const previewMeta = document.getElementById("previewMeta");
const generateBtn = document.getElementById("generateBtn");
const resetBtn    = document.getElementById("resetBtn");
const resultBox   = document.getElementById("resultBox");
const captionText = document.getElementById("captionText");
const errorMsg    = document.getElementById("errorMsg");
const spinner     = document.getElementById("spinner");
const btnLabel    = document.getElementById("btnLabel");

let selectedFile = null;
let currentCaption = "";

/* ================= IMAGE UPLOAD ================= */

fileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;

  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.src = ev.target.result;

    const kb = Math.round(file.size / 1024);
    const ext = file.type.replace("image/", "").toUpperCase();
    previewMeta.textContent = `${ext} · ${kb} KB`;

    uploadArea.classList.add("hidden");
    previewWrap.classList.add("visible");
    generateBtn.style.display = "flex";
    resetBtn.style.display = "flex";

    resultBox.style.display = "none";
    errorMsg.style.display = "none";
  };
  reader.readAsDataURL(file);
});

/* ================= GENERATE ================= */

async function generateCaption() {
  if (!selectedFile) {
    showError("Please choose an image first");
    return;
  }

  setLoading(true);
  resultBox.style.display = "none";
  errorMsg.style.display = "none";

  try {
    const raw = await requestHuggingFaceCaption(selectedFile);
    const caption = normalizeCaption(raw);

    if (!caption) {
      throw new Error("No caption returned.");
    }

    currentCaption = caption;
    captionText.textContent = caption;
    resultBox.style.display = "block";

  } catch (err) {
    console.error(err);
    showError(err.message || "Caption generation failed. API might be rate-limited.");
  } finally {
    setLoading(false);
  }
}

async function requestHuggingFaceCaption(file) {
  // Hugging Face inference API without an auth token often works but can be rate-limited.
  // It may also return 503 if the model is currently loading into server memory.
  let response;
  try {
    response = await fetch(HUGGINGFACE_URL, {
      method: "POST",
      headers: {
        "Content-Type": file.type
      },
      body: file
    });
  } catch(err) {
      throw new Error("Network error. Could not connect to API.");
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 503 && data.estimated_time) {
      throw new Error(`Model is loading. Please try again in ${Math.round(data.estimated_time)} seconds.`);
    } else {
      throw new Error(data.error || "Failed to generate caption.");
    }
  }

  // Hugging Face typically returns an array for this pipeline: [{ "generated_text": "..." }]
  if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
    return data[0].generated_text;
  }

  return "";
}

/* ================= HELPERS ================= */

function normalizeCaption(text) {
  return String(text || "")
    .replace(/^\s*["']+/, "")
    .replace(/["']+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function showError(msg) {
  errorMsg.textContent = "⚠ " + msg;
  errorMsg.style.display = "block";
}

function setLoading(on) {
  generateBtn.disabled = on;
  spinner.style.display = on ? "block" : "none";
  btnLabel.textContent = on ? "Generating…" : "Generate caption";
}

function copyCaption() {
  if (!currentCaption) return;
  navigator.clipboard.writeText(currentCaption).then(() => {
    const btn = document.getElementById("copyBtn");
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1500);
  });
}

function resetApp() {
  selectedFile = null;
  currentCaption = "";

  preview.removeAttribute("src");
  previewWrap.classList.remove("visible");
  uploadArea.classList.remove("hidden");

  generateBtn.style.display = "none";
  resetBtn.style.display = "none";
  resultBox.style.display = "none";
  errorMsg.style.display = "none";

  fileInput.value = "";
}

// Bind functions from HTML event handlers if needed, or by direct listeners (since HTML used onclick)
window.generateCaption = generateCaption;
window.resetApp = resetApp;
window.copyCaption = copyCaption;
