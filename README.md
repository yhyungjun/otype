# 유형도감 (TypeDex)

나를 설명하는 모든 유형, 한 곳에. 여러 유형 테스트를 골라 응시하고,
로그인 계정에 저장된 결과를 "내 도감"에 모아 보는 정적 사이트(바닐라 JS + Supabase)입니다.

## 테스트

- **otype 성격 검사** — 5축(Big Five) 50문항. 공개 도메인 IPIP Big-Five Factor Markers(Goldberg) 기반
- **MBTI 유형 검사** — 4개 이분축 32문항(원작 문항, 공식 MBTI®와 별개)
- **진짜 MBTI 찾기** — 알던 MBTI vs 진짜 MBTI, A/B 양자택일 32문항
- **에겐·테토 기질 테스트** — 2축 4유형 20문항

## 기능

- **허브 홈** — 레지스트리의 테스트를 카드로 나열, 카드 클릭으로 응시
- **내 도감** — 내 결과 목록 · 테스트별 필터 · 상세 수치 · 비교 · 이미지 저장 · 삭제
- **공유** — 결과별 공유 링크(`share.html?id=`), 친구 결과 대시보드
- **로그인** — 카카오 · 구글(Supabase Auth)

## 실행

빌드 불필요. 로컬 서버로 띄우려면:

```bash
node server.js   # http://localhost:4173
```

## 구조

```
index.html / hub.js        허브 홈
test.html / test-runner.js 공용 러너(인트로 · 문항 · 결과 · 저장)
me.html / me.js            내 도감
share.html / share.js      공유된 결과
dashboard.html / dashboard.js  친구 결과 대시보드
tests/<id>/                테스트 모듈(questions · types/archetypes · module)
tests/registry.js          테스트 레지스트리
assets/                    로고 · 아이콘 · OG 이미지
```

> 본 검사들은 참고용 진단이며 전문적인 심리 상담을 대체하지 않습니다.
