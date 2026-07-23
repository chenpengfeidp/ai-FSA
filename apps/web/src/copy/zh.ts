/**
 * ZH-1/ZH-2 Chinese UI copy for chrome, Match Center, Analysis Session,
 * Workspace, explainable report, and Analysis Library.
 * Team/competition proper nouns stay English at call sites.
 */

export const zh = {
  meta: {
    title: "AI 足球分析平台",
    description: "确定性足球分析仪表盘。",
  },
  nav: {
    brand: "AI 足球分析",
    primaryAria: "主导航",
    dashboard: "仪表盘",
    matchCenter: "比赛中心",
    workspace: "工作区",
    reports: "报告",
  },
  hero: {
    eyebrow: "确定性足球智能",
    title: "AI 足球分析平台",
    description: "基于确定性流水线的可解释足球分析。",
    analyzeToday: "分析今日比赛",
    viewRecentReports: "查看近期报告",
  },
  matchCenter: {
    eyebrow: "比赛中心",
    upcomingHeading: "即将进行的比赛",
    loadingFixtures: "正在加载赛程…",
    fixturesAvailable: (count: number): string => `${String(count)} 场可用赛程`,
    loadError: "无法加载即将进行的比赛。",
    modeRecorded: "录制演示（赔率）",
    modeLive: "实时赔率",
    modeFixture: "纯 Fixture",
    modeUnknown: "模式未知",
    modeFootballRecorded: "足球数据·录制",
    modeFootballLive: "足球数据·实时",
    modeFootballLiveFallback: "足球数据·live→录制回退",
    modeHintRecorded:
      "赛程来自 Odds recorded cassette（常为演示日期）。若需足球事实源，设置 FOOTBALL_DATA_PROVIDER_MODE=recorded|live。",
    modeHintLive:
      "当前为 Odds live：赛程来自 The Odds API（Football Data 已设为 fixture/关闭）。",
    modeHintLiveFallback:
      "Odds live 拉取失败，已回退 Odds recorded cassette（多为 8 月演示日期）。请检查额度/限流，或启用 Football Data 主源。",
    modeHintFixture: "当前为 fixture：仅演示种子赛程。",
    modeHintUnknown: "赛程元数据尚未返回；请刷新或检查 Football Data / Odds 配置。",
    modeHintFootballRecorded:
      "赛程主源为 Football Data recorded cassette（Fixture/Form/Stats/H2H），不消耗 The Odds API 额度。",
    modeHintFootballLive:
      "赛程主源为 API-Football（API-Sports 直连）。赔率层仍可选；分析前会拉取 Form/Stats/H2H。",
    modeHintFootballLiveFallback:
      "Football Data live 为空或失败，已回退 football recorded cassette。请检查 API_FOOTBALL_KEY / 日配额，或调整日期窗口。",
    modeLiveFallback: "赔率 live→录制回退",
    filterStart: "起始日期",
    filterHorizon: "窗口天数",
    filterHorizonOption: (days: number): string => `${String(days)} 天`,
    includeDemos: "显示演示赛（fixture）",
    emptyFiltered:
      "当前日期窗口内没有比赛。可改起始日期或窗口天数；录制模式可打开演示赛；live 下休赛期联赛可能为空。",
    emptyFilteredOutsideWindow: (total: number, earliest: string): string =>
      `板上有 ${String(total)} 场，但不在当前日期窗口内（最早一场约 ${earliest}）。若误用 Odds cassette，日期常落在 8 月；Football Data recorded 多为当前窗口附近。`,
    jumpToEarliest: (date: string): string => `跳到 ${date} 查看`,
    showingRange: (from: string, to: string, shown: number, total: number): string =>
      `${from} → ${to} · 显示 ${String(shown)} / ${String(total)} 场`,
  },
  matchCard: {
    home: "主队",
    away: "客队",
    vs: "VS",
    analyze: "分析",
    evidenceIncomplete: "证据不完整",
    analyzeAria: (matchup: string): string => `分析 ${matchup}`,
    evidenceIncompleteAria: (matchup: string): string => `${matchup} 证据不完整`,
  },
  recentAnalysis: {
    heading: "近期分析",
    completedCount: (count: number): string => `${String(count)} 已完成`,
    noReportsYet: "暂无报告",
    openLibrary: "打开资料库",
    completed: "已完成",
    openAnalysis: "打开分析",
    openAnalysisAria: (homeTeam: string, awayTeam: string): string =>
      `打开 ${homeTeam} vs ${awayTeam} 的分析`,
    emptyTitle: "暂无分析",
    emptyDescription:
      "对比赛执行「分析」以生成首份可解释报告。结果将显示在此处便于再次查看。",
  },
  overview: {
    heading: "总览",
    sessionMetrics: "会话指标",
    importedMatches: "已导入比赛",
    evidence: "证据",
    features: "特征",
    rules: "规则",
    reports: "报告",
  },
  pipeline: {
    heading: "流水线状态",
    healthy: "正常",
    stages: {
      provider: "数据源",
      normalizer: "归一化",
      evidence: "证据",
      feature: "特征",
      rule: "规则",
      analysis: "分析",
      report: "报告",
    },
  },
  session: {
    eyebrow: "分析会话",
    navEyebrow: "分析会话",
    watching: "正在观察确定性流水线组装可审查报告。",
    match: "比赛",
    competition: "赛事",
    kickoff: "开球时间",
    estimatedDuration: "预计用时",
    progress: "进度",
    progressAria: "分析会话进度",
    runningPrefix: "进行中：",
    sessionComplete: "会话完成 — 正在打开工作区",
    timelineHeading: "流水线时间线",
    timelineDescription:
      "每个阶段对应现有确定性工作流的一部分。各阶段按顺序完成后将打开工作区。",
    stagesAria: "分析会话阶段",
    statusCompleted: "已完成",
    statusRunning: "进行中",
    statusPending: "待处理",
    backToMatchCenter: "返回比赛中心",
    matchNotFound: "未找到比赛",
    matchNotFoundDescription: (matchId: string): string =>
      `目录中不存在「${matchId}」。请从今日赛程中选择一场比赛。`,
    matchUnavailableBoardFailed: (matchId: string): string =>
      `赛程列表暂时不可用，无法打开「${matchId}」。请返回比赛中心刷新后再试（常见原因：Odds API 额度/限流）。`,
    stages: {
      loadingMatch: {
        label: "加载比赛",
        description: "解析赛事身份与开球上下文。",
      },
      collectingEvidence: {
        label: "收集证据",
        description: "汇总所选比赛的归一化证据。",
      },
      extractingFeatures: {
        label: "提取特征",
        description: "从证据派生确定性特征。",
      },
      evaluatingRules: {
        label: "评估规则",
        description: "应用规则引擎检查，不进行生成式推理。",
      },
      buildingAnalysis: {
        label: "构建分析",
        description: "由已评估结论组装分析结果。",
      },
      generatingReport: {
        label: "生成报告",
        description: "组装可解释比赛报告载荷。",
      },
      openingWorkspace: {
        label: "打开工作区",
        description: "移交至可审查的分析工作区。",
      },
    },
  },
  workspace: {
    eyebrow: "工作区",
    backToMatchCenter: "返回比赛中心",
    matchList: "比赛列表",
    recentAnalyses: "近期分析",
    recentAnalysesEmpty: "分析一场比赛以填充近期历史。",
    matchNotFound: "未找到比赛",
    matchNotFoundDescription: (matchId: string): string =>
      `目录中不存在「${matchId}」。请从今日赛程中选择一场比赛。`,
    matchUnavailableBoardFailed: (matchId: string): string =>
      `赛程列表暂时不可用，无法打开「${matchId}」。请返回比赛中心刷新后再试（常见原因：Odds API 额度/限流）。`,
    loadErrorTitle: "无法加载比赛分析",
    loadErrorDescription: "分析流水线未能完成本场比赛。请返回仪表盘并尝试其他赛程。",
    aiAnalysisWorkspace: "AI 分析工作区",
    kickoff: (time: string): string => `开球 ${time}`,
    home: "主队",
    away: "客队",
    vs: "vs",
    sectionsAria: "工作区版块",
    nav: {
      prediction: "预测",
      reasoning: "推理",
      evidence: "证据",
      features: "特征",
      rules: "规则",
      recommendation: "推荐",
      developer: "开发者",
    },
  },
  report: {
    prediction: "预测",
    winner: "胜者",
    confidence: "置信度",
    recommendation: "推荐",
    scoreLine: (score: string): string => `比分 ${score}`,
    rangeLine: (range: string): string => `区间 ${range}`,
    analysisComplete: "确定性分析完成。",
    winnerPrediction: "胜者预测",
    winnerPredictionHint: "由确定性规则权重生成的横向概率条",
    actualResult: "实际赛果",
    actualResultHint: "来自 MATCH_RESULT 证据的完整比赛结果；与预测分离",
    actualResultUnavailable: "尚无实际赛果（比赛未完赛或未导入 MATCH_RESULT）",
    actualScore: "终场比分",
    actualWinner: "胜负",
    actualTotalGoals: "总进球",
    actualCompetition: "赛事",
    actualCompetitionUnknown: "未提供",
    actualProvenance: "来源",
    evaluation: "预测评估",
    evaluationHint: "对已封存预测的确定性度量；不会改写预测或投影",
    evaluationUnavailable: "暂无评估（需要实际赛果）",
    evaluationExcluded: "已排除",
    evaluationHit: "命中",
    evaluationMiss: "未中",
    evaluationWinnerHome: "主胜",
    evaluationWinnerAway: "客胜",
    evaluationWinnerDraw: "平局",
    metricWinnerHit: "胜者命中",
    metricScoreHit: "比分命中",
    metricGoalHit: "总进球命中",
    metricGoalRangeHit: "进球区间命中",
    metricScenarioMostLikely: "最可能情景命中",
    metricScenarioAlternative: "备选情景命中",
    metricScenarioUpset: "冷门情景命中",
    metricConfidence: "置信一致性",
    metricRuleCoverage: "规则覆盖/一致",
    metricFeatureCoverage: "特征覆盖",
    metricPaperReturn: "纸面单位收益",
    confidenceCorrect: "高置信且命中",
    confidenceIncorrect: "高置信但未中",
    confidenceNotClaimed: "未主张高置信",
    reasoning: "推理",
    reasoningFlow: "证据 → 特征 → 规则 → 推荐",
    reasoningStages: {
      evidence: {
        title: "证据",
        description: "收集的比赛证据进入流水线。",
      },
      features: {
        title: "特征",
        description: "从证据中提取确定性特征。",
      },
      rules: {
        title: "规则",
        description: "每条确定性规则均按明确权重评估。",
      },
      recommendation: {
        title: "推荐",
        description: "组装供审查的人类可读推荐。",
      },
    },
    venue: "比赛场地",
    venueHint: "来自 Venue Evidence 的事实场地信息（不进入规则/投影）",
    venueId: (id: string): string => `场地 ID · ${id}`,
    noVenue: "暂无场地证据",
    referee: "裁判",
    refereeHint: "仅展示 Provider 提供的裁判事实（不做推断）",
    refereeStats: (
      appearances: number | null,
      yellow: number | null,
      red: number | null,
    ): string => {
      const parts: string[] = [];

      if (appearances !== null) {
        parts.push(`出场 ${String(appearances)}`);
      }

      if (yellow !== null) {
        parts.push(`黄牌/场 ${String(yellow)}`);
      }

      if (red !== null) {
        parts.push(`红牌/场 ${String(red)}`);
      }

      return parts.length > 0 ? parts.join(" · ") : "无统计字段";
    },
    noReferee: "暂无裁判证据",
    players: "球员基本信息",
    playersHint: "来自 Player Evidence 的阵容身份（无统计/伤病/评分）",
    playersHome: "主队球员",
    playersAway: "客队球员",
    playerNumber: (value: number): string => `号码 ${String(value)}`,
    playerId: (id: string): string => `球员 ID · ${id}`,
    noPlayers: "暂无球员证据",
    lineups: "确认阵容",
    lineupsHint: "仅展示已确认 LINEUP Evidence；绝不编造预计阵容",
    lineupsHome: "主队确认阵容",
    lineupsAway: "客队确认阵容",
    lineupConfirmed: "已确认",
    noLineups: "暂无确认阵容证据",
    advancedStatistics: "高级统计",
    advancedStatisticsHint:
      "来自 STATISTICS Evidence 的 Provider 测量值（F1.2a；不进入规则/投影）",
    noAdvancedStatistics: "暂无高级统计证据",
    statHome: "主队统计",
    statAway: "客队统计",
    statScopeFixture: "本场",
    statScopeSeason: "赛季均值",
    statNoMetrics: "高级统计对象存在，但无可展示指标。",
    statShots: "射门",
    statShotsOnTarget: "射正",
    statShotsOffTarget: "射偏",
    statPossession: "控球率",
    statCorners: "角球",
    statYellowCards: "黄牌",
    statRedCards: "红牌",
    statAttacks: "进攻",
    statDangerousAttacks: "危险进攻",
    statFouls: "犯规",
    statSaves: "扑救",
    statPassingAccuracy: "传球成功率",
    expectedGoals: "期望进球（xG）",
    expectedGoalsHint:
      "原始 EXPECTED_GOALS Evidence（Provider 测量值）。衍生 xG Features 见特征重要性；叙事仅引用 Rule 输出",
    noExpectedGoals: "暂无期望进球证据",
    xgHome: "主队 xG",
    xgAway: "客队 xG",
    xgNoMetrics: "期望进球记录存在，但无可展示指标。",
    xgWindowOverall: "总体",
    xgWindowHome: "主场",
    xgWindowAway: "客场",
    xgWindowRecent: "近期",
    xgWindowLast5: "近 5 场",
    xgWindowLast10: "近 10 场",
    xgWindowFixture: "本场",
    xgMetricXg: "xG",
    xgMetricXga: "xGA",
    xgMetricNonPenaltyXg: "非点球 xG",
    xgMetricNonPenaltyXga: "非点球 xGA",
    xgMetricExpectedPoints: "期望积分",
    xgMetricExpectedGoalDifference: "期望净胜球",
    matchContext: "比赛情境",
    matchContextHint:
      "原始 MATCH_CONTEXT Evidence（Provider 赛程/赛事事实）。衍生疲劳/赛程/轮换 Features 见特征重要性；叙事仅引用 Rule 输出",
    noMatchContext: "暂无比赛情境证据",
    contextHome: "主队情境",
    contextAway: "客队情境",
    contextNoMetrics: "情境记录存在，但无可展示指标。",
    contextRestDays: "休息天数",
    contextDaysSinceLastMatch: "距上场比赛天数",
    contextDaysUntilNextMatch: "距下场比赛天数",
    contextMatchesLast7: "近 7 日场次",
    contextMatchesLast14: "近 14 日场次",
    contextFixtureCongestion: "赛程密度（近 7 日）",
    contextHomeAway: "主客场情境",
    contextTravel: "出行情境（主客场姿态）",
    contextVenueCity: "比赛城市",
    contextCompetitionKind: "赛事类型",
    contextCompetitionType: "赛事类型标签",
    contextKnockout: "淘汰赛",
    contextRound: "轮次",
    contextLeg: "主客场回合",
    contextAggregate: "总比分",
    contextSideHome: "主场",
    contextSideAway: "客场",
    contextLegFirst: "首回合",
    contextLegSecond: "次回合",
    contextYes: "是",
    contextNo: "否",
    marketEvidence: "盘口与市场证据",
    marketEvidenceHint:
      "原始 ODDS / Market Evidence（Provider 盘口事实）。衍生 Market Intelligence Features 见特征重要性；叙事仅引用 Rule 输出；市场不覆盖 Football Intelligence",
    noMarketEvidence: "暂无盘口与市场证据",
    marketSummary: "市场摘要",
    marketNoSelectionMetrics: "市场选择记录存在，但无可展示指标。",
    marketObservedAt: "市场时间戳",
    marketSource: "市场来源",
    marketHomeOdds: "主胜赔率（当前）",
    marketDrawOdds: "平局赔率（当前）",
    marketAwayOdds: "客胜赔率（当前）",
    marketOpeningHome: "主胜开盘",
    marketOpeningDraw: "平局开盘",
    marketOpeningAway: "客胜开盘",
    marketClosingHome: "主胜收盘",
    marketClosingDraw: "平局收盘",
    marketClosingAway: "客胜收盘",
    marketOddsMovementHome: "主胜赔率变动",
    marketOddsMovementDraw: "平局赔率变动",
    marketOddsMovementAway: "客胜赔率变动",
    marketAsianLine: "亚盘盘口",
    marketAsianHomeOdds: "亚盘主队水位",
    marketAsianAwayOdds: "亚盘客队水位",
    marketAsianOpeningLine: "亚盘开盘盘口",
    marketHandicapMovement: "亚盘盘口变动",
    marketOverUnderLine: "大小球盘口",
    marketOverOdds: "大球赔率",
    marketUnderOdds: "小球赔率",
    marketOverUnderOpeningLine: "大小球开盘盘口",
    marketOverUnderLineMovement: "大小球盘口变动",
    marketPublicHomePct: "公众投注主胜占比",
    marketPublicDrawPct: "公众投注平局占比",
    marketPublicAwayPct: "公众投注客胜占比",
    marketBettingVolume: "投注量",
    marketSharpMoney: "Sharp Money 指示",
    marketTypeAsianHandicap: "亚盘",
    marketTypeEuropean1x2: "欧赔 1X2",
    marketTypeOverUnder: "大小球",
    marketSelectionHome: "主胜",
    marketSelectionDraw: "平局",
    marketSelectionAway: "客胜",
    marketSelectionAsianHome: "亚盘主队",
    marketSelectionAsianAway: "亚盘客队",
    marketSelectionOver: "大球",
    marketSelectionUnder: "小球",
    marketLine: "盘口线",
    marketOpeningValue: "开盘值",
    marketCurrentValue: "当前值",
    marketClosingValue: "收盘值",
    marketMovement: "变动",
    marketLineMovement: "盘口线变动",
    availability: "出场可用性",
    availabilityHint:
      "来自 Injury / Suspension Evidence 的可用性摘要（不进入规则/投影）",
    availabilitySummary: (injuries: number, suspensions: number): string =>
      `伤病 ${String(injuries)} · 停赛 ${String(suspensions)}`,
    availabilityInjuries: "伤病",
    availabilitySuspensions: "停赛",
    noAvailability: "暂无可用性证据",
    noAvailabilityDescription:
      "本场无 Injury / Suspension Evidence。这不表示全员可出战，也不得猜测 Unknown。",
    evidence: "证据",
    evidenceHint: "纵向时间线，含类型图标与视觉层级；显示 Provider 来源",
    evidenceSource: (providerId: string, source: string, method: string): string =>
      `来源 · ${providerId} · ${source} · ${method}`,
    noEvidence: "暂无证据",
    noEvidenceDescription: "本场比赛未返回任何证据记录。",
    step: (step: number, timestamp: string): string =>
      `步骤 ${String(step)} · ${timestamp}`,
    featureImportance: "特征重要性",
    featureImportanceHint:
      "派生特征（含 xG / 高级统计 / 比赛情境 / Market Intelligence；非原始 Evidence）——正向与负向信号以颜色区分；原始盘口见 Market Evidence 区",
    noFeatures: "暂无特征",
    noFeaturesDescription: "本场比赛未提取任何特征。",
    positive: "正向",
    negative: "负向",
    ruleEvaluation: "规则评估",
    ruleEvaluationHint: "PASS / FAIL 结果及确定性权重",
    noRules: "暂无规则",
    noRulesDescription: "本场比赛未评估任何规则。",
    weight: (value: number): string =>
      `权重 ${value >= 0 ? "+" : ""}${String(value)}`,
    finalRecommendation: "最终推荐",
    finalRecommendationHint: "由确定性报告输出组装的高级摘要",
    recommendedWinner: "推荐胜者",
    recommendedScore: "推荐比分",
    recommendedGoalRange: "推荐进球区间",
    inferenceNarrative: "推理叙述",
    developerDetails: "开发者详情",
    developerDetailsHint: "原始确定性报告 JSON — 默认隐藏",
    toggleDeveloperDetails: "切换开发者详情",
    mostLikelyScore: "最可能比分",
    goalRange: "进球区间",
    goalRangeRecommended: "推荐区间已高亮",
    recommended: "推荐",
    confidenceGauge: "置信度仪表",
    confidenceGaugeHint: (passCount: number, ruleCount: number): string =>
      `由确定性规则通过率计算的可视置信度（${String(passCount)}/${String(ruleCount)}）`,
    gauge: "仪表",
    confidenceLabel: (level: string): string => `置信度 ${level}`,
    confidenceLevel: (level: string): string => {
      switch (level) {
        case "Very High":
          return "极高";
        case "High":
          return "高";
        case "Medium":
          return "中";
        case "Low":
          return "低";
        default:
          return level;
      }
    },
  },
  library: {
    eyebrow: "分析资料库",
    heading: "分析资料库",
    reportsEyebrow: "报告",
    description: "管理每场已完成的足球分析——搜索、筛选、收藏并随时重新打开报告。",
    sidebarTitle: "资料库",
    sidebarHint: "在同一处浏览每场已完成报告。",
    sectionsAria: "分析资料库版块",
    sections: {
      recent: "近期",
      favorites: "收藏",
      competitions: "赛事",
      completed: "已完成",
      inProgress: "进行中",
      failed: "失败",
      settings: "设置",
    },
    empty: {
      favorites: {
        title: "暂无收藏",
        description: "使用心形控件标记报告，将最佳阅读保留在一键可达处。",
      },
      inProgress: {
        title: "暂无进行中项",
        description:
          "进行中的分析将在实时运行被跟踪时显示于此。已完成历史仍在「已完成」与「近期」中。",
      },
      failed: {
        title: "暂无失败报告",
        description: "失败运行出现时将显示于此。成功历史仍保留在资料库中。",
      },
      settings: {
        title: "资料库设置",
        description:
          "设置为后续产品 sprint 的占位项。报告仍可从「近期」与「已完成」访问。",
      },
      competitions: {
        title: "暂无赛事报告",
        description: "跨赛事运行分析以按联赛构建可浏览资料库。",
      },
      default: {
        title: "运行你的首次分析",
        description:
          "从比赛中心分析一场比赛。已完成报告将显示于此，便于浏览、收藏与随时重新打开。",
      },
    },
    searchPlaceholder: "搜索球队、赛事或预测…",
    searchSrOnly: "搜索报告",
    filters: {
      competition: "赛事",
      date: "日期",
      status: "状态",
      confidence: "置信度",
      favorite: "收藏",
      sort: "排序",
    },
    filterOptions: {
      allCompetitions: "全部赛事",
      allStatuses: "全部状态",
      allLevels: "全部等级",
      allReports: "全部报告",
      favoritesOnly: "仅收藏",
    },
    sort: {
      newest: "最新",
      oldest: "最早",
      highestConfidence: "置信度最高",
      competition: "赛事",
    },
    statusLabel: (status: string): string => {
      switch (status) {
        case "Completed":
          return "已完成";
        case "In Progress":
          return "进行中";
        case "Failed":
          return "失败";
        default:
          return status;
      }
    },
    evenSignal: "均衡信号",
    evidenceItems: (count: number): string =>
      count === 1 ? "1 条证据" : `${String(count)} 条证据`,
    noEvidenceSummary: "无证据摘要",
    openForFullRecommendation: "打开工作区报告查看完整推荐。",
    reportCard: {
      winnerPrediction: "胜者预测",
      confidence: "置信度",
      kickoffCreated: (kickoff: string, created: string): string =>
        `${kickoff} 开球 · 创建于 ${created} UTC`,
      openReport: "打开报告",
      favorite: "收藏",
      favorited: "已收藏",
      unfavorite: "取消收藏",
      delete: "删除",
      quickPreview: "快速预览",
      prediction: "预测",
      topEvidence: "主要证据",
      recommendation: "推荐",
      quickActions: "快捷操作",
      select: (homeTeam: string, awayTeam: string): string =>
        `选择 ${homeTeam} vs ${awayTeam}`,
      favoriteAction: (homeTeam: string, awayTeam: string): string =>
        `收藏 ${homeTeam} vs ${awayTeam}`,
      unfavoriteAction: (homeTeam: string, awayTeam: string): string =>
        `取消收藏 ${homeTeam} vs ${awayTeam}`,
    },
    bulkBar: {
      selected: (count: number): string => `已选 ${String(count)} 项`,
      clearSelection: "清除选择",
      favoriteSelected: "收藏所选",
      deleteSelected: "删除所选",
      exportSelected: "导出所选",
      exportComingLater: "导出功能即将推出",
    },
    goToMatchCenter: "前往比赛中心",
  },
  matchDetail: {
    homeTeam: "主队",
    awayTeam: "客队",
    competition: "赛事",
    kickoff: "开球",
    status: "状态",
    tabsAria: "比赛详情版块",
    tabs: {
      overview: "总览",
      evidence: "证据",
      features: "特征",
      rules: "规则",
      report: "报告",
      raw: "原始 JSON",
    },
    noEvidence: "暂无证据",
    noEvidenceDescription: "本场比赛未返回任何证据记录。",
    noFeatures: "暂无特征",
    noFeaturesDescription: "本场比赛未提取任何特征。",
    noRules: "暂无规则",
    noRulesDescription: "本场比赛未评估任何规则。",
  },
  breadcrumb: {
    aria: "面包屑导航",
  },
} as const;
