// StampMode.js
class StampMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorImage = null;
        this.isActive = false;
        this.currentStamp = '';
        this.currentStampType = '';

        this.updateCursorPosition = this.updateCursorPosition.bind(this);
        this.placeStamp = this.placeStamp.bind(this);
        this.deactivate = this.deactivate.bind(this);

        this.canvas.addEventListener('mousemove', this.updateCursorPosition);
        this.canvas.addEventListener('touchmove', this.updateCursorPosition, { passive: false });
        this.canvas.addEventListener('touchstart', this.updateCursorPosition, { passive: false });
        this.canvas.addEventListener('click', this.placeStamp);
        this.canvas.addEventListener('touchend', this.placeStamp, { passive: false });
        this.canvas.addEventListener('mouseout', this.deactivate);
    }

    activate(stampType) {
        console.log('Activating stamp mode:', stampType);
        this.isActive = true;
        this.currentStampType = stampType;
        this.currentStamp = stampType === 'TADS' ? 'Tool/ImpAnc.png' : 'Tool/Hook.png';

        if (this.cursorImage) {
            this.cursorContainer.removeChild(this.cursorImage);
        }

        this.cursorImage = new Image();
        this.cursorImage.src = this.currentStamp;
        this.cursorImage.classList.add('cursor-image');
        this.cursorImage.style.position = 'absolute';
        this.cursorImage.style.pointerEvents = 'none';
        this.cursorImage.style.width = stampType === 'TADS' ? '30px' : '20px';
        this.cursorImage.style.height = 'auto';
        this.cursorContainer.appendChild(this.cursorImage);
        console.log('Cursor image added:', this.cursorImage);

        this.canvas.style.cursor = 'none';

        const rect = this.canvas.getBoundingClientRect();
        const centerX = rect.left + this.canvas.width / 2;
        const centerY = rect.top + this.canvas.height / 2;
        this.updateCursorPosition({ clientX: centerX, clientY: centerY });
    }

    deactivate() {
        if (this.isActive) {
            console.log('Deactivating stamp mode');
            this.isActive = false;
            if (this.cursorImage) {
                this.cursorContainer.removeChild(this.cursorImage);
                this.cursorImage = null;
            }
            this.canvas.style.cursor = 'default';
        }
    }

    updateCursorPosition(event) {
        if (!this.isActive || !this.cursorImage) return;
        
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }

        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.type.startsWith('touch')) {
            const touch = event.touches && event.touches.length ? event.touches[0] : 
                          (event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null);
            
            if (!touch) return;
            
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        this.cursorImage.style.left = `${x}px`;
        this.cursorImage.style.top = `${y}px`;
    }

    placeStamp(event) {
        if (!this.isActive) return;
        
        if (event.type.startsWith('touch')) {
            event.preventDefault();
        }

        console.log('Placing stamp', event.type);
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.type.startsWith('touch')) {
            // touchendではchangedTouchesを使う
            const touch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;
            
            if (!touch) {
                console.warn('Touch event with no touches detected');
                return;
            }
            
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const img = new Image();
        img.onload = () => {
            const stampSize = this.currentStampType === 'TADS' ? 30 : 20;
            this.ctx.drawImage(img, x - stampSize/2, y - stampSize/2, stampSize, stampSize);
            console.log('Stamp placed at:', x, y);
        };
        img.src = this.currentStamp;
    }
}