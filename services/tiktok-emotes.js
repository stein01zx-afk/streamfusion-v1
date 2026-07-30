function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
}

function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function firstString(...values) {
  for (const value of values) {
    const text = clean(value, "");
    if (text) return text;
  }
  return "";
}

function getImageUrl(entry) {
  const candidates = [
    entry?.emoteImageUrl,
    entry?.stickerImageUrl,
    entry?.imageUrl,
    entry?.url,
    entry?.src,
    entry?.image?.url,
    entry?.image?.urlList?.[0],
    entry?.image?.uri,
    entry?.sticker?.imageUrl,
    entry?.sticker?.image?.url,
    entry?.sticker?.image?.urlList?.[0],
    entry?.sticker?.url,
    entry?.sticker?.src,
    entry?.data?.imageUrl,
    entry?.data?.url,
    entry?.data?.stickerImageUrl,
  ];

  return candidates.map((v) => clean(v, "")).find(Boolean) || "";
}

function getLabel(entry) {
  return firstString(
    entry?.emoteName,
    entry?.name,
    entry?.title,
    entry?.stickerName,
    entry?.sticker?.name,
    entry?.sticker?.title,
    entry?.text,
    entry?.message,
    entry?.label,
    entry?.type,
  );
}

function getPosition(entry) {
  const raw = firstString(entry?.start, entry?.left, entry?.begin, entry?.position?.start, entry?.position?.left, entry?.from);
  const endRaw = firstString(entry?.end, entry?.right, entry?.finish, entry?.position?.end, entry?.position?.right, entry?.to);
  const start = Number(raw);
  const end = Number(endRaw);
  if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) {
    return { start, end };
  }
  return null;
}

function getText(data) {
  return firstString(
    data?.comment,
    data?.text,
    data?.message,
    data?.msg,
    data?.content,
    data?.caption,
    data?.rawText,
  );
}

function appendText(parts, text) {
  const value = String(text ?? "");
  if (!value) return;
  const last = parts[parts.length - 1];
  if (last && last.type === "text") last.text += value;
  else parts.push({ type: "text", text: value });
}

function buildPartsFromRanges(text, entries, fallbackType = "emote") {
  const parts = [];
  const ranges = entries
    .map((entry) => ({ entry, pos: getPosition(entry), url: getImageUrl(entry), label: getLabel(entry) }))
    .filter((item) => item.pos && item.url);

  if (!text || !ranges.length) return null;

  ranges.sort((a, b) => a.pos.start - b.pos.start || a.pos.end - b.pos.end);

  let cursor = 0;
  for (const item of ranges) {
    if (item.pos.start < cursor) continue;
    appendText(parts, text.slice(cursor, item.pos.start));
    const token = text.slice(item.pos.start, item.pos.end + 1);
    parts.push({
      type: fallbackType,
      url: item.url,
      alt: item.label || token || fallbackType,
      label: item.label || token || fallbackType,
    });
    cursor = item.pos.end + 1;
  }
  appendText(parts, text.slice(cursor));
  return parts.length ? parts : null;
}

function buildPartsFromImages(entries, fallbackType = "emote") {
  const parts = [];
  for (const entry of entries) {
    const url = getImageUrl(entry);
    if (!url) continue;
    const label = getLabel(entry) || fallbackType;
    parts.push({
      type: fallbackType,
      url,
      alt: label,
      label,
    });
  }
  return parts.length ? parts : null;
}

function buildTiktokMessagePayload(data = {}) {
  const text = getText(data);
  const emotes = toArray(data?.emotes || data?.emoteList || data?.sticker || data?.stickers)
    .filter((entry) => entry && typeof entry === "object");

  const stickerUrl = getImageUrl(data?.sticker) || getImageUrl(data?.sticker?.image) || getImageUrl(data);
  const stickerLabel = getLabel(data?.sticker) || firstString(data?.stickerName, data?.stickerText, data?.sticker?.name, data?.sticker?.title);

  const rangedParts = buildPartsFromRanges(text, emotes, stickerUrl ? "sticker" : "emote");
  if (rangedParts) {
    return {
      type: stickerUrl ? "sticker" : "chat",
      action: stickerUrl ? "Sticker" : "Comentario",
      message: text || stickerLabel || "",
      parts: stickerUrl ? [...rangedParts, ...(stickerLabel ? [{ type: "text", text: ` ${stickerLabel}` }] : [])] : rangedParts,
    };
  }

  const imageParts = buildPartsFromImages(emotes, stickerUrl ? "sticker" : "emote");
  if (imageParts) {
    return {
      type: stickerUrl ? "sticker" : "chat",
      action: stickerUrl ? "Sticker" : "Comentario",
      message: text || stickerLabel || "",
      parts: imageParts,
    };
  }

  if (stickerUrl) {
    return {
      type: "sticker",
      action: "Sticker",
      message: stickerLabel || text || "Sticker",
      parts: [{ type: "sticker", url: stickerUrl, alt: stickerLabel || "Sticker", label: stickerLabel || "Sticker" }],
    };
  }

  return {
    type: "chat",
    action: "Comentario",
    message: text || stickerLabel || "",
    parts: [],
  };
}

export { buildTiktokMessagePayload };
