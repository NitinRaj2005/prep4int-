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


    document.addEventListener("profile-photo-updated", (event) => {
        const hasPhoto = Boolean(event.detail && event.detail.hasPhoto);
        document.querySelectorAll(".account-avatar").forEach((avatar) => {
            const icon = avatar.querySelector("i");
            let photo = avatar.querySelector("img.account-avatar-photo");
            if (!photo) {
                photo = document.createElement("img");
                photo.className = "account-avatar-photo";
                photo.alt = "";
                photo.hidden = true;
                photo.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
                avatar.appendChild(photo);
            }
            if (hasPhoto) {
                photo.onload = () => { photo.hidden = false; if (icon) icon.hidden = true; };
                photo.onerror = () => { photo.hidden = true; if (icon) icon.hidden = false; };
                photo.src = "/api/profile/photo?v=" + Date.now();
            } else {
                photo.hidden = true;
                if (icon) icon.hidden = false;
            }
        });
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
            document.querySelectorAll(".account-avatar").forEach((avatar) => {
                let photo = avatar.querySelector("img.account-avatar-photo");
                const icon = avatar.querySelector("i");
                if (!photo) {
                    photo = document.createElement("img");
                    photo.className = "account-avatar-photo";
                    photo.alt = "";
                    photo.hidden = true;
                    photo.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
                    avatar.appendChild(photo);
                }
                if (user.hasProfilePhoto) {
                    photo.onload = () => { photo.hidden = false; if (icon) icon.hidden = true; };
                    photo.onerror = () => { photo.hidden = true; if (icon) icon.hidden = false; };
                    photo.src = "/api/profile/photo?v=" + Date.now();
                } else {
                    photo.hidden = true;
                    if (icon) icon.hidden = false;
                }
            });
        })
        .catch(() => {});
})();
