/**
 * Cover Generator Service for Vibentra
 * Generates aesthetic AI-style generative playlist covers & artwork
 */
class CoverGeneratorService {
    constructor() {
        this.presets = {
            'cyberpunk': {
                name: 'Cyberpunk Neon',
                c1: '#D946EF', c2: '#8B5CF6', c3: '#06B6D4', c4: '#0F172A',
                style: 'mesh',
                icon: 'fa-solid fa-bolt'
            },
            'sunset': {
                name: 'Sunset Lo-Fi',
                c1: '#EA580C', c2: '#F97316', c3: '#FB923C', c4: '#431407',
                style: 'sun',
                icon: 'fa-solid fa-sun'
            },
            'ocean': {
                name: 'Oceanic Deep',
                c1: '#0284C7', c2: '#0EA5E9', c3: '#38BDF8', c4: '#082F49',
                style: 'waves',
                icon: 'fa-solid fa-water'
            },
            'velvet': {
                name: 'Velvet Rose',
                c1: '#E11D48', c2: '#831843', c3: '#F43F5E', c4: '#4C0519',
                style: 'glow',
                icon: 'fa-solid fa-heart'
            },
            'acid': {
                name: 'Acid Wave',
                c1: '#84CC16', c2: '#10B981', c3: '#064E3B', c4: '#022C22',
                style: 'mesh',
                icon: 'fa-solid fa-wand-magic-sparkles'
            },
            'retro': {
                name: 'Retro Synthwave',
                c1: '#7C3AED', c2: '#EC4899', c3: '#3B82F6', c4: '#1E1B4B',
                style: 'grid',
                icon: 'fa-solid fa-compact-disc'
            }
        };
    }

    getPresets() {
        return this.presets;
    }

    /**
     * Generate 800x800 high-res cover image
     */
    generateCover({ title = 'My Playlist', subtitle = 'Vibentra Vibe', presetId = 'cyberpunk', customC1 = null, customC2 = null, sticker = 'fa-solid fa-music' }) {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');

        const preset = this.presets[presetId] || this.presets['cyberpunk'];
        const color1 = customC1 || preset.c1;
        const color2 = customC2 || preset.c2;
        const color3 = preset.c3;
        const color4 = preset.c4;

        // 1. Base Gradient
        const grad = ctx.createRadialGradient(250, 250, 50, 400, 400, 600);
        grad.addColorStop(0, color1);
        grad.addColorStop(0.45, color2);
        grad.addColorStop(0.85, color3);
        grad.addColorStop(1, color4);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 800, 800);

        // 2. Generative Style Accents
        if (preset.style === 'grid' || preset.style === 'mesh') {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            for (let x = 0; x < 800; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 800);
                ctx.stroke();
            }
            for (let y = 0; y < 800; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(800, y);
                ctx.stroke();
            }
            ctx.restore();
        } else if (preset.style === 'sun') {
            ctx.save();
            const sunGrad = ctx.createRadialGradient(400, 320, 20, 400, 320, 180);
            sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            sunGrad.addColorStop(0.5, 'rgba(251, 146, 60, 0.6)');
            sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(400, 320, 180, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (preset.style === 'waves') {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(400, 900 - i * 120, 500 + i * 40, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Ambient glowing orb
        const orb = ctx.createRadialGradient(600, 200, 10, 600, 200, 300);
        orb.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        orb.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = orb;
        ctx.fillRect(0, 0, 800, 800);

        // 3. Central Glassmorphic Card Frame
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 3;
        this.roundRect(ctx, 80, 80, 640, 640, 32, true, true);
        ctx.restore();

        // 4. Floating Badge Icon (Center Emblem)
        ctx.save();
        const emblemGrad = ctx.createLinearGradient(330, 240, 470, 380);
        emblemGrad.addColorStop(0, color1);
        emblemGrad.addColorStop(1, color3);
        ctx.fillStyle = emblemGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 30;
        this.roundRect(ctx, 330, 240, 140, 140, 28, true, false);

        // Draw Emblem Symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '70px -apple-system, BlinkMacSystemFont, "Font Awesome 6 Free", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♫', 400, 310);
        ctx.restore();

        // 5. Playlist Title & Subtitle
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        let displayTitle = title || 'Vibe Playlist';
        if (ctx.measureText(displayTitle).width > 560) {
            while (ctx.measureText(displayTitle + '...').width > 560 && displayTitle.length > 0) {
                displayTitle = displayTitle.slice(0, -1);
            }
            displayTitle += '...';
        }
        ctx.fillText(displayTitle, 400, 470);

        // Subtitle
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(subtitle || 'Curated Soundscape • Vibentra', 400, 520);

        // 6. Bottom Sound wave accents
        const barCount = 18;
        const barW = 6;
        const gap = 10;
        const totalW = barCount * (barW + gap) - gap;
        const startX = 400 - totalW / 2;

        for (let i = 0; i < barCount; i++) {
            const h = Math.sin(i * 0.5) * 20 + 14;
            ctx.fillStyle = i % 2 === 0 ? color1 : color3;
            this.roundRect(ctx, startX + i * (barW + gap), 610 - h / 2, barW, h, 3, true, false);
        }
        ctx.restore();

        // Top-left brand mark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '700 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('VIBENTRA MIX', 120, 140);

        return canvas.toDataURL('image/jpeg', 0.92);
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
}

export const coverGeneratorService = new CoverGeneratorService();
