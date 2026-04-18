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
const copyBtn     = document.getElementById("copyBtn");

let selectedFile = null;
let currentCaption = "";

generateBtn.addEventListener("click", generateCaption);
resetBtn.addEventListener("click", resetApp);
copyBtn.addEventListener("click", copyCaption);

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

async function generateCaption() {
  if (!selectedFile) {
    showError("Please Choose An Image First");
    return;
  }

  setLoading(true);
  resultBox.style.display = "none";
  errorMsg.style.display = "none";

  try {
    const base64Image = await fileToBase64(selectedFile);
    const base64Data = base64Image.split(",")[1];
    const payload = {
      base64Data: base64Data,
      mimeType: selectedFile.type
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed To Fetch From API");
    }

    const data = await response.json();
    const rawCaption = data.caption;

    if (!rawCaption) {
      throw new Error("Caption Generation Returned Empty.");
    }

    const cleanCaption = normalizeCaption(rawCaption);

    currentCaption = cleanCaption;
    captionText.textContent = cleanCaption;
    resultBox.style.display = "block";

  } catch (err) {
    console.error(err);
    showError(err.message || "Failed To Generate Caption. Please Try Again.");
  } finally {
    setLoading(false);
  }
}

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
    copyBtn.textContent = "Copied!";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
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
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
