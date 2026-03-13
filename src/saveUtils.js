import { hasSaveDirectory, saveFile } from './fileStorage';
import { saveToServer } from './serverStorage';

export async function autoSave(reportTimestamp, filename, content) {
  const results = { local: false, server: false, attempted: true };

  const promises = [
    saveToServer(reportTimestamp, filename, content)
      .then((ok) => { results.server = ok; })
      .catch((err) => {
        console.warn('[autoSave] サーバ保存失敗:', err.message);
        results.server = false;
      }),
  ];

  if (hasSaveDirectory()) {
    promises.push(
      saveFile(reportTimestamp, filename, content)
        .then((ok) => { results.local = ok; })
        .catch((err) => {
          console.warn('[autoSave] ローカル保存失敗:', err.message);
          results.local = false;
        })
    );
  }

  await Promise.all(promises);

  if (!results.server && !results.local) {
    console.warn(`[autoSave] 保存先がありません: ${filename}`);
  }

  return results;
}
