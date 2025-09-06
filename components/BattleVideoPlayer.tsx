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
  const [videoGenerationProgress, setVideoGenerationProgress] = useState(0) // 0-100 for video generation
  const [imageLoadProgress, setImageLoadProgress] = useState({
    versus: false,
    arena: false
  })
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isVideoBuffering, setIsVideoBuffering] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const videoGenStartTime = useRef<number | null>(null)

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
    videoGenStartTime.current = Date.now()
    setVideoGenerationProgress(5) // Start at 5% to show it's begun
    
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
        setVideoProgress('Processing epic battle sequence...')
        setVideoGenerationProgress(10) // Queued successfully
        // Start polling after 5 seconds
        pollingTimeoutRef.current = setTimeout(() => checkVideoStatus(result.requestId), 5000)
      } else {
        throw new Error(result.error || 'Failed to start video generation')
      }
    } catch (error) {
      console.error('Failed to start video generation:', error)
      setVideoProgress('')
      setVideoGenerationProgress(0)
      setIsGeneratingVideo(false)
    }
  }

  // Poll for video generation status
  const checkVideoStatus = async (requestId: string) => {
    try {
      console.log('🔍 Checking video status...')
      
      // Estimate progress based on elapsed time (2-3 minutes typical)
      if (videoGenStartTime.current) {
        const elapsed = Date.now() - videoGenStartTime.current
        const estimatedDuration = 150000 // 2.5 minutes in milliseconds
        const estimatedProgress = Math.min(95, Math.floor((elapsed / estimatedDuration) * 90) + 10)
        setVideoGenerationProgress(estimatedProgress)
      }
      
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
        setVideoGenerationProgress(100)
        setIsGeneratingVideo(false)
        // Transition to video screen after a moment
        setTimeout(() => {
          setCurrentScreen('video')
          setProgress(100)
        }, 1000)
      } else if (result.status === 'error' || result.status === 'failed') {
        console.error('Video generation failed:', result.error)
        setVideoProgress('Video generation failed')
        setVideoGenerationProgress(0)
        setIsGeneratingVideo(false)
      } else {
        // Still processing, update progress and poll again
        setVideoProgress(result.progress || 'Generating epic battle video...')
        pollingTimeoutRef.current = setTimeout(() => checkVideoStatus(requestId), 5000)
      }
    } catch (error) {
      console.error('Error checking video status:', error)
      setVideoProgress('Error checking video status')
      setVideoGenerationProgress(0)
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
            <div className="flex justify-center gap-3 mt-4">
              <div className="w-3 h-3 bg-orange-400 rounded-full animate-ping" />
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping animation-delay-100" />
              <div className="w-3 h-3 bg-red-400 rounded-full animate-ping animation-delay-200" />
            </div>
          </div>
        )}

        {currentScreen === 'versus' && versusScreen && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={versusScreen} 
              alt="Versus Screen" 
              className="max-w-full max-h-full object-contain animate-pulse-slow"
              onLoad={() => setImageLoadProgress(prev => ({ ...prev, versus: true }))}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            
            {/* Image Loading Indicator */}
            {!imageLoadProgress.versus && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 border-4 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {currentScreen === 'arena' && battleArena && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={battleArena} 
              alt="Battle Arena" 
              className="max-w-full max-h-full object-contain"
              onLoad={() => setImageLoadProgress(prev => ({ ...prev, arena: true }))}
            />
            
            {/* Image Loading Indicator */}
            {!imageLoadProgress.arena && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 border-4 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              </div>
            )}
            
            {/* Video Generation Progress Indicator */}
            {isGeneratingVideo && imageLoadProgress.arena && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-80 max-w-[90vw]">
                <div className="bg-black/80 backdrop-blur-lg rounded-2xl p-4 border border-yellow-400/20">
                  {/* Progress Ring */}
                  <div className="flex items-center justify-center mb-3">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-gray-700"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - videoGenerationProgress / 100)}`}
                          className="text-yellow-400 transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">{videoGenerationProgress}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${videoGenerationProgress}%` }}
                    />
                  </div>
                  
                  {/* Status Text */}
                  <div className="text-center">
                    <div className="text-yellow-400 text-xs font-medium">Generating Epic Battle Video</div>
                    <div className="text-gray-400 text-xs mt-1">
                      {videoGenerationProgress < 30 ? 'Preparing warriors...' :
                       videoGenerationProgress < 60 ? 'Choreographing battle...' :
                       videoGenerationProgress < 90 ? 'Adding special effects...' :
                       'Finalizing epic sequence...'}
                    </div>
                  </div>
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
              onLoadStart={() => setIsVideoBuffering(true)}
              onCanPlay={() => setIsVideoBuffering(false)}
              onWaiting={() => setIsVideoBuffering(true)}
              onPlaying={() => setIsVideoBuffering(false)}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Video Buffering Indicator */}
            {isVideoBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-sm rounded-full p-4">
                  <div className="w-12 h-12 border-4 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                </div>
              </div>
            )}
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

      {/* Enhanced Progress Bar with Segments */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="relative h-2 bg-gray-900">
          {/* Background segments */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-gray-800" /> {/* Versus */}
            <div className="flex-1 border-r border-gray-800" /> {/* Arena */}
            <div className="flex-1" /> {/* Video */}
          </div>
          
          {/* Active progress */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-red-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Enhanced Timeline with Labels */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2">
        <div className="flex items-center gap-6">
          {/* Versus Stage */}
          <div className="flex items-center gap-2">
            <div className={`relative ${currentScreen === 'versus' ? 'scale-125' : ''} transition-all`}>
              <div className={`w-3 h-3 rounded-full ${
                currentScreen === 'versus' ? 'bg-orange-500' : 
                progress > 33 ? 'bg-orange-500/50' : 'bg-gray-600'
              }`} />
              {currentScreen === 'versus' && (
                <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              currentScreen === 'versus' ? 'text-orange-400' : 'text-gray-500'
            }`}>VS</span>
          </div>
          
          {/* Arena Stage */}
          <div className="flex items-center gap-2">
            <div className={`relative ${currentScreen === 'arena' ? 'scale-125' : ''} transition-all`}>
              <div className={`w-3 h-3 rounded-full ${
                currentScreen === 'arena' ? 'bg-yellow-500' : 
                progress > 66 ? 'bg-yellow-500/50' : 'bg-gray-600'
              }`} />
              {currentScreen === 'arena' && (
                <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              currentScreen === 'arena' ? 'text-yellow-400' : 'text-gray-500'
            }`}>Arena</span>
            {isGeneratingVideo && (
              <span className="text-xs text-yellow-400/60 ml-1">({videoGenerationProgress}%)</span>
            )}
          </div>
          
          {/* Video Stage */}
          <div className="flex items-center gap-2">
            <div className={`relative ${currentScreen === 'video' ? 'scale-125' : ''} transition-all`}>
              <div className={`w-3 h-3 rounded-full ${
                currentScreen === 'video' ? 'bg-green-500' : 
                isGeneratingVideo ? 'bg-yellow-600 animate-pulse' : 'bg-gray-600'
              }`} />
              {currentScreen === 'video' && (
                <div className="absolute inset-0 rounded-full bg-green-500 animate-ping" />
              )}
            </div>
            <span className={`text-xs font-medium ${
              currentScreen === 'video' ? 'text-green-400' : 'text-gray-500'
            }`}>Video</span>
          </div>
        </div>
      </div>
    </div>
  )
}
