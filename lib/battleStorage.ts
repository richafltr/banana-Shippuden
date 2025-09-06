// Store battle sequence data locally
interface BattleSequenceData {
  player1Stance: string | null
  player2Stance: string | null
  versusScreen: string | null
  battleArena: string | null
  timestamp: number
}

// In-memory storage for the current session
let currentBattleData: BattleSequenceData | null = null

export function storeBattleData(data: Omit<BattleSequenceData, 'timestamp'>) {
  currentBattleData = {
    ...data,
    timestamp: Date.now()
  }
  
  // Also store in localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('battleSequenceData', JSON.stringify(currentBattleData))
  }
  
  return currentBattleData
}

export function getBattleData(): BattleSequenceData | null {
  if (currentBattleData) {
    return currentBattleData
  }
  
  // Try to get from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('battleSequenceData')
    if (stored) {
      try {
        currentBattleData = JSON.parse(stored)
        return currentBattleData
      } catch (error) {
        console.error('Failed to parse stored battle data:', error)
      }
    }
  }
  
  return null
}

export function clearBattleData() {
  currentBattleData = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('battleSequenceData')
  }
}

// Export battle data as JSON file
export function exportBattleDataAsJSON(data: BattleSequenceData) {
  const jsonData = {
    battleSequence: {
      player1: {
        stance: data.player1Stance,
        cdn_url: data.player1Stance
      },
      player2: {
        stance: data.player2Stance,
        cdn_url: data.player2Stance
      },
      versus: {
        screen: data.versusScreen,
        cdn_url: data.versusScreen
      },
      arena: {
        scene: data.battleArena,
        cdn_url: data.battleArena,
        video_input_url: data.battleArena // This will be used for video generation
      },
      metadata: {
        timestamp: data.timestamp,
        created: new Date(data.timestamp).toISOString()
      }
    }
  }
  
  return jsonData
}
