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
