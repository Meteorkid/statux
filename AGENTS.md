# AGENTS.md

本文件是 statux 仓库的项目级说明。若与用户全局规则冲突，优先遵循本文件中更贴近项目的工程约束；若与用户本次明确指令冲突，优先遵循用户本次指令。

## 项目概览

statux 是一个 Bun + TypeScript CLI，用于在 Claude Code、Codex 和 iTerm2 中显示 AI Agent 状态。

核心数据流：

- Claude Code statusLine 通过 stdin 传入 JSON，CLI 解析后渲染多行状态。
- Codex 数据来自 `~/.codex/state_5.sqlite` 和 `~/.cache/statux/codex-bridge.json`。
- iTerm2 集成通过 OSC 1337 自定义序列和 `~/.cache/statux/status.json` 更新状态栏。

## 常用命令

```bash
bun run typecheck
bun test
bun run build
bun src/cli.ts --help
bun src/cli.ts --oneshot
```

说明：

- 当前项目测试文件可能不存在；如果 `bun test` 返回 `No tests found`，需要在最终回复中说明。
- `bun run build` 会重新生成 `dist/` 下多平台二进制；仅在需要验证编译产物时运行。
- 默认包管理器和运行时是 Bun，不要改用 npm/yarn/pnpm，除非用户明确要求。

## 目录约定

- `src/cli.ts`：CLI 入口、参数解析、stdin/oneshot/watch 主流程。
- `src/data/`：Claude/Codex transcript、SQLite、Git、usage、history 等数据采集。
- `src/widgets/`：Widget 实现。新增 Widget 时同步注册并遵循已有 `Widget` 接口。
- `src/render/`：ANSI、Powerline 和渲染流水线。
- `src/tui/`：Ink TUI 配置界面。
- `src/types/`：Zod schema 和共享 TypeScript 类型。
- `iterm2/`：iTerm2 Python 插件模板。
- `scripts/`：构建脚本。

## 代码风格

- 保持手术式改动，只修改完成任务必需的文件。
- 使用 TypeScript 类型和 Zod schema 保护外部输入。
- 代码注释可使用中文，但只解释非显然业务规则、协议细节或容错原因。
- 不为单次使用新增抽象；优先沿用现有函数、类型和目录边界。
- 不静默扩大行为范围。涉及 CLI 输出协议、缓存文件、历史记录或外部状态读取时，先确认现有调用方。

## 数据源与协议注意点

- `readLatestCodexThread()` 只能说明本地 SQLite 中存在未归档线程，不能直接证明当前 Codex 进程活跃。
- `readCodexBridgeData()` 读取的是本地缓存文件；使用时应考虑 `last_updated` 是否过期。
- 修改 `emitIterm2Osc()`、`writeStatusJson()` 或 `iterm2/statux.py` 时，需要保持 payload 字段兼容：`model`、`ctxPct`、`cost`、`rateLimit`、`tokens`。
- stdout 是 CLI 的用户可见输出通道。新增 OSC、日志或调试输出时要确认不会破坏 Claude Code statusLine 和管道使用。
- Git 采集可能在非仓库目录运行，所有 Git 读取必须容错并返回 `null` 或空状态。

## 测试与验证

修改核心逻辑后优先运行：

```bash
bun run typecheck
bun test
```

以下改动还应额外验证：

- CLI 主流程、Codex/Claude 检测、数据采集：运行 `bun src/cli.ts --oneshot` 或构造 stdin JSON。
- iTerm2 输出、构建配置、发布相关文件：运行 `bun run build`。
- Widget 渲染：用最小 `RenderContext` 或 CLI 样例确认空数据、缺字段、label fallback 行为。

如果无法运行某项验证，需要在最终回复中说明原因和剩余风险。

## Git 与工作区

- 可能存在用户未提交改动。开始前查看 `git status --short`，不要回退、覆盖或格式化与任务无关的改动。
- 不要自动 commit。完成后说明是否需要用户确认提交。
- 不要删除 `dist/`、缓存文件或用户配置，除非用户明确要求。

## 文档同步

当改动影响安装、CLI 参数、iTerm2 集成、Widget 列表或配置格式时，同步更新 `README.md`。

## Review 重点

审查时优先看：

- 检测逻辑是否会误判旧会话为活跃会话。
- stdout/stderr 输出是否破坏 statusLine 协议。
- 本地状态文件是否有新鲜度、字段兼容和异常容错。
- Widget 是否正确处理 `null`、缺字段和 label fallback。
- 是否缺少能覆盖新增行为的测试或最小复现验证。
