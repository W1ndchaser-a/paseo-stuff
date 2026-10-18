import { getPaseoToolLeafName } from "@getpaseo/protocol/tool-name-normalization";

export const PASEO_TOOL_ICONS: Readonly<Record<string, string>> = {
  speak: "MicVocal",
  create_workspace: "FolderPlus",
  list_workspaces: "Folders",
  archive_workspace: "Archive",
  create_agent: "Bot",
  send_agent_prompt: "Send",
  get_agent_status: "Activity",
  list_agents: "Users",
  cancel_agent: "CircleStop",
  archive_agent: "Archive",
  kill_agent: "CircleX",
  update_agent: "Settings2",
  rename_workspace: "Pencil",
  list_workspace_scripts: "ListTree",
  start_workspace_script: "Play",
  stop_workspace_script: "Square",
  list_terminals: "SquareTerminal",
  create_terminal: "SquareTerminal",
  kill_terminal: "CircleX",
  capture_terminal: "ScrollText",
  send_terminal_keys: "Keyboard",
  create_schedule: "CalendarClock",
  create_heartbeat: "HeartPulse",
  delete_heartbeat: "Trash2",
  list_schedules: "CalendarDays",
  inspect_schedule: "CalendarSearch",
  pause_schedule: "Pause",
  resume_schedule: "Play",
  delete_schedule: "Trash2",
  update_schedule: "CalendarCog",
  schedule_logs: "ScrollText",
  run_schedule_once: "CalendarCheck",
  list_providers: "Network",
  list_models: "Cpu",
  list_profiles: "ContactRound",
  inspect_provider: "ScanSearch",
  get_agent_activity: "Activity",
  set_agent_mode: "SlidersHorizontal",
  list_pending_permissions: "ShieldAlert",
  respond_to_permission: "ShieldCheck",
  browser_list_tabs: "PanelsTopLeft",
  browser_new_tab: "Globe2",
  browser_snapshot: "Scan",
  browser_click: "MousePointer2",
  browser_fill: "TextCursorInput",
  browser_wait: "Timer",
  browser_type: "Keyboard",
  browser_keypress: "KeyRound",
  browser_navigate: "Navigation",
  browser_back: "ArrowLeft",
  browser_forward: "ArrowRight",
  browser_reload: "RefreshCw",
  browser_screenshot: "Camera",
  browser_upload: "Upload",
  browser_hover: "Hand",
  browser_select: "ListFilter",
  browser_drag: "Move",
  browser_logs: "ScrollText",
  browser_evaluate: "Braces",
  browser_scroll: "Scroll",
  browser_resize: "Maximize2",
  browser_close_tab: "X",
};


const TOOL_ICONS: Readonly<Record<string, string>> = {
  exec: "Code", mcpscript: "Code", mcp_script: "Code",
  bash: "Terminal", shell: "Terminal", exec_command: "Terminal",
  run_command: "Terminal", run_shell_command: "Terminal", write_stdin: "Keyboard",
  wait: "Clock", read: "Eye", read_file: "Eye", write: "FilePen", write_file: "FilePen",
  edit: "Pencil", edit_file: "Pencil", apply_patch: "FileDiff", view_image: "Image",
  find_roots: "Monitor", observe_ui: "Eye", search_ui: "Search", inspect_ui: "Eye",
  expand_ui: "List", read_text: "FileText", act_ui: "MousePointer", wait_for: "Clock",
  launch_browser: "Globe", navigate_browser: "Globe", evaluate_browser: "Code",
  fetch_content: "Globe", web_search: "Search", source_check: "SearchCheck",
  get_search_content: "FileSearch", ask_user: "MessageSquare", mcp: "Plug",
  speak: "MicVocal", task: "Bot", thinking: "Brain",
  actions_get: "Workflow", actions_list: "ListChecks", actions_run_trigger: "PlayCircle",
  get_file_contents: "FileCode2", get_job_logs: "ScrollText", pull_request_read: "GitPullRequest",
  search_code: "Code2", search_repositories: "BookMarked",
  web_search_exa: "Search", web_fetch_exa: "Globe", exa_agent_run: "Bot",
  exa_read_agent_research_guide: "BookOpen", exa_read_agent_schema_templates: "Braces",
};
const DETAIL_ICONS: Readonly<Record<string, string>> = {
  shell: "SquareTerminal", read: "Eye", write: "FilePen", edit: "Pencil",
  worktree_setup: "GitBranch", search: "Search", fetch: "Globe",
  sub_agent: "Bot", plain_text: "MessageSquare", plan: "ListChecks",
};

function lookup(map: Readonly<Record<string, string>>, key: string): string | undefined {
  return Object.hasOwn(map, key) ? map[key] : undefined;
}

/** Name/category mapping only. Never inspect arguments or derive a business summary. */
export function toolIcon(toolName: string, detail?: unknown): string {
  const normalized = toolName.trim().toLowerCase().replace(/^(?:functions|tools)\./, "");
  const paseo = getPaseoToolLeafName(normalized) ?? normalized.match(/^(?:mcp_)?paseo_(.+)$/)?.[1];
  if (paseo) return lookup(PASEO_TOOL_ICONS, paseo) ?? "Sparkles";
  const leaf = normalized.split(/__|[.:/]/).at(-1) ?? normalized;
  const icon = lookup(TOOL_ICONS, leaf) ?? lookup(TOOL_ICONS, leaf.replace(/^github_/, ""));
  // Native typed shell "exec" is not Code mode.
  const type = detail !== null && typeof detail === "object" && "type" in detail ? detail.type : undefined;
  if (typeof type === "string" && type !== "unknown") return lookup(DETAIL_ICONS, type) ?? icon ?? "Wrench";
  return icon ?? (/(?:^|__)mcp(?:__|$)/.test(normalized) ? "Plug" : "Wrench");
}

const DETAIL_ARGUMENTS: Readonly<Record<string, string>> = {
  shell: "command", read: "filePath", write: "filePath", edit: "filePath",
  search: "query", fetch: "url", sub_agent: "description", worktree_setup: "branchName",
};
const INPUT_ARGUMENTS = ["command", "cmd", "file_path", "filePath", "path", "pattern", "query", "url"];
const ARGUMENT_CHARS = 200;

/** The call's own main argument for the collapsed header: one literal value, first
 * line only, from a bounded prefix. Never a generated or combined summary. */
export function toolArgument(detail: unknown): string | undefined {
  if (detail === null || typeof detail !== "object" || Array.isArray(detail)) return undefined;
  const fields = detail as Record<string, unknown>;
  const type = typeof fields.type === "string" ? fields.type : "";
  let value: unknown;
  if (type === "unknown") {
    const input = fields.input;
    if (input !== null && typeof input === "object" && !Array.isArray(input)) {
      const key = INPUT_ARGUMENTS.find(name => Object.hasOwn(input, name)
        && typeof (input as Record<string, unknown>)[name] === "string");
      if (key) value = (input as Record<string, unknown>)[key];
    }
  } else {
    const key = lookup(DETAIL_ARGUMENTS, type);
    if (key && Object.hasOwn(fields, key)) value = fields[key];
  }
  if (typeof value !== "string") return undefined;
  const prefix = value.slice(0, ARGUMENT_CHARS).trimStart();
  const end = prefix.search(/[\r\n]/);
  const line = (end === -1 ? prefix : prefix.slice(0, end)).trimEnd();
  if (!line) return undefined;
  return end !== -1 || value.length > ARGUMENT_CHARS ? line + "…" : line;
}
