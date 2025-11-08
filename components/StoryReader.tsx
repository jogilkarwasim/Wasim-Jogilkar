import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateStoryImage, generateSpeech } from '../services/geminiService';
import { DEFAULT_STORY, STORY_PAGE_DELIMITER, AUDIO_SAMPLE_RATE, AUDIO_NUM_CHANNELS } from '../constants';
import Button from './Button';
import Spinner from './Spinner';
import { StoryPage } from '../types';

interface StoryReaderProps {
  onBackToMenu: () => void;
}

const StoryReader: React.FC<StoryReaderProps> = ({ onBackToMenu }) => {
  const [storyInput, setStoryInput] = useState<string>(DEFAULT_STORY);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueue = useRef<AudioBuffer[]>([]);
  const nextStartTimeRef = useRef<number>(0); // Global variable to keep track of the next audio start time

  // Initialize AudioContext on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Fix: Use standard AudioContext, webkitAudioContext is deprecated and not typed.
      audioContextRef.current = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
    }
    return audioContextRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current.disconnect();
      currentAudioSourceRef.current = null;
    }
    audioQueue.current = []; // Clear queue
    nextStartTimeRef.current = 0; // Reset start time
    setIsPlayingAudio(false);
  }, []);

  const playQueuedAudio = useCallback(async () => {
    if (audioQueue.current.length === 0 || isPlayingAudio) {
      setIsPlayingAudio(false); // Stop playing if queue is empty or already playing
      return;
    }

    setIsPlayingAudio(true);
    const audioBuffer = audioQueue.current.shift(); // Get the next buffer
    if (!audioBuffer) return;

    const audioContext = getAudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    source.onended = () => {
      currentAudioSourceRef.current = null;
      // Play next after current one ends
      if (audioQueue.current.length > 0 && isPlayingAudio) {
        playQueuedAudio();
      } else {
        setIsPlayingAudio(false);
      }
    };

    currentAudioSourceRef.current = source;

    if (nextStartTimeRef.current < audioContext.currentTime) {
      nextStartTimeRef.current = audioContext.currentTime;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration; // Update for the next chunk

  }, [getAudioContext, isPlayingAudio]);

  const generateAndPlaySpeechForPage = useCallback(async (page: StoryPage) => {
    stopAudio();
    setIsLoading(true);
    setError(null);
    try {
      const audioContext = getAudioContext();
      const audioBuffer = await generateSpeech(page.text, audioContext);
      if (audioBuffer) {
        audioQueue.current = [audioBuffer];
        nextStartTimeRef.current = 0; // Reset for a new page
        playQueuedAudio();
      } else {
        setError("Could not generate audio for this page.");
      }
    } catch (e: any) {
      setError(`Failed to generate speech: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext, playQueuedAudio, stopAudio]);

  const generateContentForPage = useCallback(async (page: StoryPage, index: number) => {
    // Check if image and audio already exist
    if (page.imageUrl && page.audioBuffer) return;

    setIsLoading(true);
    setError(null);
    try {
      const imagePromise = page.imageUrl ? Promise.resolve(page.imageUrl) : generateStoryImage(page.text);
      const audioPromise = page.audioBuffer ? Promise.resolve(page.audioBuffer) : generateSpeech(page.text, getAudioContext());

      const [imageUrl, audioBuffer] = await Promise.all([imagePromise, audioPromise]);

      setPages(prevPages => {
        const newPages = [...prevPages];
        newPages[index] = {
          ...newPages[index],
          imageUrl: imageUrl || `https://picsum.photos/400/400?random=${index}`, // Fallback placeholder
          audioBuffer: audioBuffer || undefined,
        };
        return newPages;
      });
    } catch (e: any) {
      setError(`Failed to generate content for page ${index + 1}: ${e.message}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [getAudioContext]);


  const processStory = useCallback(async (storyText: string) => {
    stopAudio();
    setIsGeneratingStory(true);
    setIsLoading(true);
    setError(null);
    try {
      const paragraphs = storyText.split(STORY_PAGE_DELIMITER).filter(p => p.trim() !== '');
      if (paragraphs.length === 0) {
        setError("Please enter a story to illustrate!");
        setPages([]);
        return;
      }

      const newPages: StoryPage[] = paragraphs.map((text, idx) => ({
        id: `page-${idx}`,
        text: text.trim(),
      }));
      setPages(newPages);
      setCurrentPageIndex(0);

      // Generate content for the first page immediately
      if (newPages.length > 0) {
        await generateContentForPage(newPages[0], 0);
      }

    } catch (e: any) {
      setError(`Failed to process story: ${e.message}`);
      console.error(e);
    } finally {
      setIsGeneratingStory(false);
      setIsLoading(false);
    }
  }, [stopAudio, generateContentForPage]);

  // Initial story processing on component mount or storyInput change
  useEffect(() => {
    processStory(storyInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // When currentPageIndex changes, ensure content for that page is loaded and play audio
  useEffect(() => {
    if (pages.length > 0 && currentPageIndex < pages.length) {
      const currentPage = pages[currentPageIndex];
      // Generate content if not already present
      if (!currentPage.imageUrl || !currentPage.audioBuffer) {
        generateContentForPage(currentPage, currentPageIndex);
      } else {
        // If content is already there, just play audio
        generateAndPlaySpeechForPage(currentPage);
      }
    }
  }, [currentPageIndex, pages, generateContentForPage, generateAndPlaySpeechForPage]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio]);

  const handleNextPage = () => {
    stopAudio();
    setCurrentPageIndex(prev => Math.min(prev + 1, pages.length - 1));
  };

  const handlePreviousPage = () => {
    stopAudio();
    setCurrentPageIndex(prev => Math.max(prev - 1, 0));
  };

  const handleApplyStory = () => {
    processStory(storyInput);
  };

  const currentStoryPage = pages[currentPageIndex];

  return (
    <div className="flex flex-col items-center w-full max-w-2xl bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-3xl font-extrabold text-purple-700 mb-6 text-center">Story Time!</h2>

      <div className="w-full mb-6">
        <label htmlFor="storyInput" className="block text-purple-700 text-lg font-semibold mb-2">
          Your Story:
        </label>
        <textarea
          id="storyInput"
          className="w-full p-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
          rows={6}
          value={storyInput}
          onChange={(e) => setStoryInput(e.target.value)}
          placeholder="Type your story here, separate pages with double newlines."
          disabled={isGeneratingStory}
        ></textarea>
        <Button
          onClick={handleApplyStory}
          className="mt-4 w-full"
          disabled={isGeneratingStory || isLoading}
          variant="primary"
          size="md"
        >
          {isGeneratingStory ? 'Generating Story...' : 'Generate Story & Illustrations'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isGeneratingStory && (
        <div className="flex flex-col items-center mb-6">
          <Spinner />
          <p className="text-purple-600 text-lg mt-2">Preparing your magical story...</p>
        </div>
      )}

      {pages.length > 0 && currentStoryPage && !isGeneratingStory && (
        <div className="bg-purple-50 p-6 rounded-xl shadow-inner w-full text-center">
          <p className="text-sm text-gray-500 mb-2">Page {currentPageIndex + 1} of {pages.length}</p>
          {isLoading && !currentStoryPage.imageUrl ? (
            <Spinner />
          ) : (
            <img
              src={currentStoryPage.imageUrl || `https://picsum.photos/400/400?random=${currentPageIndex}`}
              alt={`Illustration for page ${currentPageIndex + 1}`}
              className="w-full max-w-sm h-64 object-cover rounded-lg mx-auto mb-4 border-2 border-purple-300 shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://picsum.photos/400/400?random=${currentPageIndex}`;
                target.alt = "Failed to load illustration, showing placeholder.";
              }}
            />
          )}

          <p className="text-lg text-gray-800 mb-6 leading-relaxed font-serif">
            {currentStoryPage.text}
          </p>

          <div className="flex justify-center items-center space-x-4 mb-6">
            <Button
              onClick={() => {
                if (isPlayingAudio) {
                  stopAudio();
                } else if (currentStoryPage.audioBuffer) {
                  audioQueue.current = [currentStoryPage.audioBuffer];
                  nextStartTimeRef.current = 0;
                  playQueuedAudio();
                } else {
                  generateAndPlaySpeechForPage(currentStoryPage);
                }
              }}
              disabled={isLoading}
              variant="secondary"
              size="lg"
            >
              {isLoading ? <Spinner /> : (isPlayingAudio ? '⏸️ Pause' : '▶️ Listen')}
            </Button>
          </div>

          <div className="flex justify-between w-full mt-4">
            <Button
              onClick={handlePreviousPage}
              disabled={currentPageIndex === 0 || isLoading}
              variant="outline"
            >
              ⬅️ Previous
            </Button>
            <Button
              onClick={handleNextPage}
              disabled={currentPageIndex === pages.length - 1 || isLoading}
              variant="primary"
            >
              Next ➡️
            </Button>
          </div>
        </div>
      )}

      {pages.length === 0 && !isGeneratingStory && !error && (
        <p className="text-gray-600 text-center mt-8">Start by typing or confirming your story above!</p>
      )}

      <Button onClick={onBackToMenu} className="mt-8" variant="outline">
        Back to Main Menu
      </Button>
    </div>
  );
};

export default StoryReader;