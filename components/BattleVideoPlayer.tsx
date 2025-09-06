'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react'

interface BattleVideoPlayerProps {
  battleData: {
    player1Stance: string | null
    player2Stance: string | null
    versusScreen: string | null
    battleArena: string | null
  }
  onClose: () => void
}

export default function BattleVideoPlayer({ battleData, onClose }: BattleVideoPlayerProps) {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'versus' | 'arena' | 'video'>('loading')
  const [versusScreen, setVersusScreen] = useState<string | null>(null)
  const [battleArena, setBattleArena] = useState<string | null>(null)
  const [player1Stance, setPlayer1Stance] = useState<string | null>(null)
  const [player2Stance, setPlayer2Stance] = useState<string | null>(null)
  const [battleVideo, setBattleVideo] = useState<string | null>(null)
  const [videoRequestId, setVideoRequestId] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<string>('')
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [])

  // Start video generation when battle arena is ready
  const startVideoGeneration = async () => {
    if (!battleData.battleArena || isGeneratingVideo) return
    
    console.log('🎬 Starting epic battle video generation...')
    setIsGeneratingVideo(true)
    setVideoProgress('Initiating video generation...')
    
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          battleArenaUrl: battleData.battleArena
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.requestId) {
        console.log('📹 Video generation queued:', result.requestId)
        setVideoRequestId(result.requestId)
        setVideoProgress('Video generation queued, this may take 2-3 minutes...')
        // Start polling after 5 seconds
        pollingTimeoutRef.current = setTimeout(() => checkVideoStatus(result.requestId), 5000)
      } else {
        throw new Error(result.error || 'Failed to start video generation')
      }
    } catch (error) {
      console.error('Failed to start video generation:', error)
      setVideoProgress('')
      setIsGeneratingVideo(false)
    }
  }

  // Poll for video generation status
  const checkVideoStatus = async (requestId: string) => {
    try {
      console.log('🔍 Checking video status...')
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          requestId
        })
      })
      
      const result = await response.json()
      console.log('Video status:', result.status)
      
      if (result.status === 'completed' && result.videoUrl) {
        console.log('🎥 Video ready!')
        setBattleVideo(result.videoUrl)
        setVideoProgress('Video ready!')
        setIsGeneratingVideo(false)
        // Transition to video screen after a moment
        setTimeout(() => {
          setCurrentScreen('video')
          setProgress(100)
        }, 1000)
      } else if (result.status === 'error' || result.status === 'failed') {
        console.error('Video generation failed:', result.error)
        setVideoProgress('Video generation failed')
        setIsGeneratingVideo(false)
      } else {
        // Still processing, update progress and poll again
        setVideoProgress(result.progress || 'Generating epic battle video...')
        pollingTimeoutRef.current = setTimeout(() => checkVideoStatus(requestId), 5000)
      }
    } catch (error) {
      console.error('Error checking video status:', error)
      setVideoProgress('Error checking video status')
      setIsGeneratingVideo(false)
    }
  }

  useEffect(() => {
    // Use pre-generated battle data
    console.log('Using pre-generated battle sequence data')
    
    // Set stances
    setPlayer1Stance(battleData.player1Stance)
    setPlayer2Stance(battleData.player2Stance)
    
    // Set versus screen and battle arena
    if (battleData.versusScreen) {
      setVersusScreen(battleData.versusScreen)
    }
    
    if (battleData.battleArena) {
      setBattleArena(battleData.battleArena)
      // Start video generation immediately when we have battle arena
      startVideoGeneration()
    }
    
    // Show versus screen first
    if (battleData.versusScreen) {
      setCurrentScreen('versus')
      setProgress(25)
      
      // After 3 seconds, switch to arena if available
      if (battleData.battleArena) {
        setTimeout(() => {
          setCurrentScreen('arena')
          setProgress(50)
        }, 3000)
      }
    } else if (battleData.battleArena) {
      // If no versus screen but arena exists, show arena directly
      setCurrentScreen('arena')
      setProgress(50)
    } else {
      setError('No battle visuals available')
    }
  }, [battleData])

  useEffect(() => {
    if (currentScreen === 'versus') {
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 1.67, 33)) // Versus phase: 0-33%
      }, 500)
      return () => clearInterval(timer)
    } else if (currentScreen === 'arena') {
      const timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 1.67, 66)) // Arena phase: 33-66%
      }, 500)
      return () => clearInterval(timer)
    } else if (currentScreen === 'video') {
      setProgress(100) // Video ready: 100%
    }
  }, [currentScreen])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video Player Controls */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:text-orange-400 transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:text-orange-400 transition-colors"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <span className="text-white text-sm font-medium">
              {currentScreen === 'loading' && 'Preparing Battle...'}
              {currentScreen === 'versus' && 'VERSUS SCREEN'}
              {currentScreen === 'arena' && 'BATTLE ARENA'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center relative">
        {currentScreen === 'loading' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-spin">🍌</div>
            <div className="text-white text-xl font-bold animate-pulse">
              Preparing Epic Battle...
            </div>
            <div className="text-white/60 text-sm mt-2">
              Processing all battle scenes simultaneously
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-ping" />
                <span className="text-xs text-white/50 mt-1">Stances</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping animation-delay-100" />
                <span className="text-xs text-white/50 mt-1">VS Screen</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-ping animation-delay-200" />
                <span className="text-xs text-white/50 mt-1">Arena</span>
              </div>
            </div>
          </div>
        )}

        {currentScreen === 'versus' && versusScreen && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={versusScreen} 
              alt="Versus Screen" 
              className="max-w-full max-h-full object-contain animate-pulse-slow"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {currentScreen === 'arena' && battleArena && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={battleArena} 
              alt="Battle Arena" 
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute top-10 left-1/2 -translate-x-1/2">
              <div className="text-6xl md:text-8xl font-black text-transparent bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text animate-pulse">
                FIGHT!
              </div>
            </div>
            
            {/* Video Generation Progress Overlay */}
            {isGeneratingVideo && videoProgress && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg px-6 py-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                <div className="text-white">
                  <div className="text-sm font-semibold">Generating Epic Battle Video</div>
                  <div className="text-xs text-white/70">{videoProgress}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentScreen === 'video' && battleVideo && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              controls
              autoPlay
              muted={isMuted}
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              src={battleVideo}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Epic Battle Label */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
              ⚔️ EPIC NARUTO BATTLE ⚔️
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <div className="text-red-500 text-xl font-bold mb-4">
              Battle Error
            </div>
            <div className="text-white/60 mb-4">{error}</div>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timeline Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <div className={`w-2 h-2 rounded-full transition-colors ${
          currentScreen === 'versus' ? 'bg-orange-500' : 'bg-gray-600'
        }`} title="Versus Screen" />
        <div className={`w-2 h-2 rounded-full transition-colors ${
          currentScreen === 'arena' ? 'bg-orange-500' : 'bg-gray-600'
        }`} title="Battle Arena" />
        <div className={`w-2 h-2 rounded-full transition-colors ${
          currentScreen === 'video' ? 'bg-yellow-400 animate-pulse' : 
          isGeneratingVideo ? 'bg-yellow-600 animate-pulse' : 'bg-gray-600'
        }`} title="Epic Battle Video" />
      </div>
    </div>
  )
}
