"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, User } from "lucide-react"

// Custom Dice SVG Component
const DiceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    <rect x="10" y="10" width="80" height="80" rx="8" fill="currentColor" stroke="currentColor" strokeWidth="2" />
    {/* Dice dots */}
    <circle cx="30" cy="30" r="4" fill="white" />
    <circle cx="50" cy="50" r="4" fill="white" />
    <circle cx="70" cy="70" r="4" fill="white" />
    <circle cx="30" cy="70" r="4" fill="white" />
    <circle cx="70" cy="30" r="4" fill="white" />
  </svg>
)

interface PlayerProfile {
  id: string
  image: string | null
  name: string
}

export default function BattleShowdown() {
  const [player1, setPlayer1] = useState<PlayerProfile>({
    id: "player1",
    image: null,
    name: "Player 1",
  })

  const [player2, setPlayer2] = useState<PlayerProfile>({
    id: "player2",
    image: null,
    name: "Player 2",
  })

  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    const originalBackground = document.body.style.background
    const originalBackgroundColor = document.body.style.backgroundColor

    document.body.style.background = "linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)"
    document.body.style.backgroundColor = "#0f172a"

    return () => {
      document.body.style.background = originalBackground
      document.body.style.backgroundColor = originalBackgroundColor
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, playerId: string) => {
    e.preventDefault()
    setDragOver(playerId)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, playerId: string) => {
    e.preventDefault()
    setDragOver(null)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((file) => file.type.startsWith("image/"))

    if (imageFile) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        if (playerId === "player1") {
          setPlayer1((prev) => ({ ...prev, image: imageUrl }))
        } else {
          setPlayer2((prev) => ({ ...prev, image: imageUrl }))
        }
      }
      reader.readAsDataURL(imageFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, playerId: string) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        if (playerId === "player1") {
          setPlayer1((prev) => ({ ...prev, image: imageUrl }))
        } else {
          setPlayer2((prev) => ({ ...prev, image: imageUrl }))
        }
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleBattle = () => {
    console.log("Battle initiated!")
    // Add battle logic here
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-white text-center mb-8 text-balance drop-shadow-lg">
          Battle Showdown Arena
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Player 1 */}
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-md">{player1.name}</h2>
            <Card
              className={`w-48 h-48 bg-white border-4 transition-all duration-200 ${
                dragOver === "player1" ? "border-blue-400 scale-105" : "border-gray-300"
              }`}
              onDragOver={(e) => handleDragOver(e, "player1")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "player1")}
            >
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
                {player1.image ? (
                  <img
                    src={player1.image || "/placeholder.svg"}
                    alt="Player 1"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-gray-600">
                    <User size={48} />
                    <Upload size={24} />
                    <span className="text-sm text-center px-2 font-medium">Drag & drop or click to upload</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "player1")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </Card>
          </div>

          {/* Battle Dice */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-medium text-white drop-shadow-md">Ready to Battle?</h3>
            <Button
              onClick={handleBattle}
              size="lg"
              className="w-24 h-24 rounded-xl bg-red-600 hover:bg-red-700 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
            >
              <DiceIcon className="w-12 h-12" />
            </Button>
            <p className="text-sm text-gray-200 text-center font-medium">Click the dice to start battle!</p>
          </div>

          {/* Player 2 */}
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-md">{player2.name}</h2>
            <Card
              className={`w-48 h-48 bg-white border-4 transition-all duration-200 ${
                dragOver === "player2" ? "border-blue-400 scale-105" : "border-gray-300"
              }`}
              onDragOver={(e) => handleDragOver(e, "player2")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "player2")}
            >
              <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-lg">
                {player2.image ? (
                  <img
                    src={player2.image || "/placeholder.svg"}
                    alt="Player 2"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-gray-600">
                    <User size={48} />
                    <Upload size={24} />
                    <span className="text-sm text-center px-2 font-medium">Drag & drop or click to upload</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "player2")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
