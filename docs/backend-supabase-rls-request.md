# 백엔드 요청서 — 무로그인 단일 어가 Supabase RLS 수정

- 작성일: 2026-07-10
- 우선순위: P0
- 대상: Supabase Database RLS, Grants, Storage RLS

## 1. 요청 목적

프론트는 로그인 없이 Supabase publishable key로 하나의 고정 어가를 사용합니다. 현재 publishable key 요청이 `anon` 역할로 실행되지만 대상 행을 읽을 수 없어 홈에 **“수조 정보를 불러오지 못했어요”**가 표시됩니다.

아래 고정 어가에 한해서만 프론트 조회와 수조 관리를 허용하도록 RLS를 수정해 주세요.

```text
FARM_ID = 464a0fe1-aa31-4f84-a01c-c1b42cbb1126
```

프론트는 소스 코드에 UUID를 직접 하드코딩하지 않고 아래 공개 환경변수로 전달합니다.

```dotenv
EXPO_PUBLIC_FARM_ID=464a0fe1-aa31-4f84-a01c-c1b42cbb1126
```

이 UUID는 비밀값이 아니며 앱 번들에서 확인될 수 있습니다. 실제 접근 통제는 프론트 UUID가 아니라 Supabase RLS가 담당해야 합니다. 수조 UUID는 프론트에 고정하지 않고, 허용된 어가의 `tanks` 조회 결과에서 선택한 `tanks.id`를 사용합니다.

`SUPABASE_SERVICE_KEY`, `service_role`, `sb_secret_*` 키는 프론트에 전달하거나 넣지 않습니다.

## 2. 현재 장애 확인 결과

현재 프론트 환경의 publishable key로 REST Data API를 직접 호출한 결과입니다.

| 리소스 | HTTP | 반환 행 |
| --- | ---: | ---: |
| `farms` | 200 | 0 |
| `tank_groups` | 200 | 0 |
| `tanks` | 200 | 0 |

401/403이 아니라 200과 빈 배열이 반환되므로, 프론트 네트워크나 키 파싱 문제가 아니라 RLS 조건으로 행이 보이지 않는 상태입니다. 프론트의 `farms.id = FARM_ID` 조회가 `null`이 되어 “설정된 어가를 찾을 수 없습니다” 오류로 연결됩니다.

로그인하지 않은 Supabase Data API 요청은 `anon` Postgres 역할을 사용합니다. `auth.uid()`는 이 흐름에서 `null`이므로 `auth.uid()` 기반 정책만으로는 접근을 허용할 수 없습니다.

## 3. 허용 범위

| 대상 | `anon` 허용 작업 | 행 제한 |
| --- | --- | --- |
| `farms` | `SELECT` | `id = FARM_ID` |
| `tank_groups` | `SELECT`, `INSERT`, `UPDATE` | `farm_id = FARM_ID` |
| `tanks` | `SELECT`, `INSERT`, `UPDATE` | `farm_id = FARM_ID` |
| `photos` | `SELECT` | `farm_id = FARM_ID` |
| `ai_results` | `SELECT` | `farm_id = FARM_ID` |
| `storage.objects` | `SELECT` | `bucket_id = 'fish-photos'` 및 첫 폴더가 `FARM_ID` |

다음 작업은 `anon`에 허용하지 않습니다.

- `farms` 생성·수정·삭제
- `photos`, `ai_results` 생성·수정·삭제
- Storage 객체 업로드·수정·삭제
- 모든 대상 테이블의 `DELETE`
- 다른 `farm_id`의 조회·삽입·수정
- `alerts` 접근 및 신규 자동 경보 생성

사진·AI 결과·Storage 객체 저장은 Cloud Run 백엔드의 서버 전용 키만 담당합니다.

## 4. 적용 전 정책 점검

기존의 넓은 permissive 정책이 남아 있으면 새 정책과 `OR`로 결합되어 접근 범위가 넓어질 수 있습니다. 먼저 아래 결과를 확인하고, `anon`에 전체 행을 허용하거나 legacy JWT의 특정 claim에만 의존하는 충돌 정책을 제거해 주세요.

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public' and tablename in (
  'farms',
  'tank_groups',
  'tanks',
  'photos',
  'ai_results'
))
or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;
```

## 5. 권장 SQL 템플릿

아래 SQL은 정책 이름과 컬럼 구성을 실제 DB 마이그레이션에 맞춰 검토한 뒤 적용해 주세요. 특히 `tanks.active`, `tanks.stocked_info`, `photos.tank_id`, `ai_results.tank_id`, `ai_results.request_id`가 아직 없다면 선행 스키마 마이그레이션이 필요합니다.

```sql
begin;

-- Data API가 테이블에 도달할 수 있도록 최소 권한을 부여합니다.
grant usage on schema public to anon;

-- 기존의 넓은 쓰기 grant를 먼저 제거한 뒤 필요한 컬럼만 다시 허용합니다.
revoke insert, update, delete on public.farms from anon;
revoke insert, update, delete on public.tank_groups from anon;
revoke insert, update, delete on public.tanks from anon;
revoke insert, update, delete on public.photos from anon;
revoke insert, update, delete on public.ai_results from anon;

grant select on public.farms to anon;
grant select on public.tank_groups to anon;
grant insert (farm_id, name) on public.tank_groups to anon;
grant update (name) on public.tank_groups to anon;
grant select on public.tanks to anon;
grant insert (farm_id, tank_group_id, code, stocked_at, stocked_info, active)
  on public.tanks to anon;
grant update (tank_group_id, stocked_at, stocked_info, active)
  on public.tanks to anon;
grant select on public.photos to anon;
grant select on public.ai_results to anon;

alter table public.farms enable row level security;
alter table public.tank_groups enable row level security;
alter table public.tanks enable row level security;
alter table public.photos enable row level security;
alter table public.ai_results enable row level security;

drop policy if exists "nupchi_anon_select_fixed_farm" on public.farms;
create policy "nupchi_anon_select_fixed_farm"
on public.farms
for select
to anon
using (id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_select_fixed_farm_groups" on public.tank_groups;
create policy "nupchi_anon_select_fixed_farm_groups"
on public.tank_groups
for select
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_insert_fixed_farm_groups" on public.tank_groups;
create policy "nupchi_anon_insert_fixed_farm_groups"
on public.tank_groups
for insert
to anon
with check (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_update_fixed_farm_groups" on public.tank_groups;
create policy "nupchi_anon_update_fixed_farm_groups"
on public.tank_groups
for update
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid)
with check (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_select_fixed_farm_tanks" on public.tanks;
create policy "nupchi_anon_select_fixed_farm_tanks"
on public.tanks
for select
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_insert_fixed_farm_tanks" on public.tanks;
create policy "nupchi_anon_insert_fixed_farm_tanks"
on public.tanks
for insert
to anon
with check (
  farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid
  and exists (
    select 1
    from public.tank_groups as target_group
    where target_group.id = tanks.tank_group_id
      and target_group.farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid
  )
);

drop policy if exists "nupchi_anon_update_fixed_farm_tanks" on public.tanks;
create policy "nupchi_anon_update_fixed_farm_tanks"
on public.tanks
for update
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid)
with check (
  farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid
  and exists (
    select 1
    from public.tank_groups as target_group
    where target_group.id = tanks.tank_group_id
      and target_group.farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid
  )
);

drop policy if exists "nupchi_anon_select_fixed_farm_photos" on public.photos;
create policy "nupchi_anon_select_fixed_farm_photos"
on public.photos
for select
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

drop policy if exists "nupchi_anon_select_fixed_farm_ai_results" on public.ai_results;
create policy "nupchi_anon_select_fixed_farm_ai_results"
on public.ai_results
for select
to anon
using (farm_id = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'::uuid);

-- Private Storage의 signed URL 생성에는 storage.objects SELECT 정책이 필요합니다.
grant select on storage.objects to anon;

drop policy if exists "nupchi_anon_select_fixed_farm_photos_storage" on storage.objects;
create policy "nupchi_anon_select_fixed_farm_photos_storage"
on storage.objects
for select
to anon
using (
  bucket_id = 'fish-photos'
  and (storage.foldername(name))[1] = '464a0fe1-aa31-4f84-a01c-c1b42cbb1126'
);

revoke insert, update, delete on storage.objects from anon;

commit;
```

### 컬럼 권한 전제

위 템플릿은 프론트에서 사용하는 컬럼에만 column-level `INSERT/UPDATE` grant를 부여합니다.

- `tank_groups`: `farm_id`, `name`
- `tanks`: `farm_id`, `tank_group_id`, `code`, `stocked_at`, `stocked_info`, `active`

`id`, `created_at`은 DB 기본값으로 생성하고 프론트가 임의 수정할 수 없게 유지합니다.

## 6. 검증 항목

### 정책/권한 검증

- [ ] publishable key로 `farms?id=eq.FARM_ID` 조회 시 정확히 1행 반환
- [ ] publishable key로 대상 어가의 `tank_groups`, `tanks` 조회 가능
- [ ] 다른 임의 `farm_id` 조회 시 0행 반환
- [ ] 대상 어가의 수조 그룹 및 수조 생성·수정 성공
- [ ] 다른 `farm_id`로 그룹·수조 삽입 시 RLS 오류
- [ ] 수조를 다른 어가의 `tank_group_id`에 연결하려는 요청 차단
- [ ] publishable key로 `farms`, `photos`, `ai_results` 삽입·수정·삭제 차단
- [ ] publishable key로 모든 대상 테이블의 삭제 차단
- [ ] `fish-photos/<FARM_ID>/...` 경로 signed URL 생성 성공
- [ ] 다른 어가 폴더의 Storage 객체 조회 및 signed URL 생성 차단
- [ ] Cloud Run 서버 전용 키를 통한 사진·AI 결과 저장은 계속 성공

### 프론트 완료 조건

- [ ] 홈에서 실제 어가명과 수조 목록 표시
- [ ] “수조 정보를 불러오지 못했어요” 오류가 사라짐
- [ ] 새 수조 코드와 수조군을 임의로 추가 가능
- [ ] 수조 수정 후 새로고침해도 변경 내용 유지
- [ ] 수조별 `ai_results` 이력과 비공개 사진 표시
- [ ] 로그인 UI와 `alerts` UI 없이 전체 흐름 동작

## 7. 회신 요청

적용 후 아래 내용을 전달해 주세요.

- 적용한 migration 파일 또는 SQL
- 실제 적용한 policy 이름과 대상 역할
- `FARM_ID` 확인값
- publishable key 기반 양성/음성 테스트 결과
- Storage 객체 경로 규칙
- 프론트 재검증 가능한 배포/적용 시각

참고 문서:

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
