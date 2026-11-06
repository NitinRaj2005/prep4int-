(() => {
    const form = document.getElementById("resume-upload-form");
    if (!form) return;
    const fileInput = document.getElementById("resume-file");
    const submitButton = document.getElementById("resume-analyze-button");
    const status = document.getElementById("resume-upload-status");
    const results = document.getElementById("resume-results");
    const historyList = document.getElementById("resume-history-list");
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
    const renderList = (items, emptyText = "Not found in the resume.") => Array.isArray(items) && items.length
        ? "<ul>" + items.map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>"
        : "<p>" + escapeHtml(emptyText) + "</p>";

    const renderAnalysis = resume => {
        const candidate = resume.candidate || {};
        const skills = Array.isArray(resume.skills) ? resume.skills : [];
        const projects = Array.isArray(resume.projects) ? resume.projects : [];
        const breakdown = resume.scoreBreakdown || {};
        const scoreRows = [
            ["Technical skills", breakdown.technicalSkills],
            ["Projects", breakdown.projects],
            ["Experience", breakdown.experience],
            ["Achievements", breakdown.achievements],
            ["Resume presentation", breakdown.formatting]
        ];
        results.hidden = false;
        results.innerHTML = `
          <h2>Resume Analysis</h2><div class="resume-score">${escapeHtml(resume.overallScore ?? 0)}/100</div>
          <p>Indicative AI resume score · ${escapeHtml(candidate.name || resume.fileName || "Your resume")}</p>
          <section class="resume-score-breakdown"><h3>Score breakdown</h3>${scoreRows.map(([label, value]) => '<div class="score-row"><span>' + escapeHtml(label) + '</span><div class="score-track"><span style="width:' + Math.max(0, Math.min(100, Number(value) || 0)) + '%"></span></div><strong>' + escapeHtml(value ?? 0) + '/100</strong></div>').join("")}</section>
          <div class="resume-result-grid">
            <section class="resume-result-section"><h3>Skills identified</h3>${skills.length ? skills.map(skill => '<div class="resume-skill"><span class="resume-chip">' + escapeHtml(skill.name) + ' · ' + escapeHtml(skill.proficiency) + '</span>' + (skill.evidence ? '<small>' + escapeHtml(skill.evidence) + '</small>' : '') + '</div>').join("") : "<p>No skills confidently extracted.</p>"}</section>
            <section class="resume-result-section"><h3>Education</h3>${renderList(candidate.education)}<h3>Experience</h3>${renderList(candidate.experience)}</section>
            <section class="resume-result-section"><h3>Projects</h3>${projects.length ? projects.map(project => '<p><strong>' + escapeHtml(project.name) + '</strong><br>' + escapeHtml(project.description) + '<br><small>' + escapeHtml((project.technologies || []).join(", ")) + '</small></p>').join("") : "<p>No projects identified.</p>"}</section>
            <section class="resume-result-section"><h3>Achievements</h3>${renderList(candidate.achievements)}<h3>What stands out</h3>${renderList(resume.strengths, "No specific strengths returned.")}</section>
            <section class="resume-result-section"><h3>Skills not evidenced</h3>${renderList(resume.missingSkills, "No obvious gaps suggested.")}</section>
            <section class="resume-result-section"><h3>Improvement suggestions</h3>${renderList(resume.feedback, "No suggestions returned.")}</section>
            <section class="resume-result-section"><h3>Resume-based interview questions</h3>${renderList(resume.interviewQuestions, "No questions generated.")}</section>
          </div>`;
        results.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const loadHistory = async () => {
        try {
            const response = await fetch("/api/career/resume/history");
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not load history.");
            const resumes = data.resumes || [];
            historyList.innerHTML = resumes.length ? resumes.map(item => `
              <div class="resume-history-item"><span><strong>${escapeHtml(item.originalFileName)}</strong><br><small>${escapeHtml(new Date(item.createdAt).toLocaleString())} · ${escapeHtml(item.status)} · ${item.overallScore == null ? "No score" : escapeHtml(item.overallScore + "/100")}</small></span>
              ${item.status === "completed" ? '<button type="button" data-resume-id="' + escapeHtml(item._id) + '">View analysis</button>' : ""}</div>`).join("") : "<p>No resume analyses yet. Upload a PDF to get started.</p>";
        } catch (error) { historyList.textContent = error.message; }
    };

    form.addEventListener("submit", async event => {
        event.preventDefault();
        const file = fileInput.files && fileInput.files[0];
        if (!file) { status.textContent = "Please choose a PDF resume."; return; }
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { status.textContent = "Only PDF files are supported."; return; }
        if (file.size > 5 * 1024 * 1024) { status.textContent = "The PDF must be 5 MB or smaller."; return; }
        const body = new FormData(); body.append("resume", file);
        submitButton.disabled = true;
        status.textContent = "Uploading and analyzing your resume. This may take up to a minute...";
        results.hidden = true;
        try {
            const response = await fetch("/api/career/resume/upload", { method: "POST", body });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Resume analysis failed.");
            status.textContent = data.message || "Analysis complete.";
            renderAnalysis(data.resume);
            await loadHistory();
        } catch (error) { status.textContent = error.message || "Something went wrong. Please try again."; }
        finally { submitButton.disabled = false; }
    });

    historyList.addEventListener("click", async event => {
        const button = event.target.closest("[data-resume-id]");
        if (!button) return;
        button.disabled = true;
        try {
            const response = await fetch("/api/career/resume/" + encodeURIComponent(button.dataset.resumeId));
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not open this analysis.");
            renderAnalysis(data.resume);
        } catch (error) { status.textContent = error.message; }
        finally { button.disabled = false; }
    });
    loadHistory();
})();
