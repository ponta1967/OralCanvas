// ElasticDrawMode.js
class ElasticDrawMode {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isActive = false;
        this.currentGomu = '';
        this.points = [];
        this.lastPoint = null;
        this.savedImageData = null;
        this.cursorContainer = document.getElementById('cursorContainer');
        this.cursorPoint = null;
        this.isOutOfBounds = false;

        this.updateCursor = this.updateCursor.bind(this);
        this.addPoint = this.addPoint.bind(this);
        this.endDraw = this.endDraw.bind(this);
        this.deactivate = this.deactivate.bind(this);

        this.canvas.addEventListener('mousemove', this.updateCursor, { passive: false });
        this.canvas.addEventListener('touchmove', this.updateCursor, { passive: false });
        this.canvas.addEventListener('click', this.addPoint);
        this.canvas.addEventListener('touchend', this.addPoint, { passive: false });
        this.canvas.addEventListener('dblclick', this.endDraw);
        this.canvas.addEventListener('mouseout', this.deactivate);
    }

    activate(gomuType) {
        console.log('Activating Elastic Draw mode:', gomuType);
        this.isActive = true;
        this.currentGomu = gomuType;
        this.points = [];
        this.lastPoint = null;
        this.canvas.style.cursor = 'none';
        this.createCursorPoint();

        this.savedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    deactivate() {
        if (this.isActive) {
            console.log('Deactivating Elastic Draw mode');
            this.isActive = false;
            this.canvas.style.cursor = 'default';
            if (this.savedImageData) {
                this.ctx.putImageData(this.savedImageData, 0, 0);
            }
            this.removeCursorPoint();
        }
    }

    createCursorPoint() {
        this.cursorPoint = document.createElement('div');
        this.cursorPoint.style.position = 'absolute';
        this.cursorPoint.style.width = '4px';
        this.cursorPoint.style.height = '4px';
        this.cursorPoint.style.borderRadius = '50%';
        this.cursorPoint.style.backgroundColor = 'red';
        this.cursorPoint.style.pointerEvents = 'none';
        this.cursorContainer.appendChild(this.cursorPoint);
    }

    removeCursorPoint() {
        if (this.cursorPoint) {
            this.cursorContainer.removeChild(this.cursorPoint);
            this.cursorPoint = null;
        }
    }

    updateCursor(event) {
        if (!this.isActive) return;
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX || event.touches[0].clientX) - rect.left;
        const y = (event.clientY || event.touches[0].clientY) - rect.top;

        if (x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) {
            if (!this.isOutOfBounds) {
                this.isOutOfBounds = true;
                this.deactivate();
            }
            return;
        }
        this.isOutOfBounds = false;

        this.ctx.putImageData(this.savedImageData, 0, 0);
        this.drawPoints();

        if (this.cursorPoint) {
            this.cursorPoint.style.left = `${x - 2}px`;
            this.cursorPoint.style.top = `${y - 2}px`;
        }
    }

    addPoint(event) {
        if (!this.isActive) return;
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = (event.clientX || event.changedTouches[0].clientX) - rect.left;
        const y = (event.clientY || event.changedTouches[0].clientY) - rect.top;

        this.points.push({ x, y });
        this.drawPoint(x, y);

        if (this.points.length === 1) {
            this.drawText(x, y);
        }

        if (this.lastPoint) {
            this.drawLine(this.lastPoint.x, this.lastPoint.y, x, y);
        }

        this.lastPoint = { x, y };

        this.savedImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    endDraw(event) {
        if (!this.isActive) return;
        event.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (this.lastPoint && Math.abs(x - this.lastPoint.x) < 5 && Math.abs(y - this.lastPoint.y) < 5) {
            this.deactivate();
        }
    }

    drawPoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
    }

    drawText(x, y) {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = this.getColor();
        this.ctx.fillText(this.currentGomu, x, y - 10);
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = this.getColor();
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    drawPoints() {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            this.drawPoint(point.x, point.y);

            if (i === 0) {
                this.drawText(point.x, point.y);
            }

            if (i > 0) {
                const prevPoint = this.points[i - 1];
                this.drawLine(prevPoint.x, prevPoint.y, point.x, point.y);
            }
        }
    }

    getColor() {
        if (this.currentGomu.startsWith('M')) {
            return 'rgb(0, 140, 255)';
        } else if (this.currentGomu.startsWith('H')) {
            return 'rgb(255, 58, 151)';
        } else if (this.currentGomu.startsWith('F')) {
            return 'rgb(27, 168, 0)';
        }
        return 'black';
    }
}
