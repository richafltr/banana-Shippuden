"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, User, X, Moon, Sun, Loader2, Swords } from "lucide-react"
import { useTheme } from "next-themes"

// Animated Banana Component
const BananaIcon = ({ className, isAnimating }: { className?: string; isAnimating?: boolean }) => (
  <div 
    className={`${className} relative transition-all duration-500`}
    style={{
      animation: isAnimating ? 'spin 1s linear infinite' : undefined,
    }}
  >
    <span 
      className="text-8xl md:text-9xl lg:text-[10rem] block cursor-pointer select-none"
      style={{
        filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.7)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4))',
        transform: 'rotate(-15deg) perspective(500px) rotateY(10deg)',
        display: 'inline-block'
      }}
    >
      🍌
    </span>
  </div>
)

interface PlayerProfile {
  id: string
  image: string | null
  originalImage: string | null
  transformedImages: string[]
  battleImage: string | null
  name: string
  isProcessing: boolean
  fileName?: string
}

export default function BattleShowdown() {
  const { theme, setTheme } = useTheme()
  const [isRolling, setIsRolling] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)
  const [player1, setPlayer1] = useState<PlayerProfile>({
    id: "player1",
    image: null,
    originalImage: null,
    transformedImages: [],
    battleImage: null,
    name: "Player 1",
    isProcessing: false,
  })

  const [player2, setPlayer2] = useState<PlayerProfile>({
    id: "player2",
    image: null,
    originalImage: null,
    transformedImages: [],
    battleImage: null,
    name: "Player 2",
    isProcessing: false,
  })

  const [dragOver, setDragOver] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent, playerId: string) => {
    e.preventDefault()
    setDragOver(playerId)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }, [])

  const uploadToSpaces = async (file: File, playerId: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('playerId', playerId)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.url
  }

  const transformImage = async (imageUrl: string, action: string, playerId: string) => {
    const response = await fetch('/api/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        action,
        playerId,
      }),
    })

    if (!response.ok) {
      throw new Error('Transform failed')
    }

    return response.json()
  }

  const handleDrop = useCallback(async (e: React.DragEvent, playerId: string) => {
    e.preventDefault()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      const updatePlayer = playerId === "player1" ? setPlayer1 : setPlayer2
      
      updatePlayer((prev) => ({ ...prev, isProcessing: true }))
      
      try {
        // Upload to DigitalOcean Spaces
        const uploadedUrl = await uploadToSpaces(imageFile, playerId)
        
        // Show the image immediately
        const reader = new FileReader()
        reader.onload = (event) => {
          const localUrl = event.target?.result as string
          updatePlayer((prev) => ({
            ...prev,
            image: localUrl,
            originalImage: uploadedUrl,
            isProcessing: false,
            fileName: imageFile.name
          }))
        }
        reader.readAsDataURL(imageFile)
      } catch (error) {
        console.error('Upload error:', error)
        updatePlayer((prev) => ({ ...prev, isProcessing: false }))
      }
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, playerId: string) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const updatePlayer = playerId === "player1" ? setPlayer1 : setPlayer2
      
      updatePlayer((prev) => ({ ...prev, isProcessing: true }))
      
      try {
        // Upload to DigitalOcean Spaces
        const uploadedUrl = await uploadToSpaces(file, playerId)
        
        // Show the image immediately
        const reader = new FileReader()
        reader.onload = (event) => {
          const localUrl = event.target?.result as string
          updatePlayer((prev) => ({
            ...prev,
            image: localUrl,
            originalImage: uploadedUrl,
            isProcessing: false,
            fileName: file.name
          }))
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Upload error:', error)
        updatePlayer((prev) => ({ ...prev, isProcessing: false }))
      }
    }
  }, [])

  const handleRemoveImage = useCallback((playerId: string) => {
    if (playerId === "player1") {
      setPlayer1((prev) => ({ 
        ...prev, 
        image: null, 
        originalImage: null,
        transformedImages: [],
        battleImage: null,
        fileName: undefined
      }))
    } else {
      setPlayer2((prev) => ({ 
        ...prev, 
        image: null, 
        originalImage: null,
        transformedImages: [],
        battleImage: null,
        fileName: undefined
      }))
    }
  }, [])

  const handleTransformToNaruto = async () => {
    if (!player1.originalImage || !player2.originalImage) {
      alert('Please upload images for both players first!')
      return
    }

    setIsTransforming(true)

    try {
      // Transform both players in parallel
      const [player1Result, player2Result] = await Promise.all([
        transformImage(player1.originalImage, 'naruto-transform', 'player1'),
        transformImage(player2.originalImage, 'naruto-transform', 'player2')
      ])

      // Update player 1 with transformed images
      setPlayer1(prev => ({
        ...prev,
        transformedImages: player1Result.images.map((img: any) => img.url)
      }))

      // Update player 2 with transformed images
      setPlayer2(prev => ({
        ...prev,
        transformedImages: player2Result.images.map((img: any) => img.url)
      }))

      // Auto-select first transformed image for display
      if (player1Result.images.length > 0) {
        setPlayer1(prev => ({
          ...prev,
          image: player1Result.images[0].url
        }))
      }

      if (player2Result.images.length > 0) {
        setPlayer2(prev => ({
          ...prev,
          image: player2Result.images[0].url
        }))
      }
    } catch (error) {
      console.error('Transform error:', error)
      alert('Failed to transform images. Please try again.')
    } finally {
      setIsTransforming(false)
    }
  }

  const handleBattle = async () => {
    if (!player1.image || !player2.image) {
      alert('Please upload and transform images for both players first!')
      return
    }

    setIsRolling(true)
    
    try {
      // Prepare battle stances for both players
      const [player1Battle, player2Battle] = await Promise.all([
        transformImage(player1.image, 'battle-stance-left', 'player1'),
        transformImage(player2.image, 'battle-stance-right', 'player2')
      ])

      // Update players with battle images
      setPlayer1(prev => ({
        ...prev,
        battleImage: player1Battle.images[0]?.url || prev.image
      }))

      setPlayer2(prev => ({
        ...prev,
        battleImage: player2Battle.images[0]?.url || prev.image
      }))

      // Simulate battle result
      setTimeout(() => {
        setIsRolling(false)
        // Add battle logic here
      }, 2000)
    } catch (error) {
      console.error('Battle preparation error:', error)
      setIsRolling(false)
    }
  }

  const renderPlayerCard = (player: PlayerProfile, setPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>) => {
    const isInBattleMode = !!player.battleImage
    const cardSize = isInBattleMode ? "w-80 h-80 md:w-96 md:h-96" : "w-64 h-64 md:w-72 md:h-72"
    
    return (
      <div className={`flex flex-col items-center space-y-4 transition-all duration-700 ${
        isInBattleMode ? "scale-110" : ""
      }`}>
        <Card
          className={`${cardSize} border-2 transition-all duration-700 relative transform backdrop-blur-md ${
            dragOver === player.id 
              ? "border-orange-400 scale-105 shadow-2xl bg-white/20" 
              : isInBattleMode 
                ? "border-red-500 shadow-2xl ring-4 ring-red-500/30 bg-black/40"
                : "border-white/30 shadow-lg hover:shadow-xl bg-white/10 hover:bg-white/15"
          }`}
          onDragOver={(e) => handleDragOver(e, player.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, player.id)}
        >
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg bg-black/20 backdrop-blur-sm">
            {player.isProcessing ? (
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-12 w-12 animate-spin text-orange-400" />
                <span className="text-base text-white/70">Uploading...</span>
              </div>
            ) : player.battleImage ? (
              <>
                <img
                  src={player.battleImage}
                  alt="Battle stance"
                  className="w-full h-full object-cover animate-pulse-slow"
                />
                <div className="absolute top-3 right-3 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-lg text-sm md:text-base font-bold shadow-lg animate-bounce">
                  ⚔️ BATTLE MODE ⚔️
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 via-transparent to-transparent pointer-events-none" />
              </>
            ) : player.image ? (
              <>
              <img
                src={player.image}
                alt="Player avatar"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-3 right-3 h-10 w-10 rounded-full opacity-0 hover:opacity-100 transition-all duration-300 shadow-lg"
                  onClick={() => handleRemoveImage(player.id)}
                >
                  <X className="h-5 w-5" />
                </Button>
                {player.transformedImages.length > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2 justify-center">
                    {player.transformedImages.slice(0, 3).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPlayer(prev => ({ ...prev, image: img }))}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-3 border-white/90 overflow-hidden hover:scale-125 transition-all duration-300 shadow-lg hover:shadow-xl hover:z-10"
                      >
                        <img src={img} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center space-y-4 text-white/70">
                <User size={72} />
                <Upload size={36} />
                <span className="text-base md:text-lg text-center px-4 font-medium">
                  Drag & drop or click to upload
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, player.id)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ display: player.image && !player.isProcessing ? 'none' : 'block' }}
            />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with video and gradient fallback */}
      <div className="fixed inset-0 z-0">
        {/* Gradient background (always visible) */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950 via-gray-900 to-blue-950" />
        
        {/* Video overlay (loads on top of gradient) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute top-0 left-0 w-full h-full object-cover opacity-70"
        >
          <source 
            src="https://banana-profiles.sfo3.digitaloceanspaces.com/naruto-valley-background.mp4" 
            type="video/mp4" 
          />
        </video>
        
        {/* Light overlay for content readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Dark Mode Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-white" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-white" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-7xl">
            {/* Title Text */}
            <div className="flex flex-col items-center justify-center mb-10 relative z-10">
              <h1 
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-wider animate-title-glow"
                style={{
                  fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive, sans-serif',
                  background: 'linear-gradient(135deg, #FBB03B 0%, #FACC15 25%, #FFD700 50%, #FB923C 75%, #FBB03B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 30px rgba(251, 176, 59, 0.5)',
                  textTransform: 'uppercase'
                }}
              >
                BANANA
              </h1>
              <h2 
                className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-[0.3em] mt-2"
                style={{
                  fontFamily: '"Comic Sans MS", "Chalkboard SE", "Marker Felt", cursive, sans-serif',
                  background: 'linear-gradient(135deg, #FB923C 0%, #FFD700 50%, #FBB03B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 25px rgba(251, 176, 59, 0.4)',
                  filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 15px rgba(251, 146, 60, 0.3))',
                  textTransform: 'uppercase'
                }}
              >
                Shippuden
              </h2>
            </div>

          {/* Transform Button */}
          {player1.originalImage && player2.originalImage && player1.transformedImages.length === 0 && (
            <div className="flex justify-center mb-12">
              <Button
                onClick={handleTransformToNaruto}
                disabled={isTransforming}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-xl transform transition-all duration-300 hover:scale-105"
              >
                {isTransforming ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Transforming to Shinobi...
                  </>
                ) : (
                  <>
                    <Swords className="mr-3 h-6 w-6" />
                    Transform to Naruto Characters
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-center place-items-center">
            {/* Player 1 */}
            {renderPlayerCard(player1, setPlayer1)}

          {/* Battle Banana */}
          <div className="flex flex-col items-center space-y-8">
            <button
              onClick={handleBattle}
              className="group relative p-8 transition-all duration-500 hover:scale-110 hover:rotate-12 active:scale-95 focus:outline-none cursor-pointer"
              disabled={isRolling || isTransforming}
              aria-label="Spin the banana to start battle"
            >
              <BananaIcon 
                className="transform transition-all duration-500 group-hover:scale-110"
                isAnimating={isRolling}
              />
              {/* Pulsing glow effect */}
              {!isRolling && (
                <div className="absolute inset-0 rounded-full pointer-events-none">
                  <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
                  <div className="absolute inset-0 rounded-full bg-orange-400/15 animate-ping animation-delay-200" />
                </div>
              )}
            </button>
            {isRolling && (
              <div className="text-center">
                <p className="text-sm text-white/70 animate-pulse">
                  Creating battle stances...
                </p>
              </div>
            )}
          </div>

            {/* Player 2 */}
            {renderPlayerCard(player2, setPlayer2)}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}