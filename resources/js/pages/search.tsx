import HomeLayout from "@/layouts/home-layout"
import DualVoiceButtons from "@/components/DualVoiceButtons"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search } from "lucide-react"

interface WordDataExample {
    id: number
    example: string
}

interface WordData {
    id: number
    ipa?: string
    state?: string
    def: string
    voice?: string
    uk_voice_url?: string | null
    us_voice_url?: string | null
    examples?: WordDataExample[]
}

interface MyanmarWordData {
    id: number
    phonetics?: string
    state?: string
    meaning?: string
}

interface EnglishWord {
    id: number
    word: string
    word_data?: WordData[]
}

interface MyanmarWord {
    id: number
    word: string
    myanmar_word_data?: MyanmarWordData[]
}

interface SearchProps {
    query?: string
    words?: EnglishWord[]
    myWords?: MyanmarWord[]
}

const WordDefinition = ({ data, word, isEnglish }: { data: WordData; word: string; isEnglish: boolean }) => (
    <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
                {data.ipa && (
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-mono tracking-wide">
                        /{data.ipa}/
                    </span>
                )}
                {data.state && (
                    <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        {data.state}
                    </Badge>
                )}
            </div>
            {isEnglish && (
                <DualVoiceButtons text={word} ukVoiceUrl={data.uk_voice_url} usVoiceUrl={data.us_voice_url} />
            )}
        </div>
        
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.def}</p>
        
        {data.examples?.length ? (
            <div className="pt-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Examples
                </h4>
                <div className="space-y-2">
                    {data.examples.map(example => (
                        <div key={example.id} className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-700/50">
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                                &ldquo;{example.example}&rdquo;
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        ) : null}
    </div>
)

const MyanmarDefinition = ({ data }: { data: MyanmarWordData }) => (
    <div className="pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            {data.phonetics && (
                <span className="text-gray-500 dark:text-gray-400 text-sm font-mono tracking-wide">
                    /{data.phonetics}/
                </span>
            )}
            {data.state && (
                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                    {data.state}
                </Badge>
            )}
        </div>
        {data.meaning && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.meaning}</p>
        )}
    </div>
)

const WordCard = ({ word, type = "english" }: { word: EnglishWord | MyanmarWord; type?: "english" | "myanmar" }) => {
    const isEnglish = type === "english"
    const wordData = isEnglish ? (word as EnglishWord).word_data : (word as MyanmarWord).myanmar_word_data
    const definitions = wordData ?? []
    
    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-4">
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight break-words">
                        {word.word}
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {isEnglish ? "English" : "Myanmar"} • {definitions.length} {definitions.length === 1 ? "definition" : "definitions"}
                    </p>
                </div>
            </CardHeader>
            
            <CardContent>
                {definitions.length > 0 ? (
                    <div className="space-y-6">
                        {wordData?.map((data, index) => (
                            <div key={data.id}>
                                {index > 0 && (
                                    <div className="mb-6 border-t border-gray-100 dark:border-gray-800" />
                                )}
                                {isEnglish ? (
                                    <WordDefinition data={data as WordData} word={word.word} isEnglish={isEnglish} />
                                ) : (
                                    <MyanmarDefinition data={data as MyanmarWordData} />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <BookOpen className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            No definitions available
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const SearchResultsHeader = ({ query, englishCount, myanmarCount }: { query: string; englishCount: number; myanmarCount: number }) => {
    const total = englishCount + myanmarCount
    return (
        <div className="space-y-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Results for &ldquo;{query}&rdquo;
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {total} {total === 1 ? "result" : "results"} found
                {englishCount > 0 && myanmarCount > 0 && (
                    <span> • {englishCount} English, {myanmarCount} Myanmar</span>
                )}
            </p>
        </div>
    )
}

const EmptyState = ({ query }: { query?: string }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        {query ? (
            <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No results found
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                    No definitions found for &ldquo;{query}&rdquo;. Try checking the spelling or searching for a different word.
                </p>
            </>
        ) : (
            <>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Start searching
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                    Enter a word in English or Myanmar to find definitions and pronunciations.
                </p>
            </>
        )}
    </div>
)

export default function SearchPage({ query, words, myWords }: SearchProps) {
    const englishWords = words ?? []
    const myanmarWords = myWords ?? []
    const hasResults = englishWords.length > 0 || myanmarWords.length > 0

    if (!query) {
        return (
            <HomeLayout searchValue="">
                <EmptyState />
            </HomeLayout>
        )
    }

    if (!hasResults) {
        return (
            <HomeLayout searchValue={query}>
                <EmptyState query={query} />
            </HomeLayout>
        )
    }

    return (
        <HomeLayout searchValue={query}>
            <div className="py-6 space-y-6">
                <SearchResultsHeader 
                    query={query} 
                    englishCount={englishWords.length} 
                    myanmarCount={myanmarWords.length} 
                />
                
                <div className="space-y-4">
                    {englishWords.map(word => (
                        <WordCard key={`en-${word.id}`} word={word} type="english" />
                    ))}
                    
                    {myanmarWords.map(word => (
                        <WordCard key={`my-${word.id}`} word={word} type="myanmar" />
                    ))}
                </div>
            </div>
        </HomeLayout>
    )
}