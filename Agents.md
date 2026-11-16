# Agents Guide

Notes for AI agents working on this repository (Ornagai — English ⇄ Myanmar dictionary, Laravel + React/Inertia).

## Database Design

Default connection is `sqlite` locally (`DB_CONNECTION` in `.env`); production uses MySQL (see `GUIDE.md`).
Schema lives in `database/migrations/`. Dictionary data is imported, not seeded.

### English dictionary (English → Myanmar)

```
english_words 1 ──< english_word_data 1 ──< english_word_data_examples
```

**`english_words`** — one row per headword.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `word` | string | indexed (`english_words_word_index`) |
| `created_at` / `updated_at` | timestamps | |

**`english_word_data`** — one row per sense / part of speech of a word.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `english_word_id` | FK → `english_words.id` | nullable, `ON DELETE CASCADE` |
| `state` | text, nullable | part of speech (noun, verb, …) |
| `def` | text, nullable | Myanmar definition |
| `ipa` | text, nullable | pronunciation |
| `voice` | string(35), nullable | audio file key; added in `2026_04_26_230947` |
| `created_at` / `updated_at` | timestamps | |

**`english_word_data_examples`** — example sentences for a sense.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `english_word_data_id` | FK → `english_word_data.id` | nullable, `ON DELETE CASCADE` |
| `example` | text, not null | |
| `created_at` / `updated_at` | timestamps | |

### Myanmar dictionary (Myanmar → English)

```
myanmar_words 1 ──< myanmar_word_data
```

**`myanmar_words`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `word` | string, not null | indexed (`myanmar_words_word_index`) |
| `created_at` / `updated_at` | timestamps | |

**`myanmar_word_data`**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `myanmar_word_id` | FK → `myanmar_words.id` | nullable, `ON DELETE CASCADE` |
| `phonetics` | text, nullable | |
| `state` | text, nullable | part of speech |
| `meaning` | text, nullable | English meaning |
| `created_at` / `updated_at` | timestamps | |

### Legacy

**`englishes`** — flat `id`, `word` (string), `def` (string, nullable), timestamps. Created only if missing (`Schema::hasTable` guard). Legacy import table; not used by the app's search.

### Framework tables

`users`, `password_reset_tokens`, `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs` — standard Laravel defaults.

## Models (`app/Models`)

| Model | Table | Fillable | Relations / extras |
|---|---|---|---|
| `EnglishWord` | `english_words` | `word` | `wordData()` hasMany `EnglishWordData` |
| `EnglishWordData` | `english_word_data` | `english_word_id`, `ipa`, `ipa_mm`, `state`, `def`, `voice` | `englishWord()` belongsTo; `examples()` hasMany `EnglishWordDataExample`; appends `uk_voice_url`, `us_voice_url` |
| `EnglishWordDataExample` | `english_word_data_examples` | `english_word_data_id`, `example` | `englishWordData()` belongsTo |
| `MyanmarWord` | `myanmar_words` | — (none) | `myanmarWordData()` hasMany `MyanmarWordData` |
| `MyanmarWordData` | `myanmar_word_data` | — (none) | no relations defined |
| `English` | `englishes` | — (none) | empty legacy model |
| `User` | `users` | `name`, `email`, `password` | default Laravel auth user |

### Voice URLs

`EnglishWordData::uk_voice_url` / `us_voice_url` return a 5‑minute S3 temporary URL for `uk/{voice}.ogg` and `us/{voice}.ogg` on the `s3` disk (`AWS_*` env vars), or `null` when `voice` is empty. Because these are in `$appends`, **every serialization of `EnglishWordData` signs two S3 URLs** — keep that in mind for bulk exports.

### Known gaps

- `ipa_mm` is in `EnglishWordData::$fillable` but no migration creates that column. Add a migration before writing to it.
- `MyanmarWord` / `MyanmarWordData` have no `$fillable` and `MyanmarWordData` has no inverse `belongsTo`; add them if you need mass assignment or reverse navigation.

## Where the models are used

- `app/Services/EnglishDictionaryService.php` — search via `EnglishWord::with(['wordData.examples'])`.
- `app/Services/MyanmarDictionaryService.php` — search via `MyanmarWord::with(['myanmarWordData'])`.
- Both services do an indexed prefix match (`word LIKE 'term%'`) first and only fall back to a `%term%` contains match when the page isn't full, since a leading wildcard can't use the `word` index. Preserve this pattern when changing search.
- `app/Console/Commands/AppleDictionary.php` and `KindleDictionary.php` — export the English dictionary by chunking `EnglishWord::with(['wordData.examples'])`.
