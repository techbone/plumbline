export type FrameState = {
  k: number;
  url: string;
  bytes: number;
  status: "queued" | "sending" | "counted" | "error";
  blocks?: number;
  error?: string;
};

const CONCURRENCY = 4;
const FATAL = new Set([401, 410, 413, 415]);

/**
 * Sends keyframes to the server while the foreman is still walking. Each one
 * is stored and counted by SAM on arrival, so the count grows live and there is
 * nothing left to upload when the walk ends.
 */
export class Uploader {
  frames: FrameState[] = [];
  fatal: string | null = null;
  private queue: { k: number; blob: Blob }[] = [];
  private active = 0;
  private idle: (() => void)[] = [];

  constructor(
    private visitId: string,
    private ticket: string,
    private onChange: () => void,
  ) {}

  add(blob: Blob): number {
    const k = this.frames.length;
    this.frames.push({ k, url: URL.createObjectURL(blob), bytes: blob.size, status: "queued" });
    this.queue.push({ k, blob });
    this.pump();
    this.onChange();
    return k;
  }

  get bytes(): number {
    return this.frames.reduce((a, f) => a + f.bytes, 0);
  }

  get counted(): number {
    return this.frames.filter((f) => f.status === "counted").length;
  }

  /** Resolves when every queued frame has been counted or has failed for good. */
  whenIdle(): Promise<void> {
    if (this.isIdle()) return Promise.resolve();
    return new Promise((r) => this.idle.push(r));
  }

  dispose() {
    for (const f of this.frames) URL.revokeObjectURL(f.url);
  }

  private isIdle() {
    return this.queue.length === 0 && this.active === 0;
  }

  private pump() {
    while (this.active < CONCURRENCY && this.queue.length && !this.fatal) {
      const job = this.queue.shift()!;
      this.active++;
      this.send(job.k, job.blob).finally(() => {
        this.active--;
        this.pump();
        if (this.isIdle() || this.fatal) {
          this.idle.splice(0).forEach((r) => r());
        }
      });
    }
  }

  private async send(k: number, blob: Blob) {
    const state = this.frames[k];
    for (let attempt = 0; attempt < 4; attempt++) {
      state.status = "sending";
      this.onChange();
      try {
        const res = await fetch(`/api/visits/${this.visitId}/frames/${k}`, {
          method: "PUT",
          headers: { "content-type": "image/jpeg", "x-visit-ticket": this.ticket },
          body: blob,
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          state.status = "counted";
          state.blocks = body.blocks;
          this.onChange();
          return;
        }
        if (FATAL.has(res.status)) {
          this.fatal = body.error ?? `Upload failed (${res.status})`;
          state.status = "error";
          state.error = this.fatal ?? undefined;
          this.onChange();
          return;
        }
        state.error = body.error ?? `Server said ${res.status}`;
      } catch {
        state.error = "Connection dropped";
      }
      await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
    }
    state.status = "error";
    this.onChange();
  }
}
