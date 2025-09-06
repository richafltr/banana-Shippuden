# Banana Shippuden

A Naruto-themed battle application that transforms photos into shinobi characters using FAL AI's nano-banana model and stores images in DigitalOcean Spaces.

## Features

- Upload player photos via drag-and-drop or file selection
- Transform photos into Naruto-style shinobi characters
- Prepare battle stances (left/right facing)
- Store original uploads in `banana-profiles` space
- Store transformed images in `banana-edit` space
- Dark/Light mode toggle

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following:

```bash
# DigitalOcean Spaces Configuration
DO_SPACES_KEY=your_spaces_access_key
DO_SPACES_SECRET=your_spaces_secret_key
DO_SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
DO_SPACES_REGION=sfo3

# FAL AI Configuration
FAL_KEY=your_fal_api_key
```

### 2. DigitalOcean Spaces

The app uses two Spaces buckets:
- `banana-profiles` - For original uploaded images
- `banana-edit` - For FAL AI transformed images

Both buckets should be configured with public read access.

### 3. Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

## Usage

1. **Upload Images**: Drag and drop or click to upload images for both players
2. **Transform**: Click "Transform to Naruto Characters" to apply the shinobi transformation
3. **Select Variant**: Click on the small thumbnails to select different transformation variants
4. **Battle**: Click the dice to prepare battle stances and start the battle

## API Routes

- `/api/upload` - Handles image uploads to DigitalOcean Spaces
- `/api/transform` - Processes images with FAL AI nano-banana model

## Technologies

- Next.js 14
- TypeScript
- Tailwind CSS
- FAL AI (nano-banana model)
- DigitalOcean Spaces (S3-compatible storage)
- shadcn/ui components
