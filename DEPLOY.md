# 部署到 GitHub Pages — 给 Jason 的剩余两步

本地一切就绪。剩下两步只能你自己做（gh token 在我这里失效了）：

## 第 1 步：登录 GitHub

打开终端（在任何目录）：

```bash
gh auth login -h github.com
```

按提示：
- `GitHub.com`
- `HTTPS`
- `Y`（用 git 凭证缓存）
- `Login with a web browser`
- 复制屏幕上的 8 位 code，浏览器自动打开 → 粘贴 → 授权

完成后跑 `gh auth status` 应该看到 `Logged in to github.com account estelledc`。

## 第 2 步：建仓库 + push

```bash
cd ~/intern-journal/explorations/embodied-ai-research

# 建公开仓库（不会自动 push）
gh repo create embodied-ai-reading-station \
  --public \
  --description "13 papers · embodied AI reading station · atelier-zero editorial style" \
  --source . \
  --remote origin

# push 主分支
git push -u origin main
```

## 第 3 步：开 GitHub Pages

```bash
# 一行开启 Pages（用 Actions workflow）
gh api -X POST repos/estelledc/embodied-ai-reading-station/pages \
  -f "build_type=workflow"
```

或者手动开：
1. 浏览器打开 `https://github.com/estelledc/embodied-ai-reading-station/settings/pages`
2. **Source** 选 **GitHub Actions**
3. 等 ~2 分钟（看 Actions tab 跑 deploy.yml）
4. 部署完，访问：
   - `https://estelledc.github.io/embodied-ai-reading-station/`

## 之后怎么更新

写新笔记 / 改 deck 后：

```bash
cd ~/intern-journal/explorations/embodied-ai-research
git add notes/llava.md   # 改了哪个就 add 哪个（不能用 git add .）
git commit -m "feat: 精读 LLaVA 第 1 段补充"
git push
```

push 完 GitHub Actions 会自动重新 build + 部署。

## 如果遇到问题

- **Actions failed**：看 https://github.com/estelledc/embodied-ai-reading-station/actions 里失败的 step。最常见是 node 版本问题——`.github/workflows/deploy.yml` 已固定 `node-version: 22`。
- **图片不显示**：检查 `papers/<slug>/images/` 目录有没有 push 上去（`.gitignore` 排除了 `*.pdf` 和 `bundle.zip`，但 `images/` 是要保留的）。如果 `git ls-files | grep images` 看不到，重新 `git add papers/<slug>/images/` 后再 push。
- **样式没刷出来**：浏览器强制刷新 ⌘+Shift+R。

---

**一切都 OK 后告诉我 URL，我会帮你把 GitHub Pages 链接写进 `intern-journal/CLAUDE.md` 工作目录地图里。**
