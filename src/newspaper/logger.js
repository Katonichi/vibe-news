/**
 * 新聞生成ロガー
 * - INFO / WARN / ERROR の3レベル
 * - バッファに溜めて /api/save-log へ非同期フラッシュ
 * - ファイル: data/logs/newspaper_<sessionId>.log
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function makeSessionId() {
  const now = new Date();
  return (
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `_${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`
  );
}

class NewspaperLogger {
  constructor() {
    this.sessionId = makeSessionId();
    this.buffer = [];
    this._flushing = false;
    this._flushTimer = setInterval(() => this._flush(), 3000);
    this._allEntries = [];
    this._subscribers = new Set();
  }

  _entry(level, message, data) {
    return {
      time: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  _push(level, message, data) {
    const entry = this._entry(level, message, data);
    this.buffer.push(entry);
    this._allEntries.push(entry);

    // UIサブスクライバーに通知
    for (const cb of this._subscribers) {
      try { cb(entry); } catch (_) { /* ignore */ }
    }

    // コンソールにも出力
    const consoleData = data !== undefined ? data : '';
    if (level === 'ERROR') {
      console.error(`[NewspaperLogger][${level}] ${message}`, consoleData);
    } else if (level === 'WARN') {
      console.warn(`[NewspaperLogger][${level}] ${message}`, consoleData);
    } else {
      console.log(`[NewspaperLogger][${level}] ${message}`, consoleData);
    }

    // ERROR は即座にフラッシュ
    if (level === 'ERROR') {
      this._flush();
    }
  }

  /**
   * ログエントリをリアルタイムで受け取るコールバックを登録する。
   * 戻り値の関数を呼ぶと登録解除できる。
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /** これまでに記録された全エントリのコピーを返す */
  getEntries() {
    return [...this._allEntries];
  }

  /** エントリを全クリアする（新しいセッション開始時などに使用） */
  clearEntries() {
    this._allEntries = [];
  }

  info(message, data) {
    this._push('INFO', message, data);
  }

  warn(message, data) {
    this._push('WARN', message, data);
  }

  error(message, data) {
    this._push('ERROR', message, data);
  }

  async _flush() {
    if (this._flushing || this.buffer.length === 0) return;
    this._flushing = true;
    const entries = [...this.buffer];
    this.buffer = [];
    try {
      await fetch('/api/save-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries, sessionId: this.sessionId }),
      });
    } catch (e) {
      // ログ保存失敗はコンソールのみ（無限ループ防止のためloggerを使わない）
      console.warn('[NewspaperLogger] ログファイル保存失敗:', e.message);
      // 失敗したエントリをバッファに戻す
      this.buffer = [...entries, ...this.buffer];
    } finally {
      this._flushing = false;
    }
  }

  async flushNow() {
    await this._flush();
  }

  destroy() {
    clearInterval(this._flushTimer);
    this._flush();
  }

  getLogFileName() {
    return `data/logs/newspaper_${this.sessionId}.log`;
  }
}

export const logger = new NewspaperLogger();
