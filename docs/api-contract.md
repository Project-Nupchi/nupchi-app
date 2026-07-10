# Project Nupchi API contract

앱은 성공 응답을 아래 두 형식 중 하나로 받을 수 있습니다.

```json
{ "data": { "...": "..." } }
```

또는 리소스 객체 자체를 반환할 수 있습니다. 오류 응답은 가능하면 아래 형태를 사용합니다.

```json
{ "error": { "code": "TANK_NOT_FOUND", "message": "수조를 찾을 수 없습니다." } }
```

모든 인증 API는 로그인 응답의 `accessToken`을 `Authorization: Bearer <token>`으로 전달합니다.

## Endpoints

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/v1/auth/login` | `{ farmName }` | `LoginResponse` |
| POST | `/v1/auth/logout` | - | `204` |
| GET | `/v1/aquaculture/snapshot` | - | `AquacultureSnapshot` |
| POST | `/v1/tanks` | `CreateTankInput` | `Tank` |
| PATCH | `/v1/tanks/:tankId` | `UpdateTankInput` | `Tank` |
| POST | `/v1/inspections` | multipart `tankId`, `clues`, `photo` 또는 JSON | `InspectionResult` (`pending`) |
| POST | `/v1/inspections/:resultId/analyze` | - | `InspectionResult` (`completed`/`failed`) |
| PUT | `/v1/inspections/:resultId/acknowledgement` | `{ acknowledged }` | `204` |
| PUT | `/v1/preferences/reminder` | `{ enabled }` | `204` |

TypeScript 기준 모델의 단일 진실 공급원은 `src/models/aquaculture.ts`입니다. 날짜는 ISO 8601 문자열, 병변 좌표는 이미지 크기 대비 백분율(0~100)을 사용합니다.
