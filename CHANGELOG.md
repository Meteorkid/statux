# Changelog

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
