# Stat Eleven

브라우저에서 바로 플레이하는 텍스트·데이터 중심 축구 매니지먼트 시뮬레이션 (MVP)

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입 체크 + 프로덕션 빌드
```

## 폴더 구조
```
src/
├─ types.ts               # 핵심 데이터 타입 (Player, Tactics, MatchResult, LeagueState ...)
├─ engine/
│  ├─ matchEngine.ts      # 팀 전력 프로필 · 전술 상성 · 1분 단위 90분 시뮬레이션 · 평점/MVP
│  ├─ ratings.ts          # OVR, 포지션 적합도, 시장가치, 라벨/색상
│  └─ league.ts           # 더블 라운드로빈 일정, 순위표, 시즌 상금
├─ data/
│  ├─ formations.ts       # 4-3-3 / 4-4-2 / 3-5-2 / 4-2-3-1 슬롯 좌표
│  ├─ generators.ts       # 선수 생성기 (가상 이름 풀, 포지션별 능력치 편향)
│  └─ initialData.ts      # 초기 16인 스쿼드, AI 9개 팀, 시즌 진화
├─ store/gameStore.ts     # Zustand + persist(localStorage) · 모든 게임 액션
├─ components/ui.tsx      # Card, Btn, Segmented, PlayerCard, Toast ...
└─ pages/                 # Dashboard · SquadTactics · Recruit · MatchSim · League
```

## 엔진 요약
- **팀 프로필**: 슬롯 역할 × 포지션 적합도(100/85/70/45%) × 컨디션으로 공격·중원·수비·GK·스피드 산출
- **전술 보정**: 압박/빌드업/템포/라인 → 점유 가중치, 찬스 빈도/질, 패스 성공률, 체력 소모, 파울
- **상성**: 전방 압박 vs 짧은 빌드업, 롱볼 vs 높은 라인(스피드 차 반영), 낮은 라인 vs 롱볼, 3-5-2 vs 스리톱 등
- **분 단위 루프**: 체력 감소 → 점유 → 패스 → 찬스(블록/유효/선방/골) → 파울(경고/퇴장 시 전력 감소)
- 결과는 킥오프 시점에 전부 계산되고 UI는 타임라인을 1배속/4배속으로 재생 (진행 중 경기도 저장됨)
