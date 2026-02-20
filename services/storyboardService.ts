import OpenAI from 'openai';
import { Episode, KBFile, Shot } from "../types";

// 初始化 OpenRouter 客户端
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_BASE_URL || "https://openrouter.ai/api/v1",
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    "HTTP-Referer": "https://yuanmufenjing3.pages.dev",
    "X-Title": "Anime Master",
  }
});

const STYLE_PROMPTS = {
  '情绪流': `
【当前执行风格：情绪流（极致冲突型）】
镜头偏好：增加角色面部特写、眼神细节、颤抖的肢体。
节奏控制：在冲突爆发前，通过极细碎的慢镜头（如汗水滴落、瞳孔收缩）拉长紧张感。
视觉重点：强调光影的反差、角色的压迫感、以及环境对人物情绪的烘托（如风卷残云、雷电交加）。`,
  '非情绪流': `
【当前执行风格：非情绪流（诙谐脑洞型）】
镜头偏好：增加中景和远景以展示环境互动，利用有趣的运镜（如快速推拉、摇拍）制造节奏感。
节奏控制：强调动作的连贯性和反转，不需要过多的内心戏。
视觉重点：强调趣味性、夸张的动作曲线、人物萌版表情以及隐藏在背景里的热梗或细节等等。`
};

const STORYBOARD_PROMPT = `
你是一位世界顶级动漫爽剧导演、动作指导与剪辑设计师。
当前使用模型为【连续视频生成模型（SeedDance 2.0 类）】。

你的任务不是写小说，也不是解释剧情，而是：
**把剧本拍爽，并生成“可拼接的连续时间轴分镜脚本”。**

---

【一、生成模式（极重要）】

当前为「连续镜头组生成模式」。

整条剧情将由多个“镜头组”分别生成并拼接成一集视频。
每次输出只负责一个时间片段，而不是完整视频。

因此：

每个镜头组都是一次全新视频生成任务，
模型不会记住上一次生成的画面。

为了保证连续性，必须遵守：

1）禁止重新开始剧情
2）禁止重复已经完成的动作
3）禁止时间倒退
4）本镜头组必须承接上个镜头组的结束状态继续进行

若存在未完成动作：
下一镜头必须继续该动作，而不是重新起手。

---

【二、镜头组开头（强制）】

若为首镜头组：
从剧本开头直接开始。

若为后续镜头组：
必须先写：

【承接状态说明】：

* 上一镜头结束的画面状态
* 人物位置
* 动作进行阶段（起手/途中/即将命中/已命中）
* 当前情绪

该说明用于维持跨片段物理连续性。

---

【三、全局视频头（每个镜头组都必须写）】

在输出镜头前先输出：

【总时长】：XX秒（仅指本镜头组时长）
【主题】：一句话概括本段冲突
【风格】：2D动漫风格 / 热血爽剧 / 高情绪张力
【光影】：必须写明光源方向与色温（例：左上冷蓝主光+背部暖轮廓光）
【画质】：高清锐利，线条稳定，人物不漂移
【负面约束】：无模糊，无噪点，无扭曲，无穿帮，无多余肢体

注意：
这些信息在**每个镜头组都必须重复**，否则角色会变形或风格漂移。

---

【四、时间规则】

时间精确到1秒。

格式必须为：
镜头1（0-3秒）

规则：

* 时间连续
* 不允许跳秒
* 不允许“片刻后/突然”

---

【五、连续性规则（核心）】

视频是连续时间流。

若上一镜头动作未完成：
下一镜头必须承接该动作的当前阶段。

正确：
镜头3：拳头挥至半程
镜头4：切被击者视角，拳头逼近面部

错误：
镜头3：挥拳
镜头4：再次挥拳

---

【六、爽点导演系统（最高优先级）】

分镜以“情绪节奏”优先于对话顺序。

当剧情出现以下元素，立即进入爽点模式：
嘲讽 / 羞辱 / 看不起 / 退婚 / 威压 / 围观 / 身份暴露 / 后悔 / 恐惧 / 崩溃

所有爽点必须遵循五段式：
1 铺垫
2 压迫
3 停顿（必须有0.5~1秒安静镜头）
4 爆发
5 余波

爽点镜头数量增加30~100%，单镜头时长缩短。

禁止一镜带过。

---

【七、经典爽点分镜模板】

打脸：
反派嘲讽特写 → 群像窃笑 → 主角沉默 → 细微动作特写 → 停顿 → 出手 → 表情崩裂 → 跪地 → 全场安静 → 补刀

身份反转：
异常安静 → 权威物件特写 → 群像逐级震惊 → 确认 → 跪地 → 主角远景

战力碾压：
敌人先出招 → 主角静止 → 手指/衣角特写 → 一击结束 → 敌人慢半拍倒地 → 群像震惊

修罗场：
眼神对峙 → 表情切换 → 空气凝固环境镜头 → 无对白压迫

---

【八、镜头语言规则】

远景：空间关系与压迫
中景：互动与位移
近景：情绪
特写：爽点瞬间

切镜必须有理由：
焦点变化 / 情绪变化 / 权力变化 / 威胁升级

---

【九、动作拆解规则】

禁止写：
“攻击”“打斗”“交手”

必须写清：
肢体部位 + 运动轨迹 + 接触点 + 物理反馈

例：
腰部扭转带动肩部，手臂加速前摆，拳面压缩空气，命中面部产生形变，衣物与头发被冲击波掀起。

---

【十、对白规则】

长对白必须切镜：
语义变化
情绪变化
对方反应

允许反应特写、肩后镜头。
优先用表情表达，而非台词。

【十一、单镜头信息限制】

每个镜头只允许一个信息点：
空间 / 威胁 / 动作 / 命中 / 结果 / 情绪

若包含多个 → 必须拆镜。

【十二、多人镜头】

仅允许用于：
首次对峙
数量压迫
命中瞬间
身份揭示

打斗过程优先单主体镜头。

【十三、输出格式（必须严格遵守）】

【总时长】XX秒
【主题】……
【风格】……
【光影】……
【画质】……
【负面约束】……

镜头1（0-3秒）：【景别】，【运镜】，【画面内容与具体动作】
镜头2（3-6秒）：【景别】，【运镜】，【画面内容与具体动作】
……

拍完剧本文字立即停止，禁止擅自收尾。

`;

/**
 * SeedDance 2.0 专属解析器
 * 完美匹配新的 types.ts 结构
 */
function parseSeedDanceText(rawText: string, startShotNumber: number = 1): Shot[] {
  const shots: Shot[] = [];
  
  // 1. 提取大模型生成的【全局光影/画风/约束】
  const styleMatch = rawText.match(/【风格】(.*?)(?=\n|$)/);
  const lightMatch = rawText.match(/【光影】(.*?)(?=\n|$)/);
  const qualityMatch = rawText.match(/【画质】(.*?)(?=\n|$)/);
  const negMatch = rawText.match(/【负面约束】(.*?)(?=\n|$)/);

  const globalStyle = styleMatch ? styleMatch[1].trim() : "2D动漫风格";
  const globalLight = lightMatch ? lightMatch[1].trim() : "";
  const globalQuality = qualityMatch ? qualityMatch[1].trim() : "高清锐利，人物不漂移";
  const negativePrompt = negMatch ? negMatch[1].trim() : "模糊，噪点，扭曲，穿帮，多余肢体";

  const lines = rawText.split('\n');
  
  // 2. 正则表达式：精准抓取【时间】、【景别】、【运镜】、【画面内容】
  const shotRegex = /^镜头\s*\d+\s*[（(](.*?)[)）]\s*[：:]\s*(?:【(.*?)】)?\s*[,，]?\s*(?:【(.*?)】)?\s*[,，]?\s*(.*)/;

  let currentShotIndex = startShotNumber;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith("镜头")) continue;

    const match = trimmedLine.match(shotRegex);
    if (match) {
      const duration = match[1] || "";             // 提取 (0-3秒)
      const shotType = match[2] || "中景";         // 提取景别
      const movement = match[3] || "固定";         // 提取运镜
      const visualDesc = match[4] || trimmedLine;  // 提取画面内容

      // 3. 将全局设定和当前动作组装成终极 SeedDance Prompt
      const promptParts = [globalStyle, globalLight, globalQuality, shotType, movement, visualDesc].filter(Boolean);
      const finalPrompt = promptParts.join("，");

      shots.push({
        shotNumber: currentShotIndex++, 
        duration: duration,
        shotType: shotType,
        movement: movement,
        visualDescription: visualDesc,
        dialogue: "", 
        emotion: "",  
        seedDancePrompt: finalPrompt,      // 正向提示词（光影+动作）
        negativePrompt: negativePrompt     // 反向提示词（防崩约束）
      });
    }
  }

  return shots;
}

async function fetchWithStream(messages: any[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "google/gemini-3-pro-preview",
    messages: messages,
    stream: true,
  });
  let fullContent = "";
  for await (const chunk of response) {
    fullContent += chunk.choices[0]?.delta?.content || "";
  }
  return fullContent;
}

export async function generateStoryboard(
  episode: Episode,
  kb: KBFile[],
  batchIndex: number = 0,
  previousShots: Shot[] = [],
  style: ScriptStyle = '情绪流'
): Promise<Shot[]> {
  if (batchIndex > 0) return [];

  const fullScript = episode.script.trim();
  const kbContext = kb.length > 0
    ? `【视觉设定参考（仅限查外貌，严禁看剧情）】：\n${kb.map(f => f.content).join('\n').slice(0, 8000)}`
    : "（暂无）";

  const lines = fullScript.split('\n').filter(l => l.trim().length > 0);
  const midIndex = Math.floor(lines.length / 2);
  const scriptPart1 = lines.slice(0, midIndex).join('\n');
  const scriptPart2 = lines.slice(midIndex).join('\n');
  const pivotLine = lines[midIndex - 1]; // 第一阶段的最后一行

  try {
    console.log("🚀 [第一阶段] 全局分析高潮分布，生成前半段分镜...");
    const rawContent1 = await fetchWithStream([
      { role: "system", content: STORYBOARD_PROMPT + (STYLE_PROMPTS[style] || "") },
      { role: "system", content: kbContext },
      { 
        role: "user", 
        content: `【本集完整目标剧本（仅供节奏识别参考）】：\n${fullScript}\n\n【当前具体任务】：请仅针对上述剧本的【前半部分内容】生成第一个镜头组。请严格按照要求输出【总时长】等全局信息，以及“镜头1（X-X秒）：【景别】，【运镜】，【画面内容】”的文本格式。\n\n【待处理前半段内容】：\n${scriptPart1}`
      }
    ]);

    const shotsPart1 = parseSeedDanceText(rawContent1, 1);
    const p1Count = shotsPart1.length;
    // 获取最后一镜的画面内容，作为 SeedDance 的【承接状态说明】
    const p1EndDesc = shotsPart1[p1Count - 1]?.visualDescription || "画面平稳结束";

    console.log(`✅ P1 已生成 ${p1Count} 镜。开始硬隔离生成 P2...`);

    // --- 第二阶段：硬隔离，注入承接状态，防回溯 ---
    const rawContent2 = await fetchWithStream([
      { role: "system", content: STORYBOARD_PROMPT + (STYLE_PROMPTS[style] || "") },
      { role: "system", content: kbContext },
      { 
        role: "user", 
        content: `【承接状态说明】（极其重要，用于维持 SeedDance 跨片段物理连续性）：
* 上一镜头结束的画面状态与动作：${p1EndDesc}

【场记记录 - 绝对红线】：
1. 剧本文字 “${pivotLine}” 已拍摄完毕。
2. 绝对禁止重新开始剧情或让时间倒退。

【当前目标任务】：
请补齐剩余分镜。你必须从接下来的文字开始生成，作为第二个镜头组。
请严格输出全局信息和格式。首个镜头编号必须标为 ${p1Count + 1}。

【待处理后半部分剧本】：\n${scriptPart2}` 
      }
    ]);

    const shotsPart2 = parseSeedDanceText(rawContent2, p1Count + 1);
    const allShots = [...shotsPart1, ...shotsPart2];

    // 应用 SeedDance 的动作承接逻辑
    return allShots.map((shot, index) => {
      const prev = allShots[index - 1];
      return injectActionCarryover(shot, prev);
    }).slice(0, 60);

  } catch (err) {
    console.error("分镜生成中断:", err);
    throw err;
  }
}

function injectActionCarryover(currentShot: Shot, prevShot?: Shot): Shot {
  if (!prevShot) return currentShot;
  
  const isOngoing = currentShot.visualDescription.includes("接前") || currentShot.visualDescription.includes("接上");
  const carryoverText = `【承接上镜动作：${prevShot.visualDescription}】 `;

  return {
    ...currentShot,
    visualDescription: isOngoing ? currentShot.visualDescription : `【接上镜状态】${currentShot.visualDescription}`,
    seedDancePrompt: isOngoing ? currentShot.seedDancePrompt : `${carryoverText}${currentShot.seedDancePrompt}`
  };
}

export type ScriptStyle = '情绪流' | '非情绪流';

export async function regenerateSingleShot(
  episode: Episode,
  kb: KBFile[],
  shotToRegenerate: Shot,
  previousShot?: Shot
): Promise<Shot> {
  const carryOverContext = previousShot 
    ? `【承接状态说明】：上一镜内容为“${previousShot.visualDescription}”`
    : `【承接状态说明】：这是本集首个镜头`;

  const raw = await fetchWithStream([
    { role: "system", content: STORYBOARD_PROMPT },
    { role: "user", content: `${carryOverContext}\n\n重新设计第 ${shotToRegenerate.shotNumber} 镜。请严格按照“镜头X（X-X秒）：【景别】，【运镜】，【内容】”的纯文本格式输出，严禁擅自续写后续剧情。` }
  ]);
  
  const parsedShots = parseSeedDanceText(raw, shotToRegenerate.shotNumber);
  const newShotData = parsedShots.length > 0 ? parsedShots[0] : shotToRegenerate;
  
  return injectActionCarryover(newShotData, previousShot);
}
