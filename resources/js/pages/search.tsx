import HomeLayout from "@/layouts/home-layout"
import DualVoiceButtons from "@/components/DualVoiceButtons"
import SimplePronunciationButton from "@/components/SimplePronunciationButton"

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
    <div className="border-l-2 border-blue-400 pl-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            {data.ipa && (
                <span className="text-gray-500 dark:text-gray-400 text-sm font-ipa">
                    /{data.ipa}/
                </span>
            )}
            {data.state && (
                <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                    {data.state}
                </span>
            )}
            {isEnglish && (
                <DualVoiceButtons text={word} ukVoiceUrl={data.uk_voice_url} usVoiceUrl={data.us_voice_url} />
            )}
        </div>
        
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{data.def}</p>
        
        {data.examples?.length && (
            <div className="mt-4 space-y-2">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Examples
                </h4>
                <div className="space-y-2">
                    {data.examples.map(example => (
                        <div key={example.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                    "{example.example}"
                                </p>
                            </div>
                            <SimplePronunciationButton 
                                text={example.example} 
                                accent="us"
                                className="opacity-60 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
)

const MyanmarDefinition = ({ data }: { data: MyanmarWordData }) => (
    <div className="border-l-2 border-green-400 pl-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            {data.phonetics && (
                <span className="text-gray-500 dark:text-gray-400 text-sm font-ipa">
                    /{data.phonetics}/
                </span>
            )}
            {data.state && (
                <span className="text-xs px-2 py-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800">
                    {data.state}
                </span>
            )}
        </div>
        {data.meaning && (
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{data.meaning}</p>
        )}
    </div>
)

const WordCard = ({ word, type = "english" }: { word: EnglishWord | MyanmarWord; type?: "english" | "myanmar" }) => {
    const isEnglish = type === "english"
    const wordData = isEnglish ? (word as EnglishWord).word_data : (word as MyanmarWord).myanmar_word_data
    
    return (
        <article className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-6 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
            <header className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 break-words">
                    {word.word}
                </h2>
            </header>
            
            {wordData?.length ? (
                <div className="space-y-6">
                    {wordData.map(data =>
                        isEnglish ? (
                            <WordDefinition key={data.id} data={data as WordData} word={word.word} isEnglish={isEnglish} />
                        ) : (
                            <MyanmarDefinition key={data.id} data={data as MyanmarWordData} />
                        )
                    )}
                </div>
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                        No definitions available for this word.
                    </p>
                </div>
            )}
        </article>
    )
}

export default function SearchPage({ query, words, myWords }: SearchProps) {
    if (!query) {
        return (
            <HomeLayout searchValue="">
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No search query provided</p>
                </div>
            </HomeLayout>
        )
    }

    const hasResults = (words?.length ?? 0) > 0 || (myWords?.length ?? 0) > 0

    if (!hasResults) {
        return (
            <HomeLayout searchValue={query}>
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No results found for "{query}"</p>
                </div>
            </HomeLayout>
        )
    }

    return (
        <HomeLayout searchValue={query}>
            <div className="py-8 space-y-6">
                {words?.map(word => <WordCard key={word.id} word={word} type="english" />)}
                
                {myWords && myWords.length > 0 && (
                    <>
                        {myWords.map(word => <WordCard key={word.id} word={word} type="myanmar" />)}
                    </>
                )}
            </div>
        </HomeLayout>
    )
}
