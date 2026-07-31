# Changelog

本文件记录 statux 的主要版本变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

### Added
- 新增 Claude Fable 5 / Mythos 5 定价（$10/$50）
- 新增 Claude Opus 5 / Opus 4.8 定价
- 新增 Claude Sonnet 5 定价（限时优惠 $2/$10 至 2026-08-31）
- 新增 GPT-5.6 系列（Sol/Terra/Luna）、GPT-5.5 Pro、GPT-5.4 系列、GPT-5.3 Codex 定价
- 新增 Kimi K3 / K2.7 Code 定价
- 新增 CHANGELOG.md

### Fixed
- README "Tokens & Speed" widget 数量标注从 9 修正为 8
- package.json description 补充 Codex 支持
- package.json keywords 添加 codex、openai

### Changed
- Anthropic Claude 系列定价更新（Opus 5/4.8/4.7/4.6 统一 $5/$25）
- OpenAI GPT-5.5 定价修正（$5/$30，原 $1.25/$10 错误）
- DeepSeek V4 Flash/Pro cache hit 价格修正（官方 API 数据）
- 精选覆盖表新增 18 个模型，总计从 ~40 扩展到 ~55 个

## [0.4.3] - 2026-06-08

### Fixed
- 速度组件显示 0 值时的空分隔符问题
- TypeScript 类型错误修复
- Codex bridge render context 补充 `activeDuration` 字段

## [0.4.2] - 2026-06-07

### Added
- 效率指标使用活跃时长（排除闲置时间）替代总时间跨度

### Fixed
- 修复 code review 发现的 11 个问题
- 新增 `history.test.ts` 测试 + 修复模块级状态隔离
- 恢复 `context_window` 调试日志（供 auto-compact 使用）

## [0.4.1] - 2026-06-03

### Fixed
- `context-length` widget 在 StatusJSON 为 0 时不显示
- 渲染缓存按会话隔离，解决不同窗口显示相同内容
- 缓存 ctx 百分比，避免忽高忽低
- 改回使用 Claude Code 的 `used_percentage`（封顶100%）
- 过滤空上下文数据，避免显示 0%
- 修复 review 发现的 4 个必须修复 + 8 个建议修复
- 按会话分文件存储调试数据，避免互相覆盖
- TypeScript 类型错误修复

### Changed
- `inferContextPct` 纯函数化，移除副作用
- `formatTokens` 统一到 `format-utils.ts`，消除 5 处重复定义
- context widget 颜色阈值和压缩阈值统一

## [0.4.0] - 2026-06-02

### Added
- 渲染缓存消除刷新闪烁
- 支持自动压缩监控（通过 tmux/iTerm2/终端）
- 上下文超过 85% 时显示压缩提醒
- `statux widgets` 命令列出全部 widget
- 首次运行引导 + 配置损坏警告

### Fixed
- today/week 历史统计按最后活动时间归天，跨天自动清零
- 杀死 30+ 僵尸 watch 进程 + 加互斥锁
- history 增量计费 + 去重，修复 cost 随时间持续增长
- context 超 100% 时 bar 崩溃
- widget 逐个审查修复
- token 显示与费用计算对齐
- 修复上下文长度、费用计算和速度指标的显示问题

### Changed
- 默认布局从 4 行精简为 2 行
- 按配置优化状态数据采集
- 重构 CLI 与数据采集边界
- JSONL mtime 缓存优化（session-name/skills/tool-calls/compaction）
- `vm_stat` 缓存（free-memory 3 秒 TTL）
- `custom-command` 5 秒 TTL 缓存

## [0.3.0] - 2026-05-20

### Added
- LiteLLM 定价引擎（2200+ 模型自动拉取+缓存）
- 统一 transcript 解析层（NormalizedEntry）
- 会话历史统计（SQLite 本地存储）
- 效率指标（$/min, tok/min）
- Windows 支持 — 跨平台进程检测、路径兼容、构建目标

### Fixed
- statusLine 模式回退到自动查找 JSONL，确保 tokenMetrics 不为空
- cost 累计计算修复 — 压缩上下文后费用不再回退
- cost widget 使用累计 token 计算，修复始终显示 ~$0.01 的问题

## [0.2.0] - 2026-04-15

### Added
- Codex (OpenAI) 支持 — SQLite + hooks bridge 双通道数据源
- Jujutsu VCS 支持（8 个 Widget）
- TUI 配置界面（Ink React for CLI）
- 本地诊断命令 `statux doctor`
- Anthropic Usage API 集成
- 标签系统（label 前缀 + 无数据自动隐藏）
- 多行布局支持
- Powerline 渲染模式（dark/ocean 主题）

### Changed
- 从 iTerm2 专属工具升级为通用 AI Agent 状态显示工具

## [0.1.0] - 2026-03-01

### Added
- 初始版本
- 基础 Widget：model、context-bar、tokens、cost、session-clock
- Claude Code statusLine 集成
- iTerm2 状态栏集成（OSC 1337 序列）
- Normal 渲染模式
- 基础配置系统
