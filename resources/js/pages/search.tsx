import DualVoiceButtons from '@/components/DualVoiceButtons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import HomeLayout from '@/layouts/home-layout';
import { BookOpen, Search } from 'lucide-react';

interface WordDataExample {
    id: number;
    example: string;
}

interface WordData {
    id: number;
    ipa?: string;
    ipa_mm?: string;
    state?: string;
    def: string;
    voice?: string;
    uk_voice_url?: string | null;
    us_voice_url?: string | null;
    examples?: WordDataExample[];
}

interface MyanmarWordData {
    id: number;
    phonetics?: string;
    state?: string;
    meaning?: string;
}

interface EnglishWord {
    id: number;
    word: string;
    word_data?: WordData[];
}

interface MyanmarWord {
    id: number;
    word: string;
    myanmar_word_data?: MyanmarWordData[];
}

interface SearchProps {
    query?: string;
    words?: EnglishWord[];
    myWords?: MyanmarWord[];
}

const WordDefinition = ({ data, word, isEnglish }: { data: WordData; word: string; isEnglish: boolean }) => (
    <div className="space-y-3 border-l-2 border-blue-200 pl-4 dark:border-blue-800">
        <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
                {data.ipa && <span className="font-mono text-sm tracking-wide text-gray-500 dark:text-gray-400">/{data.ipa}/</span>}
                {data.ipa_mm && <span className="text-sm text-gray-500 dark:text-gray-400">/{data.ipa_mm}/</span>}
                {data.state && (
                    <Badge
                        variant="secondary"
                        className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                    >
                        {data.state}
                    </Badge>
                )}
            </div>
            {isEnglish && <DualVoiceButtons text={word} ukVoiceUrl={data.uk_voice_url} usVoiceUrl={data.us_voice_url} />}
        </div>

        <p className="leading-relaxed text-gray-700 dark:text-gray-300">{data.def}</p>

        {data.examples?.length ? (
            <div className="space-y-2 pt-3">
                <h4 className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">Examples</h4>
                <div className="space-y-2">
                    {data.examples.map((example) => (
                        <div
                            key={example.id}
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/30"
                        >
                            <p className="text-sm text-gray-600 italic dark:text-gray-400">&ldquo;{example.example}&rdquo;</p>
                        </div>
                    ))}
                </div>
            </div>
        ) : null}
    </div>
);

const MyanmarDefinition = ({ data }: { data: MyanmarWordData }) => (
    <div className="space-y-3 border-l-2 border-emerald-200 pl-4 dark:border-emerald-800">
        <div className="flex flex-wrap items-center gap-3">
            {data.phonetics && <span className="font-mono text-sm tracking-wide text-gray-500 dark:text-gray-400">/{data.phonetics}/</span>}
            {data.state && (
                <Badge
                    variant="secondary"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                >
                    {data.state}
                </Badge>
            )}
        </div>
        {data.meaning && (
            <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                {data.meaning.split('\\n').map((line, i, arr) => (
                    <span key={i}>
                        {line}
                        {i < arr.length - 1 && <br />}
                    </span>
                ))}
            </p>
        )}
    </div>
);

const WordCard = ({ word, type = 'english' }: { word: EnglishWord | MyanmarWord; type?: 'english' | 'myanmar' }) => {
    const isEnglish = type === 'english';
    const wordData = isEnglish ? (word as EnglishWord).word_data : (word as MyanmarWord).myanmar_word_data;
    const definitions = wordData ?? [];

    return (
        <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="pb-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold tracking-tight break-words text-gray-900 sm:text-2xl dark:text-gray-50">{word.word}</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {isEnglish ? 'English' : 'Myanmar'} • {definitions.length} {definitions.length === 1 ? 'definition' : 'definitions'}
                    </p>
                </div>
            </CardHeader>

            <CardContent>
                {definitions.length > 0 ? (
                    <div className="space-y-6">
                        {wordData?.map((data, index) => (
                            <div key={data.id}>
                                {index > 0 && <div className="mb-6 border-t border-gray-100 dark:border-gray-800" />}
                                {isEnglish ? (
                                    <WordDefinition data={data as WordData} word={word.word} isEnglish={isEnglish} />
                                ) : (
                                    <MyanmarDefinition data={data as MyanmarWordData} />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center">
                        <BookOpen className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">No definitions available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const SearchResultsHeader = ({ query, englishCount, myanmarCount }: { query: string; englishCount: number; myanmarCount: number }) => {
    const total = englishCount + myanmarCount;
    return (
        <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Results for &ldquo;{query}&rdquo;</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {total} {total === 1 ? 'result' : 'results'} found
                {englishCount > 0 && myanmarCount > 0 && (
                    <span>
                        {' '}
                        • {englishCount} English, {myanmarCount} Myanmar
                    </span>
                )}
            </p>
        </div>
    );
};

const EmptyState = ({ query }: { query?: string }) => (
    <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        {query ? (
            <>
                <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">No results found</h3>
                <p className="max-w-sm text-center text-gray-500 dark:text-gray-400">
                    No definitions found for &ldquo;{query}&rdquo;. Try checking the spelling or searching for a different word.
                </p>
            </>
        ) : (
            <>
                <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-gray-100">Start searching</h3>
                <p className="max-w-sm text-center text-gray-500 dark:text-gray-400">
                    Enter a word in English or Myanmar to find definitions and pronunciations.
                </p>
            </>
        )}
    </div>
);

export default function SearchPage({ query, words, myWords }: SearchProps) {
    const englishWords = words ?? [];
    const myanmarWords = myWords ?? [];
    const hasResults = englishWords.length > 0 || myanmarWords.length > 0;

    if (!query) {
        return (
            <HomeLayout searchValue="">
                <EmptyState />
            </HomeLayout>
        );
    }

    if (!hasResults) {
        return (
            <HomeLayout searchValue={query}>
                <EmptyState query={query} />
            </HomeLayout>
        );
    }

    return (
        <HomeLayout searchValue={query}>
            <div className="space-y-6 py-6">
                <SearchResultsHeader query={query} englishCount={englishWords.length} myanmarCount={myanmarWords.length} />

                <div className="space-y-4">
                    {englishWords.map((word) => (
                        <WordCard key={`en-${word.id}`} word={word} type="english" />
                    ))}

                    {myanmarWords.map((word) => (
                        <WordCard key={`my-${word.id}`} word={word} type="myanmar" />
                    ))}
                </div>
            </div>
        </HomeLayout>
    );
}
