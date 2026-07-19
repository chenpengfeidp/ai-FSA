/**
 * ZH-1 Chinese UI copy for chrome, Match Center, and Analysis Session.
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
} as const;
