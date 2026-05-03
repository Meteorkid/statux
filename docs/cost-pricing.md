# 模型定价参考

> 来源：
> - Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
> - DeepSeek: https://platform.deepseek.com/api-docs/pricing
> - Kimi: https://platform.moonshot.cn/docs/pricing
> - MiMo: https://open-platform.mihoyo.com
> - 豆包: https://www.volcengine.com/docs/82379
>
> 最后更新：2026-05-04

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
| Claude Sonnet 3.5 | claude-3-5-sonnet | $3.00 | $15.00 | $3.75 | $0.30 |
| Claude Haiku 3.5 | claude-3-5-haiku | $0.80 | $4.00 | $1.00 | $0.08 |
| Claude Opus 3 | claude-3-opus | $15.00 | $75.00 | $18.75 | $1.50 |
| Claude Haiku 3 | claude-3-haiku | $0.25 | $1.25 | $0.30 | $0.03 |

### 缓存定价规则

| 缓存操作 | 倍率 | 说明 |
|----------|------|------|
| 5 分钟缓存写入 | 1.25x base input | 首次存储内容时计费 |
| 1 小时缓存写入 | 2x base input | 首次存储内容时计费 |
| 缓存读取 (hit) | 0.1x base input | 后续请求读取缓存时计费 |

## DeepSeek 系列

| 模型 | API ID | Input | Output | Cache Hit |
|------|--------|-------|--------|-----------|
| DeepSeek V3 | deepseek-chat / deepseek-v3 | $0.27 | $1.10 | $0.07 |
| DeepSeek R1 | deepseek-reasoner / deepseek-r1 | $0.55 | $2.19 | $0.14 |
| DeepSeek Coder | deepseek-coder | $0.27 | $1.10 | $0.07 |

## Kimi (月之暗面 Moonshot AI) 系列

| 模型 | API ID | Input | Output | Cache Hit |
|------|--------|-------|--------|-----------|
| Kimi K2 | kimi-k2 | $0.60 | $2.00 | $0.06 |
| Kimi K1.5 | kimi-k1.5 | $0.50 | $1.50 | $0.05 |
| Kimi 通用 | kimi-latest | $0.40 | $1.20 | $0.04 |

## MiMo (小米) 系列

| 模型 | API ID | Input | Output | Cache Hit |
|------|--------|-------|--------|-----------|
| MiMo V2 | mimo-v2 | $0.20 | $0.80 | $0.02 |
| MiMo 通用 | mimo-7b | $0.15 | $0.60 | $0.015 |

## 豆包 (ByteDance 字节跳动) 系列

| 模型 | API ID | Input | Output | Cache Hit |
|------|--------|-------|--------|-----------|
| Doubao Pro | doubao-pro | $0.40 | $1.20 | $0.04 |
| Doubao Lite | doubao-lite | $0.10 | $0.30 | $0.01 |
| Doubao 通用 | doubao | $0.20 | $0.60 | $0.02 |

## Statux Cost Widget 计算逻辑

Cost widget 使用以下策略计算费用：

1. **优先**：根据模型 ID 匹配定价表，结合 JSONL 中的 token 指标本地计算
   - `inputTokens * input_price`
   - `outputTokens * output_price`
   - `cacheCreationTokens * cacheWrite5m_price`
   - `cacheReadTokens * cacheRead_price`
2. **回退**：使用客户端传入的 `cost.total_cost_usd`

本地计算时显示 `~` 前缀（如 `~$1.23`）表示估算值。

## Mem Widget 计算逻辑

对齐 macOS 活动监视器：

```
App Memory  = Anonymous pages - Purgeable pages
Memory Used = App Memory + Wired + Compressor
```

通过 `vm_stat` 命令获取各分页类别的字节数，页面大小从 `vm_stat` 输出首行自动解析（Apple Silicon 为 16384）。
