# 오션(OCEAN) 성격 검사

Big Five(OCEAN) 모델 기반의 무료 온라인 성격 검사. 50문항 · 5점 척도로 응답하면
5가지 특성 백분위, 성격 유형(아키타입), 종합 분석(강점·블라인드 스팟)을 담은
프로필을 만들어 줍니다. 결과는 이미지로 저장할 수 있습니다.

## 특징

- **50문항 검사** — 공개 도메인 IPIP Big-Five Factor Markers(Goldberg) 기반
- **결과 프로필** — 오각형 레이더 차트 + 유형(예: The Executor · 유형 C) + 특성별 해석
- **이미지 저장** — 결과를 PNG로 내려받기 (html2canvas)
- **토스 스타일 UI** — 토스 블루 팔레트, 커스텀 SVG 아이콘, 반응형

## 실행

빌드 불필요. `index.html`을 브라우저로 열면 됩니다. 로컬 서버로 띄우려면:

```bash
node server.js   # http://localhost:4173
```

## 구조

```
index.html          랜딩 · 검사 · 결과 3화면
styles.css          디자인(토스 블루 테마)
app.js              진행 · 채점 · 결과 렌더 · 이미지 저장
data/questions.js   50문항 + 5개 특성 정의
data/archetypes.js  유형 판정 · 종합 분석 생성
vendor/             html2canvas (이미지 저장)
```

> 본 검사는 참고용 진단이며 전문적인 심리 상담을 대체하지 않습니다.
