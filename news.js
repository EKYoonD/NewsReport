// DOM 요소
const refreshBtn = document.getElementById('refreshBtn');
const newsContent = document.getElementById('newsContent');
const lastUpdate = document.getElementById('lastUpdate');
const wordcloudKorean = document.getElementById('wordcloud-korean');
const wordcloudEnglish = document.getElementById('wordcloud-english');

// 뉴스 소스 정의
const NEWS_SOURCES = {
    korean: [
        { name: '보안뉴스', url: 'https://www.boannews.com', topUrl: 'https://www.boannews.com/media/t_list.asp' },
        { name: '데일리시큐', url: 'https://www.dailysecu.com', topUrl: 'https://www.dailysecu.com/news/articleList.html' },
        { name: '전자신문', url: 'https://m.etnews.com/news/section.html?id1=03', topUrl: 'https://m.etnews.com/news/section.html?id1=03' }
    ],
    english: [
        { name: 'Dark Reading', url: 'https://www.darkreading.com', topUrl: 'https://www.darkreading.com' },
        { name: 'Cyberscoop', url: 'https://www.cyberscoop.com', topUrl: 'https://www.cyberscoop.com' },
        { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com', topUrl: 'https://krebsonsecurity.com' }
    ]
};

// CORS 프록시 목록 (여러 개 시도)
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
];

// 현재 선택된 소스 (null이면 전체)
let selectedSource = null;

// 전체 뉴스 데이터 저장 (키워드 필터링용)
let allNewsData = [];

// 워드클라우드 데이터 저장 (리사이즈 시 재렌더링용)
let wordCloudData = {
    korean: null,
    english: null
};

// 모든 뉴스 로드
async function loadNews(sourceName = null) {
    selectedSource = sourceName; // 현재 선택된 소스 저장
    refreshBtn.disabled = true;
    newsContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>뉴스를 불러오는 중...</p>
        </div>
    `;

    try {
        const allNews = [];
        const allTexts = [];

        // 특정 소스만 로드하거나 전체 로드
        const sourcesToLoad = sourceName 
            ? [...NEWS_SOURCES.korean, ...NEWS_SOURCES.english].filter(s => s.name === sourceName)
            : [...NEWS_SOURCES.korean, ...NEWS_SOURCES.english];

        // 모든 뉴스 소스에서 크롤링
        const errors = [];
        for (const source of sourcesToLoad) {
            try {
                console.log(`${source.name} 크롤링 시작...`);
                const news = await crawlNews(source);
                console.log(`${source.name}에서 ${news.length}개 뉴스 발견`);
                
                if (news.length > 0) {
                    allNews.push(...news);
                    
                    // 제목과 본문에서 텍스트 추출
                    for (const item of news) {
                        if (item.title) allTexts.push(item.title);
                        if (item.content) allTexts.push(item.content);
                    }
                } else {
                    errors.push(`${source.name}: 뉴스를 찾을 수 없음`);
                }
            } catch (err) {
                console.error(`${source.name} 크롤링 실패:`, err);
                errors.push(`${source.name}: ${err.message}`);
            }
        }

        if (allNews.length === 0) {
            const errorMsg = errors.length > 0 
                ? `모든 뉴스 소스에서 뉴스를 불러올 수 없습니다.\n${errors.join('\n')}`
                : '뉴스를 불러올 수 없습니다. 네트워크 연결을 확인해주세요.';
            throw new Error(errorMsg);
        }

        // 전체 뉴스 데이터 저장 (키워드 필터링용)
        if (!sourceName) {
            allNewsData = allNews;
        }
        
        displayNews(allNews, sourceName);
        
        // 전체 로드일 때만 워드클라우드 생성
        if (!sourceName) {
            generateWordCloud(allTexts);
        }
        
        updateLastUpdate();
        
    } catch (error) {
        console.error('뉴스 로드 오류:', error);
        displayError(error.message);
    } finally {
        refreshBtn.disabled = false;
    }
}

// 프록시를 통해 URL 가져오기 (여러 프록시 시도, UTF-8 인코딩 보장)
async function fetchWithProxy(url) {
    let lastError = null;
    
    for (const proxy of CORS_PROXIES) {
        try {
            let proxyUrl;
            if (proxy.includes('allorigins.win')) {
                proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            } else if (proxy.includes('codetabs.com')) {
                proxyUrl = `${proxy}${url}`;
            } else {
                proxyUrl = `${proxy}${url}`;
            }
            
            // 타임아웃 처리
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Charset': 'UTF-8',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // 사이트별 인코딩 처리
            let html;
            const contentType = response.headers.get('content-type') || '';
            
            // 사이트별 인코딩 우선순위 설정
            let encodings = [];
            if (url.includes('boannews.com')) {
                // 보안뉴스: EUC-KR 우선
                encodings = ['euc-kr', 'windows-949', 'utf-8'];
            } else if (url.includes('dailysecu.com')) {
                // 데일리시큐: UTF-8 우선
                encodings = ['utf-8', 'euc-kr', 'windows-949'];
            } else if (url.includes('etnews.com')) {
                // 전자신문: UTF-8 우선
                encodings = ['utf-8', 'euc-kr', 'windows-949'];
            } else {
                // 영어 사이트는 기본 text() 사용
                html = await response.text();
            }
            
            // 한국 사이트는 blob으로 받아서 인코딩 시도
            if (encodings.length > 0) {
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                let decoded = false;
                
                for (const enc of encodings) {
                    try {
                        const decoder = new TextDecoder(enc, { fatal: false });
                        html = decoder.decode(arrayBuffer);
                        // 한글이 제대로 디코딩되었는지 확인 (더 엄격한 검증)
                        const koreanCharCount = (html.match(/[가-힣]/g) || []).length;
                        const totalCharCount = html.length;
                        const koreanRatio = koreanCharCount / totalCharCount;
                        
                        // 한글 비율이 0.01 이상이고, 깨진 문자()가 적으면 성공
                        const brokenCharCount = (html.match(/\uFFFD/g) || []).length; // 문자 개수
                        if (koreanRatio > 0.01 && html.length > 100 && brokenCharCount < totalCharCount * 0.1) {
                            decoded = true;
                            console.log(`${url} 인코딩 성공: ${enc} (한글 비율: ${(koreanRatio * 100).toFixed(2)}%)`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (!decoded) {
                    // 마지막 시도: UTF-8
                    const decoder = new TextDecoder('utf-8', { fatal: false });
                    html = decoder.decode(arrayBuffer);
                    console.log(`${url} 인코딩 실패, UTF-8로 강제 변환`);
                }
            }
            
            // HTML에 charset이 없으면 추가 (DOMParser를 위해)
            if (html && !html.includes('charset=')) {
                if (html.includes('<head>')) {
                    html = html.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">');
                } else if (html.includes('<html')) {
                    html = html.replace(/<html([^>]*)>/i, '<html$1><head><meta charset="UTF-8"></head>');
                }
            }
            
            // 기존 charset 메타 태그를 UTF-8로 강제 변경
            html = html.replace(/<meta[^>]*charset\s*=\s*["']?[^"'>\s]+["']?[^>]*>/gi, '');
            if (html.includes('<head>')) {
                html = html.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">');
            }
            
            if (!html || html.length < 100) {
                throw new Error('HTML 응답이 비어있거나 너무 짧습니다');
            }
            
            return html;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`프록시 ${proxy} 타임아웃`);
            } else {
                console.log(`프록시 ${proxy} 실패:`, error.message);
            }
            lastError = error;
            continue; // 다음 프록시 시도
        }
    }
    
    throw lastError || new Error('모든 프록시 실패');
}

// 개별 뉴스 사이트 크롤링
async function crawlNews(source) {
    try {
        const url = source.topUrl || source.url;
        console.log(`${source.name} 크롤링 시작: ${url}`);
        const html = await fetchWithProxy(url);
        console.log(`${source.name} HTML 받음 (길이: ${html.length})`);
        
        const newsList = await parseNews(html, source);
        
        console.log(`${source.name} 파싱 결과: ${newsList.length}개`);
        if (newsList.length > 0) {
            console.log(`${source.name} 첫 번째 뉴스:`, newsList[0].title);
        }
        
        // 본문 크롤링은 선택적으로 (너무 느릴 수 있으므로)
        // 최대 3개만 빠르게 시도
        const contentPromises = [];
        for (let i = 0; i < Math.min(newsList.length, 3); i++) {
            if (newsList[i].url && newsList[i].url !== source.url) {
                contentPromises.push(
                    fetchArticleContent(newsList[i].url)
                        .then(content => {
                            if (content) newsList[i].content = content;
                        })
                        .catch(err => {
                            console.log(`${newsList[i].title} 본문 크롤링 실패:`, err.message);
                        })
                );
            }
        }
        
        // 본문 크롤링은 백그라운드에서 진행 (기다리지 않음)
        Promise.all(contentPromises).catch(() => {});
        
        return newsList;
    } catch (error) {
        console.error(`${source.name} 크롤링 오류:`, error);
        return [];
    }
}

// 기사 본문 크롤링
async function fetchArticleContent(url) {
    try {
        const html = await fetchWithProxy(url);
        
        // HTML에 charset이 명시되어 있는지 확인하고 없으면 추가
        if (!html.includes('charset=') && !html.includes('charset =')) {
            html = html.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">');
        }
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 본문 선택자 (사이트별로 다를 수 있음)
        const contentSelectors = [
            'article', '.article-content', '.post-content', 
            '.entry-content', '.news-content', '#articleBody',
            'main', '.content', 'p'
        ];
        
        for (const selector of contentSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const text = element.textContent.trim();
                if (text.length > 100) {
                    return text;
                }
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// HTML 파싱하여 뉴스 추출 (사이트별 정확한 선택자 사용)
async function parseNews(html, source) {
    const newsList = [];
    
    // HTML에 charset이 명시되어 있는지 확인하고 없으면 추가
    if (!html.includes('charset=') && !html.includes('charset =')) {
        html = html.replace(/<head([^>]*)>/i, '<head$1><meta charset="UTF-8">');
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const seenTitles = new Set();
    const seenUrls = new Set();
    
    // 사이트별 특정 선택자 우선 시도
    let articles = [];
    
    try {
        if (source.name === '보안뉴스') {
            // 보안뉴스: .list_title a 또는 .news_list a
            articles = doc.querySelectorAll('.list_title a, .news_list a, .article_list a, a[href*="/media/view"], a[href*="/media/t_list"]');
            console.log(`${source.name} 선택자 결과: ${articles.length}개`);
            if (articles.length === 0) {
                articles = doc.querySelectorAll('a[href*="/media/"]');
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        } else if (source.name === '데일리시큐') {
            // 데일리시큐: .article-list a 또는 .title a
            articles = doc.querySelectorAll('.article-list a, .title a, .article-title a, a[href*="/news/article"]');
            console.log(`${source.name} 선택자 결과: ${articles.length}개`);
            if (articles.length === 0) {
                articles = doc.querySelectorAll('a[href*="/news/article"], a[href*="/news/"]');
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        } else if (source.name === '전자신문') {
            // 전자신문: 숫자로 시작하는 제목 찾기
            const allLinks = doc.querySelectorAll('a, li');
            allLinks.forEach(el => {
                const text = el.textContent.trim();
                const rankMatch = text.match(/^[_\s]*(\d+)[\.\s_]+(.+)/);
                if (rankMatch && parseInt(rankMatch[1]) <= 10) {
                    const title = rankMatch[2].trim();
                    if (title.length >= 10) {
                        articles.push({ element: el, title: title });
                    }
                }
            });
            console.log(`${source.name} 순위 매칭 결과: ${articles.length}개`);
            if (articles.length < 5) {
                const links = doc.querySelectorAll('a[href*="/news/"], .news-list a, .article-list a');
                articles = Array.from(links);
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        } else if (source.name === 'Dark Reading') {
            // Dark Reading: article 내부의 링크
            articles = doc.querySelectorAll('article a, .article-title a, h2 a, h3 a, a[href*="/attacks-breaches"], a[href*="/vulnerabilities-threats"], a[href*="/risk"]');
            console.log(`${source.name} 선택자 결과: ${articles.length}개`);
            if (articles.length === 0) {
                articles = doc.querySelectorAll('a[href*="/attacks-breaches"], a[href*="/vulnerabilities-threats"], a[href*="/risk"], a[href*="/"]');
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        } else if (source.name === 'Cyberscoop') {
            // Cyberscoop: article 내부의 링크
            articles = doc.querySelectorAll('article a, .article-title a, .headline a, h2 a, h3 a, a[href*="/news"], a[href*="/article"]');
            console.log(`${source.name} 선택자 결과: ${articles.length}개`);
            if (articles.length === 0) {
                articles = doc.querySelectorAll('a[href*="/news"], a[href*="/article"], a[href*="/"]');
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        } else if (source.name === 'KrebsOnSecurity') {
            // KrebsOnSecurity: article 내부의 링크
            articles = doc.querySelectorAll('article a, .entry-title a, .post-title a, h2 a, main a');
            console.log(`${source.name} 선택자 결과: ${articles.length}개`);
            if (articles.length === 0) {
                articles = doc.querySelectorAll('article a, main a, a[href*="/20"]');
                console.log(`${source.name} 대체 선택자 결과: ${articles.length}개`);
            }
        }
    } catch (e) {
        console.error(`${source.name} 선택자 오류:`, e);
    }
    
    // 파싱 실행
    for (const item of articles) {
        if (newsList.length >= 10) break;
        
        let element, title, href;
        
        if (item.element) {
            // 전자신문처럼 이미 파싱된 경우
            element = item.element;
            title = item.title;
            href = element.getAttribute('href') || element.querySelector('a')?.getAttribute('href') || '';
        } else {
            // 일반 링크 요소
            element = item;
            title = element.textContent.trim();
            href = element.getAttribute('href') || '';
        }
        
        // 제목 정제 (HTML 태그 제거, 공백 정리)
        title = title.replace(/<[^>]*>/g, '').trim();
        title = title.replace(/\s+/g, ' ');
        
        // 기본 필터링
        if (!title || title.length < 10 || title.length > 200) continue;
        if (title.includes('http://') || title.includes('https://')) continue;
        if (title.includes('target=') || title.includes('href=') || title.includes('class=')) continue;
        if (title.includes('javascript:') || title.includes('onclick=')) continue;
        if (seenTitles.has(title)) continue;
        
        // 링크 처리
        if (href && !href.startsWith('http')) {
            const baseUrl = source.url.replace(/\/$/, '');
            href = href.startsWith('/') 
                ? `${baseUrl}${href}` 
                : `${baseUrl}/${href}`;
        }
        
        if (!href || href === source.url || href.includes('javascript:') || seenUrls.has(href)) continue;
        
        // 유효한 뉴스 링크인지 확인
        const validPatterns = [
            '/news/', '/article/', '/post/', '/media/', '/view/', 
            '/attacks-breaches', '/vulnerabilities-threats', '/risk',
            '/20' // 날짜 포함 링크
        ];
        const isValidLink = validPatterns.some(pattern => href.includes(pattern));
        
        if (!isValidLink && newsList.length >= 5) continue; // 최소 5개는 보장
        
        seenTitles.add(title);
        seenUrls.add(href);
        
        newsList.push({
            source: source.name,
            title: title,
            url: href,
            content: null
        });
    }
    
    // 결과가 부족하면 더 넓은 범위로 시도
    if (newsList.length < 5) {
        console.log(`${source.name} 파싱 결과 부족 (${newsList.length}개), 추가 시도...`);
        const allLinks = doc.querySelectorAll('a');
        console.log(`${source.name} 전체 링크 수: ${allLinks.length}개`);
        
        for (const link of allLinks) {
            if (newsList.length >= 10) break;
            
            let title = link.textContent.trim();
            title = title.replace(/<[^>]*>/g, '').trim();
            title = title.replace(/\s+/g, ' ');
            
            let href = link.getAttribute('href') || '';
            
            // 기본 필터링 (더 관대하게)
            if (!title || title.length < 10 || title.length > 200) continue;
            if (title.includes('http://') || title.includes('https://')) continue;
            if (title.includes('javascript:') || title.includes('onclick=')) continue;
            if (seenTitles.has(title)) continue;
            
            if (href && !href.startsWith('http')) {
                const baseUrl = source.url.replace(/\/$/, '');
                href = href.startsWith('/') 
                    ? `${baseUrl}${href}` 
                    : `${baseUrl}/${href}`;
            }
            
            if (!href || href === source.url || href.includes('javascript:') || seenUrls.has(href)) continue;
            
            // 뉴스 관련 링크인지 확인 (더 넓은 범위)
            const newsPatterns = ['/news/', '/article/', '/post/', '/media/', '/view/', '/story/', '/content/'];
            const isNewsLink = newsPatterns.some(pattern => href.includes(pattern));
            
            // 최소 5개는 보장하기 위해 패턴이 없어도 추가
            if (isNewsLink || newsList.length < 5) {
                seenTitles.add(title);
                seenUrls.add(href);
                newsList.push({
                    source: source.name,
                    title: title,
                    url: href,
                    content: null
                });
            }
        }
        console.log(`${source.name} fallback 후 결과: ${newsList.length}개`);
    }

    console.log(`${source.name} 최종 파싱 결과: ${newsList.length}개`);
    return newsList.slice(0, 10);
}

// 뉴스 표시 함수
function displayNews(newsList, sourceName, customTitle = null) {
    if (!newsList || newsList.length === 0) {
        newsContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <p>표시할 뉴스가 없습니다.</p>
            </div>
        `;
        return;
    }

    // 사이드바 활성 상태 업데이트
    updateSidebarActive(sourceName);

    // 소스별로 그룹화
    const groupedNews = {};
    newsList.forEach(news => {
        if (!groupedNews[news.source]) {
            groupedNews[news.source] = [];
        }
        groupedNews[news.source].push(news);
    });

    let newsHTML = '';
    
    // 전체 보기일 때 - 카드 그리드 레이아웃
    if (!sourceName) {
        newsHTML = '<div class="news-grid">';
        for (const [source, items] of Object.entries(groupedNews)) {
            newsHTML += `
                <div class="news-card" onclick="loadNews('${source}')">
                    <div class="news-card-header">${source}</div>
                    <div class="news-card-body">
                        ${items.slice(0, 5).map((news, index) => `
                            <div class="news-card-item" onclick="event.stopPropagation(); openNews('${news.url}')">
                                <span class="news-card-rank">${index + 1}</span>
                                <span class="news-card-title">${escapeHtml(news.title)}</span>
                            </div>
                        `).join('')}
                        ${items.length > 5 ? `<div style="text-align: center; margin-top: 10px; color: #64748b; font-size: 0.85rem;">+ ${items.length - 5}개 더 보기</div>` : ''}
                    </div>
                </div>
            `;
        }
        newsHTML += '</div>';
    } else {
        // 특정 소스만 보기 - 리스트 레이아웃
        const items = groupedNews[sourceName] || [];
        const displayTitle = customTitle || `${sourceName} Top 10`;
        newsHTML = `
            <div class="back-button" onclick="loadNews()">
                ← 전체 보기
            </div>
            <h3 style="color: #1e40af; margin: 20px 0 20px 0; font-size: 1.5rem; font-weight: 700;">${displayTitle}</h3>
            <ul class="news-list">
                ${items.map((news, index) => `
                    <li class="news-item" onclick="openNews('${news.url}')">
                        <span class="news-rank">${index + 1}</span>
                        <span class="news-title">${escapeHtml(news.title)}</span>
                        ${news.url ? `<br><a href="${news.url}" target="_blank" class="news-link" onclick="event.stopPropagation()">기사 보기 →</a>` : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }

    newsContent.innerHTML = newsHTML;
}

// 사이드바 활성 상태 업데이트
function updateSidebarActive(sourceName) {
    const items = document.querySelectorAll('.source-list-item');
    items.forEach(item => {
        item.classList.remove('active');
        const text = item.textContent.trim();
        if ((!sourceName && text === '전체 보기') || 
            (sourceName && text === sourceName)) {
            item.classList.add('active');
        }
    });
}

// 워드클라우드 생성
function generateWordCloud(texts) {
    if (!texts || texts.length === 0) return;

    // 키워드 추출 및 한글/영어 분리
    const { korean, english } = extractKeywords(texts);
    
    // 워드클라우드 데이터 저장 (리사이즈 시 재렌더링용)
    wordCloudData.korean = korean.slice(0, 30);
    wordCloudData.english = english.slice(0, 30);
    
    // 한글 워드클라우드 생성
    if (korean.length > 0) {
        createWordCloud(wordcloudKorean, korean.slice(0, 30), 'korean');
        // 키워드 목록도 표시 (클릭 가능)
        createKeywordList('korean', korean.slice(0, 30));
    }
    
    // 영어 워드클라우드 생성
    if (english.length > 0) {
        createWordCloud(wordcloudEnglish, english.slice(0, 30), 'english');
        // 키워드 목록도 표시 (클릭 가능)
        createKeywordList('english', english.slice(0, 30));
    }
}

// 키워드 목록 생성 (클릭 가능)
function createKeywordList(type, keywords) {
    const container = document.querySelector(`#wordcloud-${type}`).parentElement;
    
    // 기존 키워드 목록 제거
    const existingList = container.querySelector('.keyword-list');
    if (existingList) {
        existingList.remove();
    }
    
    // 키워드 목록 생성
    const keywordList = document.createElement('div');
    keywordList.className = 'keyword-list';
    keywordList.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; display: flex; flex-wrap: wrap; gap: 8px;';
    
    keywords.forEach(item => {
        const keywordTag = document.createElement('span');
        keywordTag.textContent = item.word;
        keywordTag.style.cssText = `
            background: #eff6ff;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #dbeafe;
        `;
        keywordTag.addEventListener('mouseenter', function() {
            this.style.background = '#dbeafe';
            this.style.transform = 'scale(1.05)';
        });
        keywordTag.addEventListener('mouseleave', function() {
            this.style.background = '#eff6ff';
            this.style.transform = 'scale(1)';
        });
        keywordTag.addEventListener('click', function() {
            filterNewsByKeyword(item.word);
        });
        keywordList.appendChild(keywordTag);
    });
    
    container.appendChild(keywordList);
}

// 키워드로 뉴스 필터링
function filterNewsByKeyword(keyword) {
    if (!keyword || allNewsData.length === 0) return;
    
    // 키워드가 포함된 뉴스 필터링 (제목 또는 본문)
    const filteredNews = allNewsData.filter(news => {
        const titleMatch = news.title && news.title.toLowerCase().includes(keyword.toLowerCase());
        const contentMatch = news.content && news.content.toLowerCase().includes(keyword.toLowerCase());
        return titleMatch || contentMatch;
    }).slice(0, 10); // 최대 10개
    
    if (filteredNews.length === 0) {
        alert(`"${keyword}" 키워드가 포함된 뉴스를 찾을 수 없습니다.`);
        return;
    }
    
    // 필터링된 뉴스 표시
    displayNews(filteredNews, null, `"${keyword}" 관련 뉴스`);
}

// 개별 워드클라우드 생성 함수
function createWordCloud(canvas, keywords, type) {
    if (!canvas || keywords.length === 0) return;

    // 캔버스 크기 고정 (고해상도)
    const dpr = window.devicePixelRatio || 1;
    let rect = canvas.getBoundingClientRect();
    
    // 명시적인 크기 설정 (CSS에서 설정한 크기 사용)
    // getBoundingClientRect()가 0을 반환할 수 있으므로 최소값 보장
    // 화면 너비를 넘지 않도록 제한
    const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    const maxWidth = Math.min(containerWidth - 50, window.innerWidth - 100); // 여유 공간 확보
    
    // rect.width가 0이면 CSS에서 설정한 크기 사용
    let fixedWidth = rect.width;
    if (fixedWidth === 0 || isNaN(fixedWidth)) {
        // CSS에서 width: 100%로 설정되어 있으므로 부모 컨테이너 크기 사용
        fixedWidth = containerWidth > 0 ? containerWidth - 50 : 500;
    }
    fixedWidth = Math.min(Math.max(fixedWidth, 300), maxWidth); // 최소 300px, 최대 화면 너비
    const fixedHeight = 400; // CSS에서 설정한 고정 높이
    
    // 캔버스 실제 크기 (고해상도)
    canvas.width = fixedWidth * dpr;
    canvas.height = fixedHeight * dpr;
    
    // 캔버스 표시 크기 (CSS 크기 유지)
    canvas.style.width = fixedWidth + 'px';
    canvas.style.height = fixedHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, fixedWidth, fixedHeight);

    // WordCloud2 형식으로 변환
    const wordList = keywords.map(item => [item.word, item.weight]);
    
    // 빈도수 범위 확인 (디버깅용)
    if (wordList.length > 0) {
        const weights = wordList.map(item => item[1]);
        const maxWeight = Math.max(...weights);
        const minWeight = Math.min(...weights);
        console.log(`${type} 키워드 빈도수 범위: ${minWeight} ~ ${maxWeight}`);
    }

    try {
        WordCloud(canvas, {
            list: wordList,
            gridSize: Math.round(4 * dpr), // 여백 줄이기: 8 -> 4
            weightFactor: function(size) {
                // 빈도수 차이를 명확히 하기 위해 제곱 적용 (영어는 더 강하게)
                if (type === 'english') {
                    return Math.pow(size, 1.3) * 35 * dpr; // 영어는 제곱 적용하여 차이 명확히
                } else {
                    return size * 25 * dpr; // 한글은 선형
                }
            },
            fontFamily: type === 'korean' 
                ? 'Malgun Gothic, 맑은 고딕, sans-serif'
                : 'Arial, sans-serif',
            color: function() {
                const colors = ['#1976d2', '#1565c0', '#0d47a1', '#2196F3', '#42a5f5', '#64b5f6'];
                return colors[Math.floor(Math.random() * colors.length)];
            },
            rotateRatio: 0.3,
            rotationSteps: 2,
            backgroundColor: 'transparent',
            minSize: 10 * dpr, // 최소 크기 조정 (빈도수 차이 명확히)
            drawOutOfBound: false,
            click: function(item) {
                // WordCloud2의 click 콜백: item은 [word, size, x, y] 형태
                if (item && item.length > 0 && item[0]) {
                    console.log('클릭된 키워드:', item[0]);
                    filterNewsByKeyword(item[0]);
                }
            }
        });
        
        // 캔버스에 클릭 이벤트 추가
        canvas.style.cursor = 'pointer';
        
        // WordCloud2의 click 콜백이 모든 단어에서 작동하도록 보장
        // WordCloud2는 내부적으로 단어 위치를 추적하므로 click 콜백이 자동으로 작동해야 함
        // 하지만 추가로 클릭 이벤트 리스너를 추가하여 확실하게 처리
        canvas.addEventListener('click', function(e) {
            // WordCloud2의 click 콜백이 먼저 처리되도록 함
            // 만약 click 콜백이 작동하지 않으면 여기서 처리
            console.log('캔버스 클릭 이벤트 발생');
        }, true); // capture phase에서 처리
    } catch (error) {
        console.error(`${type} 워드클라우드 생성 오류:`, error);
    }
}

// 키워드 추출 (한글/영어 분리) - 일반 명사 중심 (고유명사 제외)
function extractKeywords(texts) {
    const koreanWords = {};
    const englishWords = {};
    
    // 확장된 불용어 목록
    const stopWords = new Set([
        // 영어 불용어
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her', 'him',
        'not', 'no', 'all', 'each', 'every', 'some', 'any', 'many', 'much', 'more', 'most', 'other', 'such', 'only', 'very', 'also', 'even', 'just', 'still', 'yet', 'already', 'now', 'then', 'here', 'there', 'where', 'when', 'what', 'which', 'who', 'why', 'how',
        'new', 'old', 'good', 'bad', 'big', 'small', 'large', 'long', 'short', 'high', 'low', 'first', 'last', 'next', 'previous', 'same', 'different', 'important', 'recent', 'latest',
        'said', 'says', 'according', 'report', 'reports', 'news', 'article', 'articles', 'story', 'stories', 'data', 'information', 'system', 'systems', 'company', 'companies', 'organization', 'organizations',
        // 한국어 불용어
        '이', '가', '을', '를', '에', '의', '와', '과', '도', '로', '으로', '에서', '부터', '까지', '한', '한다', '하다', '하는', '된', '된다', '되다', '되는', '이다', '있다', '없다', '것', '수', '등', '및', '또한', '또', '그리고', '하지만', '그러나', '그런데', '그래서', '그러면', '그렇지만', '그러므로', '그런', '그', '저', '이것', '저것', '그것', '이런', '저런', '그런', '이렇게', '저렇게', '그렇게',
        '때문', '위해', '대해', '관련', '통해', '따라', '따른', '따름', '경우', '때문', '이유', '원인', '결과', '과정', '방법', '내용', '문제', '해결', '개선', '향상', '증가', '감소', '변화', '발생', '진행', '실시', '추진', '확인', '발표', '공개', '제공', '지원', '개발', '연구', '조사', '분석', '검토', '검증', '평가', '판단', '결정', '선택', '사용', '활용', '적용', '도입', '시작', '종료', '완료', '성공', '실패', '중요', '필요', '가능', '불가능', '확실', '불확실', '명확', '불명확',
        '새로운', '기존', '최근', '최신', '과거', '현재', '미래', '앞으로', '이후', '이전', '동안', '이후', '이전', '다음', '이번', '저번', '다음', '첫', '마지막', '전체', '일부', '모든', '각', '여러', '많은', '적은', '큰', '작은', '높은', '낮은', '좋은', '나쁜', '중요한', '필요한', '가능한', '불가능한',
        '기사', '뉴스', '보도', '발표', '공개', '확인', '알려', '밝혀', '말하', '설명', '전달', '제시', '제안', '요청', '요구', '주장', '강조', '지적', '비판', '우려', '경고', '경고', '예상', '예측', '전망', '기대', '희망', '우려', '걱정'
    ]);

    texts.forEach(text => {
        if (!text) return;
        
        // 한글 추출 - 일반 명사 중심 (2-4자 우선, 의미 있는 단어만)
        const koreanMatches = text.match(/[가-힣]+/g);
        if (koreanMatches) {
            koreanMatches.forEach(word => {
                // 2-4자 단어만 추출 (일반 명사 위주)
                if (word.length >= 2 && word.length <= 4 && !stopWords.has(word)) {
                    // 의미 없는 조합 필터링 (예: "제출", "냅" 등)
                    // 한글 자모가 이상하게 조합된 경우 제외
                    const koreanPattern = /^[가-힣]{2,4}$/;
                    if (koreanPattern.test(word)) {
                        // 너무 짧거나 의미 없는 단어 제외
                        let shouldInclude = true;
                        if (word.length === 2) {
                            const commonITWords = ['보안', '데이터', '시스템', '공격', '정보', '기술', '서비스', '플랫폼', '클라우드', '모바일', '인터넷', '디지털', '사이버', '해킹', '악성', '코드', '프로그램', '소프트웨어', '하드웨어', '서버', '데이터베이스'];
                            if (!commonITWords.includes(word)) {
                                // 빈도수가 높은 경우만 포함 (2회 이상)
                                if ((koreanWords[word] || 0) < 2) {
                                    shouldInclude = false;
                                }
                            }
                        }
                        
                        if (shouldInclude) {
                            koreanWords[word] = (koreanWords[word] || 0) + 1;
                        }
                    }
                }
            });
        }
        
        // 영어 단어 추출 - 소문자로 시작하는 일반 명사만 (대문자로 시작하는 고유명사 제외)
        // 원본 텍스트에서 대문자로 시작하는 단어를 제외하기 위해 먼저 제거
        const textWithoutProperNouns = text.replace(/\b[A-Z][a-z]+\b/g, '');
        
        const englishMatches = textWithoutProperNouns.toLowerCase()
            .replace(/[^a-z\s]/g, ' ')
            .split(/\s+/)
            .filter(word => {
                if (word.length < 4) return false; // 최소 4자 이상
                if (stopWords.has(word)) return false;
                if (/^\d+$/.test(word)) return false;
                if (!/^[a-z]+$/.test(word)) return false;
                
                // 특정 의미 없는 단어만 명시적으로 제외
                const invalidWords = ['kinx', 'httptroy', 'linktext', 'networksfirms'];
                if (invalidWords.includes(word)) return false;
                
                // 모음이 전혀 없는 단어만 제외 (4자 이상인 경우)
                if (word.length >= 4 && !/[aeiou]/.test(word)) return false;
                
                // 연속된 자음이 4개 이상인 경우만 제외 (너무 엄격하지 않게)
                if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(word)) return false;
                
                return true;
            });
            
        englishMatches.forEach(word => {
            englishWords[word] = (englishWords[word] || 0) + 1;
        });
    });

    // 빈도순으로 정렬
    const korean = Object.entries(koreanWords)
        .map(([word, count]) => ({ word, weight: count }))
        .sort((a, b) => b.weight - a.weight);
        
    const english = Object.entries(englishWords)
        .map(([word, count]) => ({ word, weight: count }))
        .sort((a, b) => b.weight - a.weight);

    return { korean, english };
}

// 에러 표시 함수
function displayError(message) {
    newsContent.innerHTML = `
        <div class="error">
            <strong>오류 발생</strong>
            <p>${escapeHtml(message)}</p>
            <p style="margin-top: 10px; font-size: 0.9rem;">
                페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>
        </div>
    `;
}

// HTML 이스케이프 (UTF-8 안전)
function escapeHtml(text) {
    if (!text) return '';
    // textContent를 사용하면 자동으로 HTML 엔티티 변환 및 UTF-8 처리
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// 뉴스 열기
function openNews(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

// 마지막 업데이트 시간 업데이트
function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    lastUpdate.textContent = `마지막 업데이트: ${timeString}`;
}

// 페이지 로드 시 뉴스 불러오기
// 윈도우 리사이즈 시 워드클라우드 재렌더링
let resizeTimeout;
let isResizing = false;
window.addEventListener('resize', () => {
    isResizing = true;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // 브라우저가 레이아웃을 완료한 후 재렌더링
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // 워드클라우드 데이터가 있으면 재렌더링
                if (wordCloudData.korean && wordCloudData.korean.length > 0) {
                    createWordCloud(wordcloudKorean, wordCloudData.korean, 'korean');
                }
                if (wordCloudData.english && wordCloudData.english.length > 0) {
                    createWordCloud(wordcloudEnglish, wordCloudData.english, 'english');
                }
                isResizing = false;
            });
        });
    }, 500); // 500ms 디바운스 (더 길게)
});

window.addEventListener('DOMContentLoaded', () => {
    loadNews();
});

// 5분마다 자동 새로고침
setInterval(() => {
    if (!selectedSource) {
        loadNews();
    }
}, 5 * 60 * 1000);
