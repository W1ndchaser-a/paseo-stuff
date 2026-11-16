Readable Agent Activity 把 Paseo 的工具调用行换成可展开的卡片，用格式化并带语法高亮的 JSON 显示 Input 和 Output，并给 Thinking 行配上风格一致的紧凑标题栏。长输出只预览前二十行，点 Show all 可以展开全部。消息、审批和输入框保持原生显示。

请在聊天显示设为“完整”（Full）时使用这些卡片。截至 Paseo 0.16.0，卡片仍会绕过工具调用分组，也会让仅含工具和 Thinking 工作行的轮次保持展开，所以切换到“折叠工具调用”、“折叠轮次”或 Summary 之前，请在该客户端的 Command Center 里运行 "Activity: use native rows (Collapse or Summary)"；要切回卡片时，运行 "Activity: use tool cards (Full display)"。其他智能体发来的消息和 heartbeat 始终保留宿主自己的显示行。这个选择只对当前客户端生效，插件每次重新加载后都会恢复为卡片。

插件完全在客户端运行，只重新排版 Paseo 已经收到的数据，不生成摘要，也不重建 diff。它没有网络、文件系统、进程或 daemon 端的行为。对非常大的内容点 Show all 可能会比较慢。

不要和其他替换工具调用或 Thinking 时间线条目的插件同时启用。插件要求 Paseo 0.13.0 或更新版本。自动化检查在 Paseo 0.13.2 和 0.16.0 SDK 下通过，覆盖 0.16.0 宿主显示流水线的三种聊天显示模式。打包后的插件和已发布的 npm 版本均在隔离的 macOS 0.15.3 daemon 上加载成功。最近一次网页客户端实测使用 Paseo 0.14.0。上游关于转换后工作行的轮次折叠问题仍处于开放状态。Paseo 桌面应用以及原生 iOS 和 Android 未经测试。本插件 fork 自 Matt Cowger 的 Colorful Agent Activity。
