(() => {
    const searchInput = document.getElementById("topic-search-input");
    const status = document.getElementById("topic-search-status");
    const cards = Array.from(document.querySelectorAll(".whole .card"));

    const filterTopics = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;
        const visibleByGroup = new Map();

        cards.forEach((card) => {
            const topicName = card.querySelector(".info h1").textContent.toLocaleLowerCase();
            const matches = topicName.includes(query);
            const group = card.closest(".wrapper");
            card.hidden = !matches;

            if (matches) {
                visibleCount += 1;
                visibleByGroup.set(group, (visibleByGroup.get(group) || 0) + 1);
            }
        });

        document.querySelectorAll(".whole .wrapper").forEach((group) => {
            group.hidden = !visibleByGroup.has(group);
        });

        status.textContent = query
            ? `${visibleCount} of ${cards.length} topics found.`
            : `${cards.length} topics available.`;
    };

    searchInput.addEventListener("input", filterTopics);
    filterTopics();
})();
