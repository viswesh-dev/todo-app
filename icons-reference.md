# Todo App - Icon Assets Reference

This file contains the base64 encoded icons used in the application. These are embedded directly in the HTML and manifest files to avoid external dependencies.

## App Icon (192x192)

```
data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192' fill='none'%3E%3Crect width='192' height='192' rx='24' fill='%231a1a1a'/%3E%3Cpath d='M48 72h96v8H48zm0 24h96v8H48zm0 24h72v8H48z' fill='%23fff'/%3E%3Ccircle cx='48' cy='76' r='12' fill='%23007bff'/%3E%3Cpath d='m44 76 3 3 6-6' stroke='%23fff' stroke-width='2' fill='none'/%3E%3Ccircle cx='48' cy='100' r='12' fill='%23e9ecef' stroke='%23dee2e6' stroke-width='2'/%3E%3Ccircle cx='48' cy='124' r='12' fill='%23e9ecef' stroke='%23dee2e6' stroke-width='2'/%3E%3C/svg%3E
```

## App Icon (512x512)

```
data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512' fill='none'%3E%3Crect width='512' height='512' rx='64' fill='%231a1a1a'/%3E%3Cpath d='M128 192h256v20H128zm0 64h256v20H128zm0 64h192v20H128z' fill='%23fff'/%3E%3Ccircle cx='128' cy='202' r='32' fill='%23007bff'/%3E%3Cpath d='m118 202 8 8 16-16' stroke='%23fff' stroke-width='4' fill='none'/%3E%3Ccircle cx='128' cy='266' r='32' fill='%23e9ecef' stroke='%23dee2e6' stroke-width='4'/%3E%3Ccircle cx='128' cy='330' r='32' fill='%23e9ecef' stroke='%23dee2e6' stroke-width='4'/%3E%3C/svg%3E
```

## Alternative Favicon (Inline SVG for HTML)

This is the minimal version used in the HTML head:

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%231a1a1a' rx='6'/%3E%3Cpath d='M8 12h16v2H8zm0 4h16v2H8zm0 4h12v2H8z' fill='%23fff'/%3E%3C/svg%3E">
```

## Icon Descriptions

### 192x192 Icon
- **Size**: 192x192 pixels
- **Format**: SVG as data URI
- **Design**: Dark background with white task lines and a blue checkmark on the first item
- **Purpose**: Standard PWA icon, app launcher icon
- **Features**: 
  - Rounded corners (24px radius)
  - Three horizontal lines representing tasks
  - First task has a blue completed checkbox with white checkmark
  - Other tasks have empty checkboxes

### 512x512 Icon
- **Size**: 512x512 pixels  
- **Format**: SVG as data URI
- **Design**: Same design as 192x192 but scaled up
- **Purpose**: High-resolution icon for various platforms
- **Features**:
  - Rounded corners (64px radius)
  - Larger stroke widths for better visibility
  - Same visual hierarchy as smaller icon

### Favicon
- **Size**: 32x32 pixels
- **Format**: Inline SVG
- **Design**: Simplified version without checkboxes
- **Purpose**: Browser tab icon
- **Features**:
  - Minimal design for small size
  - Just the task lines without interactive elements
  - Smaller corner radius (6px)

## Color Palette

- **Background**: `#1a1a1a` (Dark gray, matching app theme)
- **Text/Lines**: `#ffffff` (White)
- **Accent/Active**: `#007bff` (Blue, matching app accent color)
- **Inactive Elements**: `#e9ecef` (Light gray)
- **Borders**: `#dee2e6` (Border gray)

## Usage Notes

1. **In HTML**: The favicon is embedded directly in the `<head>` section
2. **In Manifest**: Both 192x192 and 512x512 icons are referenced
3. **Fallback**: The HTML also includes PNG fallback links (currently placeholder)
4. **Scalability**: All icons are SVG-based for crisp rendering at any size
5. **Theme Consistency**: Colors match the app's CSS custom properties

## Generating Real PNG Icons (Optional)

If you need actual PNG files instead of SVG data URIs, you can:

1. Use an online SVG to PNG converter
2. Use command-line tools like `rsvg-convert` or `imagemagick`
3. Use Node.js tools like `svg2png` or `sharp`

Example with ImageMagick:
```bash
# Convert SVG to PNG
convert -background transparent icon.svg -resize 192x192 icon-192.png
convert -background transparent icon.svg -resize 512x512 icon-512.png
```

## Browser Compatibility

- **SVG Data URIs**: Supported in all modern browsers
- **Manifest Icons**: Supported in all PWA-capable browsers
- **Favicon**: Supported universally
- **Inline SVG**: Supported in all modern browsers

## Optimization Notes

- Icons use minimal SVG code for smaller data URIs
- Colors are optimized for both light and dark system themes
- Geometric shapes ensure crisp rendering at all sizes
- No complex gradients or effects to keep file size small