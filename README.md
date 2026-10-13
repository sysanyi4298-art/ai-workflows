# ai-workflows

个人 AI 工作流资产库：把「AI 辅助运营 + 内容生产 + 站外增长」里可复用的 Skill 与工具沉淀成可独立运行的代码。

> 定位：不是示例集，而是本人在实际跑通的流水线里抽出来的、可复用的部分。
> 每个目录都能单独看懂、单独运行。

## 目录结构

```
ai-workflows/
├── skills/                     可复用的 Agent Skill（Markdown 指令包 + 脚本）
│   ├── codex-history/          检索本机 Codex 历史对话，找回项目决策与偏好
│   └── directory-outreach/     驱动 cli/directory-outreach，发现→分级→起草→审核→导出
├── cli/
│   └── directory-outreach/     站外目录外联 CLI（Bun + TypeScript）
└── docs/                       方法论说明
```

## 1. `cli/directory-outreach` — 目录外联增长工具

自研 Bun CLI：找出「链竞品但不链我们」的站点，分级投稿渠道，生成合规草稿，人工审核后导出。
**不自动发信、不自动提交表单、不自动发评论**，所有外链带短码可归因。

| 命令 | 作用 | 成本 |
| --- | --- | --- |
| `discover` | 找反向链接缺口站点 | 真实花费，单次封顶 $0.15 |
| `qualify` | 逐个打开站点，分级为表单/邮箱/评论/友链/付费 | 无 API 花费 |
| `compose` | 按 `config/listing.yaml` 生成投稿包 + 短码归因 | 无 |
| `review` | 打印对外文本供人工审核 | 无 |
| `approve` / `reject` / `export` | 审批与导出 `.eml` / 表单字段包 | 无 |

技术栈：Bun · TypeScript · Zod · Biome · DataForSEO API，含完整单测（`bun test`）。

### 快速开始

```sh
cd cli/directory-outreach
export PATH="$HOME/.bun/bin:$PATH"
cp .env.example .env        # 填入 DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD
bun install
bun test
bun src/cli.ts discover
```

## 2. `skills/` — 可复用 Agent Skill

- **codex-history**：只读检索本机 `~/.codex` 的 user/assistant 消息，用于找回项目决策与偏好；
  只读、有界、自动 redact 凭据，不写数据库、不读鉴权文件。
- **directory-outreach**：把 `cli/directory-outreach` 的用法、命令顺序、对外文案规则写成 Skill 指令，
  让 Agent 在人工闸门内安全驱动外联流程。

## 设计原则（贯穿所有工具）

1. **人工闸门优先**：付费动作与对外动作都有人工确认节点。
2. **证据分层，绝不编造**：数据新鲜度 / 实测状态 / 产品事实都落盘、可追溯，缺失就标缺失。
3. **成本护栏内建**：配额守卫 + 单次花费封顶 + 缓存复用。
4. **一切可归因**：外链短码、Run ID，每篇内容都能回溯到来源与运行。

## 说明

- 本仓库为个人作品与工具沉淀，代码来自本人独立搭建的项目。
- 所有绝对路径已改为可移植写法（`~` / `Path.home()`），不包含任何密钥；`.env` 已被忽略，仅保留 `.env.example`。
