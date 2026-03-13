export function downloadFile(content, filename, mimeType = 'text/markdown') {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function formatDateSlash(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

export function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function scriptToTtsText(script) {
  let text = script;
  text = text.replace(/^#.*$/gm, '');
  text = text.replace(/^\*\*放送日:.*\*\*$/gm, '');
  text = text.replace(/^---$/gm, '');
  text = text.replace(/\*\*ゆい\*\*:\s*/g, 'ゆい: ');
  text = text.replace(/\*\*ひかり\*\*:\s*/g, 'ひかり: ');
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/`(.*?)`/g, '$1');
  text = text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
  return text;
}
