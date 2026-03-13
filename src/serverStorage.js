function formatDateDir(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatTimeDir(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}${min}${s}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveToServer(reportTimestamp, filename, content) {
  try {
    const dateDir = formatDateDir(reportTimestamp);
    const timeDir = formatTimeDir(reportTimestamp);

    let payload;
    if (content instanceof Blob) {
      const base64 = await blobToBase64(content);
      payload = { dateDir, timeDir, filename, content: base64, encoding: 'base64' };
    } else {
      payload = { dateDir, timeDir, filename, content, encoding: 'utf-8' };
    }

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error);
    }

    return true;
  } catch (err) {
    console.warn('サーバ保存スキップ:', err.message);
    return false;
  }
}

export async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}
