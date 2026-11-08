import type { PluginServerContext } from "@getpaseo/plugin/server";
import { createDeepSeekHarnessProvider } from "./server/provider";
import { createDeepSeekUsageSource } from "./server/usage";
import { clearHistoryAttachments, loadHistoryImage } from "./server/history-attachments";
import { readHistoryImage } from "./shared/history-attachments";

export default function contribute(server: PluginServerContext) {
  const reverse = createDeepSeekHarnessProvider();
  const daily = createDeepSeekHarnessProvider({ profile: "acp-daily" });
  server.registerProvider(daily);
  server.registerProvider(reverse);
  server.registerUsageSource(createDeepSeekUsageSource());
  server.handle(readHistoryImage, loadHistoryImage);
  return async () => {
    try {
      await Promise.all([daily.dispose(), reverse.dispose()]);
    } finally {
      clearHistoryAttachments();
    }
  };
}
