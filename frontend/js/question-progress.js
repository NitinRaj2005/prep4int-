(() => {
    const questionItems = Array.from(document.querySelectorAll(".aman11 li"));
    const count = document.getElementById("solved-count");
    const progress = document.getElementById("solved-progress");
    const message = document.getElementById("progress-message");
    const searchInput = document.getElementById("question-search-input");
    const searchStatus = document.getElementById("question-search-status");

    const toSlug = (value) => value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const entries = questionItems.map((item) => {
        const link = item.querySelector("a");
        const category = item.closest(".quegrid-item").querySelector(".aman1 h1").textContent;
        const questionId = `${toSlug(category)}--${toSlug(link.textContent)}`;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");

        label.className = "question-solved-control";
        checkbox.type = "checkbox";
        checkbox.className = "question-solved-checkbox";
        checkbox.disabled = true;
        checkbox.setAttribute("aria-label", `Mark ${link.textContent.trim()} as solved`);
        label.append(checkbox, document.createTextNode(" Solved"));
        item.append(label);

        return { item, questionId, checkbox };
    });

    const solvedIds = new Set();

    const renderProgress = () => {
        const solvedCount = entries.filter(({ questionId }) => solvedIds.has(questionId)).length;
        count.textContent = `${solvedCount} of ${entries.length} questions solved`;
        progress.max = entries.length || 1;
        progress.value = solvedCount;
    };

    const filterQuestions = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;
        const visibleByCategory = new Map();

        entries.forEach(({ item }) => {
            const category = item.closest(".quegrid-item");
            const categoryName = category.querySelector(".aman1 h1").textContent;
            const questionName = item.querySelector("a").textContent;
            const matches = `${categoryName} ${questionName}`.toLocaleLowerCase().includes(query);

            item.hidden = !matches;
            if (matches) {
                visibleCount += 1;
                visibleByCategory.set(category, (visibleByCategory.get(category) || 0) + 1);
            }
        });

        document.querySelectorAll(".quegrid-item").forEach((category) => {
            category.hidden = !visibleByCategory.has(category);
        });
        searchStatus.textContent = query
            ? `${visibleCount} of ${entries.length} questions found.`
            : `${entries.length} questions available.`;
    };

    searchInput.addEventListener("input", filterQuestions);
    filterQuestions();

    const setControlsEnabled = (enabled) => {
        entries.forEach(({ checkbox }) => {
            checkbox.disabled = !enabled;
        });
    };

    const initialize = async () => {
        try {
            const response = await fetch("/api/questions/progress", {
                headers: { Accept: "application/json" }
            });
            const data = await response.json();
            if (response.status === 401) {
                message.textContent = "Log in to track your solved questions.";
                const loginLink = document.createElement("a");
                loginLink.href = "/login";
                loginLink.textContent = "Log in";
                message.append(" ", loginLink);
                renderProgress();
                return;
            }
            if (!response.ok) {
                throw new Error(data.error || "Unable to load your question progress.");
            }

            data.solvedQuestionIds.forEach((questionId) => solvedIds.add(questionId));
            entries.forEach(({ item, questionId, checkbox }) => {
                checkbox.checked = solvedIds.has(questionId);
                item.classList.toggle("question-solved", checkbox.checked);
                checkbox.addEventListener("change", () => updateQuestion(item, questionId, checkbox));
            });
            message.textContent = "Progress is saved to your account.";
            renderProgress();
            setControlsEnabled(true);
        } catch (error) {
            count.textContent = `Progress unavailable (${entries.length} questions)`;
            message.textContent = error.message;
        }
    };

    const updateQuestion = async (item, questionId, checkbox) => {
        const wasSolved = !checkbox.checked;
        checkbox.disabled = true;
        message.textContent = "Saving progress...";

        try {
            const response = await fetch("/api/questions/progress", {
                method: "PUT",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ questionId, solved: checkbox.checked })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Unable to save your question progress.");
            }

            solvedIds.clear();
            data.solvedQuestionIds.forEach((id) => solvedIds.add(id));
            checkbox.checked = solvedIds.has(questionId);
            item.classList.toggle("question-solved", checkbox.checked);
            message.textContent = "Progress saved.";
            renderProgress();
        } catch (error) {
            checkbox.checked = wasSolved;
            item.classList.toggle("question-solved", wasSolved);
            message.textContent = error.message;
        } finally {
            checkbox.disabled = false;
        }
    };

    initialize();
})();
