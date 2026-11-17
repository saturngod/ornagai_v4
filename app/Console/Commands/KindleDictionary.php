<?php

namespace App\Console\Commands;

use App\Models\EnglishWord;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class KindleDictionary extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:kindle-dictionary {--output=dictionary.html : Output file name} {--format= : Text format (e.g. kindle for Kindle Myanmar rendering)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate Kindle Dictionary HTML format from EnglishWord data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $outputFileName = $this->option('output');
        $format = strtolower((string) $this->option('format'));
        $useKindleRender = $format === 'kindle';
        $wordsPerFile = 3000;
        
        $this->info('Starting Kindle Dictionary generation...');
        if ($useKindleRender) {
            $this->info('Applying Kindle Myanmar rendering format...');
        }
        
        // Get total count of words
        $totalWords = EnglishWord::count();
        $this->info("Total words to process: {$totalWords}");
        
        // Calculate number of files needed
        $totalFiles = ceil($totalWords / $wordsPerFile);
        $this->info("Will generate {$totalFiles} files with {$wordsPerFile} words each");
        
        // Process words in chunks
        $fileIndex = 1;
        EnglishWord::with(['wordData.examples'])
            ->orderBy('word')
            ->chunk($wordsPerFile, function ($words) use (&$fileIndex, $outputFileName, $totalFiles, $useKindleRender) {
                $fileName = $this->generateFileName($outputFileName, $fileIndex, $totalFiles);
                $this->generateDictionaryFile($words, $fileName, $useKindleRender);
                
                $this->info("Generated file {$fileIndex}: {$fileName}");
                $fileIndex++;
            });
        
        $this->info('Kindle Dictionary generation completed!');
    }
    
    /**
     * Generate filename for the chunk
     */
    private function generateFileName(string $baseFileName, int $index, int $total): string
    {
        $pathInfo = pathinfo($baseFileName);
        $name = $pathInfo['filename'];
        $extension = $pathInfo['extension'] ?? 'html';
        
        if ($total > 1) {
            return "{$name}_part_{$index}.{$extension}";
        }
        
        return $baseFileName;
    }
    
    /**
     * Generate dictionary HTML file for a chunk of words
     */
    private function generateDictionaryFile($words, string $fileName, bool $useKindleRender = false): void
    {
        $html = $this->generateHTMLHeader();
        $html .= $this->generateBodyStart();
        
        foreach ($words as $word) {
            $html .= $this->generateWordEntry($word, $useKindleRender);
        }
        
        $html .= $this->generateBodyEnd();
        
        // Save to storage
        Storage::disk('public')->put($fileName, $html);
    }
    
    /**
     * Generate HTML header with Kindle dictionary format
     */
    private function generateHTMLHeader(): string
    {
        return '<!DOCTYPE html>
<html xmlns:math="http://exslt.org/math" xmlns:svg="http://www.w3.org/2000/svg"
      xmlns:tl="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
      xmlns:saxon="http://saxon.sf.net/" xmlns:xs="http://www.w3.org/2001/XMLSchema"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:cx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:mbp="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
      xmlns:mmc="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf"
      xmlns:idx="https://kindlegen.s3.amazonaws.com/AmazonKindlePublishingGuidelines.pdf">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
      h5 {
          font-size: 1em;
          margin: 0;
      }
      dt {
          font-weight: bold;
      }
      dd {
          margin: 0;
          padding: 0 0 0.5em 0;
          display: block
      }
      .part-of-speech {
          font-style: italic;
          color: #666;
      }
      .pronunciation {
          color: #888;
      }
      .example {
          font-style: italic;
          color: #555;
          margin-left: 1em;
      }
    </style>
  </head>
  <body>
    <mbp:frameset>
';
    }
    
    /**
     * Generate body start
     */
    private function generateBodyStart(): string
    {
        return '';
    }
    
    /**
     * Generate word entry for Kindle dictionary format
     */
    private function generateWordEntry(EnglishWord $word, bool $useKindleRender = false): string
    {
        $html = '<idx:entry name="default" scriptable="yes" spell="yes">' . "\n";
        $html .= '  <h5><dt><idx:orth>' . htmlspecialchars($word->word, ENT_XML1, 'UTF-8') . '</idx:orth></dt></h5>' . "\n";
        
        // Process each word data (different definitions/parts of speech)
        foreach ($word->wordData as $index => $wordData) {
            $html .= '  <dd>' . "\n";
            
            // Add part of speech and pronunciation if available
            $extraInfo = [];
            if ($wordData->state) {
                $extraInfo[] = '<span class="part-of-speech">' . htmlspecialchars($wordData->state, ENT_XML1, 'UTF-8') . '</span>';
            }
            if ($wordData->ipa) {
                $extraInfo[] = '<span class="pronunciation">/' . htmlspecialchars($wordData->ipa, ENT_XML1, 'UTF-8') . '/</span>';
            }
            
            if (!empty($extraInfo)) {
                $html .= '    ' . implode(' ', $extraInfo) . '<br/>' . "\n";
            }
            
            // Add definition
            if ($wordData->def) {
                $definition = $this->formatText($wordData->def, $useKindleRender);
                $html .= '    <span class="definition">';
                $html .= '    ' . ($index + 1) . '. ' . $definition . "\n";
                $html .= '    </span>' . "\n";
            }
            
            // Add examples
            if ($wordData->examples && $wordData->examples->count() > 0) {
                $html .= '<br/>' . "\n";
                foreach ($wordData->examples as $example) {
                    $exampleText = $this->formatText((string) $example->example, $useKindleRender);
                    $html .= '    <div class="example">• ' . $exampleText . '</div>' . "\n";
                }
            }
            
            $html .= '  </dd>' . "\n";
            
            // Add separator between definitions
            if ($index < $word->wordData->count() - 1) {
                $html .= '<br/>' . "\n";
            }
        }
        
        $html .= '</idx:entry>' . "\n";
        $html .= '<hr/>' . "\n";
        
        return $html;
    }

    /**
     * Optionally reorder Myanmar text for Kindle rendering and escape for XML/HTML output.
     */
    private function formatText(string $text, bool $useKindleRender): string
    {
        if ($useKindleRender) {
            $text = $this->kindleDictRender($text);
        }

        return htmlspecialchars($text, ENT_XML1, 'UTF-8');
    }

    /**
     * Reorder Myanmar Unicode pre-base signs for Kindle's Unicode font renderer.
     */
    private function kindleDictRender(string $text): string
    {
        $rules = [
            // 1. Move vowel sign E (\u{1031}) before consonant + optional subscript/kinzi + optional medials (\u{103B}-\u{103E})
            '~([\x{1000}-\x{1021}\x{1023}-\x{102A}\x{103F}\x{1040}-\x{1049}])(\x{103A}?\x{1039}[\x{1000}-\x{1021}])?([\x{103B}-\x{103E}]*)\x{1031}~u' => "\u{1031}$1$2$3",

            // 2. Move medial Ra (\u{103C}) before consonant + optional subscript/kinzi
            '~([\x{1000}-\x{1021}\x{1023}-\x{102A}\x{103F}\x{1040}-\x{1049}])(\x{103A}?\x{1039}[\x{1000}-\x{1021}])?\x{103C}~u' => "\u{103C}$1$2",
        ];

        return preg_replace(array_keys($rules), array_values($rules), $text) ?? $text;
    }
    
    /**
     * Generate body end
     */
    private function generateBodyEnd(): string
    {
        return '    </mbp:frameset>
  </body>
</html>';
    }
}