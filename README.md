# statux

> AI Agent status display for Claude Code and iTerm2

[![npm](https://img.shields.io/npm/v/@statux/cli)](https://www.npmjs.com/package/@statux/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey)]()

statux 是一个终端状态显示工具，为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 和 [iTerm2](https://iterm2.com/) 提供 AI Agent 的实时状态信息。支持 65 个可配置 Widget、Powerline 渲染、交互式 TUI 配置界面。

```
opus-4.7 │ [████████░░] 82% │ in:45k out:12k │ main +3 ~1 │ 25m │ $0.35
```

---

## 目录

- [功能特性](#功能特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [Claude Code 集成](#claude-code-集成)
- [iTerm2 集成](#iterm2-集成)
- [Widget 目录](#widget-目录)
  - [Core — 核心信息](#core--核心信息)
  - [Context — 上下文](#context--上下文)
  - [Tokens & Speed — Token 与速度](#tokens--speed--token-与速度)
  - [Git — 版本控制](#git--版本控制)
  - [Session — 会话](#session--会话)
  - [Usage — 用量统计](#usage--用量统计)
  - [Custom — 自定义](#custom--自定义)
  - [Jujutsu — Jujutsu VCS](#jujutsu--jujutsu-vcs)
  - [Layout — 布局](#layout--布局)
- [渲染模式](#渲染模式)
- [配置参考](#配置参考)
- [TUI 配置界面](#tui-配置界面)
- [架构](#架构)
- [从源码构建](#从源码构建)
- [与 ccstatusline 的对比](#与-ccstatusline-的对比)
- [License](#license)

---

## 功能特性

- **65 个 Widget** — 覆盖模型、上下文、Token、Git、会话、费用、速率限制、Jujutsu VCS 等
- **双通道输出** — Claude Code statusLine + iTerm2 状态栏
- **Powerline 渲染** — 内置 dark/ocean 主题，箭头分隔符
- **TUI 配置界面** — 基于 Ink (React for CLI) 的交互式配置，支持搜索、排序、预览
- **Anthropic Usage API** — 实时获取 session/weekly 用量数据
- **多平台二进制** — macOS (arm64/x64) + Linux (x64/arm64)，无依赖独立运行
- **零配置可用** — 默认布局开箱即用，按需自定义

---

## 安装

### npm / bun（推荐）

```bash
# npm
npm install -g @statux/cli

# bun
bun install -g @statux/cli
```

### 独立二进制

从 [GitHub Releases](https://github.com/Meteorkid/statux/releases) 下载对应平台的二进制文件：

| 平台 | 文件名 |
|------|--------|
| macOS (Apple Silicon) | `statux-darwin-arm64` |
| macOS (Intel) | `statux-darwin-x64` |
| Linux (x64) | `statux-linux-x64` |
| Linux (ARM64) | `statux-linux-arm64` |

```bash
# 下载后添加执行权限
chmod +x statux-darwin-arm64

# 移动到 PATH
mv statux-darwin-arm64 /usr/local/bin/statux
```

每个 Release 附带 `.sha256` 校验文件，可验证完整性：

```bash
sha256sum -c statux-darwin-arm64.sha256
```

### 从源码构建

```bash
git clone https://github.com/Meteorkid/statux.git
cd statux
bun install

# 单平台构建
bun run build

# 多平台构建
bun run build:all
```

---

## 快速开始

```bash
# 使用模拟数据测试
echo '{"model":{"display_name":"opus-4.7"},"context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.35}}' | statux

# 启动 TUI 配置界面
statux --tui

# 安装 iTerm2 插件
statux --setup
```

---

## Claude Code 集成

在 `~/.claude/settings.json` 中添加 `statusLine` 配置：

```json
{
  "statusLine": {
    "type": "command",
    "command": "statux",
    "refreshInterval": 10
  }
}
```

如果使用 bun 直接运行（未全局安装）：

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /path/to/statux/src/cli.ts",
    "refreshInterval": 10
  }
}
```

`refreshInterval` 单位为秒，控制状态栏刷新频率。建议值：5-15。

---

## iTerm2 集成

### 自动安装

```bash
statux --setup
```

此命令会将 Python Plugin 安装到 iTerm2 的 AutoLaunch 目录。

### 手动安装

1. 将 `iterm2/statux.py` 复制到 `~/Library/Application Support/iTerm2/Scripts/AutoLaunch/`
2. 重启 iTerm2
3. 进入 Preferences → Profiles → Session → Status bar
4. 拖拽 "Agent Status" 到活动组件区域

### 工作原理

```
statux CLI → OSC 1337 自定义序列 → iTerm2 Python daemon → 状态栏 + 标签颜色
```

- CLI 每次渲染时输出 OSC 1337 序列
- iTerm2 的 `CustomControlSequenceMonitor` 接收并解析
- 自动更新状态栏内容和标签颜色（运行中=蓝色，完成=绿色，限速=红色）

---

## Widget 目录

statux 提供 65 个 Widget，分为 9 个类别。每个 Widget 都支持自定义颜色和粗体。

### Core — 核心信息

8 个 Widget，显示 AI Agent 的基础状态。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `model` | `model` | 当前使用的模型名称 | `opus-4.7` |
| `output-style` | `output-style` | 当前输出风格 | `style:concise` |
| `version` | `version` | Claude Code 版本号 | `v1.2.3` |
| `session-id` | `session-id` | 当前会话 ID（短格式） | `sid:a3f2` |
| `thinking-effort` | `thinking-effort` | 思维努力级别 | `think:high` |
| `vim-mode` | `vim-mode` | Vim 模式指示器 | `[N]` `[I]` `[V]` |
| `terminal-width` | `terminal-width` | 终端宽度（列数） | `cols:120` |
| `free-memory` | `free-memory` | 系统可用内存 | `mem:8.2G` |

**`thinking-effort` 说明：**

| 级别 | 显示 | 颜色 |
|------|------|------|
| low | `think:low` | 灰色 |
| medium | `think:med` | 黄色 |
| high | `think:high` | 绿色 |
| xhigh | `think:xhigh` | 青色 |

### Context — 上下文

6 个 Widget，显示上下文窗口使用情况。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `context-bar` | `context-bar` | 上下文使用率进度条 | `[████████░░] 82%` |
| `context-pct` | `context-pct` | 上下文使用率（纯数字） | `ctx:82%` |
| `context-length` | `context-length` | 当前上下文长度 | `ctx:45.2k` |
| `context-window` | `context-window` | 上下文窗口总大小 | `win:200k` |
| `context-pct-usable` | `context-pct-usable` | 可用上下文百分比 | `usable:18%` |
| `compaction` | `compaction` | 上下文压缩次数 | `compact:2` |

**`context-bar` 进度条颜色：**

| 使用率 | 颜色 |
|--------|------|
| < 50% | 绿色 |
| 50-80% | 黄色 |
| > 80% | 红色 |

### Tokens & Speed — Token 与速度

9 个 Widget，显示 Token 消耗和生成速度。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `tokens` | `tokens` | 输入/输出 Token 汇总 | `in:45k out:12k` |
| `tokens-input` | `tokens-input` | 输入 Token 数量 | `input:45k` |
| `tokens-output` | `tokens-output` | 输出 Token 数量 | `output:12k` |
| `tokens-cached` | `tokens-cached` | 缓存命中 Token 数量 | `cached:30k` |
| `tokens-total` | `tokens-total` | 总 Token 数量 | `total:57k` |
| `output-speed` | `output-speed` | 输出 Token 速度 | `spd:85/s` |
| `total-speed` | `total-speed` | 总 Token 速度 | `120/s` |
| `input-speed` | `input-speed` | 输入 Token 速度 | `in:200/s` |

**速度格式化：**
- < 1000/s: `85/s`
- ≥ 1000/s: `1.2k/s`

**窗口速度：** 支持 `metadata.window` 参数，计算指定时间窗口内的平均速度。

### Git — 版本控制

17 个 Widget，显示 Git 仓库状态。

#### 基础信息

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `git-branch` | `git-branch` | 当前分支名 | `main` |
| `git-status` | `git-status` | 文件变更摘要 | `+3 ~1 ?2` |
| `git-sha` | `git-sha` | 当前 commit SHA（短） | `sha:a3f2b1c` |
| `git-origin` | `git-origin` | 远程仓库地址 | `origin:github.com/user/repo` |

#### 变更统计

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `git-changes` | `git-changes` | 总变更文件数 | `chg:5` |
| `git-insertions` | `git-insertions` | 新增行数 | `+120` |
| `git-deletions` | `git-deletions` | 删除行数 | `-45` |

#### 文件计数

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `git-staged-files` | `git-staged-files` | 已暂存文件数 | `staged:3` |
| `git-unstaged-files` | `git-unstaged-files` | 未暂存文件数 | `unstaged:2` |
| `git-untracked-files` | `git-untracked-files` | 未跟踪文件数 | `untracked:1` |
| `git-clean-status` | `git-clean-status` | 工作区是否干净 | `clean` 或 `dirty` |

#### 高级信息

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `git-root-dir` | `git-root-dir` | Git 仓库根目录名 | `statux` |
| `git-ahead-behind` | `git-ahead-behind` | 与远程的 ahead/behind | `↑2 ↓1` |
| `git-conflicts` | `git-conflicts` | 合并冲突数 | `conflicts:1` |
| `git-is-fork` | `git-is-fork` | 是否为 fork 仓库 | `fork` |
| `git-worktree` | `git-worktree` | 是否在 worktree 中 | `worktree` |
| `git-pr` | `git-pr` | 关联的 PR 编号 | `pr:#42` |

**`git-status` 符号：**
- `+` 新增文件
- `~` 修改文件
- `?` 未跟踪文件
- `-` 删除文件

### Session — 会话

7 个 Widget，显示会话相关信息。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `session-clock` | `session-clock` | 会话持续时间 | `25m` `1h30m` |
| `session-name` | `session-name` | 会话名称 | `session:debug-auth` |
| `cost` | `cost` | 本次会话费用（USD） | `$0.35` |
| `rate-limit` | `rate-limit` | 速率限制使用率 | `rl:42%` |
| `tool-calls` | `tool-calls` | 工具调用次数 | `tools:15` |
| `account-email` | `account-email` | Anthropic 账户邮箱 | `user@example.com` |
| `skills` | `skills` | 可用 Skills 数量 | `skills:12` |

**`rate-limit` 颜色：**

| 使用率 | 颜色 |
|--------|------|
| < 50% | 绿色 |
| 50-80% | 黄色 |
| > 80% | 红色 |

**`session-clock` 时间格式：**
- < 60s: `45s`
- < 60m: `25m`
- ≥ 60m: `1h30m`

### Usage — 用量统计

5 个 Widget，基于 Anthropic Usage API 的用量数据。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `block-timer` | `block-timer` | 当前 5 小时计费窗口倒计时 | `block:2h15m` |
| `rate-limit-timer` | `rate-limit-timer` | 速率限制重置倒计时 | `rl-reset:45m` |
| `session-usage` | `session-usage` | 当前 session token 用量 | `session:125k` |
| `weekly-usage` | `weekly-usage` | 本周 token 用量 | `week:2.5M` |
| `weekly-reset-timer` | `weekly-reset-timer` | 周用量重置倒计时 | `week-reset:3d` |

**数据来源策略：**
1. 优先从 StatusJSON 的 `rate_limits` 字段提取
2. 数据不完整时，调用 Anthropic Usage API 补充
3. API 结果缓存 3 分钟，避免频繁请求

**OAuth Token 获取顺序：**
1. macOS Keychain: `security find-generic-password -s "Claude Code-credentials" -w`
2. 文件: `~/.claude/.credentials.json`

### Custom — 自定义

4 个 Widget，支持用户自定义内容。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `custom-command` | `custom-command` | 执行命令并显示输出 | 命令的 stdout |
| `custom-text` | `custom-text` | 静态自定义文本 | 任意文本 |
| `custom-symbol` | `custom-symbol` | 自定义符号/图标 | 任意符号 |
| `link` | `link` | 可点击链接 | `link:docs` |

**`custom-command` 示例：**

```json
{
  "type": "custom-command",
  "metadata": {
    "command": "date +%H:%M"
  }
}
```

**`custom-text` 示例：**

```json
{
  "type": "custom-text",
  "metadata": {
    "text": "DEV"
  },
  "color": "red",
  "bold": true
}
```

### Jujutsu — Jujutsu VCS

8 个 Widget，支持 [Jujutsu](https://github.com/martinvonz/jj) 版本控制系统。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `jj-bookmarks` | `jj-bookmarks` | 当前 bookmark | `bm:main` |
| `jj-workspace` | `jj-workspace` | 工作区名称 | `ws:default` |
| `jj-root-dir` | `jj-root-dir` | 仓库根目录名 | `my-project` |
| `jj-changes` | `jj-changes` | 变更数量 | `jj:5` |
| `jj-insertions` | `jj-insertions` | 新增行数 | `+80` |
| `jj-deletions` | `jj-deletions` | 删除行数 | `-20` |
| `jj-description` | `jj-description` | 当前变更描述 | `desc:fix auth` |
| `jj-revision` | `jj-revision` | 当前 revision ID | `rev:kqmpx` |

### Layout — 布局

2 个 Widget，用于控制布局和间距。

| Widget | 类型 | 说明 | 输出示例 |
|--------|------|------|---------|
| `separator` | `separator` | 静态分隔符 | ` │ ` |
| `flex-separator` | `flex-separator` | 自动填充空格 | （占据剩余宽度） |

**`separator` 默认值：** ` │ `（可自定义为任意字符串）

**`flex-separator` 用途：** 在多 Widget 布局中，将左右两侧的内容分别推到屏幕两端。

---

## 渲染模式

### Normal 模式（默认）

标准 ANSI 文本渲染，Widget 之间使用分隔符连接。

```
opus-4.7 │ [████████░░] 82% │ in:45k out:12k │ main │ $0.35
```

### Powerline 模式

使用 Powerline 箭头符号，视觉效果更紧凑。

```
  opus-4.7   [████████░░] 82%   in:45k out:12k   main   $0.35  
```

在配置中切换：

```json
{
  "renderMode": "powerline",
  "powerline": {
    "theme": "dark"
  }
}
```

**可用主题：**

| 主题 | 说明 |
|------|------|
| `dark` | 深色背景适配 |
| `ocean` | 海洋蓝色调 |

---

## 配置参考

配置文件路径：`~/.config/statux/settings.json`

### 完整配置示例

```json
{
  "version": 1,
  "lines": [
    [
      { "id": "model", "type": "model" },
      { "id": "sep1", "type": "separator" },
      { "id": "ctx", "type": "context-bar" },
      { "id": "sep2", "type": "separator" },
      { "id": "tokens", "type": "tokens" },
      { "id": "flex", "type": "flex-separator" },
      { "id": "git", "type": "git-branch" },
      { "id": "sep3", "type": "separator" },
      { "id": "cost", "type": "cost" }
    ]
  ],
  "renderMode": "normal",
  "colorLevel": 3,
  "powerline": {
    "theme": "dark"
  }
}
```

### 配置字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `version` | `number` | `1` | 配置版本号，用于迁移 |
| `lines` | `Widget[][]` | `[[...]]` | 多行 Widget 布局 |
| `renderMode` | `"normal" \| "powerline"` | `"normal"` | 渲染模式 |
| `colorLevel` | `0 \| 1 \| 2 \| 3` | `3` | 颜色级别（0=无色, 3=真彩色） |
| `powerline.theme` | `string` | `"dark"` | Powerline 主题名 |

### Widget 配置项

每个 Widget 对象支持以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识符 |
| `type` | `string` | Widget 类型（见上方目录） |
| `color` | `string` | 自定义颜色（覆盖默认值） |
| `bold` | `boolean` | 是否粗体 |
| `hidden` | `boolean` | 是否隐藏 |
| `rawValue` | `boolean` | 是否显示原始值（无标签） |
| `metadata` | `object` | Widget 特定参数 |

**可用颜色：** `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`

---

## TUI 配置界面

交互式终端配置界面，无需手动编辑 JSON。

```bash
statux --tui
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `↑/↓` 或 `j/k` | 选择 Widget |
| `Enter` | 添加选中的 Widget |
| `Backspace` / `Delete` | 删除选中的 Widget |
| `Tab` | 切换到下一行 |
| `Shift+Tab` | 切换到上一行 |
| `Shift+A` | 在下方新增一行 |
| `Shift+D` | 删除当前行 |
| `←/→` | 移动当前 Widget 位置 |
| `c` | 循环切换颜色 |
| `b` | 切换粗体 |
| `Shift+H` | 切换隐藏 |
| `m` | 切换 Normal/Powerline 模式 |
| `/` | 搜索 Widget |
| `Ctrl+S` | 保存配置 |
| `?` | 显示帮助 |
| `q` / `Ctrl+C` | 退出 |

---

## 架构

```
statux (TypeScript/Bun)
├── src/
│   ├── cli.ts                 # CLI 入口：statusLine 模式 vs TUI 模式
│   ├── setup.ts               # iTerm2 plugin 安装
│   ├── types/
│   │   ├── StatusJSON.ts      # Claude Code 输入 schema (Zod)
│   │   ├── Widget.ts          # Widget 接口定义
│   │   └── Config.ts          # 配置 schema
│   ├── widgets/               # 65 个 Widget 实现
│   │   ├── registry.ts        # Widget 注册表
│   │   └── *.ts               # 各 Widget 文件
│   ├── render/
│   │   ├── pipeline.ts        # 两阶段渲染：预渲染 + 组装
│   │   ├── ansi.ts            # ANSI 转义码工具
│   │   └── powerline.ts       # Powerline 箭头渲染
│   ├── data/
│   │   ├── jsonl.ts           # 解析 transcript.jsonl
│   │   ├── git.ts             # Git 状态采集
│   │   ├── metrics.ts         # Token/速度/费用计算
│   │   └── usage-api.ts       # Anthropic Usage API 客户端
│   ├── config.ts              # 配置加载/保存/迁移
│   └── tui/                   # Ink TUI 配置界面
│       ├── App.tsx            # 主应用组件
│       └── index.tsx          # TUI 入口
├── iterm2/
│   └── statux.py              # iTerm2 Python Plugin
└── scripts/
    └── build.ts               # 多平台构建脚本
```

### 数据流

```
Claude Code → stdin(StatusJSON) → statux CLI → 解析 JSON + JSONL
  → Widget 渲染 → stdout(ANSI) → Claude Code 显示
                                  ↓
                           OSC 1337 序列
                                  ↓
                           iTerm2 Python daemon → 状态栏 + 标签颜色
```

---

## 从源码构建

### 前置条件

- [Bun](https://bun.sh/) >= 1.0

### 构建命令

```bash
# 安装依赖
bun install

# 类型检查
bun run typecheck

# 单平台构建（当前平台）
bun run build

# 多平台构建
bun run build:all
```

### 发布流程

发布通过 GitHub Actions 自动化，由 git tag 触发：

```bash
# 更新版本号
# 编辑 package.json 中的 version

# 创建 tag 并推送
git tag v0.2.0
git push origin v0.2.0
```

自动执行：
1. 4 平台交叉编译 (darwin-arm64, darwin-x64, linux-x64, linux-arm64)
2. 创建 GitHub Release（附带二进制文件和 SHA256 校验和）
3. 发布到 npm（`@statux/cli`）

---

## 与 ccstatusline 的对比

| 维度 | statux | ccstatusline |
|------|--------|-------------|
| Widget 数量 | 65 | 73 |
| Powerline 渲染 | ✅ 内置支持 | ❌ |
| TUI 配置界面 | ✅ Ink (React) | ❌ |
| iTerm2 状态栏集成 | ✅ Python Plugin | ❌ |
| iTerm2 标签颜色 | ✅ 自动变色 | ❌ |
| Jujutsu VCS 支持 | ✅ 8 个 Widget | ❌ |
| Anthropic Usage API | ✅ 实时用量 | ❌ |
| 独立二进制 | ✅ 无依赖 | ❌ Node.js 运行时 |
| 多行布局 | ✅ | ✅ |
| Powerline 主题 | ✅ dark/ocean | ❌ |

---

## License

[MIT](LICENSE)
