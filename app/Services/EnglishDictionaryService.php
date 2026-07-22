<?php

namespace App\Services;

use App\Contracts\EnglishDictionaryServiceInterface;
use App\Models\EnglishWord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class EnglishDictionaryService implements EnglishDictionaryServiceInterface
{
    /**
     * Search for English words based on query string
     *
     * @param string|null $query
     * @param int $limit
     * @return Collection
     */
    public function search(?string $query, int $limit = 10): Collection
    {
        if (!$query) {
            return $this->baseQuery()->limit($limit)->get();
        }

        $term = $this->escapeLike($query);

        // Ordering by word puts the exact match first: it is a prefix of every
        // other match, so it is always the shortest and sorts ahead of them.
        $words = $this->baseQuery()
            ->where('word', 'like', $term . '%')
            ->orderBy('word')
            ->limit($limit)
            ->get();

        if ($words->count() >= $limit) {
            return $words;
        }

        // A leading wildcard cannot use english_words_word_index, so only reach
        // for it when the indexed prefix scan did not fill the page. Words that
        // merely end with the term rank below those matching it mid-word.
        $contains = $this->baseQuery()
            ->where('word', 'like', '%' . $term . '%')
            ->whereNotIn('id', $words->modelKeys())
            ->orderByRaw('CASE WHEN word LIKE ? THEN 2 ELSE 1 END, word ASC', ['%' . $term])
            ->limit($limit - $words->count())
            ->get();

        return $words->merge($contains);
    }

    protected function baseQuery(): Builder
    {
        return EnglishWord::with(['wordData.examples']);
    }

    protected function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $value);
    }
}
