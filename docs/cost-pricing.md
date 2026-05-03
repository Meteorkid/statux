# Claude 模型定价参考

> 来源：https://platform.claude.com/docs/en/about-claude/pricing
> 最后更新：2026-05-04

## 模型定价表

单位：USD / Million Tokens (MTok)

### 当前模型

| 模型 | Input | Output | Cache Write 5m | Cache Write 1h | Cache Read |
|------|-------|--------|----------------|----------------|------------|
| Claude Opus 4.7 | $5.00 | $25.00 | $6.25 | $10.00 | $0.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $1.25 | $2.00 | $0.10 |

### 遗留模型

| 模型 | Input | Output | Cache Write 5m | Cache Write 1h | Cache Read |
|------|-------|--------|----------------|----------------|------------|
| Claude Opus 4.6 | $5.00 | $25.00 | $6.25 | $10.00 | $0.50 |
| Claude Opus 4.5 | $5.00 | $25.00 | $6.25 | $10.00 | $0.50 |
| Claude Opus 4.1 | $15.00 | $75.00 | $18.75 | $30.00 | $1.50 |
| Claude Opus 4 | $15.00 | $75.00 | $18.75 | $30.00 | $1.50 |
| Claude Sonnet 4.5 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 |
| Claude Sonnet 4 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 |
| Claude Sonnet 3.7 | $3.00 | $15.00 | $3.75 | $6.00 | $0.30 |
| Claude Haiku 3.5 | $0.80 | $4.00 | $1.00 | $1.60 | $0.08 |
| Claude Opus 3 | $15.00 | $75.00 | $18.75 | $30.00 | $1.50 |
| Claude Haiku 3 | $0.25 | $1.25 | $0.30 | $0.50 | $0.03 |

## 缓存定价规则

| 缓存操作 | 倍率 | 说明 |
|----------|------|------|
| 5 分钟缓存写入 | 1.25x base input | 首次存储内容时计费 |
| 1 小时缓存写入 | 2x base input | 首次存储内容时计费 |
| 缓存读取 (hit) | 0.1x base input | 后续请求读取缓存时计费 |

## Batch API 定价

Batch API 享受输入和输出 token 50% 折扣。

| 模型 | Batch Input | Batch Output |
|------|-------------|--------------|
| Claude Opus 4.7 | $2.50 | $12.50 |
| Claude Opus 4.6 | $2.50 | $12.50 |
| Claude Opus 4.5 | $2.50 | $12.50 |
| Claude Opus 4.1 | $7.50 | $37.50 |
| Claude Opus 4 | $7.50 | $37.50 |
| Claude Sonnet 4.6 | $1.50 | $7.50 |
| Claude Sonnet 4.5 | $1.50 | $7.50 |
| Claude Sonnet 4 | $1.50 | $7.50 |
| Claude Haiku 4.5 | $0.50 | $2.50 |
| Claude Haiku 3.5 | $0.40 | $2.00 |
| Claude Haiku 3 | $0.125 | $0.625 |

## Fast Mode 定价

Claude Opus 4.6 的 Fast Mode 提供更快输出，价格为标准的 6x。

| Input | Output |
|-------|--------|
| $30 / MTok | $150 / MTok |

## Statux Cost Widget 计算逻辑

Cost widget 使用以下策略计算费用：

1. **优先**：根据模型 ID 匹配定价表，结合 JSONL 中的 token 指标本地计算
   - `inputTokens * input_price`
   - `outputTokens * output_price`
   - `cacheCreationTokens * cacheWrite5m_price`
   - `cacheReadTokens * cacheRead_price`
2. **回退**：使用 Claude Code 客户端传入的 `cost.total_cost_usd`

本地计算时显示 `~` 前缀（如 `~$1.23`）表示估算值。

## 费用计算示例

使用 Claude Opus 4.7 的一次会话：
- Input: 50,000 tokens
- Output: 15,000 tokens
- Cache Creation: 30,000 tokens
- Cache Read: 100,000 tokens

```
Input:       50,000 × $5.00 / 1,000,000 = $0.250
Output:      15,000 × $25.00 / 1,000,000 = $0.375
Cache Write: 30,000 × $6.25 / 1,000,000 = $0.188
Cache Read: 100,000 × $0.50 / 1,000,000 = $0.050
Total: $0.863
```
