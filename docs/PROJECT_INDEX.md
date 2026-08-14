# FAS Project Index（项目地图）

> 给 AI / 新协作者的一页导航：文档职责、权威层级、代码落点、当前交付进度。  
> **不要**用本文件覆盖 `docs/00_PROJECT_BIBLE.md` 或 Accepted ADRs；冲突时按下方权威序。  
> 命名说明：截图示例中的 `34_PROJECT_INDEX.md` 会与已有 `docs/34_V2_ARCHITECTURE_ALIGNMENT.md` 撞号，故本仓库使用 **`docs/PROJECT_INDEX.md`**。

**Live 进度快照（实现状态以它为准）：** [`docs/PROJECT_STATE.md`](./PROJECT_STATE.md)  
**AI 协作入口：** [`AGENTS.md`](../AGENTS.md)

---

## 1. 现在到哪一步了（给 GPT 的结论）

| 维度 | 状态 |
|------|------|
| 平台 Milestone 3A bootstrap | **基本落地**（workspace、API/web/worker、Compose、质量门、Prisma 首批 Evidence/Match） |
| 确定性足球垂直切片 1.0–1.4 | **已落地**（证据→特征→规则→投影→报告→本地叙事） |
| 国际赔率路径 B.1 / B.2 | **已落地**（1X2 + 亚盘；默认 recorded cassette） |
| Match Center C.1 / C.2 | **已落地**；并已扩展多联赛 live odds/scores + 日期过滤 + 额度回退 |
| 校准 A.1 | **已落地**（`population_demo_v1`，未 Evaluation 合格） |
| 平台 P.1 / P.2 | **已落地**（`/health/ready`；Evidence 可选 postgres） |
| UI 中文 ZH-1 / ZH-2 | **已落地**（比赛中心/会话 + 工作区/报告/资料库） |
| Football Data ≠ Odds（F.1） | **已落地**（`@fas/provider-football`；Match Center 主源；Odds 为可选赔率层） |
| Architecture Freeze | **v0.3**（v0.2 管线复审通过；见 `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md`） |
| 交付阶段 | **产品研发**（架构设计阶段关闭；见 `AGENTS.md` Project Governance Rule） |
| Football Intelligence MVP | **已落地**（F1.2–F1.3–I1–I2；Market findings-only） |
| Redis / BullMQ / 公网认证 / 网络 AI SDK | **未做 / 禁止擅自开工** |

一句话：**已进入产品研发阶段。** Intelligence MVP 完成且 Freeze v0.3 复审通过；**A1 / A1.5 / A2 / V1A / O1 / M1A / M1B / R1A（审计）/ R1B（结构校准）/ P2K-A+B（History+Sidecar 持久化）/ P2K-C（replay 完备性与回填策略）/ P2K-D（离线 Match Script override）/ P2K-E（密封 Replay Cohort）/ P2K-F（密封 Cohort 离线 Replay Run）/ P2K-G（密封 Cohort 人口评估）/ P2K Validation Data Bootstrap（真实 AnalyzeMatch 历史数据）/ P2K-E Validation Sealed Cohort（bootstrap 6 人 SEALED）/ P2K-G-RECOVERY（Projection V2 新行）/ P2K-E Recovery V2 Sealed Cohort（`p2k.e.validation.recovery.v2.analyzematch.v1` SEALED）/ P2K-F Recovery V2 Replay（A 6/6、C 6/6、paired 6）/ P2K-G Recovery V2 Population Evaluation（paired sample 6；描述性证据；未晋升 Candidate C）** 均已完成。生产默认仍为 Baseline A；Candidate C 非默认、未自动晋升。下一步为人工治理审阅（勿据 n=6 宣称 C 更优）或 **L2A**；**P2K-H 未授权**。**治理提示：** `V1A`、`O1`、`P2A–P2K`、`M1B`、`R1A`/`R1B` 部分尚未作为 Sprint id 写入 doc 40（且 doc 40 **R1** = AI Review ≠ R1B），由任务发起人直接授权。禁止擅自新增 Architecture 文档 / Engine / Redis/微服务/网络 AI。

---

## 2. 权威顺序（冲突时）

1. `docs/00_PROJECT_BIBLE.md`
2. Accepted ADRs in `docs/decisions/`
3. Owning numbered architecture docs（`01`–`19` 等）
4. Approved implementation plan / gate / sign-off
5. `docs/PROJECT_STATE.md`（**当前交付真相**）
6. `docs/40_PRODUCT_ROADMAP.md`（**产品 Sprint 排序唯一权威**）
7. Sprint plans / reports（须引用 doc 40；历史证据不覆盖契约）
8. 现有实现
9. 评论、示例、agent 假设

Agent 规则：`AGENTS.md`（含 Project Governance Rule）→ `PROJECT_STATE.md` → 产品工作再读 doc 40。

---

## 3. 文档目录地图

### 3.1 权威 / 治理（Authority）

| 文档 | 一句话职责 |
|------|------------|
| `docs/00_PROJECT_BIBLE.md` | 产品使命与不可违背原则；最高权威之一。 |
| `docs/DEVELOPMENT_WORKFLOW.md` | 工程生命周期与治理流程。 |
| `AGENTS.md` | AI agent 必读规则；**Project Governance Rule**（产品研发阶段铁规则）。 |
| `docs/40_PRODUCT_ROADMAP.md` | v0.2 后唯一产品路线图；每个 Sprint 必须引用。 |
| `docs/41_EVIDENCE_PROVIDER_ARCHITECTURE.md` | Evidence Provider Layer 架构规划冻结（多 Provider；不授权 coding / 新 package）。 |
| `docs/50_EVIDENCE_CATALOG.md` | Evidence / 产品表面交付状态目录（INJURY / SUSPENSION / AVAILABILITY 等）。 |
| `docs/PROJECT_STATE.md` | **当前里程碑 / 已交付 / 下一步** 的活快照。 |
| `docs/decisions/ADR-001-*.md` | 模块化单体 + TypeScript monorepo。 |
| `docs/decisions/ADR-002-*.md` | V1 用 PostgreSQL + 持久任务方向。 |
| `docs/decisions/ADR-003-*.md` | Provider 中立 AI 与分阶段检索。 |
| `docs/decisions/ADR-004-*.md` | 比赛结果版本 append-only。 |
| `docs/21_ARCHITECTURE_SIGNOFF.md` | 架构签核记录。 |
| `docs/22_MILESTONE_3A_GATE.md` | Milestone 3A 门禁定义。 |
| `docs/23_RELEASE_BASELINE.md` | 发布基线期望。 |

### 3.2 产品与领域契约（Canonical product / domain）

| 文档 | 一句话职责 |
|------|------------|
| `docs/01_PRODUCT.md` | 产品范围与非目标。 |
| `docs/02_DOMAIN_MODEL.md` | 领域语言与核心对象。 |
| `docs/03_AI_PRINCIPLES.md` | AI 使用边界（起草 vs 权威决策）。 |
| `docs/04_ARCHITECTURE.md` | 系统架构总览（ports/adapters、引擎边界）。 |
| `docs/05_PROMPT_ENGINE.md` | Prompt 引擎契约。 |
| `docs/06_KNOWLEDGE_ENGINE.md` | Knowledge 引擎契约。 |
| `docs/07_RULE_ENGINE.md` | Rule 引擎契约（V1 编号文档）。 |
| `docs/08_CASE_ENGINE.md` | Case 引擎契约。 |
| `docs/09_REVIEW_ENGINE.md` | Review 引擎契约。 |
| `docs/10_EVALUATION_ENGINE.md` | Evaluation 引擎契约。 |
| `docs/11_STATISTICS_ENGINE.md` | Statistics 引擎契约。 |
| `docs/12_DATABASE.md` | 持久化与数据边界。 |
| `docs/13_API.md` | API 契约方向。 |
| `docs/14_MONOREPO.md` | 包边界与依赖方向。 |
| `docs/15_DEVELOPMENT_GUIDE.md` | 本地开发指南。 |
| `docs/16_IMPLEMENTATION_ROADMAP.md` | 实现路线图。 |
| `docs/17_ANALYSIS_PIPELINE.md` | 分析流水线（编号权威侧）。 |
| `docs/18_BACKEND_ARCHITECTURE.md` | 后端组成与运行时。 |
| `docs/19_DATABASE_ERD.md` | ERD / 表关系目标。 |
| `docs/20_IMPLEMENTATION_PLAN.md` | 实现计划（门禁相关）。 |

### 3.3 V2 设计（Design — 非权威覆盖层）

与 `01`–`19` 冲突时：**以 canonical + ADR 为准**；V2 文档指导下一阶段形态。

| 文档 | 一句话职责 |
|------|------------|
| `docs/30_RULE_ENGINE_V2.md` | Rule Engine V2 设计。 |
| `docs/31_PREDICTION_ENGINE_V2.md` | Prediction / 投影引擎 V2 设计（术语仍避免「prediction」滥用）。 |
| `docs/32_REPORT_ENGINE_V2.md` | Report Engine V2 设计。 |
| `docs/33_ANALYSIS_PIPELINE_V2.md` | Analysis Pipeline V2 设计。 |
| `docs/34_V2_ARCHITECTURE_ALIGNMENT.md` | V2 与现架构对齐决策。 |
| `docs/35_V2_FIRST_VERTICAL_SLICE_SPECIFICATION.md` | 首个 V2 垂直切片规格（1.0–1.4 已实现对照）。 |
| `docs/36_PROJECT_HEALTH_CHECK.md` | Staff Engineer 仓库健康检查（2026-07-20；非架构重设计）。 |

### 3.4 垂直切片规格 / 完成报告（Planning + delivery evidence）

| 文档 | 一句话职责 |
|------|------------|
| `docs/sprints/VERTICAL_SLICE_1_COMPLETION_REPORT.md` | 切片 1.0–1.4 完成证据。 |
| `docs/sprints/VERTICAL_SLICE_B1_ODDS_INGEST_SPEC.md` | 真实形状赔率 ingest（recorded 默认）。 |
| `docs/sprints/VERTICAL_SLICE_B2_AH_MARKET_SPEC.md` | 亚盘市场路径。 |
| `docs/sprints/VERTICAL_SLICE_C1_MATCH_CENTER_FIXTURES_SPEC.md` | Match Center upcoming 列表。 |
| `docs/sprints/VERTICAL_SLICE_C2_SCORES_FORM_STATS_SPEC.md` | scores→TEAM_FORM + goals-proxy STATISTICS。 |
| `docs/sprints/VERTICAL_SLICE_A1_CALIBRATION_POPULATION_SPEC.md` | 人口频率比校准 artifact。 |
| `docs/sprints/VERTICAL_SLICE_P1_DATABASE_READY_SPEC.md` | `/health/ready` DB ping。 |
| `docs/sprints/VERTICAL_SLICE_P2_EVIDENCE_PERSISTENCE_SPEC.md` | 首批 Evidence/Match Prisma 持久化。 |
| `docs/sprints/VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md` | Football Data≠Odds；Match Center 事实源（**已落地**；xG 现归路线图 **Sprint F1.3**）。 |

### 3.5 Milestone 3A / Sprint 历史（Historical evidence）

| 类别 | 代表文档 | 一句话职责 |
|------|----------|------------|
| 门禁与健康 | `MILESTONE_3A_GATE_REVIEW.md`, `FINAL_REPOSITORY_HEALTH_REPORT.md`, `REPOSITORY_AUDIT_REPORT.md`, `GOVERNANCE_FOUNDATION_REPORT.md` | 3A 门禁与仓库健康证据。 |
| Sprint 1–10 | `SPRINT*_PLANNING/SPECIFICATION/REPORT*.md` 等 | 不可变历史；bootstrap 如何建成。 |
| Sprint 8 重点 | `SPRINT8_*` | Prisma 无模型 bootstrap 前后治理密集区。 |
| Sprint 9–10 | `SPRINT9_*`, `SPRINT10_*` | 容器与 Compose 拓扑。 |
| Sprint 11 | `SPRINT11_PLANNING.md`, `SPRINT11_SPECIFICATION.md` | 规划材料；**非当前活跃实现冲刺**。 |

### 3.6 本索引

| 文档 | 一句话职责 |
|------|------------|
| `docs/PROJECT_INDEX.md` | 文档 + 代码地图；指向权威与当前进度（本文）。 |

---

## 4. 文档依赖关系（简图）

```text
00_PROJECT_BIBLE
    ├── ADRs (decisions/)
    ├── 01–04 (product / domain / AI / architecture)
    │     ├── 05–11 engines
    │     ├── 12–13,19 data/API
    │     ├── 14–18 monorepo / guide / pipeline / backend
    │     └── 20–23 plan / signoff / gates / release
    ├── 30–33 V2 engine/pipeline design (non-overriding)
    │     └── 34–35 V2 alignment + first slice spec
    ├── PROJECT_STATE (delivery snapshot)
    ├── PROJECT_INDEX (this map)
    └── sprints/* (historical + vertical-slice specs)
```

---

## 5. 代码地图（实现落点）

### 5.1 Apps

| 路径 | 职责 | 状态 |
|------|------|------|
| `apps/api` | NestJS REST：import / analyze / evidence / matches/upcoming / health / evaluation-history / calibration / validation | 垂直切片可用 |
| `apps/web` | Next.js：Match Center、Session、Workspace、Library；`copy/zh.ts` | ZH-1/ZH-2 中文 |
| `apps/worker` | NestJS worker 组合根 | 启动后退出；无队列 |

### 5.2 平台包

| 包 | 职责 | 状态 |
|----|------|------|
| `@fas/tsconfig` | TS 编译策略 | 已落地 |
| `@fas/config` | API/worker 环境配置（含 `FOOTBALL_DATA_*` / `ODDS_*`） | 已落地 |
| `@fas/database` | Prisma client、Evidence 仓储适配、health ping | P.1/P.2 已落地 |
| `@fas/domain` | 共享领域类型 | 已落地 |

### 5.3 足球切片包（已实现路径）

| 包 | 职责 |
|----|------|
| `@fas/match` | MatchId 等身份 |
| `@fas/evidence` (+ normalizer/import/query) | 证据模型与导入查询 |
| `@fas/provider-fixture` | Demo fixture 证据 |
| `@fas/provider-football` | Football Data（API-Football）domain model + recorded/live；Match Center 事实源 |
| `@fas/provider-odds` | Odds/scores cassette + live fan-out、`ODDS_SPORT_KEYS`（赔率层） |
| `@fas/application` | 应用编排 |
| `@fas/feature` | FeatureBundle |
| `@fas/rule` | 确定性规则 findings |
| `@fas/analysis` | 比赛投影（Poisson + 规则调整 + 校准引用） |
| `@fas/statistics` | 校准 artifact（identity / population_demo_v1）+ A1.5 Evaluation History + A2 Prediction Calibration report + V1A Football Intelligence Validation report + O1 Football Intelligence Contribution report（仅度量，只读 History；从不改写已封存 Prediction） |
| `@fas/report` | AnalysisReport |
| `@fas/prompt` | 封存上下文组合（无检索） |
| `@fas/ai-provider` | 仅本地确定性叙事适配器 |

### 5.4 运行时主链

```text
Match Center (web)
  → GET /api/matches/upcoming  (@fas/provider-football primary + fixture demos)
  → [analyzable] POST import + analyze
       → Football domain → Evidence → Feature → Rule → Analysis projection
       → Report (+ local narrative)
  → Session → Workspace / Library
```

**配置注意：** 默认 `FOOTBALL_DATA_PROVIDER_MODE=recorded`。Football live 用 `API_FOOTBALL_KEY`（API-Sports 直连）。`FOOTBALL_DATA_PROVIDER_MODE=fixture` 时才回退 Odds 赛程板。Odds 额度问题不再主导 Match Center 日期窗。

---

## 6. 已交付垂直切片一览

| ID | 内容 | 规格文档 |
|----|------|----------|
| 1.0–1.4 | 确定性闭环 + H2H + ODDS 冲突 + 校准消费 + 本地叙事 | `35` + completion report |
| B.1 / B.2 | 赔率 ingest + 亚盘 | `VERTICAL_SLICE_B1/B2_*` |
| C.1 / C.2 | 赛程板 + scores form/stats | `VERTICAL_SLICE_C1/C2_*` |
| C.2+ | 多联赛 odds/scores、日期窗、限流回退 | 实现于 `@fas/provider-odds` + web（见近期 commits） |
| A.1 | population 校准候选 | `VERTICAL_SLICE_A1_*` |
| P.1 / P.2 | ready ping + Evidence Prisma | `VERTICAL_SLICE_P1/P2_*` |
| ZH-1 / ZH-2 | 中文 chrome | `apps/web/src/copy/zh.ts` |
| F.1 (landed) | `@fas/provider-football`；Match Center 事实源与 Odds 拆分 | `VERTICAL_SLICE_F1_FOOTBALL_DATA_PROVIDER_SPEC.md` |
| Freeze v0.2 | Report DI + pipeline depcruise + docs sync | `PROJECT_STATE.md` |
| Freeze Review v0.3 | Intelligence MVP 管线完整性复审 | `docs/reviews/v0.3_ARCHITECTURE_FREEZE_REVIEW.md` |

---

## 7. 明确未做 / 勿推断已完成

- Evaluation 合格校准与更大人口
- 真 shots / xG STATISTICS 源（替换 goals-proxy）
- 全量领域持久化、分析快照、对象存储
- Redis / BullMQ / pgvector / 微服务
- 认证、公网部署、订阅、推送、投注建议
- 网络 AI provider SDK
- Knowledge / Case / Review 引擎完整产品化

---

## 8. 推荐下一步（与 PROJECT_STATE / 路线图一致）

产品顺序以 [`docs/40_PRODUCT_ROADMAP.md`](./40_PRODUCT_ROADMAP.md) 与 [`docs/PROJECT_STATE.md`](./PROJECT_STATE.md) 为准：

1. **A1 Prediction Evaluation** — 已完成（`docs/sprints/A1/A1_PREDICTION_EVALUATION_COMPLETION_REPORT.md`）  
2. **A1.5 Evaluation Platform Foundation** — 已完成（`docs/sprints/A1/A1.5_EVALUATION_PLATFORM_FOUNDATION_COMPLETION_REPORT.md`）  
3. **P0 FI v2 Provider Capability Review** — 已完成（`docs/reviews/FOOTBALL_INTELLIGENCE_V2_PROVIDER_CAPABILITY_REVIEW.md`）  
4. **DA FI v2 Domain Architecture** — 已完成（`docs/architecture/FOOTBALL_INTELLIGENCE_V2_DOMAIN_ARCHITECTURE.md`；L1–L4）  
5. **L1A Club Intelligence Evidence** — 已完成（`docs/sprints/L1/L1A_CLUB_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md`）  
6. **L1B Club Intelligence Features** — 已完成（`docs/sprints/L1/L1B_CLUB_INTELLIGENCE_COMPLETION_REPORT.md`；Feature → Rule → Confidence → Projection）  
7. **Player Intelligence MVP Scope Review**（Wave 2 设计评审）— 已完成（`docs/reviews/PLAYER_INTELLIGENCE_MVP_SCOPE_REVIEW.md`）  
8. **P1A Player Intelligence Evidence** — 已完成（`docs/sprints/P1/P1A_PLAYER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md`）  
9. **P1B Player Intelligence Features** — 已完成（`docs/sprints/P1/P1B_PLAYER_INTELLIGENCE_COMPLETION_REPORT.md`；Feature → Rule → Confidence → Projection）  
10. **A2 Prediction Calibration** — 已完成（`docs/sprints/A2/A2_PREDICTION_CALIBRATION_COMPLETION_REPORT.md`；并行信任轨道；消费 Evaluation History；勿与 Provider 混写）  
11. **V1A Football Intelligence Validation** — 已完成（`docs/sprints/V1A/V1A_FOOTBALL_INTELLIGENCE_VALIDATION_COMPLETION_REPORT.md`；并行信任轨道；按 Feature 族对已封存 History 做观察性分区比较；从不重跑 Prediction，从不断言改进）  
12. **O1 Football Intelligence Contribution Analysis** — 已完成（`docs/sprints/O1/O1_FOOTBALL_INTELLIGENCE_CONTRIBUTION_COMPLETION_REPORT.md`；并行信任轨道；对 Football Intelligence 领域做独立、非互斥的观察性度量；从不重跑 Prediction，从不排名领域，从不断言因果；M1B 后含 Manager 共 9 个领域）  
13. **M1A Manager Intelligence Evidence** — 已完成（`docs/sprints/M1/M1A_MANAGER_INTELLIGENCE_EVIDENCE_COMPLETION_REPORT.md`；仅 Evidence）  
14. **M1B Manager Intelligence Features** — 已完成（`docs/sprints/M1/M1B_MANAGER_INTELLIGENCE_COMPLETION_REPORT.md`；Feature → Rule → Football State → Confidence → Projection → Contribution）  
15. **R1A Match Script Calibration Audit** — 已完成（`docs/sprints/R1A/R1A_MATCH_SCRIPT_CALIBRATION_AUDIT.md`；审计-only；≠ doc 40 R1 AI Review）  
16. **R1B Match Script Calibration** — 已完成 — **STRUCTURAL CALIBRATION**（`docs/sprints/R1B/R1B_MATCH_SCRIPT_CALIBRATION_COMPLETION_REPORT.md`；生产默认 = `MATCH_SCRIPT_BASELINE_V1_PARAMETER_SET`；Candidate `r1b.candidate.c.sideAwareOpen` = NON-DEFAULT / STRUCTURALLY VALIDATED；人口证据见 **P2K-G**，晋升仍需人工门禁）  
17. **P2K Planning** — 已完成（`docs/sprints/P2K/P2K_DURABLE_EVALUATION_HISTORY_PLANNING.md`）  
18. **P2K-A + P2K-B Durable History + Sidecar** — 已完成（`docs/sprints/P2K/P2K_AB_DURABLE_HISTORY_SIDECAR_COMPLETION_REPORT.md`；`platformPersistence` 可观测；Postgres 下 History+Sidecar 双写；无 Cohort/Run；未晋升 Candidate C）  
19. **P2K-C Sidecar Completeness + Backfill** — 已完成（`docs/sprints/P2K/P2K_C_SIDECAR_COMPLETENESS_BACKFILL_COMPLETION_REPORT.md`；`replayComplete` / `outcomeEvaluable` / `replayEligible`；禁止伪造历史 Sidecar；未晋升 Candidate C）  
20. **P2K-D Offline Replay Parameter / Match Script Override** — 已完成（`docs/sprints/P2K/P2K_D_OFFLINE_REPLAY_PARAMETER_OVERRIDE_COMPLETION_REPORT.md`；`runOfflineMatchScriptReplay` + 严格离线 resolver；同 Sidecar 上下文下 A vs C；未晋升 Candidate C；无人口指标）  
21. **P2K-E Sealed Replay Cohort** — 已完成（`docs/sprints/P2K/P2K_E_SEALED_REPLAY_COHORT_COMPLETION_REPORT.md`；`createAndSealReplayCohort`；P2K-C `replayEligible` 门禁；密封后不可变；Prisma Cohort/Member；无人口指标）  
22. **P2K-F Sealed Cohort Offline Replay Run** — 已完成（`docs/sprints/P2K/P2K_F_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`；`executeSealedCohortOfflineReplayPair` → P2K-D；同上下文 A/C；Prisma `ReplayRunItem`；未晋升 Candidate C；无人口指标）  
23. **P2K-G Population evaluation** — 已完成（`docs/sprints/P2K/P2K_G_POPULATION_EVALUATION_COMPLETION_REPORT.md`；同密封 cohort 配对 A/C；复用 A1/A2/P2H 指标；Prisma `PopulationEvaluationItem`；Candidate C 仍非默认、未自动晋升）  
24. **P2K Validation Data Bootstrap** — 已完成（`docs/sprints/P2K/P2K_VALIDATION_DATA_BOOTSTRAP_COMPLETION_REPORT.md`；Option B；真实 AnalyzeMatch → 6 条 catalog-valid History+Sidecar；既有 invalid fixture 未改；未自动跑 E/F/G；未晋升 Candidate C）  
25. **P2K-E Validation Sealed Cohort** — 已完成（`docs/sprints/P2K/P2K_E_VALIDATION_SEALED_COHORT_COMPLETION_REPORT.md`；`p2k.e.validation.bootstrap.analyzematch.v1` SEALED；6 offline-rebuildable members；52 fixture 排除）  
26. **P2K-F Validation Offline Replay** — FAIL CLOSED（`docs/sprints/P2K/P2K_F_VALIDATION_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`；A/C runs 已持久化但 0 success；Sidecar 缺 `parameterVersionLabel`；未跑 G/H）  
27. **P2K-G-RECOVERY Projection V2 Bootstrap** — 已完成（`docs/sprints/P2K/P2K_G_RECOVERY_PROJECTION_V2_VALIDATION_DATA_BOOTSTRAP_COMPLETION_REPORT.md`；`match-p2kg-recovery-v2-*` ×6；parameter provenance 完整；offlineReplayExecutable=6；未自动 E/F/G）  
28. **P2K-E Validation Recovery V2 Sealed Cohort** — 已完成（`docs/sprints/P2K/P2K_E_VALIDATION_RECOVERY_V2_SEALED_COHORT_COMPLETION_REPORT.md`；`p2k.e.validation.recovery.v2.analyzematch.v1` SEALED；6 offline-executable members；digest `3b707860…`；旧 v1 cohort 未改）  
29. **P2K-F Validation Recovery V2 Offline Replay** — 已完成（`docs/sprints/P2K/P2K_F_VALIDATION_RECOVERY_V2_SEALED_COHORT_OFFLINE_REPLAY_RUN_COMPLETION_REPORT.md`；A 6/6、C 6/6、paired 6；测量数据集；未跑 G/H；未晋升 Candidate C）  
30. **P2K-G Validation Recovery V2 Population Evaluation** — 已完成（`docs/sprints/P2K/P2K_G_VALIDATION_RECOVERY_V2_POPULATION_EVALUATION_COMPLETION_REPORT.md`；`eval.p2k.g.validation.recovery.v2.analyzematch.v1`；paired sample 6；描述性证据；未晋升；P2K-H 未授权）  
31. **Football Intelligence v3 Knowledge Model Design**（设计评审，非编码冲刺）— 已完成（`docs/architecture/FOOTBALL_INTELLIGENCE_V3_KNOWLEDGE_MODEL_DESIGN.md`）  
32. **Candidate C promotion gate / P2K-H+** — 仅在人工治理授权后  
33. **L2A Squad Intelligence Evidence** — 其后候选  
34. 其后按 DA Waves 2–6 / 可选 Provider Gate → v1.0  

历史已交付（勿重复开工）：F1.1* · F1.2* · F1.3* · I1* · I2* · Freeze Review v0.3 · P0 · DA · L1A · L1B · P1A · P1B · A2 · V1A · O1 · M1A · M1B · R1A · R1B · V3-KM（设计） · P2A–P2J · P2K-A/B · P2K-C · P2K-D · P2K-E · P2K-F · P2K-G · Validation Data Bootstrap · P2K-E Validation Seal · P2K-F Validation（fail closed） · P2K-G-RECOVERY V2 Bootstrap · P2K-E Recovery V2 Seal · P2K-F Recovery V2 Replay · P2K-G Recovery V2 Population Evaluation  

平台配套（非产品 Sprint 主体）：Compose postgres 冒烟等仍见 `PROJECT_STATE`。

环境操作：Football Data 联赛收窄 → `.env` 的 `FOOTBALL_DATA_LEAGUE_IDS`；Odds 联赛收窄 → `ODDS_SPORT_KEYS`。

---

## 9. 给 GPT 的最短阅读包

若只需判断「现在到哪了、下一步做什么」：

1. `docs/PROJECT_INDEX.md`（本文）  
2. `docs/PROJECT_STATE.md`  
3. `AGENTS.md`（禁区与权威序）  
4. 需要契约细节时再下钻 `00` / ADR / `34`–`35` / 对应 `VERTICAL_SLICE_*`

更新本索引的时机：新增编号文档、关闭/开启里程碑、或交付状态相对 `PROJECT_STATE` 发生跳跃时。
