# Project Nupchi

Expo Router 기반 iOS 앱 프로젝트입니다. 화면 라우트는 `src/app`에 두고, 공용 컴포넌트와 훅은 `src/components`, `src/hooks`처럼 `src` 하위에 둡니다.

## 실행

```bash
npm install
npm run ios
```

Expo Go로 먼저 확인하려면:

```bash
npm start
```

## 서버 연결

환경 파일에 API 주소를 지정하면 HTTP API를 사용합니다.

```bash
cp .env.example .env.local
# EXPO_PUBLIC_API_BASE_URL을 실제 서버 주소로 변경
npm start
```

API 주소가 없거나 `EXPO_PUBLIC_USE_MOCK_API=true`이면 `src/data/sample-aquaculture.json` 기반 목 API로 실행됩니다. 앱 데이터 모델은 `src/models/aquaculture.ts`, 서버 계약은 `docs/api-contract.md`, 사용자 노출 문구는 `src/constants/copy.ts`에서 관리합니다.

Codex 앱에서는 `Run` 액션이 `./script/build_and_run.sh`를 실행합니다. iOS 시뮬레이터를 바로 열려면 `Run iOS` 액션을 사용하거나 아래 명령을 실행합니다.

```bash
./script/build_and_run.sh --ios
```

## 검증

```bash
npm run lint
npx tsc --noEmit
./script/build_and_run.sh --doctor
```
