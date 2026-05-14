interface HistoryEntry {
    id: string;
    content: string;
    timestamp: number;
    pinned: boolean;
}

interface Window {
    api: {
        getHistory: () => Promise<HistoryEntry[]>;
        onHistoryUpdated: (callback: (History: HistoryEntry[]) => void) =>
            void;
    };
}

function render(history: HistoryEntry[]): void {
    const list = document.getElementById("history");
    if (!list) return;

    list.innerHTML = "";

    for (const entry of history) {
        const li = document.createElement("li");
        const preview = entry.content.length > 60
            ? entry.content.slice(0, 60) + "..."
            : entry.content;
        li.textContent = preview;
        list.appendChild(li);
    }
}

async function main() {
    const history = await window.api.getHistory();
    render(history);

    window.api.onHistoryUpdated((updated) => {
        console.log("history-updated", updated) // delete later
        render(updated);
    });
}

main();