# Project Nupchi 프론트 연동 계약

프론트는 로그인 없이 하나의 고정 어가를 사용한다. 인증 API, 사용자 세션, `alerts`, 일일 기록 UI는 사용하지 않는다.

## 환경변수

| 이름 | 용도 |
| --- | --- |
| `EXPO_PUBLIC_INFERENCE_URL` | Cloud Run 추론 API 주소 |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` 또는 `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | RLS가 적용된 프론트 공개 키 |
| `EXPO_PUBLIC_FARM_ID` | 로그인 없이 사용할 단일 어가 UUID |
| `EXPO_PUBLIC_MAX_UPLOAD_BYTES` | JPEG/PNG 변환 후 업로드 최대 크기 |

`SUPABASE_SERVICE_KEY`, `service_role`, `sb_secret_*` 키는 앱 번들에 넣지 않는다.

## Cloud Run

### `POST /diagnose`

`multipart/form-data`:

- `image`: JPEG 또는 PNG
- `farm_id`: 어가 UUID
- `tank_id`: 수조 UUID
- `request_id`: 클라이언트에서 생성한 UUID. 재시도 멱등 키로 사용

개체 등급 `fish[].grade`는 `normal | suspect` 두 단계다. 수조 종합 등급 `overallGrade`는 `normal | suspect | warning` 세 단계이며, 의심 개체가 없으면 `normal`, 의심 비율이 30% 미만이면 `suspect`, 30% 이상이면 `warning`이다. 프론트는 서버가 계산한 `fishCount`, `suspectCount`, `affectedRatio`, `overallGrade`, `fish`를 그대로 사용한다.

개체별 표시에는 `/diagnose` 즉시 응답의 아래 필드를 사용한다.

- `fish[].cropDataUri`: `data:image/jpeg;base64,...` 형식의 개체 크롭 이미지
- `fish[].detections[].bboxNormalized`: 크롭 이미지 기준 `[x1, y1, x2, y2]`, 각 값은 `0..1`

프론트는 증상 박스에 원본 픽셀 좌표 `bbox`를 사용하지 않는다. `detections`가 비어 있으면 박스를 표시하지 않는다. `cropDataUri`는 `ai_results` 이력에 저장되지 않으므로 이력 조회에서는 signed 원본 사진으로 대체하며, 크롭 기준 박스를 원본 사진 위에 표시하지 않는다.

### `POST /guide`

`application/x-www-form-urlencoded`의 `ai_result_id`에 `/diagnose` 응답의 `aiResultId`를 보낸다. 저장이 끝난 `suspect | warning` 결과에서 호출한다.

### `GET /health`

배포 상태 확인용이다. 브라우저에서 직접 호출할 웹 Origin은 Cloud Run의 CORS 허용 목록에 포함되어야 한다.

## Supabase

프론트는 공개 키와 RLS로 아래 동작만 수행한다.

- `farms`, `tank_groups`, `tanks`: 단일 어가 조회 및 수조 추가·수정
- `photos`, `ai_results`: 이력 조회
- 비공개 `fish-photos` Storage: signed URL 조회

사진과 AI 결과 생성은 Cloud Run만 담당한다. 신규 계약은 `photos.tank_id`, `ai_results.tank_id`, `ai_results.request_id` 직접 관계를 사용하며 `daily_record_id`를 요구하지 않는다.

백엔드/DB 변경 요청과 완료 조건은 [backend-integration-request.md](./backend-integration-request.md)에 정리되어 있다.
