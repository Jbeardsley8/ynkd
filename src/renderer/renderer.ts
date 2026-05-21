interface HistoryEntry {
    id: string;
    content: string;
    timestamp: number;
    pinned: boolean;
}

interface Window {
    api: {
        getHistory: () => Promise<HistoryEntry[]>;
        copyEntry: (id: string) => Promise<void>;
        deleteEntry: (id: string) => Promise<void>;
        togglePin: (id: string) => Promise<void>;
        onHistoryUpdated: (callback: (history: HistoryEntry[]) => void) => void;
        onWindowShown: (callback: () => void) => void;
    };
}

let latestHistory: HistoryEntry[] = [];
let visibleEntries: HistoryEntry[] = [];
let selectedIndex = 0;

function render(): void {
    const list = document.getElementById("history");
    const searchEl = document.getElementById("search") as HTMLInputElement;
    if (!list || !searchEl) return;

    list.innerHTML = "";

    const q = searchEl.value.trim().toLowerCase();
    const matching = q
        ? latestHistory.filter(e => e.content.toLowerCase().includes(q))
        : latestHistory;

    visibleEntries = [
        ...matching.filter(e => e.pinned),
        ...matching.filter(e => !e.pinned),
    ];

    const emptyEl = document.getElementById("empty-state");
    const emptyMsg = emptyEl?.querySelector(".empty-msg");

    if (visibleEntries.length === 0) {
        list.classList.add("hidden");
        emptyEl?.classList.remove("hidden");
        const hasQuery = searchEl.value.trim().length > 0;
        if (emptyMsg) {
            emptyMsg.textContent = hasQuery ? "no matches" : "Copy stuff...";
        }
    } else {
        list.classList.remove("hidden");
        emptyEl?.classList.add("hidden");
    }

    if (selectedIndex >= visibleEntries.length) {
        selectedIndex = Math.max(0, visibleEntries.length - 1);
    }

    for (let i = 0; i < visibleEntries.length; i++) {
        const entry = visibleEntries[i]
        const li = document.createElement("li");
        if (i === selectedIndex) li.classList.add("selected");
        const text = document.createElement("span");
        text.className = "entry-text";
        text.textContent = entry.content.length > 60
            ? entry.content.slice(0, 60) + "..."
            : entry.content;

        const pinBtn = document.createElement("button");
        pinBtn.className = entry.pinned ? "pin-btn pinned" : "pin-btn";
        pinBtn.textContent = entry.pinned ? "★" : "☆";
        pinBtn.title = entry.pinned ? "unpin" : "pin";
        pinBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.api.togglePin(entry.id);
        });

        const indexEl = document.createElement("span");
        indexEl.className = "entry-index";
        indexEl.textContent = String(i + 1).padStart(2, " ");

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "×";
        delBtn.title = "delete";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.api.deleteEntry(entry.id);
        });

        li.appendChild(pinBtn);
        li.appendChild(indexEl);
        li.appendChild(text);
        li.appendChild(delBtn);
        li.addEventListener("click", () => {
            window.api.copyEntry(entry.id);
        });
        list.appendChild(li);
    }
}

async function main() {
    latestHistory = await window.api.getHistory();
    render();

    window.api.onHistoryUpdated((updated) => {
        latestHistory = updated;
        render();
    });

    const searchEl = document.getElementById("search") as HTMLInputElement;
    if (searchEl) {
        searchEl.addEventListener("input", () => {
            selectedIndex = 0;
            render();
        });
        searchEl.focus();
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (selectedIndex < visibleEntries.length - 1) {
                selectedIndex++;
                render();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (selectedIndex > 0) {
                selectedIndex--;
                render();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            const entry = visibleEntries[selectedIndex];
            if (entry) {
                window.api.copyEntry(entry.id);
                selectedIndex = 0;
            }
        } else if (e.key === "Escape") {
            const searchEl = document.getElementById("search") as HTMLInputElement;
            if (searchEl && searchEl.value !== "") {
                e.preventDefault();
                searchEl.value = "";
                selectedIndex = 0;
                render();
            }
        }
    });

    window.api.onWindowShown(() => {
        searchEl?.focus();
    })
}

main();