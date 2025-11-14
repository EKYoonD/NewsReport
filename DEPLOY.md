# 배포 가이드

## 빠른 배포 (5분 안에 완료)

### 방법 1: GitHub Pages (추천)

1. **GitHub 저장소 만들기**
   - https://github.com 접속 후 로그인
   - 우측 상단 "+" > "New repository"
   - 저장소 이름 입력 (예: `it-news-analysis`)
   - Public 선택 후 생성

2. **파일 업로드**
   - 저장소 페이지에서 "uploading an existing file" 클릭
   - 다음 파일들을 드래그 앤 드롭:
     - `index.html`
     - `news.js`
   - "Commit changes" 클릭

3. **Pages 활성화**
   - 저장소 Settings > Pages
   - Source: `Deploy from a branch`
   - Branch: `main` / Folder: `/ (root)`
   - Save 클릭

4. **완료!**
   - 1-2분 후 `https://사용자명.github.io/저장소명/` 접속

### 방법 2: Netlify (가장 간단)

1. https://www.netlify.com 접속
2. GitHub 계정으로 로그인
3. "Add new site" > "Deploy manually"
4. `index.html`과 `news.js` 드래그 앤 드롭
5. 즉시 배포 완료!

## 필요한 파일

배포에 필요한 파일:
- ✅ `index.html` (메인 HTML 파일)
- ✅ `news.js` (JavaScript 로직)
- ❌ `test.html` (로컬 테스트용, 배포 불필요)
- ❌ `server.js`, `package.json` (서버 불필요, 클라이언트만 작동)

## 주의사항

- CORS 프록시 서비스에 의존하므로 일부 사이트는 접근이 제한될 수 있습니다
- 무료 프록시 서비스는 사용량 제한이 있을 수 있습니다

