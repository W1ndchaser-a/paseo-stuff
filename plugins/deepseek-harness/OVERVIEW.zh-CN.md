DeepSeek Harness 为 Paseo 添加一个 provider，让你在 daemon 所在的机器上，通过官方 DeepSeek Harness 命令行工具（`dsh`）运行 agent。对话显示在 Paseo 普通的 agent 视图里，插件没有自己的界面。这是社区插件，不是 DeepSeek 或 Paseo 的官方产品。

daemon 所在的机器上必须已经安装、登录并配置好 DeepSeek Harness，并且 `dsh` 要在 daemon 的 `PATH` 中，或者通过 Paseo 的 provider `command` 覆盖设置指定。如果 `dsh` 报告的版本低于 0.1.5-rc.1，或者无法读取版本，provider 会显示为不可用，并给出原因。插件还要求 Paseo 0.11.0 或更新版本，以及 daemon 上的 Node.js 22.19.0 或更新版本。DSH 0.2.2-rc.3 的 CLI 还要求 Node.js 24.9.0 或更新版本，因此 daemon 使用的命令需要通过这个运行时启动它。插件不会安装 `dsh` 或改写它的配置文件。模型和推理强度的选项来自 `dsh` 报告的模型，所以会跟随你的 DeepSeek Harness 配置。

如果你从 0.1.0-beta.12 或更早的版本升级，请注意插件不再读取 `DSH_PASEO_COMMAND` 和 `DSH_PASEO_PROFILE` 环境变量。请把这些值移到 Paseo 的 provider 命令覆盖设置，也就是 daemon `config.json` 里的 `agents.providers.deepseek-harness.command`，写成一个数组，例如 `["/opt/dsh/bin/dsh", "--profile", "acp"]`。这个数组会替换整条默认命令，所以要保留一个使用 ACP 的 `--profile`。

Usage 面板显示你的 DeepSeek API 余额。为了查询余额，插件按 `dsh` 相同的方式读取 API key：先读环境变量，再读 `~/.dsh/.credentials.yaml` 或 `~/.dsh/.env`，并且只把 key 发送到 DeepSeek 的余额接口。

每个 agent 会话都以你的操作系统用户身份，作为子进程运行 `dsh --profile acp`，使用 daemon 的环境变量加上该会话的环境变量。这些环境变量里的凭据都会传给 `dsh`。插件本身不添加沙箱或权限策略。对 DeepSeek 服务的调用由 `dsh` 自己发出。

恢复会话时，插件请求 `dsh` 恢复它自己的上下文。如果恢复失败，插件会报告错误，不会新开一个会话。在 Paseo 0.13 及以上版本中，插件可读取会话 `DSH_HOME` 下的 DSH v4 日志，在 agent reload 或 daemon 重启后恢复文字历史。上下文压缩后会保留原始消息和完整工具输出，跳过匹配的内部摘要与替换记录；连续压缩前半段时，也支持序号递减的合法替换范围。日志缺失、损坏、格式不支持或过大时，时间线仍为空，但不妨碍恢复上下文。如果本次请求恢复显示历史，插件会给出一次简短警告，说明无法显示的原因。恢复成功或历史本来为空时不提示；警告不含对话内容、路径或凭据。已知 v4 元数据，包括任务清单、审批、重试和子代理状态，会被跳过，不再阻断文字与工具历史恢复。未知信息事件只有在 DSH 明确标记为可安全忽略时才会跳过；未知的必需事件仍会阻止回放。回放上限为 1 秒、16 MiB 压缩数据和 64 MiB 解压数据；暂不回放附件和未识别的替换操作。插件不支持 provider 斜杠命令、steering 和计划，Paseo 额外的系统提示词也不会传给 `dsh`。列出模型时，可能会在 `dsh` 的会话列表里留下空会话。

模型支持图片时，可以通过 DSH 的 ACP 接口接收图片。插件修正了 DSH 0.2.1-rc.5 中一项过时的官方 ACP 启动默认值，该问题在 0.2.2-rc.3 中仍然存在。修正后，新建的默认配置会话无需修改 profile 就能收图。插件读取 DSH 公开的配置输出，仅在确认存在这项已知错误时，为该子进程临时修正启动参数；其他 ACP 设置保留，进程关闭后移除临时文件。其他自定义模型配置不变，也不会把纯文字模型声明成支持图片。图片附件仍不会从历史日志中回放。

自动化检查在 Paseo 0.11.4 和 0.16.0 SDK 下通过。在 0.15.4 SDK 下，生产 provider 还完成了官方 DSH 0.2.2-rc.3 的初始化、会话与模型列表查询，以及在新进程中重新打开包含批量写入的合成文字与 Team 模式事件的持久化会话，全程没有调用模型。beta.19 的打包产物也在独立的 0.15.3 daemon 上达到 running 状态，provider 诊断为 Ready，模型与推理强度查询通过，全程没有调用模型。另已在 macOS 0.15.3 桌面端验证插件重载后的文字与工具历史恢复，没有发送新的模型提示词；0.15.3 的其他界面流程未经测试。真实对话在 macOS 上的 Paseo 0.11.4、0.12.0-beta.2、0.13.0、0.13.2 和 0.14.0 daemon 上运行过，最近一次使用 DSH 0.2.1-rc.5。Windows 自动化测试和独立 daemon 冒烟检查已在 CI 通过；Windows 手动界面以及原生 iOS 和 Android 客户端未经测试。
