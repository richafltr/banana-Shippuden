# Video Background Setup

## Issue
The video URL you provided (`https://cursor-bucket.nyc3.cdn.digitaloceanspaces.com/valley-of-the-end-naruto-moewalls-com.mp4`) returns a 403 Forbidden error, meaning it's not publicly accessible.

## Solutions

### Option 1: Make Your Video Public (Recommended)
1. Go to your DigitalOcean Spaces dashboard
2. Navigate to the `cursor-bucket` space
3. Find the video file `valley-of-the-end-naruto-moewalls-com.mp4`
4. Click on the file and go to Settings
5. Change the permissions to "Public Read"
6. The video should now load in the app

### Option 2: Upload Video to Your banana-profiles Space
1. Upload your Naruto video to the `banana-profiles` space that's already configured
2. Make sure the file has public read permissions
3. Update the video URL in `/app/page.tsx` line 451:
   ```javascript
   src="https://banana-profiles.sfo3.digitaloceanspaces.com/your-video-name.mp4"
   ```

### Option 3: Use a Different Public Video
You can use any publicly accessible video URL. Some options:
- Upload to YouTube and use an embed URL
- Use a public CDN service
- Host on your own server

### Option 4: Use Local Video
1. Place your video in the `/public` folder
2. Reference it as:
   ```javascript
   src="/naruto-background.mp4"
   ```

## Current Fallback
The app currently has a beautiful gradient background that shows when the video fails to load, so the app remains visually appealing even without the video.

## Testing
Open the browser console (F12) to see if there are any video loading errors. You should see either:
- "Video loaded successfully" - if the video loads
- "Video failed to load" - if there's an issue with the URL
