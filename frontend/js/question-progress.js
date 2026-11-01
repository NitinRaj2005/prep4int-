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
