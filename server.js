const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 전자신문 IT 많이 본 뉴스 크롤링
app.get('/api/news', async (req, res) => {
    try {
        const url = 'https://m.etnews.com/news/section.html?id1=03';
        
        // 웹페이지 가져오기
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const newsList = [];

        // 간단하게 모든 링크를 찾아서 숫자로 시작하는 텍스트가 있는 항목 찾기
        $('a').each((index, element) => {
            const $el = $(element);
            const text = $el.text().trim();
            let link = $el.attr('href');
            
            // 숫자로 시작하는 링크 텍스트 찾기 (예: "1. SKT, 골드번호..." 또는 "_1_ SKT...")
            const rankMatch = text.match(/^[_\s]*(\d+)[_\s\.]/);
            
            if (rankMatch && text.length > 10) {
                const rank = parseInt(rankMatch[1]);
                const title = text.replace(/^[_\s]*\d+[_\s\.]/, '').trim();
                
                // 상대 경로를 절대 경로로 변환
                if (link && !link.startsWith('http')) {
                    link = link.startsWith('/') 
                        ? `https://m.etnews.com${link}` 
                        : `https://m.etnews.com/${link}`;
                }
                
                // 중복 제거 및 유효한 제목인지 확인
                if (title && title.length > 5 && 
                    !title.includes('많이 본 뉴스') && 
                    !title.includes('많이본') &&
                    !newsList.find(n => n.title === title)) {
                    newsList.push({
                        rank: rank,
                        title: title,
                        url: link || ''
                    });
                }
            }
        });
        
        // li 태그 내의 텍스트도 확인
        $('li').each((index, element) => {
            const $el = $(element);
            const text = $el.text().trim();
            const rankMatch = text.match(/^(\d+)[\.\s]/);
            
            if (rankMatch && text.length > 10) {
                const rank = parseInt(rankMatch[1]);
                const title = text.replace(/^\d+[\.\s]/, '').trim();
                let link = $el.find('a').attr('href');
                
                if (link && !link.startsWith('http')) {
                    link = link.startsWith('/') 
                        ? `https://m.etnews.com${link}` 
                        : `https://m.etnews.com/${link}`;
                }
                
                if (title && title.length > 5 && 
                    !title.includes('많이 본 뉴스') && 
                    !newsList.find(n => n.rank === rank)) {
                    newsList.push({
                        rank: rank,
                        title: title,
                        url: link || ''
                    });
                }
            }
        });

        // 랭킹 순으로 정렬
        newsList.sort((a, b) => a.rank - b.rank);
        
        // 최대 10개만 반환
        const topNews = newsList.slice(0, 10);

        if (topNews.length === 0) {
            return res.json({
                success: false,
                error: '뉴스를 찾을 수 없습니다. 웹사이트 구조가 변경되었을 수 있습니다.',
                news: []
            });
        }

        res.json({
            success: true,
            news: topNews,
            count: topNews.length
        });

    } catch (error) {
        console.error('크롤링 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message || '뉴스를 가져오는 중 오류가 발생했습니다.',
            news: []
        });
    }
});

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: '서버가 정상적으로 실행 중입니다.' });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`API 엔드포인트: http://localhost:${PORT}/api/news`);
});

