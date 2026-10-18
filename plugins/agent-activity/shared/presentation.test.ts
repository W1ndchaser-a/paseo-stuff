import * as icons from "lucide-react";
import { describe, expect, it } from "vitest";
import { PASEO_TOOL_ICONS, toolArgument, toolIcon } from "./presentation";

describe("tool logos without semantic summaries", () => {
  it.each([
    ["exec", "Code"], ["functions.exec_command", "Terminal"], ["tools.write_stdin", "Keyboard"],
    ["mcpScript", "Code"], ["apply_patch", "FileDiff"], ["view_image", "Image"],
    ["ask_user", "MessageSquare"], ["observe_ui", "Eye"], ["web_search", "Search"],
    ["mcp__github__pull_request_read", "GitPullRequest"], ["github_search_code", "Code2"],
    ["web_search_exa", "Search"], ["paseo_get_agent_activity", "Activity"],
    ["mcp__paseo__create_agent", "Bot"], ["mcp_paseo_list_workspaces", "Folders"],
    ["unknown_tool", "Wrench"], ["__proto__", "Wrench"], ["constructor", "Wrench"],
  ])("%s keeps its recognizable icon %s", (name, icon) => {
    expect(toolIcon(name, { type: "unknown" })).toBe(icon);
    expect(icons).toHaveProperty(icon);
  });
  it.each(Object.entries(PASEO_TOOL_ICONS))("keeps the existing Paseo logo for %s", (name, icon) => {
    expect(toolIcon("paseo_" + name)).toBe(icon);
    expect(icons).toHaveProperty(icon);
  });
  it("uses host tool categories without inspecting arguments or generating summaries", () => {
    expect(toolIcon("exec", { type: "shell", command: "hi" })).toBe("SquareTerminal");
    expect(toolIcon("custom", { type: "read" })).toBe("Eye");
    expect(toolIcon("custom", { type: "future" })).toBe("Wrench");
    const detail = { type: "unknown", get input() { throw new Error("must not inspect arguments"); } };
    expect(toolIcon("exec", detail)).toBe("Code");
  });
});

describe("header argument", () => {
  it.each([
    [{ type: "shell", command: "npm test", output: "ok" }, "npm test"],
    [{ type: "read", filePath: "a/b.ts", content: "x" }, "a/b.ts"],
    [{ type: "edit", filePath: "a/b.ts" }, "a/b.ts"],
    [{ type: "search", query: "TODO" }, "TODO"],
    [{ type: "fetch", url: "https://example.com" }, "https://example.com"],
    [{ type: "unknown", input: { limit: 2, path: "src" }, output: null }, "src"],
    [{ type: "unknown", input: { cmd: "ls", path: "src" }, output: null }, "ls"],
  ])("shows the literal main argument of %j", (detail, argument) => {
    expect(toolArgument(detail)).toBe(argument);
  });
  it.each([
    [null], ["text"], [[]], [{ type: "plan", text: "x" }], [{ type: "future", command: "x" }],
    [{ type: "unknown", input: "code", output: null }], [{ type: "unknown", input: { code: "x" } }],
    [{ type: "unknown", input: { path: 1 } }], [{ type: "unknown", input: [{ path: "x" }] }],
    [{ type: "shell", command: " \n " }], [{ type: "shell" }], [{ type: "unknown", input: { __proto__: null } }],
  ])("shows nothing for %j", detail => {
    expect(toolArgument(detail)).toBeUndefined();
  });
  it("keeps the first line of a bounded prefix and marks what it left out", () => {
    expect(toolArgument({ type: "shell", command: "  cd /tmp &&\nrm x" })).toBe("cd /tmp &&…");
    expect(toolArgument({ type: "shell", command: "a\r\nb" })).toBe("a…");
    const long = toolArgument({ type: "shell", command: "x".repeat(1_000_000) })!;
    expect(long).toBe("x".repeat(200) + "…");
    expect(toolArgument({ type: "shell", command: "x".repeat(200) })).toBe("x".repeat(200));
  });
});
