# ai-workflows

个人 AI 工作流资产库：把「AI 辅助运营 + 内容生产 + 站外增长」里可复用的 Skill 与工具沉淀成可独立运行、可单独看懂的代码。

> 定位：不是示例集，而是本人在实际跑通的流水线里抽出来的、可复用的部分。

## 目录结构

```
ai-workflows/
├── skills/                     可复用的 Agent Skill（Markdown 指令包 + 脚本 + 参考）
│   ├── generate-seo-topic-pack/     SEO 选题漏斗：关键词研究 → 选题 → Brief
│   ├── khazix-writer-skill/         事实型 SEO 长文 + 公众号人格长文写作
│   ├── seo-article-illustrator/     文章配图规划（封面 + 少量正文图）
│   ├── aicodewith-image-generation/ 生图 API 执行器（对接多模型图像 API）
│   ├── seo-review/                  发布前 SEO 硬闸门评审
│   ├── codex-history/               只读检索本机 Codex 历史，找回项目决策
│   └── directory-outreach/          驱动 cli/directory-outreach 做站外外联
├── cli/
│   └── directory-outreach/     站外目录外联 CLI（Bun + TypeScript，含完整单测）
└── docs/
    └── design-principles.md        工作流方法论「设计宪法」
```

## 完整内容流水线

这 5 个 SEO 相关 Skill 是一条强绑定的流水线，逐级解锁、每级都有闸门：

```
generate-seo-topic-pack → khazix-writer-skill → evidence-qa → platform-adaptation
  → seo-review → seo-article-illustrator → aicodewith-image-generation
  → screenshot-check → final-image-qa → publish-gate
```

| Skill | 职责 | 关键设计 |
| --- | --- | --- |
| **generate-seo-topic-pack** | 关键词研究 → 选题 → Benchmark → Brief | 证据分层、缓存复用、Semrush 只做最终付费验证 |
| **khazix-writer-skill** | SEO 长文 / 公众号人格长文 | 研究/写作隔离；不把竞品当改写底稿 |
| **seo-article-illustrator** | 配图规划 | 强制真实截图、AI 图单篇上限 3 张、五态分类 |
| **aicodewith-image-generation** | 生图 API 执行 | 参数人工确认闸门、UTF-8 编码要求、URL 输出契约 |
| **seo-review** | 发布前硬闸门 | GREEN + ≥85 分 + 无 veto 才解锁发布 |

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

**SEO 流水线（5 个）**：`generate-seo-topic-pack` · `khazix-writer-skill` · `seo-article-illustrator` · `aicodewith-image-generation` · `seo-review`
——构成上表的内容生产链路，每个 Skill 自带 `references/` 参考与脚本。

**通用工具（2 个）**：
- `codex-history`：只读检索本机 `~/.codex` 的 user/assistant 消息，用于找回项目决策与偏好；
  只读、有界、自动 redact 凭据，不写数据库、不读鉴权文件。
- `directory-outreach`：把 `cli/directory-outreach` 的用法、命令顺序、对外文案规则写成 Skill 指令，
  让 Agent 在人工闸门内安全驱动外联流程。

## 设计原则（贯穿所有工具）

1. **人工闸门优先**：付费动作（Semrush、discover）与对外动作（发布、外联）都有人工确认节点。
2. **证据分层，绝不编造**：数据新鲜度 / 实测状态 / 产品事实都落盘、可追溯，缺失就标缺失。
3. **成本护栏内建**：配额守卫 + 单次花费封顶 + 缓存复用（14 天）。
4. **Skill 化与隔离**：把「研究」与「写作」分离，避免 AI 把竞品原文当改写底稿。
5. **一切可归因**：外链短码、Run ID、`REFRESH_OF`，每篇内容都能回溯到来源与运行。

详见 [`docs/design-principles.md`](docs/design-principles.md)。

## 说明

- 本仓库为个人作品与工具沉淀，代码来自本人独立搭建的项目。
- 所有绝对路径已改为可移植写法（`~` / `Path.home()`），不包含任何密钥；`.env` 已被忽略，仅保留 `.env.example`。
- SEO 流水线 Skill 中涉及的具体产品名（AI Code With）为工作项目上下文，Skill 的方法论与结构可迁移到任意同类产品。
