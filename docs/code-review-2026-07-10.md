# 코드 검토 노트 (2026-07-10)

`feature/server-api-models` 브랜치의 작업 중 변경분(서버 연동 준비 + 카메라/결과 화면 개편)을 검토한 결과입니다.
직접 수정은 하지 않았으며, 항목별로 **수정 필요 / 확인 필요**를 구분했습니다.

검증 상태: `tsc --noEmit` 통과, `expo lint` 통과.

---

## A. 수정 필요 (동작에 영향)

### A-1. 촬영 순간 CameraView가 비활성화되는 레이스
- 위치: `src/app/camera.tsx:109-142`, `src/app/camera.tsx:263`
- `takePhoto()`가 `setIsSubmitting(true)`를 먼저 호출한 뒤 `takePictureAsync()`를 호출하는데,
  `CameraView`는 `active={!isSubmitting}`이므로 리렌더 시 카메라 세션이 먼저 일시정지될 수 있음.
  기기에 따라 캡처가 실패하거나 걸릴 수 있는 타이밍 이슈.
- 제안: `active`를 갤러리 진입/리뷰 전환 시에만 끄거나, 촬영 완료 후에 `isSubmitting`을 세팅.

### A-2. 홈 화면에 로딩·오류 상태가 전혀 없음
- 위치: `src/app/(tabs)/index.tsx:29-53`, `src/state/aquaculture-store.tsx:78-82`
- 앱 시작 시 스토어가 자동 로그인 + 스냅샷 로드를 수행하는데, 홈은 `isHydrating`/`error`를
  전혀 사용하지 않음. remote 모드에서 서버 장애 시 **빈 수조 목록 + "모두 정상" 헤드라인**이
  그대로 표시되어 장애가 정상처럼 보임. 로딩 중에도 동일.
- 제안: hydrate 중 스켈레톤/로딩 표시, 실패 시 오류 배너 + 재시도 버튼.

### A-3. 데이터 재조회 수단이 없음
- 위치: 스토어의 `refresh()`(`src/state/aquaculture-store.tsx:96`)는 어떤 화면에서도 호출되지 않음.
  `RefreshControl`도 없음.
- remote 모드에서는 앱 시작 시 1회 로드가 전부라, 다른 기기/서버 측 변경이 반영되지 않음.
- 제안: 홈·수조현황에 pull-to-refresh 또는 포커스 시 재조회.

### A-4. 분석 실패(failed) 화면의 상태 배지가 "정상"으로 표시됨
- 위치: `src/app/result/[resultId].tsx:293`, `buildObjectAnalyses`(`:695-700`)
- 미완료 결과는 `result.grade`(기본값 `'normal'`)로 객체 status를 만들기 때문에,
  실패한 분석의 사진 위에 정상 계열 `StatusBadge`가 뜸. 실패 상태에서 등급 배지는 의미가 없음.
- 제안: `status === 'failed'`일 때는 배지를 숨기거나 실패 전용 표시로 대체.

### A-5. 캐러셀 `activeIndex` 범위 이탈 미방어
- 위치: `src/app/result/[resultId].tsx:79`, `:160`, `:208`
- 필터 변경 시에는 `setActiveIndex(0)`으로 초기화하지만, **데이터 갱신으로**
  `filteredAnalyses`가 줄어드는 경우 클램프가 없음. 표시용은 `?? filteredAnalyses[0]`으로
  방어되지만 페이저 텍스트가 "5/3"처럼 나오고 활성 도트가 사라질 수 있음.
- 제안: `activeIndex`를 렌더 시 `Math.min(activeIndex, length - 1)`로 클램프하거나 effect로 보정.

### A-6. 샘플 데이터 ID 불일치
- 위치: `src/data/sample-aquaculture.json`
- 결과 `R-B03-002`의 `tankId`가 `A-08`임. ID 네이밍 규칙(R-{수조}-{순번})과 어긋나는
  복사-붙여넣기 흔적으로 보임. 의도라면 `R-A08-001` 등으로 정정 필요.

---

## B. 서버 연동 — 확인 필요 (연동 전 결정 사항)

### B-1. ★ 백엔드 요청서와 클라이언트 API 계약이 서로 다름
- 위치: `docs/backend-integration-request.md` ↔ `src/services/api/remote-aquaculture-api.ts`, `src/models/aquaculture.ts`
- 요청서(2026-07-10 작성)의 확정 요구사항:
  - 개체 등급 2단계 `normal | suspect`, 수조 종합 등급 3단계 `normal | suspect | warning`
  - **로그인/세션 없음**, Supabase anon 키 직접 접근
  - `POST /diagnose` multipart(`image`, `farm_id`, `tank_id`(UUID), `request_id`)
- 현재 클라이언트 구현:
  - 등급 3단계 `normal | caution | suspicious`
  - `POST /v1/auth/login` + Bearer accessToken
  - `/v1/aquaculture/snapshot`, `/v1/inspections` + `/analyze`, 수조 ID는 `"A-07"` 같은 문자열
- 둘 중 어느 쪽이 최신 결정인지 확인 필요. 요청서 기준이라면 `RemoteAquacultureApi`,
  serializers, 모델 타입, 등급 도메인 로직까지 큰 폭의 재작업이 필요함.

### B-2. 사진 업로드 타임아웃 12초 고정
- 위치: `src/services/api/http-client.ts:21`
- 모든 요청이 12초 타임아웃을 공유. 어촌 현장 네트워크에서 multipart 사진 업로드는
  12초를 넘길 수 있음. 업로드 요청만 별도(예: 60초) 타임아웃 검토.

### B-3. HEIC → JPEG 변환 코드 없음
- 위치: `src/services/api/remote-aquaculture-api.ts:84-98`, `src/app/camera.tsx:85-90`
- 요청서에는 "iOS 갤러리의 HEIC는 프론트에서 JPEG 변환 후 업로드"라고 명시했지만,
  실제로는 갤러리에서 고른 URI를 `type: 'image/jpeg'` 라벨만 붙여 그대로 전송.
  `ImagePicker`의 `quality: 0.82`가 재인코딩을 유발할 수 있으나 포맷 보장은 아님.
  `expo-image-manipulator` 등으로 명시적 변환 필요한지 확인.

### B-4. 토큰 미영구화 · 401 처리 없음
- 위치: `src/services/api/http-client.ts`, `src/state/aquaculture-store.tsx:78-82`
- accessToken이 메모리에만 저장되고 만료/401 시 재로그인 흐름이 없음.
  (B-1에서 "로그인 없음"으로 결정되면 이 항목은 소멸)

### B-5. 자동 로그인 하드코딩 + login 화면 고아화
- 위치: `src/state/aquaculture-store.tsx:78-82`, `src/app/login.tsx`
- 스토어 마운트 시 `AppCopy.login.defaultFarmName`으로 무조건 로그인. `login.tsx`는
  라우트로 존재하지만 진입 경로가 없고, 로그인 성공 후 네비게이션도 없음.
  로그인 화면을 유지할지 삭제할지 결정 필요.

### B-6. 실패 시 서버 오류 메시지 유실
- 위치: `src/state/aquaculture-store.tsx:187-194`
- `analyzeInspection` 실패 시 `evidenceSummary`를 고정 문구로 덮어써서 서버가 준
  구체적 오류(타임아웃/이미지 불량 등)를 사용자에게 전달할 수 없음.

### B-7. 수조 ID 중복 검사가 클라이언트 로컬 목록만 확인
- 위치: `src/state/aquaculture-store.tsx:125-141`
- remote 모드에서는 다른 기기가 만든 수조와 충돌 가능. 서버 409 응답 처리 여부 확인.

---

## C. 미사용 코드 (정리 검토 — 이번 세션에서 삭제하지 않음)

| 항목 | 위치 | 비고 |
| --- | --- | --- |
| `acknowledgeAlert`, `setReminderEnabled`, `refresh`, `logout`, `ackedAlertIds`, `reminderEnabled` | `src/state/aquaculture-store.tsx` | 스토어에 있으나 UI 호출처 없음 (refresh는 A-3과 연계해 사용 권장) |
| `guidance/[resultId].tsx` 라우트 | `src/app/guidance/`, `src/app/_layout.tsx:55` | `GuidanceModal`로 대체됨. 네비게이트하는 곳 없음 |
| `getActiveAlerts`, `countTanksCapturedToday`, `getGroupSummaries`, `getGroupAlertSource`, `behaviorClues`, `flounderDiseaseLabels`, `isCapturedToday` | `src/domain/aquaculture.ts` | 외부 사용처 없음 |
| `formatInspectionDate` | `src/app/tank/[tankId].tsx:267-276` | `domain/aquaculture.ts`의 `formatDateTime`과 완전 동일 — 중복 |

---

## D. UI/UX·기타 확인 필요 (경미)

1. **contentTop 플랫폼 분기 취약**: `result/[resultId].tsx:83`, `tank/[tankId].tsx:45`에서
   iOS는 `Space.sm`, 그 외는 `insets.top + APP_BAR_HEIGHT` 수동 계산. iOS는 `ScreenShell`의
   `contentInsetAdjustmentBehavior="automatic"`에 암묵적으로 의존하는 구조라 깨지기 쉬움.
2. **홈 "수조 현황" 헤더의 chevron이 눌리지 않음**: `(tabs)/index.tsx:127-132` — 버튼처럼
   보이지만 `Pressable`이 아님. `tank-status` 탭 이동 의도였는지 확인.
3. **정보 팝오버 좌표**: `result/[resultId].tsx:423-427` — `measureInWindow` +
   `statusBarTranslucent` Modal 조합은 일부 Android 기기에서 상태바 높이만큼 어긋날 수 있음.
   실기기 확인 권장.
4. **카메라 닫기 = `router.back()`**: `camera.tsx:176` — 딥링크로 카메라에 바로 진입하면
   뒤로 갈 스택이 없음. `router.canGoBack()` 체크 후 `replace('/')` fallback 검토.
5. **데모 병변 좌표 오버플로**: `photo-analysis-stage.tsx:39-45` — 병변이 3개 이상이면
   `left: 41.6 + index*13%`가 프레임을 벗어날 수 있음 (현재 데모 데이터는 최대 2개).
6. **오류 배너 자동 해제 없음**: `camera.tsx` / `photo-review-screen.tsx`의 message 배너는
   다음 액션 전까지 계속 떠 있음. 의도인지 확인.
7. **Android `RECORD_AUDIO` 권한**: `app.json` — 사진 전용 앱인데 마이크 권한이 선언됨.
   expo-camera 기본값이지만 `expo-camera` 플러그인 옵션으로 제외 가능(스토어 심사 지적 소지).
8. **탭 스와이프와 가로 카드 스크롤 제스처 충돌 가능**: `(tabs)/_layout.tsx`의
   `swipeEnabled: true`와 홈의 horizontal ScrollView(`(tabs)/index.tsx:137`) 조합.
   경계에서 페이지 전환이 오작동하지 않는지 실기기 확인.
9. **미완료 수조의 상태 fallback**: `getCurrentStatus`(`domain/aquaculture.ts:64-66`)는
   완료된 판정이 없으면 `'normal'` 반환 — 촬영 이력이 전혀 없는 수조도 "양호"로 표시됨.
   "미점검" 상태를 구분할지 기획 확인.

---

## 우선순위 제안

1. **B-1 (API 계약 방향 확정)** — 이후 작업 전부에 영향.
2. A-1, A-2, A-4 — 사용자 체감 버그.
3. A-3, B-2, B-3 — 서버 연동 시 바로 부딪히는 항목.
4. A-5, A-6, C, D — 여유 시 정리.

---

## 조치 현황 (2026-07-11)

| 항목 | 상태 | 조치 내용 |
| --- | --- | --- |
| A-1 | ✅ 해결 | `cameraActive` 상태를 `isSubmitting`과 분리, 갤러리 진입 시에만 카메라 일시정지 (Supabase 재작업에 포함) |
| A-2 | ✅ 해결 | 홈 헤드라인에 로딩/실패 상태 + 재시도 CTA 반영 (재작업에 포함) |
| A-3 | ✅ 해결 | 홈·수조 목록에 `RefreshControl` 추가 (재작업에 포함) |
| A-4 | ✅ 해결 | `status === 'failed'`일 때 상태 배지 숨김 (재작업에 포함) |
| A-5 | ✅ 해결 | `visibleIndex = min(activeIndex, length-1)` 클램프 (재작업에 포함) |
| A-6 | ✅ 해결 | `R-B03-002` → `R-A08-001`로 정정 |
| B-1 | ✅ 해결 | Supabase 직접 접근 + `/diagnose` multipart 계약으로 전환 완료 (재작업) |
| B-2 | ✅ 해결 | `INFERENCE_TIMEOUTS` 엔드포인트별 분리 — diagnose 90초 (재작업에 포함) |
| B-3 | ✅ 해결 | `prepareImageForUpload`가 HEIC/HEIF를 JPEG로 변환, 웹은 HEIC 거부 안내 (재작업에 포함) |
| B-4 | ✅ 소멸 | 로그인/토큰 제거로 항목 자체가 사라짐 |
| B-5 | ✅ 해결 | `login.tsx` 삭제, 자동 부트스트랩은 `refresh()`로 일원화 |
| B-6 | ✅ 해결 | `analyzeInspection` 실패 시 서버 오류 메시지를 `evidenceSummary`에 보존 |
| B-7 | 부분 해결 | 클라이언트 선검사 유지 + repository 오류 매핑. 서버측 유니크 제약은 백엔드 확인 필요 |
| C | ✅ 해결 | 미사용 도메인 헬퍼 삭제(`getGroupSummaries`, `getGroupAlertSource`, `isCapturedToday`, `countTanksCapturedToday`, `behaviorClues`, `flounderDiseaseLabels`), `formatInspectionDate` 중복 제거. 스토어 미사용 액션은 재작업에서 이미 제거됨. **`guidance/[resultId]` 라우트는 'AI 현장 대응 보고서'로 재작성되어 유지** — 단, 앱 내 진입점이 아직 없으므로 딥링크 용도인지 확인 필요 |
| D-2 | ✅ 해결 | 홈 "수조 목록" 헤더를 Pressable로 변경, 수조 목록 탭으로 이동 |
| D-4 | ✅ 해결 | `router.canGoBack()` 확인 후 홈으로 fallback (재작업에 포함) |
| D-5 | ✅ 해결 | 데모 병변 위치를 사전 정의 좌표 순환 방식으로 변경 (프레임 이탈 방지) |
| D-7 | ✅ 해결 | `RECORD_AUDIO`를 permissions에서 제거 + `blockedPermissions` 등록 + expo-camera `recordAudioAndroid: false` |
| D-1 | 보류 | iOS `contentInsetAdjustmentBehavior` 의존 구조 — 실기기 시각 확인 후 리팩터링 권장 |
| D-3 | 보류 | 팝오버 좌표는 Android 실기기 확인 필요 |
| D-6 | 유지 | 오류 배너는 다음 액션까지 유지하는 것이 의도된 동작으로 판단 (권한 오류 등은 자동 해제 시 정보 유실) |
| D-8 | 보류 | 탭 스와이프 제스처 충돌은 실기기 확인 필요 |
| D-9 | 보류 | "미점검" 상태 구분은 기획 결정 필요 |

검증: `tsc --noEmit` 통과, `expo lint` 통과.
