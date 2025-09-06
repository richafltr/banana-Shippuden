"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, User, X, Moon, Sun, Loader2, Swords } from "lucide-react"
import { useTheme } from "next-themes"

// Animated Dice SVG Component
const DiceIcon = ({ className, isAnimating }: { className?: string; isAnimating?: boolean }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`${className} ${isAnimating ? 'animate-dice-roll' : ''}`}
  >
    <rect 
      width="12" 
      height="12" 
      x="2" 
      y="10" 
      rx="2" 
      ry="2"
      className={isAnimating ? "animate-pulse" : ""}
    />
    <path 
      d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"
      className={isAnimating ? "animate-pulse animation-delay-200" : ""}
    />
    <circle 
      cx="6" 
      cy="18" 
      r="0.8" 
      fill="currentColor"
      className={isAnimating ? "animate-bounce animation-delay-100" : ""}
    />
    <circle 
      cx="10" 
      cy="14" 
      r="0.8" 
      fill="currentColor"
      className={isAnimating ? "animate-bounce animation-delay-200" : ""}
    />
    <circle 
      cx="15" 
      cy="6" 
      r="0.8" 
      fill="currentColor"
      className={isAnimating ? "animate-bounce animation-delay-300" : ""}
    />
    <circle 
      cx="18" 
      cy="9" 
      r="0.8" 
      fill="currentColor"
      className={isAnimating ? "animate-bounce animation-delay-400" : ""}
    />
  </svg>
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

  const renderPlayerCard = (player: PlayerProfile, setPlayer: React.Dispatch<React.SetStateAction<PlayerProfile>>) => (
    <div className="flex flex-col items-center space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{player.name}</h2>
      <Card
        className={`w-48 h-48 border-2 transition-all duration-200 relative ${
          dragOver === player.id 
            ? "border-blue-500 dark:border-blue-400 scale-105 shadow-lg" 
            : "border-gray-200 dark:border-gray-700"
        }`}
        onDragOver={(e) => handleDragOver(e, player.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, player.id)}
      >
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900">
          {player.isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : player.battleImage ? (
            <>
              <img
                src={player.battleImage}
                alt={`${player.name} Battle`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                BATTLE MODE
              </div>
            </>
          ) : player.image ? (
            <>
              <img
                src={player.image}
                alt={player.name}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveImage(player.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              {player.transformedImages.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2 flex gap-1">
                  {player.transformedImages.slice(0, 3).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPlayer(prev => ({ ...prev, image: img }))}
                      className="w-10 h-10 rounded border-2 border-white overflow-hidden hover:scale-110 transition-transform"
                    >
                      <img src={img} alt={`Variant ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-gray-500 dark:text-gray-400">
              <User size={48} />
              <Upload size={24} />
              <span className="text-sm text-center px-2 font-medium">
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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-200">
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white text-center mb-8 text-balance">
            Banana Shippuden
          </h1>

          {/* Transform Button */}
          {player1.originalImage && player2.originalImage && player1.transformedImages.length === 0 && (
            <div className="flex justify-center mb-8">
              <Button
                onClick={handleTransformToNaruto}
                disabled={isTransforming}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-lg font-bold"
              >
                {isTransforming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Transforming to Shinobi...
                  </>
                ) : (
                  <>
                    <Swords className="mr-2 h-5 w-5" />
                    Transform to Naruto Characters
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Player 1 */}
            {renderPlayerCard(player1, setPlayer1)}

            {/* Battle Dice */}
            <div className="flex flex-col items-center space-y-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-wide">
                Ready to Battle?
              </h3>
              <button
                onClick={handleBattle}
                className="group relative p-8 transition-all duration-500 hover:scale-125 active:scale-110 focus:outline-none cursor-pointer"
                disabled={isRolling || isTransforming}
                aria-label="Roll the dice to start battle"
              >
                <DiceIcon 
                  className={`h-40 w-40 md:h-48 md:w-48 lg:h-56 lg:w-56 transition-all duration-500 ${
                    isRolling 
                      ? 'text-transparent bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 bg-clip-text stroke-current' 
                      : 'text-gray-800 dark:text-gray-200 group-hover:text-[#40dfaf] group-hover:drop-shadow-[0_0_35px_rgba(64,223,175,0.8)]'
                  }`}
                  isAnimating={isRolling}
                />
                {/* Pulsing glow effect */}
                {!isRolling && (
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-full bg-[#40dfaf]/20 animate-ping" />
                    <div className="absolute inset-0 rounded-full bg-[#40dfaf]/10 animate-ping animation-delay-200" />
                  </div>
                )}
              </button>
              <div className="text-center space-y-2">
                <p className={`text-base font-semibold transition-all duration-300 ${
                  isRolling 
                    ? "text-transparent bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text animate-pulse" 
                    : "text-gray-700 dark:text-gray-300"
                }`}>
                  {isRolling ? "Preparing for battle..." : "Click the dice to start battle!"}
                </p>
                {isRolling && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                    Creating battle stances...
                  </p>
                )}
              </div>
            </div>

            {/* Player 2 */}
            {renderPlayerCard(player2, setPlayer2)}
          </div>
        </div>
      </div>
    </div>
  )
}