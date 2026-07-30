const TWITCH_EMOTE_CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

function clean(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length ? text : fallback;
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

function buildEmoteUrl(id) {
    const emoteId = clean(id, "");
    if (!emoteId) return "";
    return `${TWITCH_EMOTE_CDN}/${encodeURIComponent(emoteId)}/default/dark/3.0`;
}

function parseRanges(emoteString) {
    const ranges = [];
    const raw = clean(emoteString, "");
    if (!raw) return ranges;

    raw.split("/").forEach((chunk) => {
        const [id, positions] = chunk.split(":");
        if (!id || !positions) return;

        positions.split(",").forEach((pair) => {
            const [start, end] = pair.split("-").map((value) => toNumber(value));
            if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
                ranges.push({ start, end, id: clean(id, "") });
            }
        });
    });

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    return ranges;
}

function normalizeParts(parts) {
    if (!Array.isArray(parts)) return [];
    return parts
        .map((part) => {
            if (typeof part === "string") {
                return { type: "text", text: part };
            }
            if (!part || typeof part !== "object") return null;

            const type = clean(part.type || part.kind || part.partType, "text").toLowerCase();
            const text = clean(part.text ?? part.value ?? part.content ?? part.label ?? "", "");
            const url = clean(part.url ?? part.src ?? part.imageUrl ?? part.image ?? "", "");
            const id = clean(part.id ?? part.emoteId ?? part.emote ?? "", "");
            return {
                ...part,
                type,
                text,
                url,
                id,
            };
        })
        .filter(Boolean);
}

export function buildTwitchChatParts(message, emoteString) {
    const text = String(message ?? "");
    const ranges = parseRanges(emoteString);

    if (!text) {
        return ranges.map((range) => ({
            type: "emote",
            id: range.id,
            text: "",
            url: buildEmoteUrl(range.id),
            label: `Twitch emote ${range.id}`,
        }));
    }

    if (!ranges.length) {
        return [{ type: "text", text }];
    }

    const parts = [];
    let cursor = 0;

    for (const range of ranges) {
        if (range.start < cursor) continue;

        if (range.start > cursor) {
            parts.push({
                type: "text",
                text: text.slice(cursor, range.start),
            });
        }

        const token = text.slice(range.start, range.end + 1);
        parts.push({
            type: "emote",
            id: range.id,
            text: token,
            label: token,
            url: buildEmoteUrl(range.id),
        });
        cursor = range.end + 1;
    }

    if (cursor < text.length) {
        parts.push({
            type: "text",
            text: text.slice(cursor),
        });
    }

    return normalizeParts(parts);
}

export function flattenChatParts(parts) {
    const normalized = normalizeParts(parts);
    if (!normalized.length) return "";

    return normalized
        .map((part) => {
            if (part.type === "text") return part.text || "";
            if (part.text) return part.text;
            return "";
        })
        .join("");
}

export function normalizeChatParts(parts) {
    return normalizeParts(parts);
}
