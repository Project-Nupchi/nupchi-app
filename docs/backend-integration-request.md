# 백엔드 연동 변경 요청서

작성일: 2026-07-10
대상: Cloud Run 추론 API, Supabase 스키마/RLS, 프론트 전달 계약

## 1. 프론트 확정 요구사항

- 개체 등급 `fish[].grade`는 2단계 `normal | suspect`, 수조 종합 등급 `overallGrade`는 3단계 `normal | suspect | warning`을 사용한다.
- 로그인과 사용자 세션은 사용하지 않는다.
- 프론트는 Supabase publishable/anon 키로 단일 어가 데이터를 조회하고 수조를 추가·수정할 수 있어야 한다.
- 수조는 시드된 2개에 한정하지 않고 임의로 추가할 수 있어야 한다.
- `daily_records`와 `daily_record_id`는 제품 흐름에서 사용하지 않는다.
- `alerts` 화면과 신규 자동 경보 생성은 사용하지 않는다.
- `/guide`는 `suspect | warning` 진단의 실제 대응 보고서를 표시하는 필수 기능으로 연동한다.
- iOS 갤러리의 HEIC 이미지는 프론트에서 JPEG로 변환한 뒤 업로드한다. 백엔드는 JPEG/PNG를 받는다.
- `/diagnose` 응답은 즉시 화면에 표시하고, 저장된 이력은 Supabase에서 조회한다.

### 2026-07-10 실배포 확인 결과

- `GET /health`: HTTP 200, `{ "status": "ok" }`
- `POST /detect`: 실제 모델 호출 성공. `modelVersion=roboflow-seg+yolov8+vgg16-2026.07`을 반환해 모델 런타임 자체는 동작 중임을 확인
- 현재 OpenAPI의 `POST /diagnose`: 아직 `daily_record_id`를 필수로 요구하고 `request_id`는 받지 않음
- 현재 `/detect` 종합 등급: `warning` 반환을 확인했으며 수조 종합 3단계 계약과 일치
- 기존 `suspect` 결과로 `POST /guide` 호출: HTTP 500, `{ "detail": "guide failed" }`
- `Origin: http://localhost:8081`의 `/diagnose` preflight: HTTP 400이며 `Access-Control-Allow-Origin`이 없어 웹 개발 호출이 차단됨

따라서 프론트는 아래 확정 계약을 기준으로 구현하되, 저장 진단·가이드·웹 직접 호출의 종단간 검증은 이 문서의 P0 백엔드 변경 배포 후 진행한다.

## 2. P0 — `/diagnose` 계약 변경

### 요청 형식

`POST /diagnose`, `multipart/form-data`

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `image` | O | JPEG/PNG 이미지 |
| `farm_id` | O | 단일 어가 UUID |
| `tank_id` | O | Supabase `tanks.id` UUID |
| `request_id` | O | 프론트가 생성한 요청 UUID. 저장 중복 방지 키 |

현재 필수인 `daily_record_id`는 제거해 주세요.

### 응답 형식

다음 필드를 서버가 계산해 항상 반환해 주세요.

```json
{
  "aiResultId": "uuid",
  "fishCount": 7,
  "suspectCount": 3,
  "affectedRatio": 0.4286,
  "overallGrade": "suspect",
  "fish": [],
  "inferenceMs": 2118.1,
  "modelVersion": "production-model-version"
}
```

집계 기준:

- `suspectCount`: `fish[].grade === "suspect"`인 개체 수
- `affectedRatio`: `fishCount === 0`이면 `0`, 그 외 `suspectCount / fishCount`
- `overallGrade`: `suspectCount === 0`이면 `normal`, 의심 비율이 30% 미만이면 `suspect`, 30% 이상이면 `warning`
- `affectedRatio` 범위: `0..1`
- `fish[].grade` enum: `normal | suspect`
- `overallGrade` enum: `normal | suspect | warning`
- `fish[].grade`: 모델 threshold를 통과한 `detections` 또는 `diseases`가 하나라도 있으면 `suspect`, 둘 다 없으면 `normal`

증상·질병별 threshold 값은 모델/계약 버전과 함께 문서화해 주세요. 현재 배포는 질병 분류만으로 `suspect`를 만들지만 저장소 `main` 코드는 증상만 판정에 사용해 서로 다릅니다.

`farm_id`는 가능하면 `tank_id`의 관계에서 서버가 유도해 주세요. 요청 필드로 유지한다면 해당 수조가 실제로 그 어가에 속하는지 저장 전에 검증하고, 불일치는 404 또는 422로 거절해야 합니다. 서버의 service role은 RLS를 우회하므로 요청값을 그대로 신뢰하면 안 됩니다.

`/detect`를 유지한다면 저장 여부와 `cropDataUri`를 제외한 진단·집계 필드는 `/diagnose`와 동일하게 맞춰 주세요.

### 계약 파일

다음 파일을 실제 배포 응답과 동일하게 갱신해 주세요.

- `contracts/diagnosis.schema.json`
- `contracts/labels.json`
- OpenAPI 응답 모델

현재 응답 스키마가 자유 객체(`additionalProperties`)로 노출되므로 FastAPI response model을 지정해 주세요. 실제 모델을 사용 중인 배포에서는 운영 모델 태그를 설정해 주세요.

모델과 배포 코드를 별도로 추적할 수 있도록 응답 또는 `/health`에 아래 버전도 제공해 주세요.

- `serviceVersion`: 배포 Git SHA 또는 이미지 digest
- `contractVersion`: 진단 계약 버전

실배포, 저장소, 계약 파일 모두 개체 2단계와 수조 종합 3단계 등급을 동일하게 사용해야 합니다. 배포 revision이 요청 PR/커밋과 일치하는지 회귀 테스트가 필요합니다.

## 3. P0 — 일일기록 없는 DB 관계

현재 `photos.daily_record_id`가 필수 외래키이므로 프론트 요구사항과 충돌합니다. 아래 관계로 변경해 주세요.

```text
farms
  └─ tank_groups
      └─ tanks
          ├─ photos
          │   └─ ai_results
```

필수 관계와 조회 필드:

### `tanks`

- `id uuid primary key`
- `farm_id uuid not null`
- `tank_group_id uuid not null`
- `code text not null`
- `stocked_at date null`
- `stocked_info text null`
- `active boolean not null default true`
- `created_at timestamptz not null`
- `unique(farm_id, code)`

프론트가 임의 수조를 추가·수정할 수 있도록 `tank_groups` 조회/생성과 `tanks` 조회/생성/수정 정책이 필요합니다. 삭제보다는 `active=false` 비활성화를 사용합니다.

`tank_groups`는 프론트가 이름으로 기존 그룹을 찾거나 새로 만들 수 있도록 `unique(farm_id, name)` 제약을 추가해 주세요. 동시 생성 시 중복 그룹이 생기지 않아야 합니다.

### `photos`

- `id uuid primary key`
- `farm_id uuid not null references farms(id)`
- `tank_id uuid not null references tanks(id)`
- `storage_path text not null`
- `captured_at timestamptz not null`

`daily_record_id`는 제거하거나 nullable 레거시 컬럼으로 전환해 주세요. 신규 진단 저장은 `tank_id`를 사용해야 합니다.

기존 데이터 마이그레이션은 `photos.tank_id` 추가 → `daily_records` 조인으로 backfill → 관계 검증 → `NOT NULL` 적용 → 신규 쓰기 전환 → 레거시 컬럼/테이블 제거 순서로 진행해 주세요. 기존 사진과 AI 결과가 유실되지 않는 테스트가 필요합니다.

### `ai_results`

- `id uuid primary key`
- `farm_id uuid not null references farms(id)`
- `tank_id uuid not null references tanks(id)`
- `photo_id uuid not null references photos(id)`
- `request_id uuid not null unique`
- `grade text not null check (grade in ('normal', 'suspect'))`
- `fish_count int not null`
- `suspect_count int not null`
- `affected_ratio double precision not null`
- `fish jsonb not null`
- `model_version text not null`
- `created_at timestamptz not null`

수조별 이력을 별도 다단계 조인 없이 안전하게 조회할 수 있도록 `ai_results.tank_id`를 저장해 주세요. `photos.tank_id`, `ai_results.tank_id`, 요청의 `tank_id`가 항상 일치하도록 서버 저장 계층에서 검증해 주세요.

DB에도 다음 일관성 제약을 추가해 주세요.

- `0 <= suspect_count and suspect_count <= fish_count`
- `0 <= affected_ratio and affected_ratio <= 1`
- `suspect_count = 0`이면 `grade = 'normal'`, 1 이상이면 `grade = 'suspect'`
- `photo_id`는 한 진단 결과에만 연결한다면 `unique`
- `photos.tank_id`와 `ai_results.tank_id` 일치를 트리거 또는 복합 관계로 강제

권장 인덱스:

```sql
create index on ai_results (tank_id, created_at desc);
create index on photos (tank_id, captured_at desc);
```

Storage 버킷 `fish-photos`가 비공개라면 anon 키로 해당 어가 경로의 signed URL을 생성할 수 있는 정책과 `storage_path` 조회 권한을 제공해 주세요.

## 4. P0 — 무로그인 Supabase 접근과 RLS

현재 장애 재현 결과와 적용 가능한 SQL 템플릿은 [backend-supabase-rls-request.md](./backend-supabase-rls-request.md)에 별도 정리했습니다.

프론트에는 아래 공개 설정만 전달합니다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 또는 publishable key
- `FARM_ID`

`SUPABASE_SERVICE_KEY`/secret key는 Cloud Run 등 서버 환경에만 유지합니다.

로그인이 없으므로 모든 프론트 DB 요청은 Postgres `anon` 역할로 수행됩니다. MVP 단일 어가에 한해 다음 작업을 RLS로 허용해 주세요.

- `farms`: 대상 `FARM_ID` 행 조회
- `tank_groups`: 대상 어가 조회/생성/수정
- `tanks`: 대상 어가 조회/생성/수정
- `photos`: 대상 어가 조회
- `ai_results`: 대상 어가 조회
- Storage: 대상 어가 폴더 조회 및 signed URL 생성만 허용

모든 `insert/update` 정책은 `with check (farm_id = <FARM_ID>)`로 다른 어가 UUID를 쓸 수 없게 제한해 주세요.

anon 역할은 `farms`, `photos`, `ai_results`, Storage 객체를 임의 생성·수정·삭제할 수 없어야 합니다. 사진 업로드와 AI 결과 저장은 Cloud Run의 서버 전용 service key만 수행합니다. 수조 관리에 필요한 `tank_groups`, `tanks`만 제한된 CRUD를 허용합니다.

이 구성은 로그인 없는 단일 어가 MVP용이며, 여러 실제 어가를 안전하게 분리하는 운영 인증 모델은 아닙니다. Cloud Run `/diagnose`도 공개 호출 상태가 된다면 요청 제한 또는 별도 앱 인증 정책이 필요한지 함께 확인해 주세요.

## 5. P0 — 경보(`alerts`) 제외

이번 제품 범위에서는 별도 경보 목록/알림 UI를 사용하지 않습니다. `/diagnose` 결과가 `suspect` 또는 `warning`이어도 신규 `alerts` 행을 자동 생성하지 않도록 백엔드 저장 흐름에서 경보 생성을 제거해 주세요.

- 수조 상태와 주의 표시는 최신 `ai_results.grade`로 계산합니다.
- 기존 `alerts` 테이블과 과거 행은 삭제하지 않아도 되지만 프론트 계약과 신규 저장 흐름에서는 제외합니다.
- `/diagnose` 저장 성공 여부가 `alerts` 테이블 상태에 의존하지 않아야 합니다.

## 6. P0 — `/guide` 필수 연동

`POST /guide`는 저장된 `aiResultId`를 받아 RAG 기반 현장 대응 보고서를 만드는 별도 후속 요청입니다. 진단 모델 호출 자체와는 별개입니다.

`/guide`는 `suspect` 또는 `warning` 진단 결과에서 실제 대응 보고서를 표시하는 필수 기능입니다. 아래 계약으로 통일해 주세요.

- Method/Path: `POST /guide`
- Content-Type: `application/x-www-form-urlencoded`
- 요청 필드: `ai_result_id`
- 프론트는 `overallGrade !== 'normal'`이고 `aiResultId`가 있을 때만 호출
- 응답: `aiResultId`, `report.situation`, `report.riskLevel`, `report.actions`, `report.evidence`, `disclaimer`
- `report.actions`는 `priority`를 포함하고 오름차순으로 정렬 가능해야 함
- `report.evidence`는 `source`, `quote`를 포함
- 저장 결과 없음은 404, RAG/외부 의존성 실패는 502/503으로 구분
- `suspect | warning` 결과의 성공 응답에서 `report`가 `null`이거나 빈 보고서이면 안 됨
- 동일 `ai_result_id` 재요청의 결과 재사용/캐시 정책과 예상 응답 시간을 문서화

`contracts/guidance.schema.json`과 OpenAPI response model도 실제 응답과 동일하게 갱신해 주세요.

## 7. CORS 배포 요청

브라우저 웹 프론트가 Cloud Run을 직접 호출하려면 정확한 Origin이 허용되어야 합니다. 프로토콜·호스트·포트가 하나라도 다르면 다른 Origin입니다.

개발 후보:

```text
http://localhost:8081
http://127.0.0.1:8081
```

운영/프리뷰:

```text
https://<production-domain>
https://<approved-preview-domain>
```

요청 사항:

- Cloud Run `ALLOWED_ORIGINS`에 실제 개발·운영 Origin을 추가하고 재배포
- `OPTIONS /diagnose`, `OPTIONS /detect`, `OPTIONS /guide`가 허용 Origin에 `200` 반환
- 실제 POST 응답에 요청 Origin과 일치하는 `Access-Control-Allow-Origin` 포함
- 허용 method에 `POST`와 웹 상태 확인이 필요하면 `GET`, 허용 header에 최소 `Content-Type` 포함
- Vercel 프리뷰를 허용할 경우 모든 `*.vercel.app`이 아닌 해당 프로젝트에 한정한 정규식 또는 명시적 목록 사용

CORS는 브라우저의 응답 접근 정책일 뿐 API 인증이 아닙니다. 모바일 앱, curl, Postman에서는 우회되므로 공개 API 보호 수단으로 사용하면 안 됩니다.

## 8. 이미지·오류·중복 요청

- 실제 업로드 최대 크기와 지원 MIME을 문서화해 주세요. 현재 소스 기본값 6MB와 기존 문서의 10MB가 다릅니다.
- 프론트는 HEIC를 JPEG로 변환하고 필요 시 리사이즈/압축합니다.
- FastAPI 오류 응답은 `{ "detail": "..." }` 형식과 상태코드를 문서화해 주세요. 최소한 잘못된 관계 404/422, 중복 키 충돌 409, 크기 초과 413, 미지원 MIME 415, 외부 모델 장애 502/503을 구분해 주세요.
- `/diagnose`는 `request_id`에 DB unique 제약을 두어 멱등하게 처리해 주세요. 동일 request/payload 재요청은 같은 `aiResultId`와 기존 결과를 반환하고 행을 추가하지 않아야 합니다. 같은 `request_id`에 다른 수조나 이미지가 오면 409를 반환해야 합니다.
- 사진 업로드, `photos` 삽입, `ai_results` 삽입 중 일부만 성공하지 않도록 트랜잭션/보상 정책을 확인해 주세요.
- Storage 업로드 후 DB 저장이 실패하면 orphan 파일을 정리해 주세요.

## 9. 완료 조건

- [ ] `/diagnose`에서 `daily_record_id` 없이 저장 성공
- [ ] `/diagnose`와 `/detect`가 개체 2단계·수조 종합 3단계 등급 및 집계 필드를 동일하게 반환
- [ ] `suspect | warning` 진단 시 신규 `alerts` 행이 생성되지 않음
- [ ] `/guide`가 저장된 `suspect | warning` 결과에 실제 비어 있지 않은 보고서를 반환
- [ ] 실배포에서 의심 비율 30% 이상이면 `warning`을 반환하고 `serviceVersion`이 배포 커밋과 일치
- [ ] `fishCount=0`일 때 `suspectCount=0`, `affectedRatio=0`, `overallGrade=normal`
- [ ] 최신 계약 JSON과 실제 배포 응답 일치
- [ ] 새 DB 마이그레이션과 생성된 Supabase TypeScript 타입 전달
- [ ] anon 키로 대상 어가의 수조 조회/추가/수정 가능
- [ ] 다른 `farm_id`로의 조회/삽입/수정 차단
- [ ] anon 키로 사진·AI 결과·Storage 객체 생성/수정/삭제 차단
- [ ] 수조별 `ai_results` 이력과 비공개 사진 signed URL 조회 가능
- [ ] 동일 `request_id` 재시도 시 사진·결과 중복 없음
- [ ] 허용된 웹 Origin에서 CORS 성공, 허용되지 않은 Origin은 차단
- [ ] 실제 모델 버전 태그 반환
- [ ] 오류·파일 제한·중복 요청 정책 문서화

## 10. 프론트에 전달할 값

- `INFERENCE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` 또는 publishable key
- `FARM_ID`
- 최신 `contracts/labels.json`
- 최신 `contracts/diagnosis.schema.json`
- 최신 `contracts/guidance.schema.json`
- 최신 Supabase TypeScript `Database` 타입
- 허용된 운영/프리뷰 Origin 목록
