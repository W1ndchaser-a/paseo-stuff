import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearHistoryAttachments, historyAttachmentTransformer, loadHistoryImage, registerReplayHome } from "./history-attachments";

const roots: string[] = [];
afterEach(async () => {
  clearHistoryAttachments();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function restoredImage() {
  const home = await mkdtemp(join(tmpdir(), "dsh-replay-image-"));
  roots.push(home);
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ZkAAAAASUVORK5CYII=", "base64");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const attachmentId = `sha256:${hash}`;
  const directory = join(home, "attachments/v1/objects", hash.slice(0, 2));
  await mkdir(directory, { recursive: true });
  const file = join(directory, hash);
  await writeFile(file, bytes);
  registerReplayHome({ version: 1, data: { sessionId: "native-image-session" } }, { DSH_HOME: home });
  const result = historyAttachmentTransformer.notification?.({
    method: "_dsh/history-attachment",
    params: { sessionId: "native-image-session", update: {
      sessionUpdate: "user_message_chunk",
      content: { type: "resource_link", uri: `dsh-attachment://${attachmentId}`, name: "pixel.png" },
      _meta: { "deepseek-harness": {
        type: "history-attachment", sessionId: "native-image-session", messageId: "user-image",
        attachment: { attachmentId, mediaType: "image/png", bytes: bytes.length, width: 1, height: 1, name: "pixel.png" },
      } },
    } },
  }, { sessionId: "native-image-session" });
  return { bytes, file, result, input: { sessionId: "native-image-session", attachmentId } };
}

describe("restored image RPC", () => {
  it("loads only a replay-registered image and keeps image bytes out of timeline data", async () => {
    const fixture = await restoredImage();
    expect(fixture.result).toMatchObject({ type: "timeline", item: { type: "plugin", kind: "history-attachment" } });
    expect(JSON.stringify(fixture.result)).not.toContain(fixture.bytes.toString("base64"));
    const loaded = await loadHistoryImage(fixture.input);
    expect(loaded.mimeType).toBe("image/png");
    expect(Buffer.from(loaded.data, "base64")).toEqual(fixture.bytes);
    await expect(loadHistoryImage({ ...fixture.input, sessionId: "another-session" })).rejects.toThrow();
  });

  it("rejects an attachment modified after replay instead of showing unverified bytes", async () => {
    const fixture = await restoredImage();
    const changed = Buffer.from(fixture.bytes);
    changed[changed.length - 1] ^= 1;
    await writeFile(fixture.file, changed);
    await expect(loadHistoryImage(fixture.input)).rejects.toThrow();
  });
});
