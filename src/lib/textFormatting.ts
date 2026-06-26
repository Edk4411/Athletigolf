const textInputTypes = new Set(["", "text", "search"]);

const replacements: Array<[RegExp, string]> = [
  [/\bi\b/g, "I"],
  [/\bim\b/gi, "I'm"],
  [/\bive\b/gi, "I've"],
  [/\bid\b/gi, "I'd"],
  [/\bill\b/gi, "I'll"],
  [/\bdont\b/gi, "don't"],
  [/\bcant\b/gi, "can't"],
  [/\bwont\b/gi, "won't"],
  [/\bisnt\b/gi, "isn't"],
  [/\barent\b/gi, "aren't"],
  [/\bwasnt\b/gi, "wasn't"],
  [/\bwerent\b/gi, "weren't"],
  [/\bdoesnt\b/gi, "doesn't"],
  [/\bdidnt\b/gi, "didn't"],
  [/\bcouldnt\b/gi, "couldn't"],
  [/\bwouldnt\b/gi, "wouldn't"],
  [/\bshouldnt\b/gi, "shouldn't"],
  [/\bthats\b/gi, "that's"],
  [/\bwhats\b/gi, "what's"],
  [/\bwheres\b/gi, "where's"],
  [/\btheres\b/gi, "there's"],
  [/\blets\b/gi, "let's"],
];

function shouldFormatField(element: EventTarget | null) {
  if (
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLInputElement)
  ) {
    return false;
  }

  if (element.dataset.autoFormat === "off") return false;
  if (element instanceof HTMLTextAreaElement) return true;

  return textInputTypes.has(element.type);
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  valueSetter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export function formatUserText(value: string) {
  let next = value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();

  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }

  next = next.replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_match, prefix, letter) => {
    return `${prefix}${letter.toUpperCase()}`;
  });

  return next;
}

export function applyTextAutoFormatToField(element: EventTarget | null) {
  if (!shouldFormatField(element)) return;

  const field = element as HTMLInputElement | HTMLTextAreaElement;
  const formatted = formatUserText(field.value);

  if (formatted !== field.value) {
    setNativeValue(field, formatted);
  }
}
