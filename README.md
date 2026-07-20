# 팔딱 (Project Nupchi)

수조 사진 한 장으로 넙치(광어) 질병을 조기에 탐지하는 양식장 관리 앱입니다. 사진을 촬영하면 AI가
사진 속 넙치 개체를 각각 찾아 증상 부위 검출과 질병 분류를 수행하고, 수조 단위 위험 등급(양호/의심/경고)을
판정합니다. 위험 수조에는 공신력 자료 기반 대응 보고서를 제공합니다.

> 제주 바이오 AX 해커톤 MVP. AI 진단은 **참고치**이며 확진이 아닙니다. 최종 판단과 조치는
> 관리자·수의사의 책임입니다.

<img width="1206" height="678" alt="IMG_0524" src="https://github.com/user-attachments/assets/877e9a0b-2958-4e8d-bff9-878b909cd7a5" />

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [핵심 사용자 흐름](#2-핵심-사용자-흐름)
3. [등급 체계](#3-등급-체계)
4. [시스템 아키텍처](#4-시스템-아키텍처)
5. [화면 구성](#5-화면-구성)
6. [기술 스택](#6-기술-스택)
7. [백엔드 연동 계약](#7-백엔드-연동-계약)
8. [프로젝트 구조](#8-프로젝트-구조)
9. [실행](#9-실행)
10. [환경변수](#10-환경변수)
11. [검증](#11-검증)
12. [배포](#12-배포)
13. [관련 저장소·문서](#13-관련-저장소문서)

---

## 1. 서비스 개요

넙치 양식은 VHS(바이러스성출혈성패혈증)·스쿠티카병·연쇄구균증 등 질병 피해가 크지만, 초기 병변을
육안으로 상시 감지하기 어렵습니다. 팔딱은 이 점검을 **사진 1장 → 수 초 내 AI 판독**으로 대체합니다.

- **다개체 판독**: 수조 사진에서 넙치 N마리를 각각 검출하고, 개체마다 증상 부위(궤양·출혈·종양 등 5종)
  검출과 질병(VHS·스쿠티카·연쇄구균증 등 7종) 분류를 수행합니다.
- **수조 단위 경보**: 개체 판독을 종합해 수조 등급을 산정하고, 홈/수조 목록에서 위험 수조를 바로
  보여줍니다. 같은 취수·배수 계통(수조군)의 수조에는 연계 주의 표시를 합니다.
- **대응 보고서**: 의심 이상 수조에 대해 국립수산과학원 등 공신력 자료를 근거로 인용한 조치 보고서
  (현황 요약·위험도·우선순위별 조치·근거)를 생성합니다.
- **무로그인 단일 어가 MVP**: 로그인 없이 고정 어가(예: 제주 성산 광어양식장) 하나를 사용합니다.
  인증·다중 어가는 범위 밖입니다.

## 2. 핵심 사용자 흐름

```text
수조 등록/편집 ─► 촬영 탭에서 수조 선택 ─► 촬영 또는 갤러리 선택
                                              │
                                              ▼
                            POST /diagnose (Cloud Run AI 판독 + 저장)
                                              │
                                              ▼
        분석 결과 화면: 수조 등급 · 개체별 crop 이미지 · 증상 박스 · 질병 진단 요약
                                              │
                          (의심/경고일 때) POST /guide 후속 호출
                                              ▼
                  AI 대응 제안 화면: 현황 · 위험도 · 조치 목록 · 근거 인용
```

- 진단 결과는 서버(Supabase)에 저장되며, 수조 상세의 **점검 내역**에서 과거 판독을 다시 볼 수 있습니다.
  이력의 개체 crop 이미지는 비공개 Storage에서 signed URL로 다시 불러옵니다.
- 진단 요청마다 앱이 `request_id`(UUID)를 생성해 보냅니다. 네트워크 재시도 시에도 같은 결과가
  반환되고 중복 저장되지 않습니다(멱등).

## 3. 등급 체계

| 단위 | 등급 | 앱 표기 | 조건 |
| --- | --- | --- | --- |
| 개체 `fish[].grade` | `normal` | 양호 | 증상·질병 신호 없음 |
| | `suspect` | 의심 | 증상 검출 **또는** 질병 분류 고신뢰 |
| 수조 `overallGrade` | `normal` | 양호 | 의심 개체 0마리 |
| | `suspect` | 의심 | 의심 개체 ≥ 1마리, 비율 < 30% |
| | `warning` | 경고 | 의심 개체 비율 ≥ 30% |

- 개체는 2단계, 수조는 3단계입니다. 등급 계산은 전부 서버가 수행하며, 프론트는 서버가 준
  `fishCount`·`suspectCount`·`affectedRatio`·`overallGrade`·`fish`를 그대로 표시합니다.
- 서버 판정은 증상 검출기(정밀)와 질병 분류기 고신뢰(안전망)를 결합한 하이브리드입니다. 질병
  신뢰도(퍼센트)는 분류기 과신 경향 때문에 응답에 노출되지 않으며, 앱도 표시하지 않습니다.
- 정상 개체는 근거(`detections`/`diseases`)가 빈 배열로 옵니다. 약한 증상 박스가 '양호' 개체에
  표시되는 혼란을 막기 위한 서버 정책입니다.

## 4. 시스템 아키텍처

프론트는 **진단은 Cloud Run API로 보내고, 이력·최신 등급은 Supabase에서 직접 읽습니다.**

```text
팔딱 앱 (Expo React Native · iOS / Web)
  │
  ├─ 진단 ──► Cloud Run Inference API (FastAPI)
  │             ├─ Roboflow Workflow: 넙치 개체 인스턴스 세그멘테이션 (N마리)
  │             ├─ YOLOv8 ONNX: 개체 crop 증상 부위 5종 검출
  │             ├─ VGG16 ONNX: 개체 crop 질병 7종 다중 분류
  │             ├─ 등급 종합 → Supabase 저장 (사진 · 개체 crop · ai_results)
  │             └─ /guide: RAG(pgvector + Voyage) + Claude 대응 보고서
  │
  └─ 조회 ──► Supabase (anon key + RLS, 읽기 전용)
                ├─ tank_latest_grade 뷰: 수조별 최신 등급 (홈/수조 카드 배지)
                ├─ ai_results: 판독 이력 (개체별 fish JSON 포함)
                └─ Storage fish-photos: 개체 crop signed URL (이력 재표시)
```

- **쓰기 권한 분리**: 사진·AI 결과 생성은 Cloud Run(service key)만 담당합니다. 프론트의 anon 키는
  RLS로 어가·수조 조회 및 수조 추가·수정만 가능하며, service key는 앱 번들에 절대 넣지 않습니다.
- **즉시 표시 vs 이력**: 진단 직후 개체 이미지는 응답의 `cropDataUri`(base64)로 즉시 표시하고,
  이력 조회 시에는 저장된 `cropPath`를 signed URL로 해석해 표시합니다(실패 시 원본 사진 fallback).
- **mock 모드**: API 주소가 없거나 `EXPO_PUBLIC_USE_MOCK_API=true`면 `src/data/sample-aquaculture.json`
  기반 목 API로 동작해 서버 없이 개발·데모가 가능합니다.

## 5. 화면 구성

라우트는 `src/app`(Expo Router)에 있습니다.

| 화면 | 라우트 | 내용 |
| --- | --- | --- |
| 홈 | `(tabs)/index` | 오늘의 수조 상태 요약. 이상 수조 발견 시 등급·개수 헤드라인 |
| 수조 목록 | `(tabs)/tank-status` | 수조별 최신 등급 카드(양호/의심/경고 배지) |
| 수조 상세 | `tank/[tankId]` | 수조 정보 · 점검 내역(진단 이력 카드) · 이 수조 촬영하기 |
| 수조 추가/편집 | `add-tank` | 수조 ID · 수조군(취수·배수 계통) · 입식 정보 · 활성 여부 |
| 촬영 | `camera` | 수조 선택 → 카메라 촬영 또는 갤러리 선택 → 분석 요청 |
| 분석 결과 | `result/[resultId]` | 수조 등급 · 개체별 crop · 증상 박스(bboxNormalized) · 질병 진단 요약 |
| AI 대응 제안 | `guidance/[resultId]` | RAG 보고서: 현황 · 위험도 · 조치 · 근거 인용 · 면책 문구 |

UI는 Figma 토큰 기반 디자인 시스템(`src/constants/aqua-theme.ts`)을 따릅니다. 상태 색상은
success=양호, warning=의심, danger=경고로 매핑합니다. 사용자 노출 문구는 `src/constants/copy.ts`에서
일괄 관리합니다.

## 6. 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | Expo 57 · React Native 0.86 · React 19 (React Compiler 사용) |
| 라우팅 | Expo Router (typed routes) |
| 촬영·이미지 | expo-camera · expo-image-picker · expo-image-manipulator(업로드 전 변환·크기 제한) |
| 데이터 | `@supabase/supabase-js` (anon, 읽기 전용 조회) · Cloud Run REST |
| 상태 | React Context 기반 스토어 (`src/state/aquaculture-store.tsx`) |
| 테스트 | vitest (RN 비의존 순수 로직: parsers/grading/adapters) |
| 플랫폼 | iOS 네이티브 빌드 · 웹(react-native-web, Vercel 배포) |

## 7. 백엔드 연동 계약

계약 버전 `diagnosis-2026.07.4` 구현. 상세 계약은 [docs/api-contract.md](docs/api-contract.md),
정본 스키마는 백엔드 저장소 `contracts/diagnosis.schema.json`·`guidance.schema.json`입니다.

### Cloud Run API

| 엔드포인트 | 용도 |
| --- | --- |
| `POST /diagnose` | multipart(`image`, `farm_id`, `tank_id`, `request_id`) → 다개체 진단 + 저장. `DiagnosisResult` 즉시 반환 |
| `POST /guide` | `ai_result_id` → RAG 대응 보고서. 의심/경고 결과에서만 호출(양호는 `report=null`) |
| `POST /detect` | 이미지만 보내는 저장 없는 프리뷰(디버깅용, `aiResultId=null`) |
| `GET /health` | `serviceVersion`(Cloud Run 리비전) · `contractVersion` · `modelVersion` 확인 |

응답 처리 규칙:

- 개체 표시는 `fish[].cropDataUri` + crop 기준 `detections[].bboxNormalized`(0..1)를 사용합니다.
  원본 픽셀 `bbox`는 사용하지 않습니다.
- 최상위 `diseaseSummary`(수조 단위 중복 없는 질병 코드, 다발순)를 질병 진단 요약 UI에 사용합니다.
- `normalCount`·`diseaseSummary`는 응답에 있으면 검증하고, 없으면(이력 복원 경로) 파생합니다.
- 오류: 400(손상 이미지) · 404(tank↔farm 불일치) · 409(같은 `request_id`를 다른 수조로 재사용) ·
  413(크기 초과) · 415(JPEG/PNG 아님) · 500.

### Supabase 직접 조회 (anon + RLS)

- `farms` / `tank_groups` / `tanks`: 단일 어가 조회, 수조 추가·수정
- `tank_latest_grade` 뷰: 수조별 최신 등급 단일 조회(판독 없는 수조는 `grade=null`)
- `ai_results` / `photos`: 판독 이력
- Storage `fish-photos`(비공개): `cropPath` → `createSignedUrl`로 개체 crop 재표시

## 8. 프로젝트 구조

```text
src/
  app/                  # 화면 라우트 (Expo Router)
  components/           # 공용 컴포넌트 (glass-card, status-badge, photo-review 등)
  constants/            # aqua-theme.ts(Figma 토큰) · copy.ts(노출 문구)
  models/aquaculture.ts # 앱 데이터 모델
  services/
    api/                # 실서버/목 API 스위치 (aquaculture-api · mock-aquaculture-api)
    inference/          # Cloud Run 클라이언트 · 응답 parsers · 등급 표시 로직
    supabase/           # Supabase 클라이언트 · repository · 생성된 DB 타입
    image-upload/       # 업로드 전 이미지 변환·크기 제한
    aquaculture-adapters.ts  # 서버 응답 → 앱 모델 변환 (crop URL 주입 포함)
  state/                # aquaculture-store (전역 상태 · 이력 hydrate)
  data/                 # sample-aquaculture.json (목 데이터)
docs/                   # api-contract.md 등 연동 문서
handoff/                # 백엔드 전달 문서 · database.types.ts
```

## 9. 실행

```bash
npm install
npm run ios        # iOS 네이티브 빌드 실행
npm start          # Expo Go / 웹 미리보기
```

서버 연결(실제 데이터 모드):

```bash
cp .env.example .env.local
# EXPO_PUBLIC_INFERENCE_URL 등 실제 값으로 변경
npm start
```

API 주소가 없거나 `EXPO_PUBLIC_USE_MOCK_API=true`이면 목 API로 실행됩니다.

Codex 앱에서는 `Run` 액션이 `./script/build_and_run.sh`를 실행합니다. iOS 시뮬레이터를 바로 열려면:

```bash
./script/build_and_run.sh --ios
```

## 10. 환경변수

| 이름 | 용도 |
| --- | --- |
| `EXPO_PUBLIC_INFERENCE_URL` | Cloud Run 추론 API 주소 |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` (또는 `_PUBLISHABLE_KEY`) | RLS 적용 프론트 공개 키 |
| `EXPO_PUBLIC_FARM_ID` | 로그인 없이 사용할 단일 어가 UUID |
| `EXPO_PUBLIC_MAX_UPLOAD_BYTES` | 변환 후 업로드 최대 크기(기본 6 MiB, 서버 상한과 일치) |
| `EXPO_PUBLIC_USE_MOCK_API` | `true`면 실제 환경값이 있어도 목 API 사용 |

`SUPABASE_SERVICE_KEY`, `service_role`, `sb_secret_*` 키는 앱 번들에 넣지 않습니다.

## 11. 검증

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # vitest (parsers · grading · adapters 순수 로직)
./script/build_and_run.sh --doctor
```

## 12. 배포

- **웹**: `npm run build`(`expo export -p web`) → Vercel 배포(`vercel.json`).
  웹 Origin은 Cloud Run의 `ALLOWED_ORIGINS`(CORS 허용 목록)에 포함되어야 합니다 —
  프로덕션 도메인은 등록되어 있고, Vercel 프리뷰 URL은 차단됩니다.
- **iOS**: 네이티브 빌드(`com.elaus.project-nupchi`). 카메라·사진 보관함 권한을 사용합니다.

## 13. 관련 저장소·문서

- 백엔드(AI·데이터): `nupchi-vhs` — FastAPI 추론 서버 · Roboflow/ONNX 모델 · RAG · Supabase 스키마.
  프론트↔백 단일 계약은 백엔드 저장소의 `contracts/`가 정본입니다.
- [docs/api-contract.md](docs/api-contract.md) — 프론트 연동 계약 요약
- [docs/backend-integration-request.md](docs/backend-integration-request.md) — 백엔드/DB 변경 요청 이력
- `handoff/` — 백엔드에서 전달받은 crop 표시 가이드 · DB 타입
- 디자인: Figma 토큰 기반, 규칙은 [AGENTS.md](AGENTS.md) 참조
