# Changelog

## v0.4.1 (2026-06-03)

### Context Widget 修复

- **context-length 不显示**: StatusJSON 为 0 时正确回退到 JSONL 数据
- **context-bar 缓存隔离**: 每个会话独立缓存，不同窗口不再显示相同内容
- **ctx 百分比稳定**: 缓存上次的百分比值，避免忽高忽低
- **空数据过滤**: StatusJSON 为空时不显示 ctx，避免显示 0%

### 渲染缓存优化

- **按会话隔离**: render-cache.txt 改为 render-{sessionId}.txt，解决多窗口显示相同内容
- **上下文压缩提醒**: 超过 85% 时显示 ⚠️/compact 警告

### 自动压缩监控

- **auto-compact.sh**: 后台监控上下文使用率，超阈值自动提醒
- **LaunchAgent 支持**: 开机自动启动监控
- **路径修复**: 正确读取 per-session 调试文件

### 代码质量

- **inferContextPct 纯函数化**: 移除副作用，缓存写入移到 context-bar render
- **formatTokens 统一**: 消除 5 处重复定义，统一到 format-utils.ts
- **颜色阈值统一**: 三个 context widget 使用一致的颜色阈值
- **压缩阈值统一**: 统一为 85%
- **hideWhenZero 修复**: compaction widget 逻辑修正
- **TypeScript 类型修复**: buildCodexRenderContext 参数类型与 WidgetRequirements 一致

## v0.4.0 (2026-06-03)

### 重大修复

- **history 增量计费**: 修复 cost 随时间持续增长的问题（cache_read 累积导致）
- **僵尸进程清理**: 杀死 30+ 个旧的 `--watch` 僵尸进程，加 PID 锁防止复发
- **today 自动清零**: 按最后活动时间（`ended_at`）归天，跨天会话成本自动归入活动当天
- **session 去重**: 同模型+同 token 数据的会话自动合并，防止重复计费

### UX 优化

- **doctor 全面检查**: 检查 `settings.local.json`、bun 可用性、`refreshInterval`
- **首次运行引导**: 无配置时输出提示
- **默认 2 行布局**: 从 4 行精简为 2 行，减少视觉噪音
- **隐藏 label:none**: 无数据 widget 不再显示 `label:none`
- **`statux widgets` 命令**: 列出全部 72 个 widget
- **配置损坏警告**: 解析失败时输出黄色提示

### 数据准确性

- **context widget 回退**: 当 StatusJSON 无 `used_percentage` 时，从 token 数自行计算
- **token 显示含 cache**: tokens widget 显示 cache read tokens，与费用计算一致
- **速度指标拆分**: input/output/total 三个方向分别计算
- **cost-rate 统一**: 与 cost widget 使用相同的双源取大逻辑
- **context bar 超 100% 保护**: 百分比 clamp 到 0-100，防止崩溃

### 性能

- **JSONL mtime 缓存**: session-name/skills/tool-calls/compaction 不再每次 render 读整个文件
- **vm_stat 缓存**: free-memory widget 3 秒 TTL 缓存
- **custom-command 缓存**: 5 秒 TTL，避免每次 render 执行 shell

### 代码质量

- 提取 `format-utils.ts` 共享工具函数，消除 4 处重复定义
- 提取 `computeSessionCost()` 共享费用计算逻辑
- `path.dirname` 替代手写实现

## v0.3.0

- 72 个 widget 支持
- Claude Code + Codex 双工具支持
- Powerline 渲染主题
- TUI 配置编辑器
- 会话历史 SQLite 存储
- LiteLLM 2200+ 模型定价
