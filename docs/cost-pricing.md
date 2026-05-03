# 模型定价参考

> 来源：
> - Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
> - OpenRouter: https://openrouter.ai/models (2026-05-04 实时数据)
> - DeepSeek: https://platform.deepseek.com
> - Kimi: https://platform.moonshot.cn
> - MiMo: https://open-platform.mihoyo.com
> - 豆包: https://www.volcengine.com
>
> 最后更新：2026-05-04

## Mem Widget 更新机制

Mem 数据来自 `vm_stat` 命令，**每次 Claude Code 状态行刷新时实时调用**。

状态行刷新时机：
- 每次用户发送消息
- 每次 Claude 生成回复
- 每次工具调用（Bash、Read、Edit 等）
- 每次上下文变化

公式对齐 macOS 活动监视器：
```
App Memory  = Anonymous pages - Purgeable pages
Memory Used = App Memory + Wired + Compressor
```

## Anthropic Claude 系列

单位：USD / Million Tokens (MTok)

### 当前模型

| 模型 | API ID | Input | Output | Cache Write 5m | Cache Read |
|------|--------|-------|--------|----------------|------------|
| Claude Opus 4.7 | claude-opus-4-7 | $5.00 | $25.00 | $6.25 | $0.50 |
| Claude Sonnet 4.6 | claude-sonnet-4-6 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Haiku 4.5 | claude-haiku-4-5 | $1.00 | $5.00 | $1.25 | $0.10 |

### 遗留模型

| 模型 | API ID | Input | Output | Cache Write 5m | Cache Read |
|------|--------|-------|--------|----------------|------------|
| Claude Opus 4.6 | claude-opus-4-6 | $5.00 | $25.00 | $6.25 | $0.50 |
| Claude Opus 4.5 | claude-opus-4-5 | $5.00 | $25.00 | $6.25 | $0.50 |
| Claude Opus 4.1 | claude-opus-4-1 | $15.00 | $75.00 | $18.75 | $1.50 |
| Claude Opus 4 | claude-opus-4-20250514 | $15.00 | $75.00 | $18.75 | $1.50 |
| Claude Sonnet 4.5 | claude-sonnet-4-5 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Sonnet 4 | claude-sonnet-4-20250514 | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Sonnet 3.7 | claude-3-7-sonnet | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Haiku 3.5 | claude-3-5-haiku | $0.80 | $4.00 | $1.00 | $0.08 |
| Claude Opus 3 | claude-3-opus | $15.00 | $75.00 | $18.75 | $1.50 |
| Claude Haiku 3 | claude-3-haiku | $0.25 | $1.25 | $0.30 | $0.03 |

## DeepSeek 系列

| 模型 | API ID | Input | Output | 参数规模 | 上下文 |
|------|--------|-------|--------|----------|--------|
| DeepSeek V4 Flash | deepseek-v4-flash | $0.14 | $0.28 | 284B/13B active | 1M |
| DeepSeek V4 Pro | deepseek-v4-pro | $0.435 | $0.87 | 1.6T/49B active | 1M |
| DeepSeek V3.2 Speciale | deepseek-v3.2-speciale | $0.40 | $1.20 | — | 164K |
| DeepSeek V3.2 | deepseek-v3.2 | $0.252 | $0.378 | — | 131K |
| DeepSeek V3.1 Terminus | deepseek-v3.1-terminus | $0.27 | $0.95 | 671B/37B | 164K |
| DeepSeek V3.1 | deepseek-v3.1 | $0.15 | $0.75 | 671B/37B | 128K |
| DeepSeek V3 0324 | deepseek-v3-0324 | $0.20 | $0.77 | 685B MoE | 164K |
| DeepSeek V3 | deepseek-chat | $0.32 | $0.89 | 685B MoE | 164K |
| DeepSeek R1 0528 | deepseek-r1-0528 | $0.50 | $2.15 | 671B/37B | 164K |
| DeepSeek R1 | deepseek-r1 | $0.70 | $2.50 | 671B/37B | 64K |

## Kimi (月之暗面 Moonshot AI) 系列

| 模型 | API ID | Input | Output | 参数规模 | 上下文 |
|------|--------|-------|--------|----------|--------|
| Kimi K2.6 | kimi-k2.6 | $0.74 | $3.49 | 多模态 | 262K |
| Kimi K2 Thinking | kimi-k2-thinking | $0.60 | $2.50 | 1T/32B active | 262K |
| Kimi K2 Instruct | kimi-k2-instruct | $0.57 | $2.30 | 1T/32B active | 128K |
| Kimi K2 0905 | kimi-k2-0905 | $0.40 | $2.00 | 1T/32B active | 262K |
| Kimi Latest | kimi-latest | $0.74 | $3.49 | — | 262K |

## MiMo (小米) 系列

| 模型 | API ID | Input | Output | 参数规模 | 上下文 |
|------|--------|-------|--------|----------|--------|
| MiMo V2.5 Pro | mimo-v2.5-pro | $1.00 | $3.00 | — | 1M |
| MiMo V2.5 | mimo-v2.5 | $0.40 | $2.00 | — | 1M |
| MiMo V2 Pro | mimo-v2-pro | $1.00 | $3.00 | 1T+ | 1M |
| MiMo V2 Flash | mimo-v2-flash | $0.09 | $0.29 | 309B/15B | 262K |
| MiMo V2 Omni | mimo-v2-omni | $0.40 | $2.00 | — | 262K |

## 豆包 (ByteDance 字节跳动) 系列

| 模型 | API ID | Input | Output |
|------|--------|-------|--------|
| Doubao Pro | doubao-pro | $0.40 | $1.20 |
| Doubao Lite | doubao-lite | $0.10 | $0.30 |
| Doubao 通用 | doubao | $0.20 | $0.60 |

## Statux Cost Widget 计算逻辑

1. **优先**：根据模型 ID 匹配定价表，结合 token 指标本地计算
   - Token 数据来源优先级：
     1. statusLine 的 `context_window.current_usage`（实时、权威）
     2. JSONL 解析的 `tokenMetrics`（会话累积）
   - 计算公式：
     - `inputTokens × input_price`
     - `outputTokens × output_price`
     - `cacheCreationTokens × cacheWrite5m_price`
     - `cacheReadTokens × cacheRead_price`
2. **回退**：使用客户端传入的 `cost.total_cost_usd`

本地计算时显示 `~` 前缀（如 `~$1.23`）表示估算值。

## 运行稳定性保障

- statusLine 命令使用 bun 绝对路径 `/Users/meteor/.bun/bin/bun`，重启后不依赖 PATH
- 模型定价表硬编码在源码中，无网络依赖
- token 数据由 Claude Code 每次刷新 statusLine 时自动传入
