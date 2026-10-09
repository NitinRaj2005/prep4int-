(() => {
    const searchInput = document.getElementById("recommendation-search-input");
    const status = document.getElementById("recommendation-search-status");
    const recommendations = Array.from(document.querySelectorAll(".recdsawrapper"));

    const filterRecommendations = () => {
        const query = searchInput.value.trim().toLocaleLowerCase();
        let visibleCount = 0;

        recommendations.forEach((recommendation) => {
            const matches = recommendation.textContent.toLocaleLowerCase().includes(query);
            recommendation.hidden = !matches;
            if (matches) {
                visibleCount += 1;
            }
        });

        const dsaRecommendation = recommendations[0];
        const note = document.querySelector(".danger");
        if (note && dsaRecommendation) {
            note.hidden = dsaRecommendation.hidden;
        }

        status.textContent = query
            ? `${visibleCount} recommended ${visibleCount === 1 ? "topic" : "topics"} found.`
            : `${visibleCount} recommended topics available.`;
    };

    searchInput.addEventListener("input", filterRecommendations);
    filterRecommendations();
})();
