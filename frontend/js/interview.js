(() => {
  const form = document.getElementById("interview-setup-form");
  const status = document.getElementById("interview-setup-status");
  const startButton = document.getElementById("start-interview-btn");
  const historyBox = document.getElementById("interview-history");

  const showStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle("error", isError);
  };

  const loadHistory = async () => {
    historyBox.innerHTML = '<p class="history-empty">Loading your sessions…</p>';
    try {
      const response = await fetch("/api/interview/history", { credentials: "same-origin" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load history.");
      if (!data.sessions || data.sessions.length === 0) {
        historyBox.innerHTML = '<p class="history-empty">No interviews yet. Start your first session!</p>';
        return;
      }
      historyBox.replaceChildren();
      data.sessions.slice(0, 5).forEach((session) => {
        const item = document.createElement("div");
        item.className = "history-item";
        const title = document.createElement("strong");
        title.textContent = session.role + " · " + session.category;
        const meta = document.createElement("span");
        meta.textContent = new Date(session.createdAt).toLocaleString();
        const state = document.createElement("span");
        state.className = "session-state";
        state.textContent = session.status === "completed" ? "Completed" : "In progress";
        item.append(title, meta, state);
        historyBox.append(item);
      });
    } catch (error) {
      historyBox.innerHTML = '<p class="history-empty">Unable to load sessions right now.</p>';
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    startButton.disabled = true;
    startButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating session…';
    showStatus("");
    const payload = {
      role: document.getElementById("interview-role").value,
      category: document.getElementById("interview-category").value,
      difficulty: document.getElementById("interview-difficulty").value,
      mode: form.querySelector('input[name="mode"]:checked').value
    };
    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create interview.");
      showStatus("Interview session created. Session ID: " + data.session.id + ". The live AI interview room is coming in Phase 2.");
      await loadHistory();
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      startButton.disabled = false;
      startButton.innerHTML = '<i class="fa-solid fa-play"></i> Create interview session';
    }
  });

  document.getElementById("refresh-history").addEventListener("click", loadHistory);
  loadHistory();
})();