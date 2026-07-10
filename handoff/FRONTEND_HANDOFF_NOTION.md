# 넙치야 미안해 — 프론트 전달용 백엔드 문서

이 문서는 Notion에 그대로 붙여 넣기 위한 프론트 전달 원문이다.

## 결론

프론트는 진단 요청을 Supabase가 아니라 Cloud Run API로 보낸다.

Cloud Run API가 Roboflow, ONNX 모델, Supabase 저장을 모두 오케스트레이션한다.
프론트는 응답을 즉시 표시하고, 수조 상태·진단 이력은 Supabase에서 조회한다.

## 전달 값

| 항목 | 값 |
| --- | --- |
| `INFERENCE_URL` | `https://nupchi-inference-301502504998.asia-northeast3.run.app` |
| 계약 버전 | `diagnosis-2026.07.4` (`GET /health`의 `contractVersion`으로 확인) |
| 진단 API | `POST /diagnose` |
| 프리뷰 API | `POST /detect` |
| 가이드 API | `POST /guide` |
| Supabase 조회 | `tank_latest_grade`(뷰), `ai_results`, `photos`, `tanks`, `tank_groups`, `farms` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`는 프론트 환경변수로 사용한다.
`SUPABASE_SERVICE_KEY`는 서버 전용이라 프론트에 절대 넣지 않는다.

## 고정 상수 (무로그인 단일 어가)

로그인이 없으므로 모든 접근은 아래 고정 어가 스코프의 anon RLS로 동작한다.

| 상수 | 값 |
| --- | --- |
| `FARM_ID` | `00000000-0000-0000-0000-000000000001` |
| 데모 수조 A-01 | `00000000-0000-0000-0000-000000000101` |
| 데모 수조 A-02 | `00000000-0000-0000-0000-000000000102` |

anon key 권한 범위:

- 조회: `farms`, `photos`, `ai_results`, `tank_latest_grade`(뷰), Storage `fish-photos`
- 조회·추가·수정: `tanks`, `tank_groups` (`farm_id`는 반드시 위 `FARM_ID`. 수조 삭제 대신 `active=false`)
- `photos`/`ai_results` 직접 insert는 불가 — 진단 저장은 `/diagnose`가 대신 한다

## 현재 백엔드 상태

- Cloud Run 배포 완료
- 실제 ONNX 모델 이미지 포함
- Roboflow 개체 segmentation 연결
- Supabase 저장 연결
- `normal / suspect / warning` 수조 등급 반영
- `/detect` 배포 응답에서 `suspectCount`, `affectedRatio`, `overallGrade=warning` 확인
- Supabase에는 `fish_count`, `suspect_count`, `affected_ratio`, `grade`, `fish` 저장

## 전체 아키텍처

```text
Front
  |
  | POST /diagnose
  | - image
  | - farm_id
  | - tank_id
  | - request_id (앱 생성 UUID)
  v
Cloud Run Inference API
  |
  | 1. 이미지 검증
  | 2. Roboflow Segmenter
  |    - 수조 사진에서 넙치 N마리 검출
  |    - 개체별 bbox 반환
  | 3. 개체별 crop 생성
  | 4. ONNX detector
  |    - 증상 탐지
  | 5. ONNX classifier
  |    - 질병 다중 분류
  | 6. 개체 등급 산정
  |    - normal / suspect
  | 7. 수조 등급 산정
  |    - normal / suspect / warning
  | 8. Supabase 저장
  |    - photos
  |    - ai_results
  v
Front receives diagnosis response

Front
  |
  | Supabase anon key
  v
Supabase
  - 수조/수조군 조회·관리
  - 수조별 최신 등급 조회 (tank_latest_grade 뷰)
  - 진단 이력 조회
```

## 프론트 화면에서 쓰는 핵심 필드

`/diagnose` 응답:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `aiResultId` | string/null | Supabase에 저장된 AI 결과 ID |
| `fishCount` | number | 검사된 넙치 전체 개체 수 |
| `suspectCount` | number | 의심 개체 수 |
| `normalCount` | number | 정상 개체 수(`fishCount - suspectCount`). '정상 N마리' 표시용 |
| `affectedRatio` | number | 의심 개체 비율 |
| `overallGrade` | string | 수조 종합 등급 |
| `diseaseSummary` | string[] | 수조 단위 의심 질병 코드(중복 없음, 다발순). 질병 진단 요약은 이 필드로 표시 |
| `fish` | array | 개체별 상세 결과(정상·의심 모두 포함) |
| `inferenceMs` | number | 추론 시간 |
| `modelVersion` | string | 모델 추적 태그 |

`fish[]`:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `index` | number | 개체 순번 |
| `bbox` | number[] | 원본 이미지 기준 bbox |
| `segClass` | string | Roboflow 클래스명 |
| `segConfidence` | number | Roboflow 개체 검출 신뢰도 |
| `detections` | array | 증상 부위 탐지(위치·유형). **정상 개체·증상 미검출이면 빈 배열**(정상 응답) |
| `diseases` | array | 질병 분류 결과. `{disease}`만 제공 — 질병 신뢰도(퍼센트)는 응답에 없음(표시 금지). **정상 개체는 빈 배열** |
| `grade` | string | 개체 등급. `normal` 또는 `suspect` |
| `cropDataUri` | string | 긴 변 최대 512px인 개체별 JPEG data URI(**즉시 표시용 base64**). 정상·의심 모든 개체에 제공 |
| `cropPath` | string/null | 개체 crop이 저장된 Storage 경로(**이력 조회용**). `/diagnose`에서만 채워지고 `/detect`는 `null`. 이력에서 이 경로로 signed URL을 만들어 크롭을 다시 불러온다 |

`detections[]`의 `bbox`는 축소 전 개체 crop 기준 픽셀 좌표다. 앱에서
`cropDataUri` 위에 감지 박스를 표시할 때는 `[x1, y1, x2, y2]` 형식의
`bboxNormalized`를 이미지 표시 폭과 높이에 각각 곱한다.

## 등급 기준

### 개체 등급

| 값 | 프론트 표기 | 기준 |
| --- | --- | --- |
| `normal` | 문제 없음 | 증상 검출도 없고 질병 고신뢰 소견도 없음. `detections`·`diseases` 모두 빈 배열 |
| `suspect` | 의심 | 증상 부위가 검출되었거나, 질병 분류가 고신뢰로 발화. 이 개체만 `detections`/`diseases`가 채워짐 |

정상 개체도 `fish[]`에 포함되고 `cropDataUri`·`grade`가 모두 제공된다(증상 박스만 그려지지 않음).
그래서 "정상 N마리 / 의심 N마리"를 각각 `normalCount` / `suspectCount`로 표시할 수 있고,
정상 개체의 크롭 이미지도 그대로 화면에 노출할 수 있다.

### 수조 등급

| 값 | 프론트 표기 | 기준 |
| --- | --- | --- |
| `normal` | 문제 없음 | 의심 개체 0마리 |
| `suspect` | 의심 | 의심 개체가 1마리 이상이고 전체의 30% 미만 |
| `warning` | 경고 | 의심 개체 비율이 30% 이상 |

프론트 수조 상태 표시는 `overallGrade`를 기준으로 한다.

## `/diagnose` 사용법

요청:

```javascript
const INFERENCE_URL = 'https://nupchi-inference-301502504998.asia-northeast3.run.app'

const form = new FormData()
form.append('image', file)
form.append('farm_id', farmId)
form.append('tank_id', tankId)
form.append('request_id', crypto.randomUUID())

const res = await fetch(`${INFERENCE_URL}/diagnose`, {
  method: 'POST',
  body: form,
})

const diagnosis = await res.json()
```

`request_id`는 멱등 키다. 요청마다 새 UUID를 생성하고, 같은 값으로 재요청하면
재판독 없이 저장된 같은 결과가 반환된다(더블탭·재시도 안전).

네이티브(Expo) 주의: `expo/fetch`는 `{uri, name, type}` FormData 파트를 지원하지
않는다(`Unsupported FormDataPart implementation` 에러). RN 전역 `fetch`를 쓰거나
`expo-file-system`의 `FileSystem.uploadAsync`(MULTIPART)를 사용할 것.

에러 코드:

| 코드 | 의미 |
| --- | --- |
| 400 | 잘못된 요청(파라미터 형식) |
| 404 | `tank_id`가 해당 `farm_id` 소속이 아님(UUID 확인) |
| 409 | 같은 `request_id`를 다른 수조에 재사용 |
| 413 | 이미지 용량 초과 |
| 415 | 지원하지 않는 이미지 포맷 |
| 500 | 서버 오류 |

응답 예시:

```json
{
  "aiResultId": "5a3736f7-...",
  "fishCount": 7,
  "suspectCount": 5,
  "normalCount": 2,
  "affectedRatio": 0.714,
  "overallGrade": "warning",
  "diseaseSummary": ["streptococcosis", "emaciation"],
  "fish": [
    {
      "index": 0,
      "bbox": [10, 20, 180, 140],
      "segClass": "Healthy",
      "segConfidence": 0.94,
      "detections": [
        {
          "symptom": "ulcer",
          "confidence": 0.72,
          "bbox": [12, 24, 60, 80],
          "bboxNormalized": [0.071, 0.2, 0.353, 0.667]
        }
      ],
      "diseases": [
        { "disease": "streptococcosis" },
        { "disease": "emaciation" }
      ],
      "grade": "suspect",
      "cropDataUri": "data:image/jpeg;base64,...",
      "cropPath": "00000000-0000-0000-0000-000000000001/<photoId>/fish_0.jpg"
    },
    {
      "index": 1,
      "bbox": [200, 40, 360, 150],
      "segClass": "Healthy",
      "segConfidence": 0.9,
      "detections": [],
      "diseases": [],
      "grade": "normal",
      "cropDataUri": "data:image/jpeg;base64,...",
      "cropPath": "00000000-0000-0000-0000-000000000001/<photoId>/fish_1.jpg"
    }
  ],
  "inferenceMs": 2118.1,
  "modelVersion": "roboflow-seg+yolov8+vgg16-2026.07"
}
```

## `/detect` 사용법

저장 없이 미리보기 판독만 필요할 때 쓴다.

```javascript
const form = new FormData()
form.append('image', file)

const res = await fetch(`${INFERENCE_URL}/detect`, {
  method: 'POST',
  body: form,
})

const preview = await res.json()
```

`/diagnose`와 `/detect` 모두 각 개체에 `cropDataUri`와 감지 박스용
`detections[].bboxNormalized`가 들어온다. `/detect`는 저장하지 않는다는 점만 다르다.

## `/guide` 사용법

`/diagnose` 이후 `aiResultId`로 대응 보고서를 조회한다.

```javascript
const form = new FormData()
form.append('ai_result_id', diagnosis.aiResultId)

const res = await fetch(`${INFERENCE_URL}/guide`, {
  method: 'POST',
  body: form,
})

const guide = await res.json()
```

응답:

```json
{
  "aiResultId": "5a3736f7-...",
  "report": {
    "situation": "총 10마리 중 3마리에서 의심 소견이 확인되었습니다.",
    "riskLevel": "medium",
    "actions": [
      { "title": "의심 개체 격리", "detail": "격리 수조로 이동...", "priority": 1 }
    ],
    "evidence": [
      { "source": "국립수산과학원", "quote": "의심 시 격리와 소독을 우선한다." }
    ]
  },
  "disclaimer": "본 안내는 참고용이며 확진이 아닙니다..."
}
```

`overallGrade`가 `normal`인 결과는 `report: null`이 올 수 있다.

## Supabase 조회

수조 목록과 수조별 최신 등급은 `tank_latest_grade` 뷰 하나로 조회한다.
판독 이력이 없는 수조는 `grade`가 `null`이다.

```javascript
const { data: tanks } = await supabase
  .from('tank_latest_grade')
  .select('*')
  .eq('farm_id', FARM_ID)
```

수조별 진단 이력은 `ai_results`에서 조회한다.

```javascript
const { data: results } = await supabase
  .from('ai_results')
  .select('grade, fish_count, suspect_count, affected_ratio, fish, model_version, created_at')
  .eq('tank_id', tankId)
  .order('created_at', { ascending: false })
  .limit(20)
```

### 이력에서 개체 crop 이미지 불러오기

진단 응답의 `cropDataUri`(base64)는 즉시 표시 전용이며 DB에 저장되지 않는다.
이력에서는 저장된 `fish[].cropPath`로 signed URL을 만들어 크롭을 다시 불러온다
(`fish-photos` 버킷은 비공개라 signed URL이 필요하다. 원본 사진 `photos.storage_path`도 같은 방식).

```javascript
// ai_results.fish 는 개체별 JSON 배열. 각 원소에 cropPath 가 들어 있다.
async function loadFishCrops(fish) {
  return Promise.all(
    fish.map(async (f) => {
      const { data } = await supabase
        .storage
        .from('fish-photos')
        .createSignedUrl(f.cropPath, 3600) // 1시간 유효
      return { ...f, cropUrl: data?.signedUrl ?? null }
    })
  )
}

// 사용: 이력 카드에서 cropUrl 을 <img src>로 사용(신규 진단은 cropDataUri 그대로)
const fishWithCrops = await loadFishCrops(result.fish)
```

`cropPath`가 없는 예전 이력(이 기능 배포 전 저장분)은 crop 이미지를 표시하지 않고
등급·질병 텍스트만 보여주면 된다.

## Supabase 저장 필드

### `ai_results`

| 컬럼 | 설명 |
| --- | --- |
| `grade` | 수조 종합 등급 |
| `fish_count` | 전체 개체 수 |
| `suspect_count` | 의심 개체 수 |
| `affected_ratio` | 의심 비율 |
| `fish` | 개체별 상세 JSON(`cropPath` 포함 — Storage 크롭 경로) |
| `model_version` | 모델 태그 |
| `created_at` | 생성 시각 |

경보(`alerts`) 테이블은 제거됐다. 경고 UI는 `tank_latest_grade.grade == 'warning'`
기준으로 표시한다.

## 코드/라벨 매핑

라벨 단일 소스는 `contracts/labels.json`이다.

질병 코드:

| 코드 | 한글 |
| --- | --- |
| `vhs` | 바이러스성 출혈성 패혈증 |
| `lymphocystis` | 림포시스티스 |
| `emaciation` | 여윔병 |
| `scuticociliatosis` | 스쿠티카병 |
| `streptococcosis` | 연쇄구균증 |
| `vibriosis` | 비브리오병 |
| `edwardsiellosis` | 에드워드병 |

증상 코드:

| 코드 | 한글 |
| --- | --- |
| `corrosion` | 부식 |
| `hemorrhage` | 출혈 |
| `ulcer` | 궤양 |
| `tumor` | 종양 |
| `eye_disease` | 안구질환 |

## 우리가 완료한 백엔드 작업

1. Roboflow 개체 segmentation을 다개체 파이프라인에 연결
2. 개체 crop별 ONNX detector/classifier 실행
3. 개체 등급을 **하이브리드**로 판정(증상 검출 OR 질병 고신뢰) — 멀쩡한 개체가 전부 의심으로 찍히던 문제 해결
4. 정상/의심 개체가 섞여 나오도록 조정, 정상 개체는 `detections`·`diseases`를 빈 배열로 정리
5. 개체별 crop 미리보기(`cropDataUri`) + 증상 박스 정규화 좌표(`bboxNormalized`) 제공
6. 수조 단위 질병 요약 `diseaseSummary` 추가(중복 제거·다발순)
7. 질병 신뢰도(퍼센트)를 응답에서 제거(참고치 성격 — 표시 금지)
8. 정상 개체 수 `normalCount` 필드 추가
9. 수조 종합 등급 `normal / suspect / warning` + `suspectCount`·`affectedRatio` 제공
10. 수조별 최신 등급 뷰 `tank_latest_grade` 제공, `/guide` 조건을 `suspect / warning`으로 정리
11. 개체 crop을 Storage(`fish-photos`)에 저장하고 `fish[].cropPath` 제공 — 이력 조회 시 크롭 재표시 가능
12. Cloud Build 이미지 빌드 → Cloud Run 배포 → 배포 API 실응답 확인
13. 프론트 연동 문서/계약(`diagnosis-2026.07.4`) 최신화

## 이번 업데이트에서 프론트가 바꿔야 할 것 (요약)

1. **질병 요약은 최상위 `diseaseSummary`** 사용(개체별로 모으지 말 것). 병명 중복 없음.
2. **`fish[].diseases[]`에서 `confidence` 제거됨** — 이제 `{ disease }`만. 질병 퍼센트 표시 UI 있으면 삭제.
3. **정상 개체는 `detections`·`diseases`가 `[]`** — 단 `cropDataUri`·`grade`는 정상 개체에도 옴.
4. **`normalCount` 신규** — "정상 N마리" 표시에 사용.
5. **개체 crop이 Storage에 저장됨(`fish[].cropPath`)** — 이력 화면에서 `cropPath`로 signed URL을 만들어 크롭 이미지를 다시 표시할 수 있다(위 "이력에서 개체 crop 이미지 불러오기" 참고). 신규 진단은 기존대로 `cropDataUri`(base64) 즉시 표시.

## 현재 주의사항

### CORS

허용된 Origin (적용 완료):

- `https://project-nupchi.vercel.app` (프로덕션)
- `http://localhost:8081`, `http://127.0.0.1:8081` (로컬 개발)

Vercel 프리뷰 배포 URL(브랜치별 주소)은 차단된다 — 웹 테스트는 프로덕션 주소로 할 것.
네이티브 앱, 서버 프록시, curl, Postman은 CORS 영향을 받지 않는다.
Origin 추가가 필요하면 백엔드에 요청한다(env 갱신만, 재빌드 불필요).

### 비밀키

프론트에는 아래만 전달한다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `INFERENCE_URL`

아래는 절대 전달하지 않는다.

- `SUPABASE_SERVICE_KEY`
- `ROBOFLOW_API_KEY`
- `ANTHROPIC_API_KEY`
- `VOYAGE_API_KEY`
