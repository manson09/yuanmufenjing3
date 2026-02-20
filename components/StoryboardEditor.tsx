import React, { useState, useEffect } from 'react';
import { Episode, Shot, KBFile, ScriptStyle } from '../types';
import { generateStoryboard, regenerateSingleShot } from '../services/storyboardService';

interface StoryboardEditorProps {
  episode: Episode;
  kb: KBFile[];
  onUpdate: (updates: Partial<Episode>) => void;
  onBack: () => void;
}

const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ episode, kb, onUpdate, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ScriptStyle>('情绪流');

  const storageId = `storyboard_sd2_${episode.title}`;

  const saveToCloud = async (shots: Shot[]) => {
    try {
      localStorage.setItem(storageId, JSON.stringify(shots));
    } catch (err) {
      console.error("存档失败:", err);
    }
  };

  useEffect(() => {
    const loadSavedWork = async () => {
      if (episode.shots && episode.shots.length > 0) return;
      try {
        const savedDataRaw = localStorage.getItem(storageId);
        if (savedDataRaw) {
          const savedData = JSON.parse(savedDataRaw);
          onUpdate({ shots: savedData, status: 'completed' });
        }
      } catch (e) {
        console.log("暂无 SeedDance 存档");
      }
    };
    loadSavedWork();
  }, [episode.title, storageId, onUpdate]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // 这里的逻辑已经由 service 内部处理了 Part1 和 Part2 的物理承接
      const shots = await generateStoryboard(episode, kb, 0, [], selectedStyle);
      onUpdate({ shots, status: 'completed' });
      await saveToCloud(shots);
    } catch (err) {
      setError('生成失败，请检查 API 或网络');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateShot = async (index: number) => {
    const target = episode.shots[index];
    const prev = index > 0 ? episode.shots[index - 1] : undefined;
    try {
      // 传递 prev 镜头，确保单镜重绘时也会生成“接前动作”说明
      const newShot = await regenerateSingleShot(episode, kb, target, prev);
      const updatedShots = [...episode.shots];
      updatedShots[index] = newShot;
      onUpdate({ shots: updatedShots });
      await saveToCloud(updatedShots);
    } catch (err) {
      alert('单镜重绘失败');
    }
  };

  const exportToWord = () => {
    if (!episode.shots || episode.shots.length === 0) return;

    const tableRows = episode.shots.map(s => `
      <tr style="background-color: ${s.shotNumber % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center; font-weight: bold;">${s.shotNumber}</td>
        <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${s.duration}</td>
        <td style="border: 1px solid #ddd; padding: 10px; color: #2563eb;"><b>${s.shotType}</b><br/>${s.movement}</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${s.visualDescription}</td>
        <td style="border: 1px solid #ddd; padding: 10px; font-size: 9pt; background-color: #f5f7ff;">
          <div style="color: #4f46e5;"><b>[SeedDance Prompt]</b><br/>${s.seedDancePrompt}</div>
          <div style="color: #ef4444; margin-top: 5px;"><b>[Negative]</b><br/>${s.negativePrompt || '无'}</div>
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
      <body style="font-family: sans-serif;">
        <h2 style="text-align: center;">SeedDance 2.0 连续分镜脚本 - ${episode.title}</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th>镜号</th><th>时间</th><th>视听语言</th><th>视觉描述</th><th>SeedDance 2.0 专用提示词</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${episode.title}_SD2分镜脚本.doc`;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a]">
      <header className="p-6 border-b border-white/5 flex justify-between items-center bg-[#141414] shadow-xl relative z-10">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              {episode.title}
              <span className="ml-3 px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] rounded uppercase border border-blue-600/30 font-black">
                SeedDance 连续生成模式
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/5 mx-4">
          {['情绪流', '非情绪流'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStyle(s as ScriptStyle)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                selectedStyle === s ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s}模式
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          {episode.shots.length > 0 && (
            <button onClick={exportToWord} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl flex items-center space-x-2 transition-all text-xs font-black border border-white/10">
              <span>导出 SD2 脚本</span>
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`px-6 py-2 rounded-xl font-black transition-all shadow-xl ${
              isGenerating ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-900/40'
            }`}
          >
            <span className="text-sm">{isGenerating ? '连续生成中...' : (episode.shots.length > 0 ? '重新规划全集' : '开始智能导演')}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {isGenerating && episode.shots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center text-gray-400">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold tracking-widest text-blue-500 uppercase text-xs">正在执行物理连续性分析与镜头组拆解...</p>
          </div>
        )}

        {episode.shots.length === 0 && !isGenerating && (
          <div className="text-center py-24 text-gray-600 flex flex-col items-center">
            <p className="font-bold text-blue-500">SeedDance 2.0 引擎就绪</p>
            <p className="text-xs mt-2 opacity-60">点击上方按钮，基于剧本生成具备动作承接关系的连续分镜</p>
          </div>
        )}

        {episode.shots.length > 0 && (
          <div className="grid grid-cols-1 gap-10 max-w-6xl mx-auto pb-10">
            {episode.shots.map((shot, idx) => (
              <div key={idx} className="bg-[#141414] rounded-3xl border border-white/5 overflow-hidden flex flex-col lg:flex-row transition-all hover:border-blue-500/30 group shadow-2xl relative">
                <div className="w-full lg:w-80 bg-black p-6 border-r border-white/5 relative aspect-video lg:aspect-square flex flex-col items-center justify-center">
                  <div className="absolute top-4 left-4 bg-blue-600 text-[10px] font-black px-3 py-1 rounded-full z-10 shadow-lg">
                    镜 #{shot.shotNumber} | {shot.duration}
                  </div>
                  
                  <button 
                    onClick={() => handleRegenerateShot(idx)}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-blue-600 text-white rounded-lg transition-colors border border-white/10 group-hover:opacity-100 opacity-0"
                    title="保持物理连续性重刷此镜"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>

                  <div className="text-center">
                    <div className="text-blue-500 text-xl font-black tracking-tighter">{shot.shotType}</div>
                    <div className="text-gray-500 text-[10px] font-black border-t border-white/5 pt-2 mt-1 uppercase tracking-widest">{shot.movement}</div>
                  </div>
                </div>
                
                <div className="flex-1 p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-black mb-2 flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                        画面描述 (Visual)
                      </h4>
                      <p className="text-base text-gray-200 leading-relaxed font-bold">{shot.visualDescription}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-black mb-1">SeedDance 正向提示词</h4>
                      <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 relative">
                        <p className="text-xs text-indigo-300/80 font-mono select-all leading-relaxed">
                          {shot.seedDancePrompt}
                        </p>
                      </div>
                    </div>
                    
                    {shot.negativePrompt && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-red-400/80 font-black mb-1">反向约束 (Negative)</h4>
                        <div className="bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                          <p className="text-[10px] text-red-300/70 font-mono select-all">
                            {shot.negativePrompt}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryboardEditor;
