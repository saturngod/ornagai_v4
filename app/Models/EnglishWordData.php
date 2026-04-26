<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class EnglishWordData extends Model
{
    protected $fillable = [
        'english_word_id',
        'ipa',
        'state',
        'def',
        'voice'
    ];

    protected $appends = ['uk_voice_url', 'us_voice_url'];

    /**
     * Get the English word that this data belongs to.
     */
    public function englishWord()
    {
        return $this->belongsTo(EnglishWord::class);
    }

    /**
     * Get the examples for this word data.
     */
    public function examples()
    {
        return $this->hasMany(EnglishWordDataExample::class);
    }

    public function getUkVoiceUrlAttribute(): ?string
    {
        if (!$this->voice) {
            return null;
        }

        return Storage::disk('s3')->temporaryUrl("uk/{$this->voice}.ogg", now()->addMinutes(5));
    }

    public function getUsVoiceUrlAttribute(): ?string
    {
        if (!$this->voice) {
            return null;
        }

        return Storage::disk('s3')->temporaryUrl("us/{$this->voice}.ogg", now()->addMinutes(5));
    }
}
