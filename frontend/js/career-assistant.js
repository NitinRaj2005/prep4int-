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

    const jdForm = document.getElementById("jd-analysis-form");
    if (jdForm) {
        const jdStatus = document.getElementById("jd-analysis-status");
        const jdResults = document.getElementById("jd-results");
        const jdHistoryList = document.getElementById("jd-history-list");
        const resumeSelect = document.getElementById("jd-resume");
        const daysInput = document.getElementById("jd-days");
        const daysValue = document.getElementById("jd-days-value");
        const jdButton = document.getElementById("jd-analyze-button");
        let currentPreparationId = null;

        daysInput.addEventListener("input", () => { daysValue.textContent = daysInput.value + " days"; });

        const loadResumeOptions = async () => {
            try {
                const response = await fetch("/api/career/resume/history");
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not load resumes.");
                (data.resumes || []).filter(item => item.status === "completed").forEach(item => {
                    const option = document.createElement("option");
                    option.value = item._id;
                    option.textContent = item.originalFileName + (item.overallScore == null ? "" : " · " + item.overallScore + "/100");
                    resumeSelect.appendChild(option);
                });
            } catch (error) { jdStatus.textContent = error.message; }
        };

        const renderJD = preparation => {
            currentPreparationId = preparation._id;
            const skills = preparation.skills || [];
            const roadmap = preparation.roadmap || [];
            const completed = roadmap.filter(task => task.completed).length;
            const questions = preparation.questionDetails || (preparation.interviewQuestions || []).map(question => ({ category: "Technical", question, difficulty: "medium", expectedAnswerPoints: [] }));
            const recommendations = preparation.recommendations || [];
            jdResults.hidden = false;
            jdResults.innerHTML = `
              <div class="jd-result-heading">
                <div><span class="career-kicker">YOUR PERSONALIZED REPORT</span><h2>JD Analysis · ${escapeHtml(preparation.role)}</h2>
                <p>${escapeHtml(preparation.company || "Company not specified")} <span>•</span> ${escapeHtml(preparation.experienceLevel)} <span>•</span> ${escapeHtml(preparation.roadmapDays)}-day roadmap</p></div>
                <div class="jd-match-score">${escapeHtml(preparation.matchPercentage ?? 0)}% <small>estimated resume match</small></div>
              </div>
              ${preparation.resumeAnalysisId ? "" : '<p class="jd-no-resume">No saved resume was available. Upload a resume to get a meaningful match score.</p>'}
              <section class="jd-report-section jd-skills-section">
                <div class="jd-section-heading"><span class="jd-section-icon"><i class="fa-solid fa-list-check"></i></span><div><h3>Required skills and match</h3><p>See which requirements your resume already demonstrates.</p></div></div>
                <div class="jd-skills-grid">${skills.length ? skills.map(skill => '<article class="jd-skill-row"><div class="jd-skill-copy"><strong>' + escapeHtml(skill.name) + '</strong><small>' + escapeHtml(skill.category) + ' · ' + escapeHtml(skill.priority) + '</small><p>' + escapeHtml(skill.notes) + '</p></div><span class="jd-status jd-' + escapeHtml(skill.status) + '">' + escapeHtml(skill.status.replace("-", " ")) + '</span></article>').join("") : "<p>No skills were extracted.</p>"}</div>
              </section>
              <section class="jd-report-section">
                <div class="jd-section-heading"><span class="jd-section-icon"><i class="fa-solid fa-lightbulb"></i></span><div><h3>Recommendations by priority</h3><p>Practical next steps to improve your role readiness.</p></div></div>
                <div class="jd-recommendations-grid">${recommendations.length ? recommendations.map(item => { const entry = typeof item === "string" ? { priority: "important", category: "Technical", text: item } : item; return '<article class="jd-recommendation"><span class="jd-status jd-' + escapeHtml(entry.priority) + '">' + escapeHtml(entry.priority) + '</span><small>' + escapeHtml(entry.category) + '</small><p>' + escapeHtml(entry.text) + '</p></article>'; }).join("") : "<p>No recommendations returned.</p>"}</div>
              </section>
              <section class="jd-report-section">
                <div class="jd-section-heading"><span class="jd-section-icon"><i class="fa-solid fa-comments"></i></span><div><h3>Interview questions with answer guidance</h3><p>Practice these questions before your interview.</p></div></div>
                <div class="jd-questions-grid">${questions.length ? questions.map((item, index) => '<details class="jd-question"><summary><span>' + escapeHtml(item.question) + '</span><small>' + escapeHtml(item.category) + ' · ' + escapeHtml(item.difficulty) + '</small></summary>' + (item.expectedAnswerPoints && item.expectedAnswerPoints.length ? '<strong>Expected answer should cover:</strong>' + renderList(item.expectedAnswerPoints) : "<p>Prepare a structured answer with an example from your projects.</p>") + '</details>').join("") : "<p>No questions generated.</p>"}</div>
              </section>
              ${Number(preparation.roadmapDays) <= 2 ? '<p class="jd-short-roadmap-warning">Short preparation window: focus on must-have gaps and interview practice. This plan cannot replace longer-term learning.</p>' : ""}
              <section class="jd-roadmap"><div class="jd-roadmap-header"><div><span class="career-kicker">YOUR ACTION PLAN</span><h3>Personalized preparation roadmap</h3><p>${completed} of ${roadmap.length} days completed</p></div>
                <form id="jd-roadmap-duration-form"><label for="jd-roadmap-days">Roadmap duration</label><input id="jd-roadmap-days" name="days" type="number" min="1" max="90" value="${escapeHtml(preparation.roadmapDays)}"><span>days</span><button type="submit">Regenerate plan</button></form></div>
                <div class="jd-progress-track"><span style="width:${roadmap.length ? completed / roadmap.length * 100 : 0}%"></span></div>
                <div class="jd-roadmap-list">${roadmap.map(task => '<label class="jd-roadmap-task"><input type="checkbox" data-roadmap-day="' + escapeHtml(task.day) + '" ' + (task.completed ? "checked" : "") + '><span><strong>Day ' + escapeHtml(task.day) + ': ' + escapeHtml(task.title) + '</strong><small>' + escapeHtml(task.description) + '</small><em>' + escapeHtml((task.topics || []).join(" · ")) + '</em></span></label>').join("")}</div>
              </section>`;
            jdResults.scrollIntoView({ behavior: "smooth", block: "start" });
        };

        const loadJDHistory = async () => {
            try {
                const response = await fetch("/api/career/jd/history");
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not load JD history.");
                const items = data.preparations || [];
                jdHistoryList.innerHTML = items.length ? items.map(item => `
                  <div class="resume-history-item"><span><strong>${escapeHtml(item.role)} · ${escapeHtml(item.company || "Company not specified")}</strong><br><small>${escapeHtml(new Date(item.createdAt).toLocaleString())} · ${escapeHtml(item.status)} · ${item.matchPercentage == null ? "No match score" : escapeHtml(item.matchPercentage + "% match")}</small></span>
                  ${item.status === "completed" ? '<button type="button" data-jd-id="' + escapeHtml(item._id) + '">View preparation</button>' : ""}</div>`).join("") : "<p>No JD preparations yet.</p>";
            } catch (error) { jdHistoryList.textContent = error.message; }
        };

        jdForm.addEventListener("submit", async event => {
            event.preventDefault();
            const jobDescription = document.getElementById("jd-text").value.trim();
            const jdPdf = document.getElementById("jd-pdf").files[0];
            if (!jdPdf && jobDescription.length < 100) { jdStatus.textContent = "Upload a PDF or paste a job description with at least 100 characters."; return; }
            if (jdPdf && (jdPdf.type !== "application/pdf" && !jdPdf.name.toLowerCase().endsWith(".pdf"))) { jdStatus.textContent = "Only PDF files are supported."; return; }
            if (jdPdf && jdPdf.size > 5 * 1024 * 1024) { jdStatus.textContent = "The JD PDF must be 5 MB or smaller."; return; }
            const payload = new FormData();
            payload.append("company", document.getElementById("jd-company").value.trim());
            payload.append("role", document.getElementById("jd-role").value.trim());
            payload.append("experienceLevel", document.getElementById("jd-level").value);
            payload.append("resumeAnalysisId", resumeSelect.value);
            payload.append("roadmapDays", daysInput.value);
            if (jdPdf) payload.append("jdPdf", jdPdf);
            else payload.append("jobDescription", jobDescription);
            jdButton.disabled = true;
            jdStatus.textContent = jdPdf ? "Reading the JD PDF and creating your preparation roadmap..." : "Analyzing the job description and creating your preparation roadmap...";
            try {
                const response = await fetch("/api/career/jd/analyze", { method: "POST", body: payload });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "JD analysis failed.");
                jdStatus.textContent = data.message || "JD analysis complete.";
                renderJD(data.preparation);
                await loadJDHistory();
            } catch (error) { jdStatus.textContent = error.message || "Unable to analyze this JD."; }
            finally { jdButton.disabled = false; }
        });

        jdResults.addEventListener("submit", async event => {
            if (event.target.id !== "jd-roadmap-duration-form" || !currentPreparationId) return;
            event.preventDefault();
            const days = Number(document.getElementById("jd-roadmap-days").value);
            if (!Number.isInteger(days) || days < 1 || days > 90) { jdStatus.textContent = "Choose a duration between 1 and 90 days."; return; }
            const button = event.target.querySelector("button");
            button.disabled = true;
            try {
                const response = await fetch("/api/career/jd/" + encodeURIComponent(currentPreparationId) + "/roadmap-days", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not regenerate roadmap.");
                renderJD(data.preparation);
                await loadJDHistory();
            } catch (error) { jdStatus.textContent = error.message; }
            finally { button.disabled = false; }
        });

        jdResults.addEventListener("change", async event => {
            const checkbox = event.target.closest("[data-roadmap-day]");
            if (!checkbox || !currentPreparationId) return;
            checkbox.disabled = true;
            try {
                const response = await fetch("/api/career/jd/" + encodeURIComponent(currentPreparationId) + "/roadmap/" + encodeURIComponent(checkbox.dataset.roadmapDay), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: checkbox.checked }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not update roadmap progress.");
                const preparationResponse = await fetch("/api/career/jd/" + encodeURIComponent(currentPreparationId));
                const preparationData = await preparationResponse.json();
                if (!preparationResponse.ok) throw new Error(preparationData.error || "Could not refresh roadmap.");
                renderJD(preparationData.preparation);
            } catch (error) { jdStatus.textContent = error.message; checkbox.disabled = false; checkbox.checked = !checkbox.checked; }
        });

        jdHistoryList.addEventListener("click", async event => {
            const button = event.target.closest("[data-jd-id]");
            if (!button) return;
            button.disabled = true;
            try {
                const response = await fetch("/api/career/jd/" + encodeURIComponent(button.dataset.jdId));
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Could not open this preparation.");
                renderJD(data.preparation);
            } catch (error) { jdStatus.textContent = error.message; }
            finally { button.disabled = false; }
        });

        loadResumeOptions();
        loadJDHistory();
    }

    loadHistory();
})();
