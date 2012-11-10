window.ps = window.ps || {};

ps.Particle = function(pos, angle, speed, life, color, size) {
	this.pos = {
		x: pos.x,
		y: pos.y
	};

	this.vel = {
		x: speed * Math.cos(ps.toRad(angle)),
		y: - speed * Math.sin(ps.toRad(angle))
	};

	this.originalLife = this.life = life;
	this.color = color;
	this.originalSize = this.size = size;
};

ps.Particle.prototype.update = function(dt) {
	this.life -= dt;

	if (this.life > 0) {
		var ratio = this.life / this.originalLife;
		this.size = this.originalSize * ratio;
		this.alpha = ratio;

		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;
	}
};

