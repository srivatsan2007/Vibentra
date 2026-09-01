/**
 * Story Share Service for Vibentra
 * Generates Spotify-style aesthetic story cards for Instagram Stories, WhatsApp Status & Social Media
 */
class StoryShareService {
    constructor() {
        this.cardCanvas = null;
    }

    /**
     * Extract prominent gradient colors from an image
     */
    async extractColors(imageUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 30;
                    canvas.height = 30;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 30, 30);
                    const data = ctx.getImageData(0, 0, 30, 30).data;

                    let r1 = 0, g1 = 0, b1 = 0, count1 = 0;
                    let r2 = 0, g2 = 0, b2 = 0, count2 = 0;

                    for (let i = 0; i < data.length; i += 16) {
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        if (brightness > 40 && brightness < 220) {
                            if (i < data.length / 2) {
                                r1 += r; g1 += g; b1 += b; count1++;
                            } else {
                                r2 += r; g2 += g; b2 += b; count2++;
                            }
                        }
                    }

                    const c1 = count1 ? `rgb(${Math.round(r1/count1)}, ${Math.round(g1/count1)}, ${Math.round(b1/count1)})` : '#138086';
                    const c2 = count2 ? `rgb(${Math.round(r2/count2)}, ${Math.round(g2/count2)}, ${Math.round(b2/count2)})` : '#061A1C';
                    resolve({ c1, c2, c3: '#030B0C' });
                } catch {
                    resolve({ c1: '#138086', c2: '#0D9488', c3: '#061A1C' });
                }
            };
            img.onerror = () => resolve({ c1: '#138086', c2: '#0D9488', c3: '#061A1C' });
            img.src = imageUrl;
        });
    }

    /**
     * Render 9:16 high-resolution story card
     */
    async renderStoryCard(track, canvasWidth = 1080, canvasHeight = 1920) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        const title = track.title || 'Untitled Track';
        const artist = track.artist || 'Unknown Artist';
        const coverUrl = track.cover || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80';
        const providerName = track.provider || (track.source === 'youtube' ? 'YouTube Music' : 'JioSaavn');

        // 1. Color Extraction
        const colors = await this.extractColors(coverUrl);

        // 2. Multi-point Ambient Radial Mesh Background
        const bgGrad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        bgGrad.addColorStop(0, colors.c1);
        bgGrad.addColorStop(0.5, colors.c2);
        bgGrad.addColorStop(1, '#050B0C');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Ambient glowing orb circles
        const orb = ctx.createRadialGradient(canvasWidth * 0.5, canvasHeight * 0.38, 50, canvasWidth * 0.5, canvasHeight * 0.38, canvasWidth * 0.7);
        orb.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        orb.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = orb;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Subtle noise/grain grid
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let x = 0; x < canvasWidth; x += 40) {
            ctx.fillRect(x, 0, 1, canvasHeight);
        }
        for (let y = 0; y < canvasHeight; y += 40) {
            ctx.fillRect(0, y, canvasWidth, 1);
        }

        // 3. Top Vibentra App Branding Pill
        const pillW = 420;
        const pillH = 90;
        const pillX = (canvasWidth - pillW) / 2;
        const pillY = 160;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, pillX, pillY, pillW, pillH, 45, true, true);

        // Brand Text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨ Vibentra Music', canvasWidth / 2, pillY + pillH / 2);
        ctx.restore();

        // 4. Central Cover Art with Glassmorphic Card Frame
        const cardSize = 740;
        const cardX = (canvasWidth - cardSize) / 2;
        const cardY = 360;

        // Shadow under artwork
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 70;
        ctx.shadowOffsetY = 30;

        // Draw image
        const img = await this.loadImage(coverUrl);
        ctx.save();
        this.roundRect(ctx, cardX, cardY, cardSize, cardSize, 36, false, false);
        ctx.clip();
        ctx.drawImage(img, cardX, cardY, cardSize, cardSize);
        ctx.restore();

        // Border around cover
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 4;
        this.roundRect(ctx, cardX, cardY, cardSize, cardSize, 36, false, true);
        ctx.restore();

        // 5. Track Meta Info
        const metaY = cardY + cardSize + 90;

        // Track Title (Truncate if needed)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        let displayTitle = title;
        if (ctx.measureText(displayTitle).width > canvasWidth - 160) {
            while (ctx.measureText(displayTitle + '...').width > canvasWidth - 160 && displayTitle.length > 0) {
                displayTitle = displayTitle.slice(0, -1);
            }
            displayTitle += '...';
        }
        ctx.fillText(displayTitle, canvasWidth / 2, metaY);

        // Artist Name
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '600 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        let displayArtist = artist;
        if (ctx.measureText(displayArtist).width > canvasWidth - 200) {
            while (ctx.measureText(displayArtist + '...').width > canvasWidth - 200 && displayArtist.length > 0) {
                displayArtist = displayArtist.slice(0, -1);
            }
            displayArtist += '...';
        }
        ctx.fillText(displayArtist, canvasWidth / 2, metaY + 65);

        // 6. Dynamic Soundwave Graphic / Spotify-Style Sound Capsule
        const waveY = metaY + 140;
        const waveW = 660;
        const waveH = 120;
        const waveX = (canvasWidth - waveW) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, waveX, waveY, waveW, waveH, 60, true, true);

        // Soundwave Bars
        const numBars = 32;
        const barW = 8;
        const gap = 12;
        const startX = waveX + (waveW - (numBars * (barW + gap) - gap)) / 2;
        const centerY = waveY + waveH / 2;

        for (let i = 0; i < numBars; i++) {
            // Generate rhythmic symmetrical wave pattern
            const waveHeight = Math.sin(i * 0.45) * Math.cos(i * 0.25) * 35 + 20 + Math.abs(Math.sin(i * 1.2)) * 25;
            const barX = startX + i * (barW + gap);

            ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#EE6C4D';
            this.roundRect(ctx, barX, centerY - waveHeight / 2, barW, waveHeight, 4, true, false);
        }
        ctx.restore();

        // 7. Footer Pill (Listen on Vibentra • Web & PWA)
        const footerY = canvasHeight - 160;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`STREAMING VIA ${providerName.toUpperCase()} • VIBENTRA`, canvasWidth / 2, footerY);

        this.cardCanvas = canvas;
        return canvas;
    }

    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => {
                // Fallback default image
                const fallback = new Image();
                fallback.crossOrigin = 'Anonymous';
                fallback.onload = () => resolve(fallback);
                fallback.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80';
            };
            img.src = url;
        });
    }

    downloadCard(canvas, filename = 'vibentra-story.png') {
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    async shareCard(canvas, track) {
        if (!canvas) return false;
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'vibentra-story.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `${track.title} - Vibentra`,
                        text: `Listening to "${track.title}" by ${track.artist} on Vibentra! 🎶`,
                        files: [file]
                    });
                } else {
                    this.downloadCard(canvas, `${track.title || 'vibentra'}-story.png`);
                }
            }, 'image/png');
            return true;
        } catch (e) {
            console.warn('Share error:', e);
            this.downloadCard(canvas, `${track.title || 'vibentra'}-story.png`);
            return false;
        }
    }
}

export const storyShareService = new StoryShareService();
