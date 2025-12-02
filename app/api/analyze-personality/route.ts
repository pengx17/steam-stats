import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GameStats {
  totalGames: number;
  playedGames: number;
  unplayedGames: number;
  totalPlaytimeHours: number;
  averagePlaytimeHours: number;
  topGenres: Array<{ name: string; hours: number; count: number }>;
  topGames: Array<{ name: string; hours: number }>;
  recentlyPlayed: number;
  oldestUnplayed: number;
  singlePlayerRatio: number;
  indieRatio: number;
  completionRate: number;
  reviews?: {
    totalReviews: number;
    reviews: Array<{
      gameName: string;
      recommended: boolean;
      reviewText: string;
      hoursPlayed: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const stats: GameStats = await request.json();

    const topGamesList = stats.topGames
      .map((g, i) => `${i + 1}. 《${g.name}》: ${g.hours}小时`)
      .join("\n");
    const topGenresList = stats.topGenres
      .map((g, i) => `${i + 1}. ${g.name}: ${g.hours}小时, ${g.count}款游戏`)
      .join("\n");

    // Format reviews if available
    let reviewsSection = "";
    if (stats.reviews && stats.reviews.reviews.length > 0) {
      const reviewsList = stats.reviews.reviews
        .map((r) => {
          const sentiment = r.recommended ? "👍 推荐" : "👎 不推荐";
          return `- 《${r.gameName}》(${
            r.hoursPlayed
          }小时) ${sentiment}\n  评测摘要: "${r.reviewText.slice(0, 100)}${
            r.reviewText.length > 100 ? "..." : ""
          }"`;
        })
        .join("\n");
      reviewsSection = `
### 玩家评测（重要！反映玩家的思维方式和表达风格）
- 评测总数：${stats.reviews.totalReviews} 篇
${reviewsList}
`;
    }

    const prompt = `你是一位资深的心理学家和游戏行为分析师，精通MBTI人格理论。请根据以下Steam游戏库数据，深度分析这位玩家的MBTI人格类型。

## 玩家游戏数据

### 基础统计
- 游戏库总数：${stats.totalGames} 款游戏
- 已游玩游戏：${stats.playedGames} 款 (${(
      (stats.playedGames / stats.totalGames) *
      100
    ).toFixed(1)}%)
- 未游玩游戏：${stats.unplayedGames} 款
- 总游戏时长：${stats.totalPlaytimeHours.toLocaleString()} 小时（约 ${Math.round(
      stats.totalPlaytimeHours / 24
    )} 天）
- 平均每款游戏时长：${stats.averagePlaytimeHours.toFixed(1)} 小时
- 最近两周活跃游戏：${stats.recentlyPlayed} 款
- 超过一年未玩的游戏：${stats.oldestUnplayed} 款
- 单机游戏占比：${(stats.singlePlayerRatio * 100).toFixed(0)}%
- 独立游戏占比：${(stats.indieRatio * 100).toFixed(0)}%

### 最常玩的游戏类型
${topGenresList}

### 游玩时间最长的游戏（重要参考）
${topGamesList}
${reviewsSection}
## 分析要求

**重要提醒**：16种MBTI类型在玩家群体中应该是多样化分布的，不要因为Steam以单机游戏为主就倾向于给出I或P的结论。请仔细分析具体游戏特征和玩家行为模式。

请基于以上数据，特别是玩家最常玩的具体游戏和评测内容，从以下四个维度深度分析该玩家的MBTI类型：

1. **E/I (外向/内向)**：
   - E倾向：喜欢多人合作/竞技游戏、社区活跃、组队游戏、直播互动型游戏、派对游戏
   - I倾向：喜欢深度单机体验、沉浸式世界探索、独自完成挑战、避免社交压力的游戏
   - 注意：玩单机游戏不代表内向，要看游戏选择的动机和风格

2. **S/N (感知/直觉)**：
   - S倾向：喜欢写实模拟、体育竞技、历史战争、细节管理、现实题材、反复练习技能的游戏
   - N倾向：喜欢奇幻科幻世界观、创意沙盒、复杂叙事、解谜探索、概念抽象的游戏
   - 注意：不是所有策略游戏都是N，精细的战术模拟可能是S

3. **T/F (思考/情感)**：
   - T倾向：注重系统优化、数值分析、效率最大化、竞技排名、策略规划
   - F倾向：注重角色情感、故事共鸣、美学体验、角色扮演代入、道德选择
   - 注意：这个维度从游戏评测的写作风格最能体现

4. **J/P (判断/感知)**：
   - J倾向：完成主义（高成就/全收集）、有计划地推进游戏、专注深耕少数游戏、遵循攻略
   - P倾向：探索式游玩、同时开多个游戏、随性切换、喜欢自由开放的玩法
   - 注意：游戏库大不代表P，要看实际游玩模式和完成度

**重要**：
- 在分析中，请务必引用玩家实际游玩的具体游戏名称作为证据支撑你的分析
- 如果有评测数据，请特别关注评测的写作风格、关注点和表达方式，这能深刻反映玩家的思维模式
- 每个维度都要独立判断，不要有预设偏见

**代表游戏选择要求**：
- 必须从玩家游戏库中选择，且必须来自**不同的游戏类型/类别**
- 例如：不能同时选择两款CRPG（如博德之门3和神界原罪2），应该选择不同类型的游戏
- 每款代表游戏都要标注其主要类型（如RPG、策略、动作、模拟、竞技等）

请用以下JSON格式回复（只回复JSON，不要其他内容）：

{
  "mbtiType": "XXXX",
  "confidence": 85,
  "dimensions": {
    "EI": { 
      "result": "E或I", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "SN": { 
      "result": "S或N", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "TF": { 
      "result": "T或F", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "JP": { 
      "result": "J或P", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    }
  },
  "personality": {
    "title": "MBTI官方人格名称（如：建筑师、冒险家、逻辑学家等）",
    "subtitle": "一句话游戏风格标语",
    "description": "3-4句话详细描述这种玩家的游戏风格和习惯，引用玩家实际玩的游戏来说明",
    "strengths": ["优势1：具体描述", "优势2：具体描述", "优势3：具体描述"],
    "weaknesses": ["弱点1：具体描述", "弱点2：具体描述"],
    "signatureGames": [
      { "name": "游戏名称", "genre": "游戏类型", "category": "主力游戏", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "近期热衷", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "隐藏宝藏", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "跨界之选", "reason": "与主要偏好不同类型的游戏，体现多样性" }
    ],
    "recommendedGenres": ["推荐尝试的游戏类型1", "推荐尝试的游戏类型2", "推荐尝试的游戏类型3"],
    "gamingStyle": {
      "playtimePattern": "描述玩家的游戏时间模式（如：深度沉浸型、广泛涉猎型等）",
      "decisionMaking": "描述玩家在游戏中的决策风格",
      "socialPreference": "描述玩家的游戏社交偏好"
    },
    "advice": "针对这位玩家的个性化建议，包括如何更好地享受游戏、避免潜在问题等，至少100字，引用其游戏库中的具体游戏给出建议"
  },
  "shareCard": {
    "tagline": "8-12字的精炼游戏风格标语，如「系统探索者」「虚拟世界建筑师」",
    "summary": "一句话总结（20-30字），解释为什么得到这个MBTI结果，要提及具体游戏",
    "highlights": ["特点1（8字内）", "特点2（8字内）", "特点3（8字内）"]
  }
}`;

    const response = await openai.responses.create({
      model: "gpt-5.1",
      instructions:
        "你是一位专业的MBTI分析师和游戏心理学专家。你的分析必须客观公正，避免刻板印象。关键原则：1) 16种MBTI类型在玩家中分布均匀，不要偏向任何特定类型；2) 玩单机游戏不等于内向，要看动机和风格；3) 游戏库大不等于P型，要看实际行为；4) 每个维度独立判断，用具体游戏证据支持。选择代表游戏时，必须确保多样性——从不同类型的游戏中各选一款。",
      input: prompt,
      text: {
        format: { type: "json_object" },
      },
    });

    const responseText = response.output_text || "";

    // JSON mode guarantees valid JSON output
    const result = JSON.parse(responseText);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing personality:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze personality",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
