# 프론트엔드 전달: 개체 crop 및 증상 박스

## 운영 API

- Base URL: `https://nupchi-inference-301502504998.asia-northeast3.run.app`
- 계약 버전: `diagnosis-2026.07.4`
- 진단·저장: `POST /diagnose`
- 저장 없는 미리보기: `POST /detect`
- 허용 Origin: `https://project-nupchi.vercel.app`

프론트는 별도 이미지 API를 호출하지 않는다. `/diagnose` 또는 `/detect` 응답의
`fish[].cropDataUri`를 이미지 `src`로 바로 사용한다.

## 요청

```ts
const form = new FormData()
form.append('image', imageFile)
form.append('farm_id', farmId)
form.append('tank_id', tankId)
form.append('request_id', crypto.randomUUID())

const response = await fetch(`${INFERENCE_URL}/diagnose`, {
  method: 'POST',
  body: form,
})

if (!response.ok) {
  throw new Error(`diagnose failed: ${response.status}`)
}

const diagnosis: DiagnosisResult = await response.json()
```

같은 진단을 재시도할 때만 기존 `request_id`를 재사용한다. 새 촬영은 반드시 새 UUID를 사용한다.

## 응답 타입

```ts
type DiseaseCode =
  | 'vhs' | 'lymphocystis' | 'emaciation' | 'scuticociliatosis'
  | 'streptococcosis' | 'vibriosis' | 'edwardsiellosis'

// 증상(detection)에는 confidence가 있지만, 질병(disease)에는 confidence가 없다.
type Detection = {
  symptom: 'corrosion' | 'hemorrhage' | 'ulcer' | 'tumor' | 'eye_disease'
  confidence: number
  bbox: [number, number, number, number]
  bboxNormalized: [number, number, number, number]
}

type FishResult = {
  index: number
  bbox: [number, number, number, number]
  segClass: string
  segConfidence: number
  detections: Detection[]        // 정상 개체·증상 미검출이면 []
  diseases: Array<{ disease: DiseaseCode }>  // 정상 개체면 [] · confidence 없음
  grade: 'normal' | 'suspect'
  cropDataUri: string            // 즉시 표시용 base64(정상·의심 모든 개체)
  cropPath: string | null        // Storage 경로(이력 조회용). /detect는 null
}

type DiagnosisResult = {
  aiResultId: string | null
  fishCount: number
  suspectCount: number
  normalCount: number            // fishCount - suspectCount ('정상 N마리')
  affectedRatio: number
  overallGrade: 'normal' | 'suspect' | 'warning'
  diseaseSummary: DiseaseCode[]  // 수조 단위 의심 질병(중복 없음, 다발순)
  fish: FishResult[]             // 정상·의심 개체 모두 포함
  inferenceMs: number
  modelVersion: string
}
```

## React/Next.js 표시

`bboxNormalized`는 `[x1, y1, x2, y2]` 순서의 0~1 좌표다. 아래처럼 백분율로
변환하면 512px로 축소된 crop에서도 감지 박스가 맞는다.

```tsx
function FishCrop({ fish }: { fish: FishResult }) {
  return (
    <figure className="fish-crop">
      <div className="fish-crop__image">
        <img src={fish.cropDataUri} alt={`검출 개체 ${fish.index + 1}`} />

        {fish.detections.map((detection, index) => {
          const [x1, y1, x2, y2] = detection.bboxNormalized
          return (
            <div
              key={`${detection.symptom}-${index}`}
              className="fish-crop__detection"
              style={{
                left: `${x1 * 100}%`,
                top: `${y1 * 100}%`,
                width: `${(x2 - x1) * 100}%`,
                height: `${(y2 - y1) * 100}%`,
              }}
              title={`${detection.symptom} ${Math.round(detection.confidence * 100)}%`}
            />
          )
        })}
      </div>
    </figure>
  )
}
```

```css
.fish-crop {
  margin: 0;
}

.fish-crop__image {
  position: relative;
  width: 100%;
  line-height: 0;
}

.fish-crop__image img {
  display: block;
  width: 100%;
  height: auto;
}

.fish-crop__detection {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid #dc2626;
  background: rgb(220 38 38 / 12%);
  pointer-events: none;
}
```

`next/image` 최적화를 거치지 말고 일반 `img`를 사용한다. data URI는 이미 응답 안에 들어 있어
별도 원격 이미지 도메인 설정이 필요 없다.

## 화면 처리 기준

- `fish` 배열을 순회해 개체별 카드를 만든다. **정상(`grade: "normal"`) 개체도 배열에 포함**되며 `cropDataUri`가 있으므로 크롭 이미지를 그대로 보여줄 수 있다(증상 박스만 없음).
- `cropDataUri`를 개체 이미지로 사용한다.
- `detections`가 빈 배열이면 박스를 그리지 않는다. 정상 개체·증상 미검출의 정상 응답이다.
- 감지 박스는 `bbox`가 아니라 `bboxNormalized`를 사용한다.
- `diseases`는 위치가 없는 분류 결과이므로 이미지 박스로 표시하지 않는다. **질병에는 `confidence`가 없으므로 퍼센트를 표시하지 않는다**(증상 `detection.confidence`는 있음).
- "정상 N마리 / 의심 N마리"는 `normalCount` / `suspectCount`로, 수조 단위 질병 요약은 `diseaseSummary`로 표시한다.
- `cropDataUri`(base64)는 **즉시 표시 전용**이며 DB에 저장되지 않는다. **이력 화면에서는 `cropPath`로 signed URL을 만들어 크롭을 다시 불러온다**(아래 참고).

## 이력에서 crop 다시 불러오기

이력은 Supabase `ai_results.fish[]`를 읽고, 각 개체의 `cropPath`로 signed URL을 만든다
(`fish-photos` 버킷은 비공개 → signed URL 필요).

```ts
async function loadFishCrops(fish: FishResult[]) {
  return Promise.all(
    fish.map(async (f) => {
      if (!f.cropPath) return { ...f, cropUrl: null } // 기능 배포 전 이력은 cropPath 없음
      const { data } = await supabase
        .storage.from('fish-photos')
        .createSignedUrl(f.cropPath, 3600)
      return { ...f, cropUrl: data?.signedUrl ?? null }
    })
  )
}
// 신규 진단: cropDataUri 사용 / 이력: cropUrl 사용 (둘 다 <img src>)
```

## 수신 확인

1. `GET /health`에서 `contractVersion === 'diagnosis-2026.07.4'`인지 확인한다.
2. 새 `request_id`로 `/diagnose`를 호출한다.
3. `response.fish.length === response.fishCount`이고 `normalCount === fishCount - suspectCount`인지 확인한다.
4. 모든 개체의 `cropDataUri`가 `data:image/jpeg;base64,`로 시작하는지 확인한다(정상 개체 포함).
5. 감지가 있는 경우 모든 `bboxNormalized` 값이 0~1인지 확인한다.
6. 정상 개체(`grade: "normal"`)는 `detections`·`diseases`가 `[]`인지 확인한다.
7. `/diagnose` 응답의 모든 개체에 `cropPath`가 있고, `createSignedUrl(cropPath)`로 크롭이 로드되는지 확인한다(`/detect`는 `cropPath`가 `null`).

새 계약으로 100% 트래픽이 전환된 상태다(배포 리비전은 재배포마다 갱신되며, `GET /health`의
`serviceVersion`으로 확인한다).
