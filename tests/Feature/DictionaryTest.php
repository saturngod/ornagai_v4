<?php

namespace Tests\Feature;

use App\Models\EnglishWord;
use App\Models\MyanmarWord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DictionaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_page_renders(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('home'));
    }

    public function test_english_search_returns_definitions_and_examples(): void
    {
        $word = EnglishWord::create(['word' => 'hello']);
        $definition = $word->wordData()->create(['def' => 'A greeting']);
        $definition->examples()->create(['example' => 'Hello, world!']);
        EnglishWord::create(['word' => 'goodbye']);

        $this->get('/search?q=hello')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('search')
            ->where('query', 'hello')
            ->has('words', 1)
            ->where('words.0.word', 'hello')
            ->where('words.0.word_data.0.def', 'A greeting')
            ->where('words.0.word_data.0.examples.0.example', 'Hello, world!')
            ->has('myWords', 0));
    }

    public function test_myanmar_search_returns_meanings(): void
    {
        $word = new MyanmarWord;
        $word->word = 'မင်္ဂလာပါ';
        $word->save();
        $meaning = $word->myanmarWordData()->make();
        $meaning->meaning = 'hello';
        $meaning->save();

        $this->get('/search?'.http_build_query(['q' => 'မင်္ဂလာပါ']))
            ->assertOk()->assertInertia(fn (Assert $page) => $page
                ->component('search')
                ->where('query', 'မင်္ဂလာပါ')
                ->has('words', 0)
                ->has('myWords', 1)
                ->where('myWords.0.myanmar_word_data.0.meaning', 'hello'));
    }
}
