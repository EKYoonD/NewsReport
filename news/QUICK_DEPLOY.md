# 빠른 배포 가이드 (2분 완료)

## 방법 1: Netlify (가장 간단) ⭐ 추천

1. **https://www.netlify.com** 접속
2. "Sign up" 클릭 → GitHub 계정으로 로그인 (또는 이메일로 가입)
3. 메인 페이지에서 **"Add new site"** > **"Deploy manually"** 클릭
4. 다음 파일들을 드래그 앤 드롭:
   - `index.html`
   - `news.js`
5. 자동으로 배포 완료! 
6. 제공된 URL로 접속 (예: `https://random-name-123.netlify.app`)

**완료!** 이제 누구나 접속할 수 있습니다.

---

## 방법 2: GitHub Pages (무료, 영구)

### 단계별 가이드:

1. **GitHub 저장소 만들기**
   - https://github.com 접속 후 로그인
   - 우측 상단 "+" 버튼 > "New repository"
   - 저장소 이름 입력 (예: `it-news-analysis`)
   - **Public** 선택
   - "Create repository" 클릭

2. **파일 업로드**
   
   **옵션 A: 웹에서 직접 업로드 (간단)**
   - 저장소 페이지에서 "uploading an existing file" 클릭
   - `index.html`과 `news.js` 파일을 드래그 앤 드롭
   - "Commit changes" 클릭

   **옵션 B: Git 명령어 사용**
   ```bash
   git init
   git add index.html news.js
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/사용자명/저장소명.git
   git push -u origin main
   ```

3. **GitHub Pages 활성화**
   - 저장소 페이지에서 **"Settings"** 탭 클릭
   - 왼쪽 메뉴에서 **"Pages"** 클릭
   - Source: **"Deploy from a branch"** 선택
   - Branch: **`main`** 선택, Folder: **`/ (root)`** 선택
   - **"Save"** 클릭

4. **접속**
   - 1-2분 후 `https://사용자명.github.io/저장소명/` 접속
   - 예: `https://username.github.io/it-news-analysis/`

---

## 배포 후 확인사항

✅ 웹사이트가 정상적으로 로드되는지 확인
✅ 뉴스 크롤링이 작동하는지 확인
✅ 워드클라우드가 표시되는지 확인

---

## 문제 해결

- **뉴스가 로드되지 않음**: CORS 프록시 서비스가 일시적으로 다운되었을 수 있습니다. 잠시 후 다시 시도하세요.
- **페이지가 404 에러**: GitHub Pages는 몇 분 걸릴 수 있습니다. 5분 정도 기다린 후 다시 시도하세요.

