# IT 뉴스 분석

전 세계 IT 보안 뉴스를 통합 분석하고 주요 키워드를 시각화하는 웹 애플리케이션입니다.

## 기능

- **다중 뉴스 소스 크롤링**
  - 한국어: 보안뉴스, 데일리시큐, 전자신문
  - 영어: Dark Reading, Cyberscoop, KrebsOnSecurity
- **Top 10 뉴스 표시**: 각 소스별 인기 뉴스 상위 10개
- **워드클라우드**: 한글/영어 키워드를 분리하여 시각화 (상위 30개)
- **고유명사 중심 키워드 추출**: 기술 용어, 회사명, 제품명 등 우선 추출

## 배포 방법

### GitHub Pages (가장 간단하고 추천)

1. **GitHub 저장소 생성**
   - [GitHub](https://github.com)에 로그인
   - 우측 상단 "+" 버튼 > "New repository" 클릭
   - 저장소 이름 입력 (예: `it-news-analysis`)
   - Public 선택
   - "Create repository" 클릭

2. **파일 업로드**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/사용자명/저장소명.git
   git push -u origin main
   ```
   
   또는 GitHub 웹사이트에서 직접 파일을 드래그 앤 드롭으로 업로드

3. **GitHub Pages 활성화**
   - 저장소 페이지에서 "Settings" 탭 클릭
   - 왼쪽 메뉴에서 "Pages" 클릭
   - Source: `Deploy from a branch` 선택
   - Branch: `main` 선택, Folder: `/ (root)` 선택
   - "Save" 클릭

4. **접속**
   - 몇 분 후 `https://사용자명.github.io/저장소명/` 에서 접속 가능
   - 예: `https://username.github.io/it-news-analysis/`

5. **로컬 변경사항 반영하기**
   - 로컬에서 파일을 수정한 후 다음 명령어로 GitHub에 업로드:
   ```bash
   git add .
   git commit -m "변경 내용 설명"
   git push
   ```
   - GitHub Pages는 자동으로 업데이트됩니다 (1-2분 소요)
   - **참고**: `test.html`을 수정했다면 `index.html`도 동일하게 업데이트해야 합니다

### Netlify (드래그 앤 드롭으로 간단하게)

1. [Netlify](https://www.netlify.com/) 가입 (GitHub 계정으로 간단하게)
2. 메인 페이지에서 "Add new site" > "Deploy manually" 클릭
3. `index.html`, `news.js` 파일을 드래그 앤 드롭
4. 자동으로 배포 완료! URL 제공됨

### Vercel

1. [Vercel](https://vercel.com/) 가입
2. "Add New..." > "Project" 클릭
3. GitHub 저장소 연결 또는 파일 업로드
4. 자동 배포 완료

## 로컬 실행

단순히 `test.html` 파일을 브라우저에서 열면 됩니다. 서버가 필요 없습니다.

## 기술 스택

- HTML5 / CSS3
- Vanilla JavaScript
- WordCloud2.js
- CORS Proxy (api.allorigins.win 등)

## 주의사항

- CORS 프록시 서비스에 의존하므로 일부 사이트는 접근이 제한될 수 있습니다
- 뉴스 사이트의 HTML 구조 변경 시 파싱 로직 수정이 필요할 수 있습니다
