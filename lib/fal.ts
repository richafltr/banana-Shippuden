import { fal } from '@fal-ai/client'

// Configure FAL client
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  })
}

export interface FalBananaEditInput {
  prompt: string
  image_urls: string[]
  num_images?: number
  output_format?: 'jpeg' | 'png'
}

export interface FalBananaEditOutput {
  images: Array<{
    url: string
    width: number
    height: number
    content_type: string
  }>
  seed: number
  has_nsfw_concepts: boolean[]
  prompt: string
}

export async function transformToNarutoCharacter(imageUrl: string): Promise<FalBananaEditOutput> {
  const result = await fal.subscribe('fal-ai/nano-banana/edit', {
    input: {
      prompt: "Reimagine the person to cosplay as a Naruto shinobi character with weapons, ninja accessories, outfit, and headband. Realistic 3D graphics rendered in Unreal Engine.",
      image_urls: [imageUrl],
      num_images: 3,
      output_format: "jpeg"
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("Processing image...", update.logs)
      }
    },
  })
  
  return result.data as FalBananaEditOutput
}

export async function prepareBattleStance(imageUrl: string, facingDirection: 'left' | 'right'): Promise<FalBananaEditOutput> {
  const prompt = facingDirection === 'left' 
    ? "Remove the background, turn left, facing left, fighting pose"
    : "Remove the background, turn right, facing right, fighting pose"
    
  const result = await fal.subscribe('fal-ai/nano-banana/edit', {
    input: {
      prompt,
      image_urls: [imageUrl],
      num_images: 1,
      output_format: "jpeg"
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("Preparing battle stance...", update.logs)
      }
    },
  })
  
  return result.data as FalBananaEditOutput
}
