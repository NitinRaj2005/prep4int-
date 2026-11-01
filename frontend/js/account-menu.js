(() => {
    const trigger = document.querySelector(".account-menu-trigger");
    const dropdown = document.getElementById("account-dropdown");
    if (!trigger || !dropdown) return;

    const closeMenu = () => {
        dropdown.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
    };
    const openMenu = () => {
        dropdown.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
    };

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        dropdown.hidden ? openMenu() : closeMenu();
    });
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".account-menu")) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
            trigger.focus();
        }
    });
    dropdown.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu();
    });

    fetch("/api/profile/summary", { credentials: "same-origin" })
        .then((response) => {
            if (!response.ok) throw new Error("Account details unavailable");
            return response.json();
        })
        .then((user) => {
            const triggerName = document.getElementById("account-trigger-name");
            const fullName = document.getElementById("account-fullname");
            const usernameLabel = document.getElementById("account-username");
            if (triggerName) triggerName.textContent = user.username || "Account";
            if (fullName) fullName.textContent = user.fullname || user.username || "Your account";
            if (usernameLabel) usernameLabel.textContent = user.username ? "@" + user.username : "";
        })
        .catch(() => {});
})();
