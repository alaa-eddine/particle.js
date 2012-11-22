(function() {
	this.pjs = this.pjs || {};

	/*
	 * Given a vector of any length, returns a vector
	 * pointing in the same direction but with a magnitude of 1
	 */
	function normalize(vector) {
		var length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

		vector.x /= length;
		vector.y /= length;
	}

	pjs.Emitter = function(system) {
		if(!system) {
			throw new Error("Must create an Emitter with a system");
		}

		this._currentSystem = system.name;
		this.reconfigure(system.system);
	};

	pjs.Emitter.prototype = {

		/*
		 * Applies all the properties in config to the particle system,
		 * a good way to change just one or two things about the system
		 * on the fly
		 */
		overlay: function(config) {
			pjs.extend(this, config);
			this.restart();
		},

		resetTexture: function() {
			this.overlay({
				texture: pjs.defaultTexture
			});
		},

		/*
		 * completely reconfigures the particle system. First applies all 
		 * the defaults, then overlays everything found in config
		 */
		reconfigure: function(config) {
			this._totalParticles = 0;
			this.emissionRate = 0;

			this.active = false;
			this.duration = Infinity;

			this.pos = this.pos || {};
			this.pos.x = 0;
			this.pos.y = 0;

			this.posVar = this.posVar || {};
			this.posVar.x = 0;
			this.posVar.y = 0;

			this.posVarTransformFn = null;

			this.angle = 0;
			this.angleVar = 0;

			this.life = 0;
			this.lifeVar = 0;

			this.radius = 0;
			this.radiusVar = 0;

			this.texture = null;
			this.textureEnabled = false;
			this.textureAdditive = false;

			this.startScale = 0;
			this.startScaleVar = 0;
			this.endScale = 0;
			this.endScaleVar = 0;

			this.startColor = this.startColor || [];
			this.startColor[0] = 0;
			this.startColor[1] = 0;
			this.startColor[2] = 0;
			this.startColor[3] = 0;

			this.startColorVar = this.startColorVar || [];
			this.startColorVar[0] = 0;
			this.startColorVar[1] = 0;
			this.startColorVar[2] = 0;
			this.startColorVar[3] = 0;

			this.endColor = this.endColor || [];
			this.endColor[0] = 0;
			this.endColor[1] = 0;
			this.endColor[2] = 0;
			this.endColor[3] = 0;

			this.endColorVar = this.endColorVar || [];
			this.endColorVar[0] = 0;
			this.endColorVar[1] = 0;
			this.endColorVar[2] = 0;
			this.endColorVar[3] = 0;

			this.gravity = this.gravity || {};
			this.gravity.x = 0;
			this.gravity.y = 0;

			this.radialAccel = 0;
			this.radialAccelVar = 0;
			this.tangentialAccel = 0;
			this.tangentialAccelVar = 0;

			pjs.recursiveExtend(this, config, ['texture']);

			this.restart();
		},

		/*
		 * flushes out the particle pool and starts the system over
		 * from the beginning. Replacing all the particles with new ones
		 * is a bit nuclear, but gets the job done
		 */
		restart: function() {
			this._particlePool = [];

			for (var i = 0; i < this.totalParticles; ++i) {
				this._particlePool.push(new pjs.Particle());
			}

			this._particleCount = 0;
			this._particleIndex = 0;
			this._elapsed = 0;
			this._emitCounter = 0;
		},

		reset: function() {
			var system = pjs.predefinedSystems.getSystem(this.currentSystem);
			this.reconfigure(system.system);
		},

		/*
		 * Returns whether all the particles in the pool are currently active
		 */
		_isFull: function() {
			return this._particleCount === this.totalParticles;
		},

		/*
		 * Takes a dormant particle out of the pool and makes it active.
		 * Does nothing if there is no free particle availabe
		 */
		_addParticle: function() {
			if (this._isFull()) {
				return false;
			}

			var p = this._particlePool[this._particleCount];
			this._initParticle(p); ++this._particleCount;

			return true;
		},

		/*
		 * Initializes the particle based on the current settings
		 * of the particle system
		 */
		_initParticle: function(particle) {
			particle.texture = this.texture;
			particle.textureEnabled = this.textureEnabled;
			particle.textureAdditive = this.textureAdditive;

			var posVar = {
				x: this.posVar.x * pjs.random11(),
				y: this.posVar.y * pjs.random11()
			};

			if (this.posVarTransformFn) {
				posVar = this.posVarTransformFn(posVar);
			}

			particle.pos.x = this.pos.x + posVar.x;
			particle.pos.y = this.pos.y + posVar.y;

			var angle = this.angle + this.angleVar * pjs.random11();
			var speed = this.speed + this.speedVar * pjs.random11();

			// it's easier to set speed and angle at this level
			// but once the particle is active and being updated, it's easier
			// to use a vector to indicate speed and angle. So particle.setVelocity
			// converts the angle and speed values to a velocity vector
			particle.setVelocity(angle, speed);

			particle.radialAccel = this.radialAccel + this.radialAccelVar * pjs.random11() || 0;
			particle.tangentialAccel = this.tangentialAccel + this.tangentialAccelVar * pjs.random11() || 0;

			var life = this.life + this.lifeVar * pjs.random11() || 0;
			particle.life = Math.max(0, life);

			particle.scale = pjs.isNumber(this.startScale) ? this.startScale: 1;
			particle.deltaScale = pjs.isNumber(this.endScale) ? (this.endScale - this.startScale) : 0;
			particle.deltaScale /= particle.life;

			particle.radius = pjs.isNumber(this.radius) ? this.radius + (this.radiusVar || 0) * pjs.random11() : 0;

			// color
			// note that colors are stored as arrays => [r,g,b,a],
			// this makes it easier to tweak the color every frame in _updateParticle
			// The renderer will take this array and turn it into a css rgba string
			if (this.startColor) {
				var startColor = [
				this.startColor[0] + this.startColorVar[0] * pjs.random11(), this.startColor[1] + this.startColorVar[1] * pjs.random11(), this.startColor[2] + this.startColorVar[2] * pjs.random11(), this.startColor[3] + this.startColorVar[3] * pjs.random11()];

				// if there is no endColor, then the particle will end up staying at startColor the whole time
				var endColor = startColor;
				if (this.endColor) {
					endColor = [
					this.endColor[0] + this.endColorVar[0] * pjs.random11(), this.endColor[1] + this.endColorVar[1] * pjs.random11(), this.endColor[2] + this.endColorVar[2] * pjs.random11(), this.endColor[3] + this.endColorVar[3] * pjs.random11()];
				}

				particle.color = startColor;
				particle.deltaColor = [(endColor[0] - startColor[0]) / particle.life, (endColor[1] - startColor[1]) / particle.life, (endColor[2] - startColor[2]) / particle.life, (endColor[3] - startColor[3]) / particle.life];
			}
		},

		/*
		 * Updates a particle based on how much time has passed in delta
		 * Moves the particle using its velocity and all forces acting on it (gravity,
		 * radial and tangential acceleration), and updates all the properties of the
		 * particle like its size, color, etc
		 */
		_updateParticle: function(p, delta, i) {
			if (p.life > 0) {

				// these vectors are stored on the particle so we can reuse them, avoids
				// generating lots of unnecessary objects each frame
				p.forces = p.forces || {
					x: 0,
					y: 0
				};
				p.forces.x = 0;
				p.forces.y = 0;

				p.radial = p.radial || {
					x: 0,
					y: 0
				};
				p.radial.x = 0;
				p.radial.y = 0;

				// dont apply radial forces until moved away from the emitter
				if ((p.pos.x !== this.pos.x || p.pos.y !== this.pos.y) && (p.radialAccel || p.tangentialAccel)) {
					p.radial.x = p.pos.x - this.pos.x;
					p.radial.y = p.pos.y - this.pos.y;

					normalize(p.radial);
				}

				p.tangential = p.tangential || {
					x: 0,
					y: 0
				};
				p.tangential.x = p.radial.x;
				p.tangential.y = p.radial.y;

				p.radial.x *= p.radialAccel;
				p.radial.y *= p.radialAccel;

				var newy = p.tangential.x;
				p.tangential.x = - p.tangential.y;
				p.tangential.y = newy;

				p.tangential.x *= p.tangentialAccel;
				p.tangential.y *= p.tangentialAccel;

				p.forces.x = p.radial.x + p.tangential.x + this.gravity.x;
				p.forces.y = p.radial.y + p.tangential.y + this.gravity.y;

				p.forces.x *= delta;
				p.forces.y *= delta;

				p.vel.x += p.forces.x;
				p.vel.y += p.forces.y;

				p.pos.x += p.vel.x * delta;
				p.pos.y += p.vel.y * delta;

				p.life -= delta;

				p.scale += p.deltaScale * delta;

				if (p.color) {
					p.color[0] += p.deltaColor[0] * delta;
					p.color[1] += p.deltaColor[1] * delta;
					p.color[2] += p.deltaColor[2] * delta;
					p.color[3] += p.deltaColor[3] * delta;
				}

				++this._particleIndex;
			} else {
				// the particle has died, time to return it to the particle pool
				// take the particle at the current index
				var temp = this._particlePool[i];

				// and move it to the end of the active particles, keeping all alive particles pushed
				// up to the front of the pool
				this._particlePool[i] = this._particlePool[this._particleCount - 1];
				this._particlePool[this._particleCount - 1] = temp;

				// decrease the count to indicate that one less particle in the pool is active.
				--this._particleCount;
			}
		},

		update: function(delta) {
			if (!this.active) {
				return;
			}

			if (this.emissionRate) {
				// emit new particles based on how much time has passed and the emission rate
				var rate = 1.0 / this.emissionRate;
				this._emitCounter += delta;

				while (!this._isFull() && this._emitCounter > rate) {
					this._addParticle();
					this._emitCounter -= rate;
				}
			}

			this._elapsed += delta;
			this.active = this._elapsed < this.duration;

			this._particleIndex = 0;

			while (this._particleIndex < this._particleCount) {
				var p = this._particlePool[this._particleIndex];
				this._updateParticle(p, delta, this._particleIndex);
			}
		}
	};

	Object.defineProperty(pjs.Emitter.prototype, 'particles', {
		get: function() {
			return this._particlePool;
		}
	});

	Object.defineProperty(pjs.Emitter.prototype, 'totalParticles', {
		get: function() {
			return this._totalParticles;
		},
		set: function(tp) {
			tp = tp | 0;
			if(tp !== this._totalParticles) {
				this._totalParticles = tp;
				this.restart();
			}
		}
	});

	Object.defineProperty(pjs.Emitter.prototype, 'currentSystem', {
		get: function() {
			return this._currentSystem;
		},
		set: function(cs) {
			if(this._currentSystem !== cs) {
				this._currentSystem = cs;
				var system = pjs.predefinedSystems.getSystem(cs);
				this.reconfigure(system.system);
			}
		}
	});

	Object.defineProperty(pjs.Emitter.prototype, 'transformFn', {
		get: function() {
			return this._transformFnSrc || '';
		}, 
		set: function(src) {
			this._transformFnSrc = src;
			try {
				this.posVarTransformFn = new Function('value', src);
			} catch(e) {
				this.posVarTransformFn = null;
			}
		}
	});

	Object.defineProperty(pjs.Emitter.prototype, 'textureFile', {
		get: function() {
			return (this._file && this._file.name) || '';
		},
		set: function(file) {
			try {
				pjs.TextureLoader.load(this, 'texture', file);
				this._file = file;
			} catch(e) {

			}
		}
	});
})();


(function() {
	this.pjs = this.pjs || {};

	pjs.Particle = function() {
		this.pos = {
			x: 0,
			y: 0
		};
		this.setVelocity(0, 0);
		this.life = 0;
	};

	pjs.Particle.prototype = {
		setVelocity: function(angle, speed) {
			this.vel = {
				x: Math.cos(pjs.toRad(angle)) * speed,
				y: -Math.sin(pjs.toRad(angle)) * speed
			};
		}
	};

})();



(function() {
	var posFuncs = {
		center: function(size) {
			return {
				x: (size.width / 2) | 0,
				y: (size.height / 2) | 0
			};
		},
		centerBottom: function(size) {
			return {
				x: (size.width / 2) | 0,
				y: (size.height * 2 / 3) | 0
			};
		},
		centerOffBottom: function(size) {
			return {
				x: (size.width / 2) | 0,
				y: size.height + 20
			};
		},
		centerAboveTop: function(size) {
			return {
				x: (size.width / 2) | 0,
				y: 0
			};
		},
		bottomLeft: function(size){
			return {
				x: 0,
				y: size.height + 5
			};
		}
	};

	this.pjs = this.pjs || {};

	pjs.predefinedSystems = {
		getSystem: function(name) {
			var system = this.systems[0];
			for (var i = 0; i < this.systems.length; ++i) {
				var ps = this.systems[i];
				if (ps.name === name) {
					system = ps;
					break;
				}
			}
			return pjs.deepClone(system, ['texture']);
		},

		positionSystems: function(size) {
			for (var i = 0; i < this.systems.length; ++i) {
				var pos = this.systems[i].system.pos;
				this.systems[i].system.pos = posFuncs[pos](size);
			}
		},

		setTexture: function(texture) {
			for (var i = 0; i < this.systems.length; ++i) {
				this.systems[i].system.texture = texture;
			}
		},

		deleteSystem: function(systemName) {
			var index;
			for (var i = 0; i < this.systems.length; ++i) {
				if (this.systems[i].name === systemName) {
					this.systems.splice(i, 1);
					return;
				}
			}
		},

		systems: [{
			name: 'meteor',
			system: {
				totalParticles: 150,
				emissionRate: 150 / 2,
				pos: 'center',
				gravity: {
					x: - 200,
					y: - 200
				},
				angle: 90,
				angleVar: 360,
				speed: 15,
				speedVar: 5,
				life: 2,
				lifeVar: 1,
				radialAccel: 0,
				radialAccelVar: 0,
				tangentialAccel: 0,
				tangentialAccelVar: 0,
				texture: pjs.defaultTexture,
				textureEnabled: true,
				textureAdditive: true,
				radius: 12,
				radiusVar: 2,
				startScale: 1,
				endScale: 1,
				startColor: [51, 102, 178.5, 1],
				startColorVar: [0, 0, 51, 0.1],
				endColor: [0, 0, 0, 1],
				active: true,
				duration: Infinity
			}
		},
		{
			name: 'fireworks',
			system: {
				totalParticles: 1500,
				emissionRate: 1500 / 3.5,
				pos: 'centerBottom',
				angle: 90,
				angleVar: 20,
				gravity: {
					x: 0,
					y: - 90
				},
				speed: 180,
				speedVar: 50,
				life: 3.5,
				lifeVar: 1,
				radialAccel: 0,
				radialAccelVar: 0,
				tangentialAccel: 0,
				tangentialAccelVar: 0,
				radius: 8,
				radiusVar: 2,
				startScale: 1,
				endScale: 1,
				startColor: [127.5, 127.5, 127.5, 1],
				startColorVar: [127.5, 127.5, 127.5, 0],
				endColor: [25.5, 25.5, 25.5, 0.2],
				endColorVar: [25.5, 25.5, 25.5, 0.2],
				active: true,
				duration: Infinity
			}
		},
		{
			name: 'fire',
			system: {
				totalParticles: 250,
				emissionRate: 250 / 7,
				pos: 'centerBottom',
				posVar: {
					x: 40,
					y: 20
				},
				angle: 90,
				angleVar: 10,
				speed: 60,
				speedVar: 20,
				life: 7,
				lifeVar: 4,
				radialAccel: 0,
				radialAccelVar: 0,
				tangentialAccel: 0,
				tangentialAccelVar: 0,
				texture: pjs.defaultTexture,
				textureEnabled: true,
				textureAdditive: true,
				radius: 10,
				radiusVar: 1,
				startScale: 1,
				endScale: 1,
				startColor: [193.8, 63.75, 30.6, 1],
				endColor: [0, 0, 0, 0],
				active: true,
				duration: Infinity
			}
		},
		{
			name: 'galaxy',
			system: {
				totalParticles: 200,
				emissionRate: 200 / 4,
				pos: 'center',
				angle: 90,
				angleVar: 360,
				speed: 60,
				speedVar: 10,
				life: 4,
				lifeVar: 1,
				radialAccel: - 80,
				radialAccelVar: 0,
				tangentialAccel: 80,
				tangentialAccelVar: 0,
				texture: pjs.defaultTexture,
				textureEnabled: true,
				textureAdditive: true,
				radius: 10,
				radiusVar: 2,
				startScale: 1,
				endScale: 1,
				startColor: [30.6, 63.75, 193.8, 1],
				endColor: [0, 0, 0, 1],
				active: true,
				duration: Infinity
			}
		},
		{
			name: 'snow',
			system: {
				totalParticles: 700,
				emissionRate: 10,
				pos: 'centerAboveTop',
				posVar: {
					x: 175,
					y: 0
				},
				gravity: {
					x: 0,
					y: 8
				},
				angle: - 90,
				angleVar: 10,
				speed: 9,
				speedVar: 1,
				life: 45,
				lifeVar: 15,
				radialAccel: 0,
				radialAccelVar: 0,
				tangentialAccel: 0,
				tangentialAccelVar: 0,
				textureEnabled: false,
				textureAdditive: false,
				radius: 3,
				radiusVar: 2,
				startScale: 1,
				endScale: 0.3,
				startColor: [255, 255, 255, 1],
				endColor: [255, 255, 255, 0],
				active: true,
				duration: Infinity
			}
		},
		{
			name: 'bubbles',
			system: {
				"totalParticles": 500,
				"emissionRate": 200,
				"active": true,
				"duration": Infinity,
				"pos": 'centerOffBottom',
				"posVar": {
					"x": 150,
					"y": 0
				},
				"angle": 90,
				"angleVar": 20,
				"life": 3.5,
				"lifeVar": 1,
				"radius": 8,
				"radiusVar": 2,
				"textureEnabled": false,
				"textureAdditive": true,
				"startScale": 1,
				"startScaleVar": 0,
				"endScale": 1,
				"endScaleVar": 0,
				"startColor": [198.9, 198.9, 255, 1],
				"startColorVar": [0, 0, 38, 0.1],
				"endColor": [25.5, 25.5, 25.5, 0.2],
				"endColorVar": [25.5, 25.5, 25.5, 0.2],
				"gravity": {
					"x": 0,
					"y": - 90
				},
				"radialAccel": 0,
				"radialAccelVar": 0,
				"tangentialAccel": 0,
				"tangentialAccelVar": 0,
				"speed": 180,
				"speedVar": 50
			}
		},
		{
			name: 'watergeyser',
			system: {
				"totalParticles": 400,
				"emissionRate": 100,
				"active": true,
				"duration": Infinity,
				"pos": "centerBottom",
				"posVar": {
					"x": 0,
					"y": 0
				},
				"angle": 90,
				"angleVar": 10,
				"life": 2.5,
				"lifeVar": 1,
				"radius": 5,
				"radiusVar": 3,
				"textureEnabled": false,
				"textureAdditive": false,
				"startScale": 1,
				"startScaleVar": 0,
				"endScale": 1,
				"endScaleVar": 0,
				"startColor": [19.89, 59.93, 255, 1],
				"startColorVar": [0, 0, 48, 0.3],
				"endColor": [198.9, 198.9, 255, 0],
				"endColorVar": [0, 0, 0, 0],
				"gravity": {
					"x": 0,
					"y": 150
				},
				"radialAccel": 0,
				"radialAccelVar": 0,
				"tangentialAccel": 0,
				"tangentialAccelVar": 0,
				"speed": 180,
				"speedVar": 50
			}
		},
		{
			name: 'ribbon',
			system: {
				"totalParticles": 200,
				"emissionRate": 40,
				"active": true,
				"duration": Infinity,
				"pos": "bottomLeft",
				"posVar": {
					"x": 30,
					"y": 0
				},
				"angle": 55,
				"angleVar": 0,
				"life": 2.5,
				"lifeVar": 0,
				"radius": 10,
				"radiusVar": 5,
				"textureEnabled": false,
				"textureAdditive": false,
				"startScale": 1,
				"startScaleVar": 0,
				"endScale": 1,
				"endScaleVar": 0,
				"startColor": [255, 0, 0, 1],
				"startColorVar": [0, 0, 0, 0],
				"endColor": [0, 0, 255, 1],
				"endColorVar": [0, 0, 0, 0],
				"gravity": {
					"x": 0,
					"y": -45
				},
				"radialAccel": 0,
				"radialAccelVar": 0,
				"tangentialAccel": 60,
				"tangentialAccelVar": 0,
				"speed": 180,
				"speedVar": 50
			}
		},
		{
			name: 'ringoffire',
			system: {
				"totalParticles": 400,
				"emissionRate": 180,
				"active": true,
				"duration": Infinity,
				pos: 'center',
				"posVar": {
					"x": 180,
					"y": 20
				},
				"angle": 90,
				"angleVar": 10,
				"life": 1,
				"lifeVar": 1,
				"radius": 10,
				"radiusVar": 1,
				"textureEnabled": true,
				"textureAdditive": true,
				"startScale": 1,
				"startScaleVar": 0,
				"endScale": 1,
				"endScaleVar": 0,
				startColor: [193.8, 63.75, 30.6, 1],
				endColor: [0, 0, 0, 0],
				"gravity": {
					"x": 0,
					"y": 0
				},
				"radialAccel": 0,
				"radialAccelVar": 0,
				"tangentialAccel": 0,
				"tangentialAccelVar": 0,
				"speed": 60,
				"speedVar": 20
			}
		}]
	};
})();


(function() {
	this.pjs = this.pjs || {};

	var bufferCache = {};

	/*
	 * Given an array with four channels (r, g, b and a),
	 * returns a css rgba string compatible with Canvas.
	 * Optionally provide an override alpha value that will be used
	 * in place of the actual alpha (useful for texture rendering)
	 */
	function colorArrayToString(array, overrideAlpha) {
		var r = array[0] | 0;
		var g = array[1] | 0;
		var b = array[2] | 0;
		var a = overrideAlpha || array[3];

		return 'rgba(' + r + ', ' + g + ', ' +  b + ', ' + a + ')';
	}

	/*
	 * Utility method to create a canvas the same size as the passed in texture (which is
	 * an Image element). Used for _renderParticleTexture
	 */
	function getBuffer(texture) {
		var size = '' + texture.width + 'x' + texture.height;

		var canvas = bufferCache[size];

		if(!canvas) {
			canvas = document.createElement('canvas');
			canvas.width = texture.width;
			canvas.height = texture.height;
			bufferCache[size] = canvas;
		}

		return canvas;
	}


	pjs.Renderer = {

		/*
		 * renders a particle to the given context without using textures. Uses
		 * the particle's color to draw a circle at the particle's location
		 * and sized to the particle
		 */
		_renderParticle: function(context, particle) {
			var color = colorArrayToString(particle.color);

			context.fillStyle = color;
			context.beginPath();
			context.arc(particle.pos.x, particle.pos.y, particle.radius * particle.scale, 0, Math.PI*2, true);
			context.closePath();
			context.fill();
		},

		/*
		 * renders a particle using the particle's texture. The texture is typically a white
		 * image and so need to use a secondary buffer to "tint" this image based on the 
		 * particle's color.
		 */
		_renderParticleTexture: function(context, particle) {
			particle.buffer = particle.buffer || getBuffer(particle.texture);

			var bufferContext = particle.buffer.getContext('2d');

			// figure out what size to draw the texture at, based on the particle's
			// current scale
			var w = (particle.texture.width * particle.scale) | 0;
			var h = (particle.texture.height * particle.scale) | 0;

			// figure out the x and y locations to render at, to center the texture in the buffer
			var x = particle.pos.x - w / 2;
			var y = particle.pos.y - h / 2;

			bufferContext.clearRect(0, 0, particle.buffer.width, particle.buffer.height);
			bufferContext.globalAlpha = particle.color[3];
			bufferContext.drawImage(particle.texture, 0, 0);

			// now use source-atop to "tint" the white texture, here we want the particle's pure color,
			// not including alpha. As we already used the particle's alpha to render the texture above
			bufferContext.globalCompositeOperation = "source-atop";
			bufferContext.fillStyle = colorArrayToString(particle.color, 1);
			bufferContext.fillRect(0, 0, particle.buffer.width, particle.buffer.height);

			// reset the buffer's context for the next time we draw the particle
			bufferContext.globalCompositeOperation = "source-over";
			bufferContext.globalAlpha = 1;

			// finally, take the rendered and tinted texture and draw it into the main canvas, at the
			// particle's location
			context.drawImage(particle.buffer, 0, 0, particle.buffer.width, particle.buffer.height, x, y, w, h);
		},

		render: function(context, particles) {
			for(var i = 0; i < particles.length; ++i) {
				var p = particles[i];
				if(p.life > 0 && p.color) {
					if(p.textureAdditive) {
						context.globalCompositeOperation = 'lighter';
					} else {
						context.globalCompositeOperation = 'source-over';
					}

					if(!p.texture || !p.textureEnabled) {
						this._renderParticle(context, p);
					} else {
						this._renderParticleTexture(context, p);
					}
				}
			}
			context.globalCompositeOperation = 'source-over';
		}
	};

})();


(function() {
	this.pjs = this.pjs || {};

	this.pjs.TextureLoader = {
		cache: {},

		load: function(target, property, file) {
			if (this.cache[file.name]) {
				this._overlay(target, property, this.cache[file.name]);
			} else {
				this._loadViaFile(target, property, file);
			}
		},

		_overlay: function(target, property, result) {
			if(result.width) {
				target[property] = result;
			} else {
				result.onload = function() {
					target[property] = result;
				};
			}
		},

		_loadViaFile: function(target, property, file) {
			if (!this._isImageFile(file)) {
				throw new Error('this does not appear to be an image');
			}

			var me = this;

			var filereader = new FileReader();
			filereader.onload = function(result) {
				var image = new Image();
				image.src = result.target.result;

				me.cache[file.name] = image;
				me._overlay(target, property, image);
			};

			filereader.onerror = function() {
				alert('failed to load the image file');
			};

			filereader.readAsDataURL(file);
		},

		_isImageFile: function(file) {
			var period = file.name.indexOf('.');

			var extension = file.name.substring(period + 1);

			if (!extension) {
				return false;
			}

			return ['png', 'jpg', 'jpeg', 'gif'].indexOf(extension.toLowerCase()) > -1;
		}
	};
})();


(function() {
	function isInteger(num) {
		return num === (num | 0);
	}

	this.pjs = this.pjs || {};

	pjs.toRad = function(deg) {
		return Math.PI * deg / 180;
	};

	pjs.random = function(minOrMax, maxOrUndefined, dontFloor) {
		dontFloor = dontFloor || false;

		var min = pjs.isNumber(maxOrUndefined) ? minOrMax: 0;
		var max = pjs.isNumber(maxOrUndefined) ? maxOrUndefined: minOrMax;

		var range = max - min;

		var result = Math.random() * range + min;

		if (isInteger(min) && isInteger(max) && ! dontFloor) {
			return Math.floor(result);
		} else {
			return result;
		}
	};

	pjs.random11 = function() {
		return pjs.random(-1, 1, true);
	};

	pjs.extend = function(obj, config) {
		for (var prop in config) {
			if (config.hasOwnProperty(prop)) {
				obj[prop] = config[prop];
			}
		}
	};

	pjs.recursiveExtend = function(obj, config, exceptions) {
		for (var prop in config) {
			if (config.hasOwnProperty(prop)) {
				if (exceptions.indexOf(prop) > - 1) {
					obj[prop] = config[prop];
				} else {
					if (typeof config[prop] === 'object') {
						pjs.recursiveExtend(obj[prop], config[prop], exceptions);
					} else {
						obj[prop] = config[prop];
					}
				}
			}
		}
	};

	pjs.isNumber = function(i) {
		return typeof i === 'number';
	};

	pjs.clone = function(obj) {
		var clone = {};
		pjs.extend(clone, obj);
		return clone;
	};

	pjs.deepClone = function(obj, exceptions) {
		if (typeof obj !== 'object') {
			return obj;
		}
		if (Array.isArray(obj)) {
			var cloneArray = [];
			for (var i = 0; i < obj.length; ++i) {
				cloneArray.push(pjs.deepClone(obj[i], exceptions));
			}
			return cloneArray;
		}

		var clone = {};
		for (var prop in obj) {
			if (exceptions.indexOf(prop) > - 1) {
				clone[prop] = obj[prop];
			} else {
				clone[prop] = pjs.deepClone(obj[prop], exceptions);
			}
		}
		return clone;
	};

})();


(function() {
	this.pjs = this.pjs || {};
	var lastTime = 0;

	this.requestAnimationFrame = window.requestAnimationFrame || 
		window.mozRequestAnimationFrame || 
		window.webkitRequestAnimationFrame || 
		window.msRequestAnimationFrame || 
		window.oRequestAnimationFrame;

	if (!this.requestAnimationFrame) {
		// polyfill, primarily for IE9
		this.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() {
				callback(currTime + timeToCall);
			},
			timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
	}

	function getUrlParam(name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.href);

		return (results && results[1]) || '';
	}

	function getCanvasSize() {
		var width = getUrlParam('w');
		var height = getUrlParam('h');

		return {
			width: + width || 250,
			height: + height || 300
		};
	}

	var paused = true;
	var lastTimestamp = 0;

	var particleSystem;
	var canvas;
	var context;
	var stats;

	function initStats(statsContainerId) {
		stats = new Stats();
		stats.setMode(0);

		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = 0;
		stats.domElement.style.left = 0;

		document.getElementById(statsContainerId).appendChild(stats.domElement);

		var graphs = ['fpsGraph', 'msGraph'];
		for(var i = 0; i < graphs.length; ++i) {
			var graphId = graphs[i];
			var graph = document.getElementById(graphId);
			graph.parentNode.removeChild(graph);
		}
	}

	function draw(timestamp) {
		if (paused) {
			return;
		}
		stats.begin();

		var delta = timestamp - (lastTimestamp || timestamp);
		lastTimestamp = timestamp;

		delta /= 1000;
		particleSystem.update(delta);

		context.fillStyle = 'black';
		context.fillRect(0, 0, context.canvas.width, context.canvas.height);

		pjs.Renderer.render(context, particleSystem.particles);

		requestAnimationFrame(draw);
		stats.end();
	}

	pjs.onReady = function() {
		pjs.defaultTexture = new Image();
		pjs.defaultTexture.src = 'particle.png';

		pjs.defaultTexture.onload = function() {
			canvas = document.createElement('canvas');

			var canvasSize = getCanvasSize();

			canvas.width = canvasSize.width;
			canvas.height = canvasSize.height;

			pjs.predefinedSystems.positionSystems(canvasSize);
			pjs.predefinedSystems.setTexture(pjs.defaultTexture);

			var system = pjs.predefinedSystems.getSystem(getUrlParam('system'));
			pjs.ps = particleSystem = new pjs.Emitter(system);

			context = canvas.getContext('2d');

			var includeTransformFn = getUrlParam('transform') === 'true';

			if (!includeTransformFn) {
				pjs.predefinedSystems.deleteSystem('ringoffire');
			}

			new pjs.ui.Builder('guiContainer', particleSystem, canvas, pjs, getUrlParam('ui'), includeTransformFn);
			document.getElementById('canvasContainer').appendChild(canvas);
			initStats('canvasContainer');

			setTimeout(function() {
				pjs.ps.reset();
				if(includeTransformFn) {
					pjs.ps.transformFn = pjs.circleFnSrc;
				}
			}, 10);
			draw(new Date().getTime());
		};
	};

	pjs.isPaused = function() {
		return paused;
	};

	pjs.togglePause = function() {
		paused = ! paused;

		if (!paused) {
			lastTimestamp = 0;
			draw(new Date().getTime());
		}
	};
})();


/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
var dat=dat||{};dat.gui=dat.gui||{};dat.utils=dat.utils||{};dat.controllers=dat.controllers||{};dat.dom=dat.dom||{};dat.color=dat.color||{};dat.utils.css=function(){return{load:function(e,a){var a=a||document,d=a.createElement("link");d.type="text/css";d.rel="stylesheet";d.href=e;a.getElementsByTagName("head")[0].appendChild(d)},inject:function(e,a){var a=a||document,d=document.createElement("style");d.type="text/css";d.innerHTML=e;a.getElementsByTagName("head")[0].appendChild(d)}}}();
dat.utils.common=function(){var e=Array.prototype.forEach,a=Array.prototype.slice;return{BREAK:{},extend:function(d){this.each(a.call(arguments,1),function(a){for(var g in a)this.isUndefined(a[g])||(d[g]=a[g])},this);return d},defaults:function(d){this.each(a.call(arguments,1),function(a){for(var g in a)this.isUndefined(d[g])&&(d[g]=a[g])},this);return d},compose:function(){var d=a.call(arguments);return function(){for(var c=a.call(arguments),g=d.length-1;0<=g;g--)c=[d[g].apply(this,c)];return c[0]}},
each:function(a,c,g){if(e&&a.forEach===e)a.forEach(c,g);else if(a.length===a.length+0)for(var b=0,n=a.length;b<n&&!(b in a&&c.call(g,a[b],b)===this.BREAK);b++);else for(b in a)if(c.call(g,a[b],b)===this.BREAK)break},defer:function(a){setTimeout(a,0)},toArray:function(d){return d.toArray?d.toArray():a.call(d)},isUndefined:function(a){return void 0===a},isNull:function(a){return null===a},isNaN:function(a){return a!==a},isArray:Array.isArray||function(a){return a.constructor===Array},isObject:function(a){return a===
Object(a)},isNumber:function(a){return a===a+0},isString:function(a){return a===a+""},isBoolean:function(a){return!1===a||!0===a},isFunction:function(a){return"[object Function]"===Object.prototype.toString.call(a)}}}();
dat.controllers.Controller=function(e){var a=function(a,c){this.initialValue=a[c];this.domElement=document.createElement("div");this.object=a;this.property=c;this.__onFinishChange=this.__onChange=void 0};e.extend(a.prototype,{onChange:function(a){this.__onChange=a;return this},onFinishChange:function(a){this.__onFinishChange=a;return this},setValue:function(a){this.object[this.property]=a;this.__onChange&&this.__onChange.call(this,a);this.updateDisplay();return this},getValue:function(){return this.object[this.property]},
updateDisplay:function(){return this},isModified:function(){return this.initialValue!==this.getValue()}});return a}(dat.utils.common);
dat.dom.dom=function(e){function a(b){if("0"===b||e.isUndefined(b))return 0;b=b.match(c);return!e.isNull(b)?parseFloat(b[1]):0}var d={};e.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(b,a){e.each(b,function(b){d[b]=a})});var c=/(\d+(\.\d+)?)px/,g={makeSelectable:function(b,a){void 0===b||void 0===b.style||(b.onselectstart=a?function(){return!1}:function(){},b.style.MozUserSelect=a?"auto":"none",b.style.KhtmlUserSelect=
a?"auto":"none",b.unselectable=a?"on":"off")},makeFullscreen:function(b,a,c){e.isUndefined(a)&&(a=!0);e.isUndefined(c)&&(c=!0);b.style.position="absolute";a&&(b.style.left=0,b.style.right=0);c&&(b.style.top=0,b.style.bottom=0)},fakeEvent:function(b,a,c,g){var c=c||{},p=d[a];if(!p)throw Error("Event type "+a+" not supported.");var k=document.createEvent(p);switch(p){case "MouseEvents":k.initMouseEvent(a,c.bubbles||!1,c.cancelable||!0,window,c.clickCount||1,0,0,c.x||c.clientX||0,c.y||c.clientY||0,!1,
!1,!1,!1,0,null);break;case "KeyboardEvents":p=k.initKeyboardEvent||k.initKeyEvent;e.defaults(c,{cancelable:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:void 0,charCode:void 0});p(a,c.bubbles||!1,c.cancelable,window,c.ctrlKey,c.altKey,c.shiftKey,c.metaKey,c.keyCode,c.charCode);break;default:k.initEvent(a,c.bubbles||!1,c.cancelable||!0)}e.defaults(k,g);b.dispatchEvent(k)},bind:function(b,a,c,d){b.addEventListener?b.addEventListener(a,c,d||!1):b.attachEvent&&b.attachEvent("on"+a,c);return g},
unbind:function(b,a,c,d){b.removeEventListener?b.removeEventListener(a,c,d||!1):b.detachEvent&&b.detachEvent("on"+a,c);return g},addClass:function(b,a){if(void 0===b.className)b.className=a;else if(b.className!==a){var c=b.className.split(/ +/);-1==c.indexOf(a)&&(c.push(a),b.className=c.join(" ").replace(/^\s+/,"").replace(/\s+$/,""))}return g},removeClass:function(a,c){if(c){if(void 0!==a.className)if(a.className===c)a.removeAttribute("class");else{var d=a.className.split(/ +/),e=d.indexOf(c);-1!=
e&&(d.splice(e,1),a.className=d.join(" "))}}else a.className=void 0;return g},hasClass:function(a,c){return RegExp("(?:^|\\s+)"+c+"(?:\\s+|$)").test(a.className)||!1},getWidth:function(b){b=getComputedStyle(b);return a(b["border-left-width"])+a(b["border-right-width"])+a(b["padding-left"])+a(b["padding-right"])+a(b.width)},getHeight:function(b){b=getComputedStyle(b);return a(b["border-top-width"])+a(b["border-bottom-width"])+a(b["padding-top"])+a(b["padding-bottom"])+a(b.height)},getOffset:function(a){var c=
{left:0,top:0};if(a.offsetParent){do c.left+=a.offsetLeft,c.top+=a.offsetTop;while(a=a.offsetParent)}return c},isActive:function(a){return a===document.activeElement&&(a.type||a.href)}};return g}(dat.utils.common);
dat.controllers.OptionController=function(e,a,d){var c=function(g,b,e){c.superclass.call(this,g,b);var i=this;this.__select=document.createElement("select");if(d.isArray(e)){var l={};d.each(e,function(a){l[a]=a});e=l}d.each(e,function(a,b){var c=document.createElement("option");c.innerHTML=b;c.setAttribute("value",a);i.__select.appendChild(c)});this.updateDisplay();a.bind(this.__select,"change",function(){i.setValue(this.options[this.selectedIndex].value)});this.domElement.appendChild(this.__select)};
c.superclass=e;d.extend(c.prototype,e.prototype,{setValue:function(a){a=c.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue());return a},updateDisplay:function(){this.__select.value=this.getValue();return c.superclass.prototype.updateDisplay.call(this)}});return c}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.NumberController=function(e,a){var d=function(c,g,b){d.superclass.call(this,c,g);b=b||{};this.__min=b.min;this.__max=b.max;this.__step=b.step;this.__impliedStep=a.isUndefined(this.__step)?0==this.initialValue?1:Math.pow(10,Math.floor(Math.log(this.initialValue)/Math.LN10))/10:this.__step;c=this.__impliedStep;c=c.toString();c=-1<c.indexOf(".")?c.length-c.indexOf(".")-1:0;this.__precision=c};d.superclass=e;a.extend(d.prototype,e.prototype,{setValue:function(a){void 0!==this.__min&&a<
this.__min?a=this.__min:void 0!==this.__max&&a>this.__max&&(a=this.__max);void 0!==this.__step&&0!=a%this.__step&&(a=Math.round(a/this.__step)*this.__step);return d.superclass.prototype.setValue.call(this,a)},min:function(a){this.__min=a;return this},max:function(a){this.__max=a;return this},step:function(a){this.__step=a;return this}});return d}(dat.controllers.Controller,dat.utils.common);
dat.controllers.NumberControllerBox=function(e,a,d){var c=function(g,b,e){function i(){var a=parseFloat(k.__input.value);d.isNaN(a)||k.setValue(a)}function l(a){var b=s-a.clientY;k.setValue(k.getValue()+b*k.__impliedStep);s=a.clientY}function p(){a.unbind(window,"mousemove",l);a.unbind(window,"mouseup",p)}this.__truncationSuspended=!1;c.superclass.call(this,g,b,e);var k=this,s;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"change",i);a.bind(this.__input,
"blur",function(){i();k.__onFinishChange&&k.__onFinishChange.call(k,k.getValue())});a.bind(this.__input,"mousedown",function(b){a.bind(window,"mousemove",l);a.bind(window,"mouseup",p);s=b.clientY});a.bind(this.__input,"keydown",function(a){13===a.keyCode&&(k.__truncationSuspended=!0,this.blur(),k.__truncationSuspended=!1)});this.updateDisplay();this.domElement.appendChild(this.__input)};c.superclass=e;d.extend(c.prototype,e.prototype,{updateDisplay:function(){var a=this.__input,b;if(this.__truncationSuspended)b=
this.getValue();else{b=this.getValue();var d=Math.pow(10,this.__precision);b=Math.round(b*d)/d}a.value=b;return c.superclass.prototype.updateDisplay.call(this)}});return c}(dat.controllers.NumberController,dat.dom.dom,dat.utils.common);
dat.controllers.NumberControllerSlider=function(e,a,d,c,g){var b=function(c,d,g,e,k){function s(b){b.preventDefault();var c=a.getOffset(q.__background),d=a.getWidth(q.__background);q.setValue(q.__min+(q.__max-q.__min)*((b.clientX-c.left)/(c.left+d-c.left)));return!1}function w(){a.unbind(window,"mousemove",s);a.unbind(window,"mouseup",w);q.__onFinishChange&&q.__onFinishChange.call(q,q.getValue())}b.superclass.call(this,c,d,{min:g,max:e,step:k});var q=this;this.__background=document.createElement("div");
this.__foreground=document.createElement("div");a.bind(this.__background,"mousedown",function(b){a.bind(window,"mousemove",s);a.bind(window,"mouseup",w);s(b)});a.addClass(this.__background,"slider");a.addClass(this.__foreground,"slider-fg");this.updateDisplay();this.__background.appendChild(this.__foreground);this.domElement.appendChild(this.__background)};b.superclass=e;b.useDefaultStyles=function(){d.inject(g)};c.extend(b.prototype,e.prototype,{updateDisplay:function(){var a=(this.getValue()-this.__min)/
(this.__max-this.__min);this.__foreground.style.width=100*a+"%";return b.superclass.prototype.updateDisplay.call(this)}});return b}(dat.controllers.NumberController,dat.dom.dom,dat.utils.css,dat.utils.common,"/**\n * dat-gui JavaScript Controller Library\n * http://code.google.com/p/dat-gui\n *\n * Copyright 2011 Data Arts Team, Google Creative Lab\n *\n * Licensed under the Apache License, Version 2.0 (the \"License\");\n * you may not use this file except in compliance with the License.\n * You may obtain a copy of the License at\n *\n * http://www.apache.org/licenses/LICENSE-2.0\n */\n\n.slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}");
dat.controllers.FunctionController=function(e,a,d){var c=function(d,b,e){c.superclass.call(this,d,b);var i=this;this.__button=document.createElement("div");this.__button.innerHTML=void 0===e?"Fire":e;a.bind(this.__button,"click",function(a){a.preventDefault();i.fire();return!1});a.addClass(this.__button,"button");this.domElement.appendChild(this.__button)};c.superclass=e;d.extend(c.prototype,e.prototype,{fire:function(){this.__onChange&&this.__onChange.call(this);this.__onFinishChange&&this.__onFinishChange.call(this,
this.getValue());this.getValue().call(this.object)}});return c}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.BooleanController=function(e,a,d){var c=function(d,b){c.superclass.call(this,d,b);var e=this;this.__prev=this.getValue();this.__checkbox=document.createElement("input");this.__checkbox.setAttribute("type","checkbox");a.bind(this.__checkbox,"change",function(){e.setValue(!e.__prev)},!1);this.domElement.appendChild(this.__checkbox);this.updateDisplay()};c.superclass=e;d.extend(c.prototype,e.prototype,{setValue:function(a){a=c.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&
this.__onFinishChange.call(this,this.getValue());this.__prev=this.getValue();return a},updateDisplay:function(){!0===this.getValue()?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=!0):this.__checkbox.checked=!1;return c.superclass.prototype.updateDisplay.call(this)}});return c}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.color.toString=function(e){return function(a){if(1==a.a||e.isUndefined(a.a)){for(a=a.hex.toString(16);6>a.length;)a="0"+a;return"#"+a}return"rgba("+Math.round(a.r)+","+Math.round(a.g)+","+Math.round(a.b)+","+a.a+")"}}(dat.utils.common);
dat.color.interpret=function(e,a){var d,c,g=[{litmus:a.isString,conversions:{THREE_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);return null===a?!1:{space:"HEX",hex:parseInt("0x"+a[1].toString()+a[1].toString()+a[2].toString()+a[2].toString()+a[3].toString()+a[3].toString())}},write:e},SIX_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9]{6})$/i);return null===a?!1:{space:"HEX",hex:parseInt("0x"+a[1].toString())}},write:e},CSS_RGB:{read:function(a){a=a.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
return null===a?!1:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3])}},write:e},CSS_RGBA:{read:function(a){a=a.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);return null===a?!1:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3]),a:parseFloat(a[4])}},write:e}}},{litmus:a.isNumber,conversions:{HEX:{read:function(a){return{space:"HEX",hex:a,conversionName:"HEX"}},write:function(a){return a.hex}}}},{litmus:a.isArray,conversions:{RGB_ARRAY:{read:function(a){return 3!=
a.length?!1:{space:"RGB",r:a[0],g:a[1],b:a[2]}},write:function(a){return[a.r,a.g,a.b]}},RGBA_ARRAY:{read:function(a){return 4!=a.length?!1:{space:"RGB",r:a[0],g:a[1],b:a[2],a:a[3]}},write:function(a){return[a.r,a.g,a.b,a.a]}}}},{litmus:a.isObject,conversions:{RGBA_OBJ:{read:function(b){return a.isNumber(b.r)&&a.isNumber(b.g)&&a.isNumber(b.b)&&a.isNumber(b.a)?{space:"RGB",r:b.r,g:b.g,b:b.b,a:b.a}:!1},write:function(a){return{r:a.r,g:a.g,b:a.b,a:a.a}}},RGB_OBJ:{read:function(b){return a.isNumber(b.r)&&
a.isNumber(b.g)&&a.isNumber(b.b)?{space:"RGB",r:b.r,g:b.g,b:b.b}:!1},write:function(a){return{r:a.r,g:a.g,b:a.b}}},HSVA_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)&&a.isNumber(b.a)?{space:"HSV",h:b.h,s:b.s,v:b.v,a:b.a}:!1},write:function(a){return{h:a.h,s:a.s,v:a.v,a:a.a}}},HSV_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)?{space:"HSV",h:b.h,s:b.s,v:b.v}:!1},write:function(a){return{h:a.h,s:a.s,v:a.v}}}}}];return function(){c=!1;
var b=1<arguments.length?a.toArray(arguments):arguments[0];a.each(g,function(e){if(e.litmus(b))return a.each(e.conversions,function(e,g){d=e.read(b);if(!1===c&&!1!==d)return c=d,d.conversionName=g,d.conversion=e,a.BREAK}),a.BREAK});return c}}(dat.color.toString,dat.utils.common);
dat.GUI=dat.gui.GUI=function(e,a,d,c,g,b,n,i,l,p,k,s,w,q,z,h,j){function t(a,d,e,u){if(void 0===d[e])throw Error("Object "+d+' has no property "'+e+'"');u.color?d=new k(d,e):u.textarea?d=new s(d,e):u.file?d=new w(d,e):(d=[d,e].concat(u.factoryArgs),d=c.apply(a,d));u.before instanceof g&&(u.before=u.before.__li);H(a,d);h.addClass(d.domElement,"c");e=document.createElement("span");h.addClass(e,"property-name");e.innerHTML=d.property;var p=document.createElement("div");p.appendChild(e);p.appendChild(d.domElement);
var v=r(a,p,u.before);h.addClass(v,m.CLASS_CONTROLLER_ROW);h.addClass(v,typeof d.getValue());h.addClass(v,d.additionalClasses);var f=d;f.__li=v;f.__gui=a;j.extend(f,{options:function(c){if(1<arguments.length)return f.remove(),t(a,f.object,f.property,{before:f.__li.nextElementSibling,factoryArgs:[j.toArray(arguments)]});if(j.isArray(c)||j.isObject(c))return f.remove(),t(a,f.object,f.property,{before:f.__li.nextElementSibling,factoryArgs:[c]})},name:function(a){f.__li.firstElementChild.firstElementChild.innerHTML=
a;return f},listen:function(){f.__gui.listen(f);return f},remove:function(){f.__gui.remove(f);return f}});if(f instanceof l){var q=new i(f.object,f.property,{min:f.__min,max:f.__max,step:f.__step});j.each(["updateDisplay","onChange","onFinishChange"],function(a){var c=f[a],b=q[a];f[a]=q[a]=function(){var a=Array.prototype.slice.call(arguments);c.apply(f,a);return b.apply(q,a)}});h.addClass(v,"has-slider");f.domElement.insertBefore(q.domElement,f.domElement.firstElementChild)}else f instanceof i?(u=
function(c){return j.isNumber(f.__min)&&j.isNumber(f.__max)?(f.remove(),t(a,f.object,f.property,{before:f.__li.nextElementSibling,factoryArgs:[f.__min,f.__max,f.__step]})):c},f.min=j.compose(u,f.min),f.max=j.compose(u,f.max)):f instanceof b?(h.bind(v,"click",function(){h.fakeEvent(f.__checkbox,"click")}),h.bind(f.__checkbox,"click",function(a){a.stopPropagation()})):f instanceof n?(h.bind(v,"click",function(){h.fakeEvent(f.__button,"click")}),h.bind(v,"mouseover",function(){h.addClass(f.__button,
"hover")}),h.bind(v,"mouseout",function(){h.removeClass(f.__button,"hover")})):f instanceof k&&(h.addClass(v,"color"),f.updateDisplay=j.compose(function(a){v.style.borderLeftColor=f.__color.toString();return a},f.updateDisplay),f.updateDisplay());f.setValue=j.compose(function(c){a.getRoot().__preset_select&&f.isModified()&&E(a.getRoot(),!0);return c},f.setValue);a.__controllers.push(d);return d}function r(a,c,b){var d=document.createElement("li");c&&d.appendChild(c);b?a.__ul.insertBefore(d,params.before):
a.__ul.appendChild(d);a.onResize();return d}function H(a,c){var b=a.getRoot(),d=b.__rememberedObjects.indexOf(c.object);if(-1!=d){var e=b.__rememberedObjectIndecesToControllers[d];void 0===e&&(e={},b.__rememberedObjectIndecesToControllers[d]=e);e[c.property]=c;if(b.load&&b.load.remembered){b=b.load.remembered;if(b[a.preset])b=b[a.preset];else if(b[A])b=b[A];else return;b[d]&&void 0!==b[d][c.property]&&(d=b[d][c.property],c.initialValue=d,c.setValue(d))}}}function F(a,c){a.domElement.style.width=c+
"px";a.__save_row&&a.autoPlace&&(a.__save_row.style.width=c+"px");a.__closeButton&&(a.__closeButton.style.width=c+"px")}function C(a,c){var b={};j.each(a.__rememberedObjects,function(d,e){var g={};j.each(a.__rememberedObjectIndecesToControllers[e],function(a,b){g[b]=c?a.initialValue:a.getValue()});b[e]=g});return b}function G(a,c,b){var d=document.createElement("option");d.innerHTML=c;d.value=c;a.__preset_select.appendChild(d);b&&(a.__preset_select.selectedIndex=a.__preset_select.length-1)}function E(a,
c){var b=a.__preset_select[a.__preset_select.selectedIndex];b.innerHTML=c?b.value+"*":b.value}function I(a){0!=a.length&&q(function(){I(a)});j.each(a,function(a){a.updateDisplay()})}e.inject(d);var A="Default",x;try{x="localStorage"in window&&null!==window.localStorage}catch(L){x=!1}var B,J=!0,y,D=!1,K=[],m=function(a){function c(){localStorage.setItem(document.location.href+".gui",JSON.stringify(b.getSaveObject()))}var b=this;this.domElement=document.createElement("div");this.__ul=document.createElement("ul");
this.domElement.appendChild(this.__ul);h.addClass(this.domElement,"dg");this.__folders={};this.__controllers=[];this.__rememberedObjects=[];this.__rememberedObjectIndecesToControllers=[];this.__listening=[];a=a||{};a=j.defaults(a,{autoPlace:!0,width:m.DEFAULT_WIDTH});a=j.defaults(a,{resizable:a.autoPlace,hideable:a.autoPlace});j.isUndefined(a.load)?a.load={preset:A}:a.preset&&(a.load.preset=a.preset);j.isUndefined(a.parent)&&a.hideable&&K.push(this);a.resizable=j.isUndefined(a.parent)&&a.resizable;
a.autoPlace&&j.isUndefined(a.scrollable)&&(a.scrollable=!0);var d=x&&"true"===localStorage.getItem(document.location.href+".isLocal");Object.defineProperties(this,{parent:{get:function(){return a.parent}},scrollable:{get:function(){return a.scrollable}},autoPlace:{get:function(){return a.autoPlace}},preset:{get:function(){return b.parent?b.getRoot().preset:a.load.preset},set:function(c){b.parent?b.getRoot().preset=c:a.load.preset=c;for(c=0;c<this.__preset_select.length;c++)this.__preset_select[c].value==
this.preset&&(this.__preset_select.selectedIndex=c);b.revert()}},width:{get:function(){return a.width},set:function(c){a.width=c;F(b,c)}},name:{get:function(){return a.name},set:function(b){a.name=b;g&&(g.innerHTML=a.name)}},closed:{get:function(){return a.closed},set:function(c){a.closed=c;a.closed?h.addClass(b.__ul,m.CLASS_CLOSED):h.removeClass(b.__ul,m.CLASS_CLOSED);this.onResize();b.__closeButton&&(b.__closeButton.innerHTML=c?m.TEXT_OPEN:m.TEXT_CLOSED)}},load:{get:function(){return a.load}},useLocalStorage:{get:function(){return d},
set:function(a){x&&((d=a)?h.bind(window,"unload",c):h.unbind(window,"unload",c),localStorage.setItem(document.location.href+".isLocal",a))}}});if(j.isUndefined(a.parent)){a.closed=!1;h.addClass(this.domElement,m.CLASS_MAIN);h.makeSelectable(this.domElement,!1);if(x&&d){b.useLocalStorage=!0;var e=localStorage.getItem(document.location.href+".gui");e&&(a.load=JSON.parse(e))}this.__closeButton=document.createElement("div");this.__closeButton.innerHTML=m.TEXT_CLOSED;h.addClass(this.__closeButton,m.CLASS_CLOSE_BUTTON);
this.domElement.appendChild(this.__closeButton);h.bind(this.__closeButton,"click",function(){b.closed=!b.closed})}else{void 0===a.closed&&(a.closed=!0);var g=document.createTextNode(a.name);h.addClass(g,"controller-name");e=r(b,g);h.addClass(this.__ul,m.CLASS_CLOSED);h.addClass(e,"title");h.bind(e,"click",function(a){a.preventDefault();b.closed=!b.closed;return!1});a.closed||(this.closed=!1)}a.autoPlace&&(j.isUndefined(a.parent)&&(J&&(y=document.createElement("div"),h.addClass(y,"dg"),h.addClass(y,
m.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(y),J=!1),y.appendChild(this.domElement),h.addClass(this.domElement,m.CLASS_AUTO_PLACE)),this.parent||F(b,a.width));h.bind(window,"resize",function(){b.onResize()});h.bind(this.__ul,"webkitTransitionEnd",function(){b.onResize()});h.bind(this.__ul,"transitionend",function(){b.onResize()});h.bind(this.__ul,"oTransitionEnd",function(){b.onResize()});this.onResize();if(a.resizable){var f=this,e=function(a){a.preventDefault();l=a.clientX;h.addClass(f.__closeButton,
m.CLASS_DRAG);h.bind(window,"mousemove",k);h.bind(window,"mouseup",p);return!1},k=function(a){a.preventDefault();f.width+=l-a.clientX;f.onResize();l=a.clientX;return!1},p=function(){h.removeClass(f.__closeButton,m.CLASS_DRAG);h.unbind(window,"mousemove",k);h.unbind(window,"mouseup",p)};f.__resize_handle=document.createElement("div");j.extend(f.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});var l;h.bind(f.__resize_handle,"mousedown",e);
h.bind(f.__closeButton,"mousedown",e);f.domElement.insertBefore(f.__resize_handle,f.domElement.firstElementChild)}b.getRoot();if(!a.parent){var i=b.getRoot();i.width+=1;j.defer(function(){i.width-=1})}};m.toggleHide=function(){D=!D;j.each(K,function(a){a.domElement.style.zIndex=D?-999:999;a.domElement.style.opacity=D?0:1})};m.CLASS_AUTO_PLACE="a";m.CLASS_AUTO_PLACE_CONTAINER="ac";m.CLASS_MAIN="main";m.CLASS_CONTROLLER_ROW="cr";m.CLASS_TOO_TALL="taller-than-window";m.CLASS_CLOSED="closed";m.CLASS_CLOSE_BUTTON=
"close-button";m.CLASS_DRAG="drag";m.DEFAULT_WIDTH=245;m.TEXT_CLOSED="Close Controls";m.TEXT_OPEN="Open Controls";h.bind(window,"keydown",function(a){"text"!==document.activeElement.type&&("textarea"!==document.activeElement.type&&(72===a.which||72==a.keyCode))&&m.toggleHide()},!1);j.extend(m.prototype,{add:function(a,b){return t(this,a,b,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(a,b){return t(this,a,b,{color:!0})},addTextArea:function(a,b){return t(this,a,b,{textarea:!0})},
addFile:function(a,b){return t(this,a,b,{file:!0})},remove:function(a){this.__ul.removeChild(a.__li);this.__controllers.slice(this.__controllers.indexOf(a),1);var b=this;j.defer(function(){b.onResize()})},destroy:function(){this.autoPlace&&y.removeChild(this.domElement)},addFolder:function(a){if(void 0!==this.__folders[a])throw Error('You already have a folder in this GUI by the name "'+a+'"');var b={name:a,parent:this};b.autoPlace=this.autoPlace;this.load&&(this.load.folders&&this.load.folders[a])&&
(b.closed=this.load.folders[a].closed,b.load=this.load.folders[a]);b=new m(b);this.__folders[a]=b;a=r(this,b.domElement);h.addClass(a,"folder");return b},open:function(){this.closed=!1},close:function(){this.closed=!0},onResize:function(){var a=this.getRoot();if(a.scrollable){var b=h.getOffset(a.__ul).top,c=0;j.each(a.__ul.childNodes,function(b){a.autoPlace&&b===a.__save_row||(c+=h.getHeight(b))});window.innerHeight-b-20<c?(h.addClass(a.domElement,m.CLASS_TOO_TALL),a.__ul.style.height=window.innerHeight-
b-20+"px"):(h.removeClass(a.domElement,m.CLASS_TOO_TALL),a.__ul.style.height="auto")}a.__resize_handle&&j.defer(function(){a.__resize_handle.style.height=a.__ul.offsetHeight+"px"});a.__closeButton&&(a.__closeButton.style.width=a.width+"px")},remember:function(){j.isUndefined(B)&&(B=new z,B.domElement.innerHTML=a);if(this.parent)throw Error("You can only call remember on a top level GUI.");var b=this;j.each(Array.prototype.slice.call(arguments),function(a){if(0==b.__rememberedObjects.length){var c=
b,d=c.__save_row=document.createElement("li");h.addClass(c.domElement,"has-save");c.__ul.insertBefore(d,c.__ul.firstChild);h.addClass(d,"save-row");var e=document.createElement("span");e.innerHTML="&nbsp;";h.addClass(e,"button gears");var g=document.createElement("span");g.innerHTML="Save";h.addClass(g,"button");h.addClass(g,"save");var f=document.createElement("span");f.innerHTML="New";h.addClass(f,"button");h.addClass(f,"save-as");var k=document.createElement("span");k.innerHTML="Revert";h.addClass(k,
"button");h.addClass(k,"revert");var p=c.__preset_select=document.createElement("select");c.load&&c.load.remembered?j.each(c.load.remembered,function(a,b){G(c,b,b==c.preset)}):G(c,A,!1);h.bind(p,"change",function(){for(var a=0;a<c.__preset_select.length;a++)c.__preset_select[a].innerHTML=c.__preset_select[a].value;c.preset=this.value});d.appendChild(p);d.appendChild(e);d.appendChild(g);d.appendChild(f);d.appendChild(k);if(x){var d=document.getElementById("dg-save-locally"),l=document.getElementById("dg-local-explain");
d.style.display="block";d=document.getElementById("dg-local-storage");"true"===localStorage.getItem(document.location.href+".isLocal")&&d.setAttribute("checked","checked");var i=function(){l.style.display=c.useLocalStorage?"block":"none"};i();h.bind(d,"change",function(){c.useLocalStorage=!c.useLocalStorage;i()})}var n=document.getElementById("dg-new-constructor");h.bind(n,"keydown",function(a){a.metaKey&&(67===a.which||67==a.keyCode)&&B.hide()});h.bind(e,"click",function(){n.innerHTML=JSON.stringify(c.getSaveObject(),
void 0,2);B.show();n.focus();n.select()});h.bind(g,"click",function(){c.save()});h.bind(f,"click",function(){var a=prompt("Enter a new preset name.");a&&c.saveAs(a)});h.bind(k,"click",function(){c.revert()})}-1==b.__rememberedObjects.indexOf(a)&&b.__rememberedObjects.push(a)});this.autoPlace&&F(this,this.width)},getRoot:function(){for(var a=this;a.parent;)a=a.parent;return a},getSaveObject:function(){var a=this.load;a.closed=this.closed;0<this.__rememberedObjects.length&&(a.preset=this.preset,a.remembered||
(a.remembered={}),a.remembered[this.preset]=C(this));a.folders={};j.each(this.__folders,function(b,c){a.folders[c]=b.getSaveObject()});return a},save:function(){this.load.remembered||(this.load.remembered={});this.load.remembered[this.preset]=C(this);E(this,!1)},saveAs:function(a){this.load.remembered||(this.load.remembered={},this.load.remembered[A]=C(this,!0));this.load.remembered[a]=C(this);this.preset=a;G(this,a,!0)},revert:function(a){j.each(this.__controllers,function(b){this.getRoot().load.remembered?
H(a||this.getRoot(),b):b.setValue(b.initialValue)},this);j.each(this.__folders,function(a){a.revert(a)});a||E(this.getRoot(),!1)},listen:function(a){var b=0==this.__listening.length;this.__listening.push(a);b&&I(this.__listening)}});return m}(dat.utils.css,'<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>',
".dg {\n  /** Clear list styles */\n  /* Auto-place container */\n  /* Auto-placed GUI's */\n  /* Line items that don't contain folders. */\n  /** Folder names */\n  /** Hides closed items */\n  /** Controller row */\n  /** Name-half (left) */\n  /** Controller-half (right) */\n  /** Controller placement */\n  /** Shorter number boxes when slider is present. */\n  /** Ensure the entire boolean and function row shows a hand */ }\n  .dg ul {\n    list-style: none;\n    margin: 0;\n    padding: 0;\n    width: 100%;\n    clear: both; }\n  .dg:not(.ac) .main {\n    /** Exclude mains in ac so that we don't hide close button */\n    overflow: hidden; }\n  .dg.main {\n    -webkit-transition: opacity 0.1s linear;\n    -o-transition: opacity 0.1s linear;\n    -moz-transition: opacity 0.1s linear;\n    transition: opacity 0.1s linear; }\n    .dg.main.taller-than-window {\n      overflow-y: auto; }\n      .dg.main.taller-than-window .close-button {\n        opacity: 1;\n        /* TODO, these are style notes */\n        margin-top: -1px;\n        border-top: 1px solid #2c2c2c; }\n    .dg.main ul.closed .close-button {\n      opacity: 1 !important; }\n    .dg.main:hover .close-button,\n    .dg.main .close-button.drag {\n      opacity: 1; }\n    .dg.main .close-button {\n      /*opacity: 0;*/\n      -webkit-transition: opacity 0.1s linear;\n      -o-transition: opacity 0.1s linear;\n      -moz-transition: opacity 0.1s linear;\n      transition: opacity 0.1s linear;\n      border: 0;\n      position: absolute;\n      line-height: 19px;\n      height: 20px;\n      /* TODO, these are style notes */\n      cursor: pointer;\n      text-align: center;\n      background-color: #000; }\n      .dg.main .close-button:hover {\n        background-color: #111; }\n  .dg.a {\n    float: left;\n    overflow-x: hidden; }\n    .dg.a.has-save ul {\n      margin-top: 27px; }\n      .dg.a.has-save ul.closed {\n        margin-top: 0; }\n    .dg.a .save-row {\n      position: fixed;\n      top: 0;\n      z-index: 1002; }\n  .dg li {\n    -webkit-transition: height 0.1s ease-out;\n    -o-transition: height 0.1s ease-out;\n    -moz-transition: height 0.1s ease-out;\n    transition: height 0.1s ease-out; }\n  .dg li:not(.folder) {\n    cursor: auto;\n    height: 27px;\n    line-height: 27px;\n    overflow: hidden;\n    padding: 0 4px 0 5px; }\n  .dg li.textarea {\n    height: 100px; }\n  .dg li.folder {\n    padding: 0;\n    border-left: 4px solid rgba(0, 0, 0, 0); }\n  .dg li.title {\n    cursor: pointer;\n    margin-left: -4px; }\n  .dg .closed li:not(.title),\n  .dg .closed ul li,\n  .dg .closed ul li > * {\n    height: 0;\n    overflow: hidden;\n    border: 0; }\n  .dg .cr {\n    clear: both;\n    padding-left: 3px;\n    height: 27px; }\n  .dg .property-name {\n    cursor: default;\n    float: left;\n    clear: left;\n    width: 40%;\n    overflow: hidden;\n    text-overflow: ellipsis; }\n  .dg .c {\n    float: left;\n    width: 60%; }\n  .dg .c input[type=text] {\n    border: 0;\n    margin-top: 4px;\n    padding: 3px;\n    width: 100%;\n    float: right; }\n  .dg .has-slider input[type=text] {\n    width: 30%;\n    /*display: none;*/\n    margin-left: 0; }\n  .dg .slider {\n    float: left;\n    width: 66%;\n    margin-left: -5px;\n    margin-right: 0;\n    height: 19px;\n    margin-top: 4px; }\n  .dg .slider-fg {\n    height: 100%; }\n  .dg .c input[type=checkbox] {\n    margin-top: 9px; }\n  .dg .c select {\n    margin-top: 5px; }\n  .dg .cr.function,\n  .dg .cr.function .property-name,\n  .dg .cr.function *,\n  .dg .cr.boolean,\n  .dg .cr.boolean * {\n    cursor: pointer; }\n  .dg .selector {\n    display: none;\n    position: absolute;\n    margin-left: -9px;\n    margin-top: 23px;\n    z-index: 10; }\n  .dg .c:hover .selector,\n  .dg .selector.drag {\n    display: block; }\n  .dg li.save-row {\n    padding: 0; }\n    .dg li.save-row .button {\n      display: inline-block;\n      padding: 0px 6px; }\n  .dg.dialogue {\n    background-color: #222;\n    width: 460px;\n    padding: 15px;\n    font-size: 13px;\n    line-height: 15px; }\n\n/* TODO Separate style and structure */\n#dg-new-constructor {\n  padding: 10px;\n  color: #222;\n  font-family: Monaco, monospace;\n  font-size: 10px;\n  border: 0;\n  resize: none;\n  box-shadow: inset 1px 1px 1px #888;\n  word-wrap: break-word;\n  margin: 12px 0;\n  display: block;\n  width: 440px;\n  overflow-y: scroll;\n  height: 100px;\n  position: relative; }\n\n#dg-local-explain {\n  display: none;\n  font-size: 11px;\n  line-height: 17px;\n  border-radius: 3px;\n  background-color: #333;\n  padding: 8px;\n  margin-top: 10px; }\n  #dg-local-explain code {\n    font-size: 10px; }\n\n#dat-gui-save-locally {\n  display: none; }\n\n/** Main type */\n.dg {\n  color: #eee;\n  font: 11px 'Lucida Grande', sans-serif;\n  text-shadow: 0 -1px 0 #111111;\n  /** Auto place */\n  /* Controller row, <li> */\n  /** Controllers */ }\n  .dg.main {\n    /** Scrollbar */ }\n    .dg.main::-webkit-scrollbar {\n      width: 5px;\n      background: #1a1a1a; }\n    .dg.main::-webkit-scrollbar-corner {\n      height: 0;\n      display: none; }\n    .dg.main::-webkit-scrollbar-thumb {\n      border-radius: 5px;\n      background: #676767; }\n  .dg li:not(.folder) {\n    background: #1a1a1a;\n    border-bottom: 1px solid #2c2c2c; }\n  .dg li.save-row {\n    line-height: 25px;\n    background: #dad5cb;\n    border: 0; }\n    .dg li.save-row select {\n      margin-left: 5px;\n      width: 108px; }\n    .dg li.save-row .button {\n      margin-left: 5px;\n      margin-top: 1px;\n      border-radius: 2px;\n      font-size: 9px;\n      line-height: 7px;\n      padding: 4px 4px 5px 4px;\n      background: #c5bdad;\n      color: #fff;\n      text-shadow: 0 1px 0 #b0a58f;\n      box-shadow: 0 -1px 0 #b0a58f;\n      cursor: pointer; }\n      .dg li.save-row .button.gears {\n        background: #c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;\n        height: 7px;\n        width: 8px; }\n      .dg li.save-row .button:hover {\n        background-color: #bab19e;\n        box-shadow: 0 -1px 0 #b0a58f; }\n  .dg li.folder {\n    border-bottom: 0; }\n  .dg li.title {\n    padding-left: 16px;\n    background: black url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;\n    cursor: pointer;\n    border-bottom: 1px solid rgba(255, 255, 255, 0.2); }\n  .dg .closed li.title {\n    background-image: url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==); }\n  .dg .cr.boolean {\n    border-left: 3px solid #806787; }\n  .dg .cr.function {\n    border-left: 3px solid #e61d5f; }\n  .dg .cr.number {\n    border-left: 3px solid #2fa1d6; }\n    .dg .cr.number input[type=text] {\n      color: #2fa1d6; }\n  .dg .cr.string {\n    border-left: 3px solid #1ed36f; }\n    .dg .cr.string input[type=text], .dg .cr.string textarea {\n      color: #1ed36f; }\n  .dg .cr.function:hover, .dg .cr.boolean:hover {\n    background: #111; }\n  .dg .c input[type=text], .dg .c textarea {\n    background: #303030;\n    outline: none; }\n    .dg .c input[type=text]:hover, .dg .c textarea:hover {\n      background: #3c3c3c; }\n    .dg .c input[type=text]:focus, .dg .c textarea:focus {\n      background: #494949;\n      color: #fff; }\n  .dg .c .slider {\n    background: #303030;\n    cursor: ew-resize; }\n  .dg .c .slider-fg {\n    background: #2fa1d6; }\n  .dg .c .slider:hover {\n    background: #3c3c3c; }\n    .dg .c .slider:hover .slider-fg {\n      background: #44abda; }\n",
dat.controllers.factory=function(e,a,d,c,g,b,n){return function(i,l,p,k){var s=i[l];if(n.isArray(p)||n.isObject(p))return new e(i,l,p);if(n.isNumber(s))return n.isNumber(p)&&n.isNumber(k)?new d(i,l,p,k):new a(i,l,{min:p,max:k});if(n.isString(s))return new c(i,l);if(n.isFunction(s))return new g(i,l,"");if(n.isBoolean(s))return new b(i,l)}}(dat.controllers.OptionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.StringController=function(e,a,d){var c=
function(d,b){function e(){i.setValue(i.__input.value)}c.superclass.call(this,d,b);var i=this;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"keyup",e);a.bind(this.__input,"change",e);a.bind(this.__input,"blur",function(){i.__onFinishChange&&i.__onFinishChange.call(i,i.getValue())});a.bind(this.__input,"keydown",function(a){13===a.keyCode&&this.blur()});this.updateDisplay();this.domElement.appendChild(this.__input)};c.superclass=e;d.extend(c.prototype,
e.prototype,{updateDisplay:function(){a.isActive(this.__input)||(this.__input.value=this.getValue());return c.superclass.prototype.updateDisplay.call(this)}});return c}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.FunctionController,dat.controllers.BooleanController,dat.utils.common),dat.controllers.Controller,dat.controllers.BooleanController,dat.controllers.FunctionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.OptionController,
dat.controllers.ColorController=function(e,a,d,c,g){function b(a,b,c,d){a.style.background="";g.each(i,function(e){a.style.cssText+="background: "+e+"linear-gradient("+b+", "+c+" 0%, "+d+" 100%); "})}var n=function(e,p){function k(b){z(b);a.bind(window,"mousemove",z);a.bind(window,"mouseup",i)}function i(){a.unbind(window,"mousemove",z);a.unbind(window,"mouseup",i)}function w(){var a=c(this.value);!1!==a?(j.__color.__state=a,j.setValue(j.__color.toOriginal())):this.value=j.__color.toString()}function q(){a.unbind(window,
"mousemove",h);a.unbind(window,"mouseup",q)}function z(b){b.preventDefault();var c=a.getWidth(j.__saturation_field),d=a.getOffset(j.__saturation_field),e=(b.clientX-d.left+document.body.scrollLeft)/c,b=1-(b.clientY-d.top+document.body.scrollTop)/c;1<b?b=1:0>b&&(b=0);1<e?e=1:0>e&&(e=0);j.__color.v=b;j.__color.s=e;j.setValue(j.__color.toOriginal());return!1}function h(b){b.preventDefault();var c=a.getHeight(j.__hue_field),d=a.getOffset(j.__hue_field),b=1-(b.clientY-d.top+document.body.scrollTop)/c;
1<b?b=1:0>b&&(b=0);j.__color.h=360*b;j.setValue(j.__color.toOriginal());return!1}n.superclass.call(this,e,p);this.__color=new d(this.getValue());this.__temp=new d(0);var j=this;this.domElement=document.createElement("div");a.makeSelectable(this.domElement,!1);this.__selector=document.createElement("div");this.__selector.className="selector";this.__saturation_field=document.createElement("div");this.__saturation_field.className="saturation-field";this.__field_knob=document.createElement("div");this.__field_knob.className=
"field-knob";this.__field_knob_border="2px solid ";this.__hue_knob=document.createElement("div");this.__hue_knob.className="hue-knob";this.__hue_field=document.createElement("div");this.__hue_field.className="hue-field";this.__input=document.createElement("input");this.__input.type="text";this.__input_textShadow="0 1px 1px ";a.bind(this.__input,"keydown",function(a){13===a.keyCode&&w.call(this)});a.bind(this.__input,"blur",w);a.bind(this.__selector,"mousedown",function(){a.addClass(this,"drag").bind(window,
"mouseup",function(){a.removeClass(j.__selector,"drag")})});var t=document.createElement("div");g.extend(this.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"});g.extend(this.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:this.__field_knob_border+(0.5>this.__color.v?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1});g.extend(this.__hue_knob.style,{position:"absolute",
width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1});g.extend(this.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"});g.extend(t.style,{width:"100%",height:"100%",background:"none"});b(t,"top","rgba(0,0,0,0)","#000");g.extend(this.__hue_field.style,{width:"15px",height:"100px",display:"inline-block",border:"1px solid #555",cursor:"ns-resize"});var r=this.__hue_field;r.style.background="";r.style.cssText+=
"background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);";r.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";r.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";r.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";
r.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";g.extend(this.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:this.__input_textShadow+"rgba(0,0,0,0.7)"});a.bind(this.__saturation_field,"mousedown",k);a.bind(this.__field_knob,"mousedown",k);a.bind(this.__hue_field,"mousedown",function(b){h(b);a.bind(window,"mousemove",h);a.bind(window,"mouseup",q)});this.__saturation_field.appendChild(t);
this.__selector.appendChild(this.__field_knob);this.__selector.appendChild(this.__saturation_field);this.__selector.appendChild(this.__hue_field);this.__hue_field.appendChild(this.__hue_knob);this.domElement.appendChild(this.__input);this.domElement.appendChild(this.__selector);this.updateDisplay()};n.superclass=e;g.extend(n.prototype,e.prototype,{updateDisplay:function(){var a=c(this.getValue());if(!1!==a){var e=!1;g.each(d.COMPONENTS,function(b){if(!g.isUndefined(a[b])&&!g.isUndefined(this.__color.__state[b])&&
a[b]!==this.__color.__state[b])return e=!0,{}},this);e&&g.extend(this.__color.__state,a)}g.extend(this.__temp.__state,this.__color.__state);this.__temp.a=1;var k=0.5>this.__color.v||0.5<this.__color.s?255:0,i=255-k;g.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toString(),border:this.__field_knob_border+"rgb("+k+","+k+","+k+")"});this.__hue_knob.style.marginTop=100*(1-this.__color.h/360)+"px";this.__temp.s=
1;this.__temp.v=1;b(this.__saturation_field,"left","#fff",this.__temp.toString());g.extend(this.__input.style,{backgroundColor:this.__input.value=this.__color.toString(),color:"rgb("+k+","+k+","+k+")",textShadow:this.__input_textShadow+"rgba("+i+","+i+","+i+",.7)"})}});var i=["-moz-","-o-","-webkit-","-ms-",""];return n}(dat.controllers.Controller,dat.dom.dom,dat.color.Color=function(e,a,d,c){function g(a,b,c){Object.defineProperty(a,b,{get:function(){if("RGB"===this.__state.space)return this.__state[b];
n(this,b,c);return this.__state[b]},set:function(a){"RGB"!==this.__state.space&&(n(this,b,c),this.__state.space="RGB");this.__state[b]=a}})}function b(a,b){Object.defineProperty(a,b,{get:function(){if("HSV"===this.__state.space)return this.__state[b];i(this);return this.__state[b]},set:function(a){"HSV"!==this.__state.space&&(i(this),this.__state.space="HSV");this.__state[b]=a}})}function n(b,d,e){if("HEX"===b.__state.space)b.__state[d]=a.component_from_hex(b.__state.hex,e);else if("HSV"===b.__state.space)c.extend(b.__state,
a.hsv_to_rgb(b.__state.h,b.__state.s,b.__state.v));else throw"Corrupted color state";}function i(b){var d=a.rgb_to_hsv(b.r,b.g,b.b);c.extend(b.__state,{s:d.s,v:d.v});c.isNaN(d.h)?c.isUndefined(b.__state.h)&&(b.__state.h=0):b.__state.h=d.h}var l=function(){this.__state=e.apply(this,arguments);if(!1===this.__state)throw"Failed to interpret color arguments";this.__state.a=this.__state.a||1};l.COMPONENTS="r g b h s v hex a".split(" ");c.extend(l.prototype,{toString:function(){return d(this)},toOriginal:function(){return this.__state.conversion.write(this)}});
g(l.prototype,"r",2);g(l.prototype,"g",1);g(l.prototype,"b",0);b(l.prototype,"h");b(l.prototype,"s");b(l.prototype,"v");Object.defineProperty(l.prototype,"a",{get:function(){return this.__state.a},set:function(a){this.__state.a=a}});Object.defineProperty(l.prototype,"hex",{get:function(){"HEX"!==!this.__state.space&&(this.__state.hex=a.rgb_to_hex(this.r,this.g,this.b));return this.__state.hex},set:function(a){this.__state.space="HEX";this.__state.hex=a}});return l}(dat.color.interpret,dat.color.math=
function(){var e;return{hsv_to_rgb:function(a,d,c){var e=a/60-Math.floor(a/60),b=c*(1-d),n=c*(1-e*d),d=c*(1-(1-e)*d),a=[[c,d,b],[n,c,b],[b,c,d],[b,n,c],[d,b,c],[c,b,n]][Math.floor(a/60)%6];return{r:255*a[0],g:255*a[1],b:255*a[2]}},rgb_to_hsv:function(a,d,c){var e=Math.min(a,d,c),b=Math.max(a,d,c),e=b-e;if(0==b)return{h:NaN,s:0,v:0};a=(a==b?(d-c)/e:d==b?2+(c-a)/e:4+(a-d)/e)/6;0>a&&(a+=1);return{h:360*a,s:e/b,v:b/255}},rgb_to_hex:function(a,d,c){a=this.hex_with_component(0,2,a);a=this.hex_with_component(a,
1,d);return a=this.hex_with_component(a,0,c)},component_from_hex:function(a,d){return a>>8*d&255},hex_with_component:function(a,d,c){return c<<(e=8*d)|a&~(255<<e)}}}(),dat.color.toString,dat.utils.common),dat.color.interpret,dat.utils.common),dat.controllers.TextAreaController=function(e,a,d){var c=function(d,b){function e(){i.setValue(i.__textarea.value)}c.superclass.call(this,d,b);var i=this;this.__textarea=document.createElement("textarea");this.__textarea.setAttribute("rows",5);this.__textarea.setAttribute("cols",
18);a.bind(this.__textarea,"keyup",e);a.bind(this.__textarea,"change",e);a.bind(this.__textarea,"blur",function(){i.__onFinishChange&&i.__onFinishChange.call(i,i.getValue())});this.updateDisplay();this.domElement.appendChild(this.__textarea);this.additionalClasses="textarea"};c.superclass=e;d.extend(c.prototype,e.prototype,{updateDisplay:function(){a.isActive(this.__textarea)||(this.__textarea.value=this.getValue());return c.superclass.prototype.updateDisplay.call(this)}});return c}(dat.controllers.Controller,
dat.dom.dom,dat.utils.common),dat.controllers.FileController=function(e,a,d){var c=function(d,b){c.superclass.call(this,d,b);var e=this;this.__input=document.createElement("input");this.__input.setAttribute("type","file");a.bind(this.__input,"change",function(){e.setValue(e.__input.files[0])});this.updateDisplay();this.domElement.appendChild(this.__input)};c.superclass=e;d.extend(c.prototype,e.prototype);return c}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.utils.requestAnimationFrame=
function(){return window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){window.setTimeout(e,1E3/60)}}(),dat.dom.CenteredDiv=function(e,a){var d=function(){this.backgroundElement=document.createElement("div");a.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear"});e.makeFullscreen(this.backgroundElement);
this.backgroundElement.style.position="fixed";this.domElement=document.createElement("div");a.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear"});document.body.appendChild(this.backgroundElement);document.body.appendChild(this.domElement);var c=this;e.bind(this.backgroundElement,"click",function(){c.hide()})};d.prototype.show=function(){var c=this;this.backgroundElement.style.display="block";
this.domElement.style.display="block";this.domElement.style.opacity=0;this.domElement.style.webkitTransform="scale(1.1)";this.layout();a.defer(function(){c.backgroundElement.style.opacity=1;c.domElement.style.opacity=1;c.domElement.style.webkitTransform="scale(1)"})};d.prototype.hide=function(){var a=this,d=function(){a.domElement.style.display="none";a.backgroundElement.style.display="none";e.unbind(a.domElement,"webkitTransitionEnd",d);e.unbind(a.domElement,"transitionend",d);e.unbind(a.domElement,
"oTransitionEnd",d)};e.bind(this.domElement,"webkitTransitionEnd",d);e.bind(this.domElement,"transitionend",d);e.bind(this.domElement,"oTransitionEnd",d);this.backgroundElement.style.opacity=0;this.domElement.style.opacity=0;this.domElement.style.webkitTransform="scale(1.1)"};d.prototype.layout=function(){this.domElement.style.left=window.innerWidth/2-e.getWidth(this.domElement)/2+"px";this.domElement.style.top=window.innerHeight/2-e.getHeight(this.domElement)/2+"px"};return d}(dat.dom.dom,dat.utils.common),
dat.dom.dom,dat.utils.common);

// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:11,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};

(function() {
	var circleFnSrc = 'var r = pjs.toRad(value.x);\n' + 'return {\n' + 'x: Math.cos(r) * 70,\n' + 'y: Math.sin(r) * 70\n' + '};';

	this.pjs = this.pjs || {};
	this.pjs.circleFnSrc = circleFnSrc;

	pjs.ui = pjs.ui || {};

	pjs.ui.Builder = function(containerId, particleSystem, canvas, controller, uiString, includeTransformFn) {
		this.containerId = containerId;
		this.particleSystem = particleSystem;
		this.canvas = canvas;
		this.controller = controller;
		this.uiConfig = uiString && pjs.ui.Parser.parse(uiString) || pjs.ui.FullConfig;
		this.includeTransformFn = includeTransformFn;

		this.build(includeTransformFn);
	};

	pjs.ui.Builder.prototype = {
		build: function(includeTransformFn) {
			var gui = new dat.GUI({ resizable: false, width: 370 });
			this.rootGui = gui;

			this._addPlayButton(gui);
			this._addResetButton(gui);

			var useFolders = this.uiConfig.length > 1;

			for (var i = 0; i < this.uiConfig.length; ++i) {
				var config = this.uiConfig[i];
				if (useFolders) {
					var folder = gui.addFolder(config.title || 'Section');
				} else {
					folder = gui;
				}
				for (var k = 0; k < config.items.length; ++k) {
					this._addItem(folder, config.items[k]);
				}
			}

			if (includeTransformFn) {
				this.particleSystem.transformFn = circleFnSrc;
				var transformFolder = gui.addFolder('posVar Transform');
				transformFolder.addTextArea(this.particleSystem, 'transformFn').name('function');
			}

			if(!useFolders) {
				this._openAllSubFolders();
			}
		},

		_openAllSubFolders: function() {
			for(var folderName in this.rootGui.__folders) {
				if(this.rootGui.__folders.hasOwnProperty(folderName)) {

					var folder = this.rootGui.__folders[folderName];
					folder.closed = false;
				}
			}
		},

		_updateDisplays: function(gui) {
			for (var folderName in gui.__folders) {
				if (gui.__folders.hasOwnProperty(folderName)) {
					this._updateDisplays(gui.__folders[folderName]);
				}
			}
			for (var i = 0; i < gui.__controllers.length; ++i) {
				gui.__controllers[i].updateDisplay();
			}
		},

		_addPlayButton: function(gui) {
			var c = gui.add(this.controller, 'togglePause').name(this.controller.isPaused() ? 'Play': 'Pause');
			var me = this;
			c.__onChange = function() {
				// opposite, because togglePause hasnt been called yet
				c.name(me.controller.isPaused() ? 'Pause': 'Play');
			};
		},

		_addResetButton: function(gui) {
			var c = gui.add(this.particleSystem, 'reset').name('Reset');
			var me = this;
			c.onChange(function() {
				setTimeout(function() {
					if(me.includeTransformFn) {
						me.particleSystem.transformFn = circleFnSrc;
					}
					me._updateDisplays(me.rootGui);
				}, 0);
			});
		},

		_addItem: function(gui, item) {
			var type = pjs.ui.PropertyMap[item];
			this['_' + type](gui, item);
		},

		_boolean: function(gui, property) {
			gui.add(this.particleSystem, property);
		},

		_color: function(gui, property) {
			var folder = gui.addFolder(property);
			folder.add(this.particleSystem[property], '0').min(0).max(255).name('red');
			folder.add(this.particleSystem[property], '1').min(0).max(255).name('green');
			folder.add(this.particleSystem[property], '2').min(0).max(255).name('blue');
			folder.add(this.particleSystem[property], '3').min(0).max(1).name('alpha');
		},

		_posvector: function(gui, property) {
			var folder = gui.addFolder(property);
			folder.add(this.particleSystem[property], 'x').min(0).max(this.canvas.width);
			folder.add(this.particleSystem[property], 'y').min(0).max(this.canvas.height);
		},

		_vector: function(gui, property) {
			var folder = gui.addFolder(property);
			folder.add(this.particleSystem[property], 'x').min(-500).max(500);
			folder.add(this.particleSystem[property], 'y').min(-500).max(500);
		},

		_number: function(gui, property) {
			return gui.add(this.particleSystem, property).min(-500).max(500);
		},

		_unsignednumber: function(gui, property) {
			gui.add(this.particleSystem, property).min(0).max(1000);
		},

		_systempicker: function(gui) {
			var systems = [];
			for (var i = 0; i < pjs.predefinedSystems.systems.length; ++i) {
				var system = pjs.predefinedSystems.systems[i];
				systems.push(system.name);
			}

			var c = gui.add(this.particleSystem, 'currentSystem', systems);
			var me = this;
			c.onChange(function() {
				me._updateDisplays(me.rootGui);
			});
		},

		_texture: function(gui) {
			gui.addFile(this.particleSystem, 'textureFile');
			gui.add(this.particleSystem, 'resetTexture');
		}
	};
})();


(function() {
	this.pjs = this.pjs || {};
	this.pjs.ui = this.pjs.ui || {};

	this.pjs.ui.PropertyMap = {
		pos: 'posvector',
		posVar: 'posvector',
		life: 'unsignednumber',
		lifeVar: 'unsignednumber',
		totalParticles: 'unsignednumber',
		emissionRate: 'unsignednumber',
		startColor: 'color',
		startColorVar: 'color',
		endColor: 'color',
		endColorVar: 'color',
		radius: 'unsignednumber',
		radiusVar: 'unsignednumber',
		texture: 'texture',
		textureEnabled: 'boolean',
		textureAdditive: 'boolean',
		speed: 'number',
		speedVar: 'unsignednumber',
		angle: 'number',
		angleVar: 'unsignednumber',
		gravity: 'vector',
		radialAccel: 'number',
		radialAccelVar: 'unsignednumber',
		tangentialAccel: 'number',
		tangentialAccelVar: 'unsignednumber',
		system: 'systempicker',
		startScale: 'unsignednumber',
		endScale: 'unsignednumber'
	};

	this.pjs.ui.FullConfig = [{
		title: 'Predefined Systems',
		items: ['system']
	},
	{
		title: 'Basics',
		items: ['pos', 'posVar', 'life', 'lifeVar', 'totalParticles', 'emissionRate']
	},
	{
		title: 'Appearance',
		items: ['startColor', 'startColorVar', 'endColor', 'endColorVar', 'radius', 'radiusVar']
	},
	{
		title: 'Texture',
		items: ['texture', 'textureEnabled', 'textureAdditive' ]
	},
	{
		title: 'Physics',
		items: ['speed', 'speedVar', 'angle', 'angleVar', 'gravity', 'radialAccel', 'radialAccelVar', 'tangentialAccel', 'tangentialAccelVar']
	}];

})();


(function() {
	this.pjs = this.pjs || {};
	this.pjs.ui = this.pjs.ui || {};

	//Position,pos=vector,posVar=vector:Angle,angle=number,angleVar=number
	this.pjs.ui.Parser = {
		parse: function(raw) {
			var results = [];

			if (raw === 'none') {
				return results;
			}

			var rawEntries = raw.split(':');

			for(var i = 0, l = rawEntries.length; i < l; ++i) {
				var rawEntry = rawEntries[i];
				var split = rawEntry.split(',');
				var entry = {
					title: split.shift(),
					items: []
				};

				for(var s = 0; s < split.length; ++s) {
					var rawItem = split[s];
					var item = rawItem.split('=')[0];
					if(entry.items.indexOf(item) < 0) {
						entry.items.push(item);
					}
				}
				results.push(entry);
			}

			return results;
		}
	};
})();


