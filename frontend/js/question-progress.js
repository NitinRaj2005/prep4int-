(() => {
    const questionItems = Array.from(document.querySelectorAll(".aman11 li"));
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

    let activeFilter = "all";
    const filterButtons = Array.from(document.querySelectorAll("[data-question-filter]"));

    const filterQuestions = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;
        let solvedVisibleCount = 0;
        const visibleByCategory = new Map();

        entries.forEach(({ item, questionId }) => {
            const category = item.closest(".quegrid-item");
            const categoryName = category.querySelector(".aman1 h1").textContent;
            const questionName = item.querySelector("a").textContent;
            const matchesSearch = `${categoryName} ${questionName}`.toLocaleLowerCase().includes(query);
            const isSolved = solvedIds.has(questionId);
            const matchesFilter = activeFilter === "all"
                || (activeFilter === "solved" && isSolved)
                || (activeFilter === "unsolved" && !isSolved);
            const visible = matchesSearch && matchesFilter;

            item.hidden = !visible;
            if (visible) {
                visibleCount += 1;
                if (isSolved) solvedVisibleCount += 1;
                visibleByCategory.set(category, (visibleByCategory.get(category) || 0) + 1);
            }
        });

        document.querySelectorAll(".quegrid-item").forEach((category) => {
            category.hidden = !visibleByCategory.has(category);
        });

        const filterLabel = activeFilter === "all" ? "questions" : activeFilter + " questions";
        searchStatus.textContent = `${visibleCount} ${filterLabel} shown • ${solvedVisibleCount} solved`;
    };

    searchInput.addEventListener("input", filterQuestions);
    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.questionFilter;
            filterButtons.forEach((filterButton) => {
                const selected = filterButton === button;
                filterButton.classList.toggle("active", selected);
                filterButton.setAttribute("aria-pressed", String(selected));
            });
            filterQuestions();
        });
    });
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
                setControlsEnabled(false);
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
            setControlsEnabled(true);
            filterQuestions();
        } catch (error) {
            console.error("Unable to initialize question progress:", error);
        }
    };

    const updateQuestion = async (item, questionId, checkbox) => {
        const wasSolved = !checkbox.checked;
        checkbox.disabled = true;

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
            filterQuestions();
        } catch (error) {
            checkbox.checked = wasSolved;
            item.classList.toggle("question-solved", wasSolved);
            console.error(error);
        } finally {
            checkbox.disabled = false;
        }
    };

    initialize();
})();
