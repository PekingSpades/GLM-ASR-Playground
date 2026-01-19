# GLM-ASR-Playground

基于 [智谱 GLM-ASR API](https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E8%AF%AD%E9%9F%B3%E8%BD%AC%E6%96%87%E6%9C%AC) 的实时语音转写演示应用。支持上传音频、麦克风录音或屏幕音频捕获，实时展示增量结果与分段定稿。

**[在线演示](https://pekingspades.github.io/GLM-ASR-Playground/)** | **[English](./README.md)**

![Demo](./public/demo.gif)

## 功能特性

- **多种音频输入**
  - 上传音频文件（WAV、MP3）
  - 麦克风录音
  - 屏幕音频捕获（需浏览器支持）

- **实时转写**
  - 增量预览 + 分段定稿
  - 可配置分段时长和请求间隔

- **开发者工具**
  - 请求/响应可视化调试
  - 多轨时间轴
  - 弹出式字幕窗口（BroadcastChannel API）

- **Mock 模式**
  - 无需 API Key 也可体验界面

## 技术栈

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [Tailwind CSS](https://tailwindcss.com/) 4
- TypeScript

## 快速开始

### 环境要求

- Node.js 18+
- npm / yarn / pnpm

### 安装

```bash
git clone https://github.com/PekingSpades/GLM-ASR-Playground.git
cd GLM-ASR-Playground
npm install
```

### 开发

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

### 构建

```bash
npm run build
```

### 静态导出（GitHub Pages）

项目已配置静态导出。构建完成后，静态文件位于 `out` 目录。
若仓库名不同，请同步修改 `next.config.ts` 中的 `basePath` 和 `assetPrefix`。

## 使用说明

1. **获取 API Key**：在 [智谱开放平台](https://open.bigmodel.cn/) 注册并获取 API Key。
2. **输入 API Key**：在设置面板中粘贴。密钥仅保存在本地，并只会发送到智谱的 API。
3. **选择音频来源**：
   - 点击“上传”选择音频文件
   - 点击“麦克风”录制麦克风
   - 点击“屏幕”捕获系统音频（需浏览器支持）
4. **开始转写**：点击播放按钮开始实时转写。
5. **查看结果**：
   - 已定稿文本为蓝色
   - 预览文本（当前分段）为灰色
   - 使用时间轴定位分段
   - 点击“字幕”打开弹出式字幕窗口

## 配置项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| 分段时长 | 10s | 分段定稿前的持续时间 |
| Chunk 间隔 | 200ms | 推理请求的发送间隔 |
| 模型 | GLM-ASR-2512 | 使用的智谱 ASR 模型 |

## API 参考

本项目使用 [智谱 GLM-ASR API](https://docs.bigmodel.cn/api-reference/%E6%A8%A1%E5%9E%8B-api/%E8%AF%AD%E9%9F%B3%E8%BD%AC%E6%96%87%E6%9C%AC)。

## 相关项目

- [GLM-ASR](https://github.com/zai-org/GLM-ASR) - 官方 GLM-ASR 模型仓库
- [GLM-ASR-Nano-2512](https://huggingface.co/zai-org/GLM-ASR-Nano-2512) - Hugging Face 上的模型

## 路线图

- [ ] **VAD（语音活动检测）** - 基于语音检测的智能分段，在自然停顿处切分而非固定间隔
- [ ] **滑动窗口** - 音频片段重叠处理，减少分段边界识别误差

## 许可证

本项目基于 MIT 许可证开源，详见 [LICENSE](LICENSE)。

## 致谢

- [智谱 AI](https://www.zhipuai.cn/) 提供 GLM-ASR API
- [Next.js](https://nextjs.org/) 团队提供框架支持
