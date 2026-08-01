# Chatbot Regression Matrix

Use a fresh authenticated student session for each case. Verify both the
answer and `explanation.nodes[*].dataset/result`; an answer that uses the wrong
source is a failure.

| Category | Example question | Required source | Required classification |
| --- | --- | --- | --- |
| Personal | Berapa IPK saya? | `academic_views` | `personal` |
| Personal | Nilai apa saja yang perlu saya perbaiki? | `academic_views` | `personal` |
| Personal | Mata kuliah apa saja yang belum lulus? | `academic_views` | `personal` |
| Curriculum | Mata kuliah apa saja di TI 2020? | `curriculum_catalog` | `curriculum` |
| Curriculum | Mata kuliah apa saja di TI 2025? | `curriculum_catalog` | `curriculum` |
| Curriculum | Konsentrasi TI 2025 apa saja? | `curriculum_catalog` | `curriculum` |
| Curriculum | Apa mata kuliah konsentrasi Sistem Komputer TI 2025? | `curriculum_catalog` | `curriculum` |
| General | Apa itu MBKM? | `dokumen_akademik_resmi` | `general` |
| General | Apa syarat wisuda? | `dokumen_akademik_resmi` | `general` |
| Schedule | Jadwal saya hari Selasa apa? | `dokumen_akademik_resmi` and student semester when needed | `general` or `hybrid` |
| Hybrid | Apakah saya memenuhi syarat wisuda? | `academic_views` and `dokumen_akademik_resmi` | `hybrid` |
| Hybrid | Apakah saya bisa KTW? | `academic_views` and `dokumen_akademik_resmi` | `hybrid` |
| Out of scope | Buatkan kode JavaScript untuk login | no academic source | `out_of_scope` |

## Routing Rules

- Curriculum questions are routed by a deterministic input hint to
  `Execute curriculum catalog in Postgres`.
- Personal questions are routed by a deterministic input hint to
  `Execute a SQL query in Postgres`.
- Hybrid questions are routed by a deterministic input hint to both personal
  Postgres and the official-document vector store.
- The `Explanation` node rejects curriculum answers when the catalog tool was
  not called and rejects hybrid answers when personal data was not retrieved.
- The catalog SQL scopes concentration joins to the requested curriculum ID;
  mappings from another curriculum must never appear in the result.
- The production Gemini agent uses a compact system prompt to avoid exhausting
  free-tier input-token quota. Agent retry is disabled so a quota `429` does not
  multiply requests.

## Live Smoke Results

Verified on the active GCP revision after the routing fix:

- TI-2020 catalog: `curriculum_catalog:found`, 93 courses.
- TI-2025 concentration list: `curriculum_catalog:found`, exactly SK/RPL/TI.
- TI-2025 Sistem Komputer courses: `curriculum_catalog:found`, 6 courses.
- Student IPK: `academic_views:found`, classification `personal`.
- MBKM: `dokumen_akademik_resmi:found`, classification `general`.
- Eligibility/wisuda: both `academic_views:found` and
  `dokumen_akademik_resmi:found`, classification `hybrid`.
