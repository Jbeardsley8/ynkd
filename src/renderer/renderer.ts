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
        onHistoryUpdated: (callback: (History: HistoryEntry[]) => void) => void;
    };
}

let latestHistory: HistoryEntry[] = [];

function render(): void {
    const list = document.getElementById("history");
    const searchEl = document.getElementById("search") as HTMLInputElement;
    if (!list || !searchEl) return;

    list.innerHTML = "";

    const q = searchEl.value.trim().toLowerCase();
    const matching = q
        ? latestHistory.filter(e => e.content.toLowerCase().includes(q))
        : latestHistory;

    const ordered = [
        ...matching.filter(e => e.pinned),
        ...matching.filter(e => !e.pinned),
    ];

    for (const entry of ordered) {
        const li = document.createElement("li");

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

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.textContent = "×";
        delBtn.title = "delete";
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            window.api.deleteEntry(entry.id);
        });

        li.appendChild(pinBtn);
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
        searchEl.addEventListener("input", render);
    }
}

main();