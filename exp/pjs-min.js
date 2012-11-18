(function() {
	this.pjs = this.pjs || {};

	pjs.external = pjs.external || {};

	var map = {
		angleVariance: 'angleVar',
		blendFuncDestination: 'textureAdditive',
		maxParticles: 'totalParticles',
		particleLifespan: 'life',
		particleLifespanVariance: 'lifeVar',
		radialAccelVariance: 'radialAccelVar',
		radialAcceleration: 'radialAccel',
		speedVariance: 'speedVar',
		startParticleSize: 'startScale',
		endParticleSize: 'endScale',
		tangentialAcceleration: 'tangentialAccel',
		tangentialAccelVariance: 'tangentialAccelVar'
	};

	pjs.external.PlistImporter = function(rawPlist) {
		this.rawPlist = rawPlist;
	};

	function getValue(node) {
		return node.childNodes[0].nodeValue;
	}

	function getType(node) {
		return node.tagName;
	}

	pjs.external.PlistImporter.prototype = {
		toParticleSystem: function(callback) {
			var result = this._parse(this.rawPlist);

			this._translate(result);

			if (result.textureImageData) {
				this._loadTexture(result, callback);
			} else {
				callback(result);
			}
		},

		_translate: function(system) {
			for (var prop in map) {
				var particleJsName = map[prop];
				system[particleJsName] = system[prop];
				delete system[prop];
			}

			if (system.duration = - 1) {
				system.duration = Infinity;
			}

			system.emissionRate = system.totalParticles / system.life;

			//temp
			system.startScale = 1;
			system.endScale = 1;
			system.radius = 10;
			system.radiusVar = 0;
			system.textureAdditive = !!system.textureAdditive;
			system.textureEnabled = !!system.textureImageData;
			system.active = true;

			// position
			system.pos = {
				x: system.sourcePositionx,
				y: system.sourcePositiony
			};
			delete system.sourcePositionx;
			delete system.sourcePositiony;

			system.posVar = {
				x: system.sourcePositionVariancex,
				y: system.sourcePositionVariancey
			};
			delete system.sourcePositionVariancex;
			delete system.sourcePositionVariancey;

			system.gravity = {
				x: system.gravityx,
				y: system.gravityy
			};
			delete system.gravityx;
			delete system.gravityy;

			system.startColor = [
			system.startColorRed * 255, system.startColorGreen * 255, system.startColorBlue * 255, system.startColorAlpha];
			delete system.startColorRed;
			delete system.startColorGreen;
			delete system.startColorBlue;
			delete system.startColorAlpha;

			system.startColorVar = [
			system.startColorVarianceRed * 255, system.startColorVarianceGreen * 255, system.startColorVarianceBlue * 255, system.startColorVarianceAlpha];
			delete system.startColorVarianceRed;
			delete system.startColorVarianceGreen;
			delete system.startColorVarianceBlue;
			delete system.startColorVarianceAlpha;

			system.endColor = [
			system.finishColorRed * 255, system.finishColorGreen * 255, system.finishColorBlue * 255, system.finishColorAlpha];
			delete system.finishColorRed;
			delete system.finishColorGreen;
			delete system.finishColorBlue;
			delete system.finishColorAlpha;

			system.endColorVar = [
			system.finishColorVarianceRed * 255, system.finishColorVarianceGreen * 255, system.finishColorVarianceBlue * 255, system.finishColorVarianceAlpha];
			delete system.finishColorVarianceRed;
			delete system.finishColorVarianceGreen;
			delete system.finishColorVarianceBlue;
			delete system.finishColorVarianceAlpha;
		},

		_loadTexture: function(system, callback) {
			var tiffData = this._getTiffData(system.textureImageData);

			var tiffParser = new TIFFParser();

			var buffer = new ArrayBuffer(tiffData.length);
			var uint8View = new Uint8Array(buffer);
			uint8View.set(tiffData);

			system.texture = tiffParser.parseTIFF(buffer);

			callback(system);
		},

		_getTiffData: function(plistData) {
			// from base64 to ascii binary string
			var decodedAsString = atob(plistData);

			// ascii string to bytes in gzipped format
			var data = this._binaryStringToArray(decodedAsString);

			// raw, uncompressed, binary image data in an array
			return require('gzip-js').unzip(data);
		},

		_encode: function(inp) {
			var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + //all caps
			"abcdefghijklmnopqrstuvwxyz" + //all lowercase
			"0123456789+/="; // all numbers plus +/=
			//Heres the encode function
			var out = ""; //This is the output
			var chr1, chr2, chr3 = ""; //These are the 3 bytes to be encoded
			var enc1, enc2, enc3, enc4 = ""; //These are the 4 encoded bytes
			var i = 0; //Position counter
			do { //Set up the loop here
				chr1 = inp[i++]; //Grab the first byte
				chr2 = inp[i++]; //Grab the second byte
				chr3 = inp[i++]; //Grab the third byte
				//Here is the actual base64 encode part.
				//There really is only one way to do it.
				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				//Lets spit out the 4 encoded bytes
				out = out + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);

				// OK, now clean out the variables used.
				chr1 = chr2 = chr3 = "";
				enc1 = enc2 = enc3 = enc4 = "";

			} while (i < inp.length); //And finish off the loop
			//Now return the encoded values.
			return out;
		},

		_binaryStringToArray: function(binaryString) {
			var data = [];

			for (var i = 0; i < binaryString.length; ++i) {
				data[i] = binaryString.charCodeAt(i);
			}

			return data;
		},

		_arrayToBinaryString: function(array) {
			var str = '';
			for (var i = 0; i < array.length; ++i) {
				str += String.fromCharCode(array[i]);
			}
			return str;
		},

		_parse: function() {
			var domParser = new DOMParser();

			var doc = domParser.parseFromString(this.rawPlist, 'text/xml');

			var result = {};

			var keys = doc.getElementsByTagName('key');

			for (var i = 0, l = keys.length; i < l; ++i) {
				var keyNode = keys[i];
				var keyValue = getValue(keyNode);
				var valueNode = keys[i].nextElementSibling;

				var type = getType(valueNode);
				var value = getValue(valueNode);

				if (type === 'real' || type === 'integer') {
					value = parseFloat(value);
				}

				result[keyValue] = value;
			}

			return result;
		}
	};

})();

(function() {
	this.pjs = this.pjs || {};

	pjs.FileReader = {
		readText: function(file, callback) {
			var reader = new FileReader();
			reader.onload = function(e) {
				callback(e.target.result);
			};
			reader.readAsText(file);
		}
	};

})();

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
		if (!system) {
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
			if (tp !== this._totalParticles) {
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
			if (this._currentSystem !== cs) {
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

	Object.defineProperty(pjs.Emitter.prototype, 'plist', {
		get: function() {
			return this._plist || '';
		},
		set: function(plist) {
			if (this._plist !== plist) {
				this._plist = plist;

				var me = this;
				pjs.FileReader.readText(plist, function(plistString) {
					var importer = new pjs.external.PlistImporter(plistString);
					importer.toParticleSystem(function(system) {
						me.reconfigure(system);
					});
				});
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
dat.dom.dom,dat.utils.common);var global = Function("return this;")();
/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    // modules can be required from ender's build system, or found on the window
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (typeof s == 'string' || s.nodeName || (s.length && 'item' in s) || s == window) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.6'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);
// pakmanager:crc32
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  (function () {
    	'use strict';
    
    	var table = [],
    		poly = 0xEDB88320; // reverse polynomial
    
    	// build the table
    	function makeTable() {
    		var c, n, k;
    
    		for (n = 0; n < 256; n += 1) {
    			c = n;
    			for (k = 0; k < 8; k += 1) {
    				if (c & 1) {
    					c = poly ^ (c >>> 1);
    				} else {
    					c = c >>> 1;
    				}
    			}
    			table[n] = c >>> 0;
    		}
    	}
    
    	function strToArr(str) {
    		// sweet hack to turn string into a 'byte' array
    		return Array.prototype.map.call(str, function (c) {
    			return c.charCodeAt(0);
    		});
    	}
    
    	/*
    	 * Compute CRC of array directly.
    	 *
    	 * This is slower for repeated calls, so append mode is not supported.
    	 */
    	function crcDirect(arr) {
    		var crc = -1, // initial contents of LFBSR
    			i, j, l, temp;
    
    		for (i = 0, l = arr.length; i < l; i += 1) {
    			temp = (crc ^ arr[i]) & 0xff;
    
    			// read 8 bits one at a time
    			for (j = 0; j < 8; j += 1) {
    				if ((temp & 1) === 1) {
    					temp = (temp >>> 1) ^ poly;
    				} else {
    					temp = (temp >>> 1);
    				}
    			}
    			crc = (crc >>> 8) ^ temp;
    		}
    
    		// flip bits
    		return crc ^ -1;
    	}
    
    	/*
    	 * Compute CRC with the help of a pre-calculated table.
    	 *
    	 * This supports append mode, if the second parameter is set.
    	 */
    	function crcTable(arr, append) {
    		var crc, i, l;
    
    		// if we're in append mode, don't reset crc
    		// if arr is null or undefined, reset table and return
    		if (typeof crcTable.crc === 'undefined' || !append || !arr) {
    			crcTable.crc = 0 ^ -1;
    
    			if (!arr) {
    				return;
    			}
    		}
    
    		// store in temp variable for minor speed gain
    		crc = crcTable.crc;
    
    		for (i = 0, l = arr.length; i < l; i += 1) {
    			crc = (crc >>> 8) ^ table[(crc ^ arr[i]) & 0xff];
    		}
    
    		crcTable.crc = crc;
    
    		return crc ^ -1;
    	}
    
    	// build the table
    	// this isn't that costly, and most uses will be for table assisted mode
    	makeTable();
    
    	module.exports = function (val, direct) {
    		var val = (typeof val === 'string') ? strToArr(val) : val,
    			ret = direct ? crcDirect(val) : crcTable(val);
    
    		// convert to 2's complement hex
    		return (ret >>> 0).toString(16);
    	};
    	module.exports.direct = crcDirect;
    	module.exports.table = crcTable;
    }());
    
  provide("crc32", module.exports);
}(global));

// pakmanager:deflate-js/lib/rawinflate.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*
     * $Id: rawinflate.js,v 0.2 2009/03/01 18:32:24 dankogai Exp $
     *
     * original:
     * http://www.onicos.com/staff/iz/amuse/javascript/expert/inflate.txt
     */
    
    /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
     * Version: 1.0.0.1
     * LastModified: Dec 25 1999
     */
    
    /* Interface:
     * data = inflate(src);
     */
    
    (function () {
    	/* constant parameters */
    	var WSIZE = 32768, // Sliding Window size
    		STORED_BLOCK = 0,
    		STATIC_TREES = 1,
    		DYN_TREES = 2,
    
    	/* for inflate */
    		lbits = 9, // bits in base literal/length lookup table
    		dbits = 6, // bits in base distance lookup table
    
    	/* variables (inflate) */
    		slide,
    		wp, // current position in slide
    		fixed_tl = null, // inflate static
    		fixed_td, // inflate static
    		fixed_bl, // inflate static
    		fixed_bd, // inflate static
    		bit_buf, // bit buffer
    		bit_len, // bits in bit buffer
    		method,
    		eof,
    		copy_leng,
    		copy_dist,
    		tl, // literal length decoder table
    		td, // literal distance decoder table
    		bl, // number of bits decoded by tl
    		bd, // number of bits decoded by td
    
    		inflate_data,
    		inflate_pos,
    
    
    /* constant tables (inflate) */
    		MASK_BITS = [
    			0x0000,
    			0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff,
    			0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff
    		],
    		// Tables for deflate from PKZIP's appnote.txt.
    		// Copy lengths for literal codes 257..285
    		cplens = [
    			3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
    			35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    		],
    /* note: see note #13 above about the 258 in this list. */
    		// Extra bits for literal codes 257..285
    		cplext = [
    			0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
    			3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99 // 99==invalid
    		],
    		// Copy offsets for distance codes 0..29
    		cpdist = [
    			1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
    			257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
    			8193, 12289, 16385, 24577
    		],
    		// Extra bits for distance codes
    		cpdext = [
    			0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    			7, 7, 8, 8, 9, 9, 10, 10, 11, 11,
    			12, 12, 13, 13
    		],
    		// Order of the bit length code lengths
    		border = [
    			16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
    		];
    	/* objects (inflate) */
    
    	function HuftList() {
    		this.next = null;
    		this.list = null;
    	}
    
    	function HuftNode() {
    		this.e = 0; // number of extra bits or operation
    		this.b = 0; // number of bits in this code or subcode
    
    		// union
    		this.n = 0; // literal, length base, or distance base
    		this.t = null; // (HuftNode) pointer to next level of table
    	}
    
    	/*
    	 * @param b-  code lengths in bits (all assumed <= BMAX)
    	 * @param n- number of codes (assumed <= N_MAX)
    	 * @param s- number of simple-valued codes (0..s-1)
    	 * @param d- list of base values for non-simple codes
    	 * @param e- list of extra bits for non-simple codes
    	 * @param mm- maximum lookup bits
    	 */
    	function HuftBuild(b, n, s, d, e, mm) {
    		this.BMAX = 16; // maximum bit length of any code
    		this.N_MAX = 288; // maximum number of codes in any set
    		this.status = 0; // 0: success, 1: incomplete table, 2: bad input
    		this.root = null; // (HuftList) starting table
    		this.m = 0; // maximum lookup bits, returns actual
    
    	/* Given a list of code lengths and a maximum table size, make a set of
    	   tables to decode that set of codes. Return zero on success, one if
    	   the given code set is incomplete (the tables are still built in this
    	   case), two if the input is invalid (all zero length codes or an
    	   oversubscribed set of lengths), and three if not enough memory.
    	   The code with value 256 is special, and the tables are constructed
    	   so that no bits beyond that code are fetched when that code is
    	   decoded. */
    		var a; // counter for codes of length k
    		var c = [];
    		var el; // length of EOB code (value 256)
    		var f; // i repeats in table every f entries
    		var g; // maximum code length
    		var h; // table level
    		var i; // counter, current code
    		var j; // counter
    		var k; // number of bits in current code
    		var lx = [];
    		var p; // pointer into c[], b[], or v[]
    		var pidx; // index of p
    		var q; // (HuftNode) points to current table
    		var r = new HuftNode(); // table entry for structure assignment
    		var u = [];
    		var v = [];
    		var w;
    		var x = [];
    		var xp; // pointer into x or c
    		var y; // number of dummy codes added
    		var z; // number of entries in current table
    		var o;
    		var tail; // (HuftList)
    
    		tail = this.root = null;
    
    		// bit length count table
    		for (i = 0; i < this.BMAX + 1; i++) {
    			c[i] = 0;
    		}
    		// stack of bits per table
    		for (i = 0; i < this.BMAX + 1; i++) {
    			lx[i] = 0;
    		}
    		// HuftNode[BMAX][]  table stack
    		for (i = 0; i < this.BMAX; i++) {
    			u[i] = null;
    		}
    		// values in order of bit length
    		for (i = 0; i < this.N_MAX; i++) {
    			v[i] = 0;
    		}
    		// bit offsets, then code stack
    		for (i = 0; i < this.BMAX + 1; i++) {
    			x[i] = 0;
    		}
    
    		// Generate counts for each bit length
    		el = n > 256 ? b[256] : this.BMAX; // set length of EOB code, if any
    		p = b; pidx = 0;
    		i = n;
    		do {
    			c[p[pidx]]++; // assume all entries <= BMAX
    			pidx++;
    		} while (--i > 0);
    		if (c[0] === n) { // null input--all zero length codes
    			this.root = null;
    			this.m = 0;
    			this.status = 0;
    			return;
    		}
    
    		// Find minimum and maximum length, bound *m by those
    		for (j = 1; j <= this.BMAX; j++) {
    			if (c[j] !== 0) {
    				break;
    			}
    		}
    		k = j; // minimum code length
    		if (mm < j) {
    			mm = j;
    		}
    		for (i = this.BMAX; i !== 0; i--) {
    			if (c[i] !== 0) {
    				break;
    			}
    		}
    		g = i; // maximum code length
    		if (mm > i) {
    			mm = i;
    		}
    
    		// Adjust last length count to fill out codes, if needed
    		for (y = 1 << j; j < i; j++, y <<= 1) {
    			if ((y -= c[j]) < 0) {
    				this.status = 2; // bad input: more codes than bits
    				this.m = mm;
    				return;
    			}
    		}
    		if ((y -= c[i]) < 0) {
    			this.status = 2;
    			this.m = mm;
    			return;
    		}
    		c[i] += y;
    
    		// Generate starting offsets into the value table for each length
    		x[1] = j = 0;
    		p = c;
    		pidx = 1;
    		xp = 2;
    		while (--i > 0) { // note that i == g from above
    			x[xp++] = (j += p[pidx++]);
    		}
    
    		// Make a table of values in order of bit lengths
    		p = b; pidx = 0;
    		i = 0;
    		do {
    			if ((j = p[pidx++]) !== 0) {
    				v[x[j]++] = i;
    			}
    		} while (++i < n);
    		n = x[g]; // set n to length of v
    
    		// Generate the Huffman codes and for each, make the table entries
    		x[0] = i = 0; // first Huffman code is zero
    		p = v; pidx = 0; // grab values in bit order
    		h = -1; // no tables yet--level -1
    		w = lx[0] = 0; // no bits decoded yet
    		q = null; // ditto
    		z = 0; // ditto
    
    		// go through the bit lengths (k already is bits in shortest code)
    		for (null; k <= g; k++) {
    			a = c[k];
    			while (a-- > 0) {
    				// here i is the Huffman code of length k bits for value p[pidx]
    				// make tables up to required level
    				while (k > w + lx[1 + h]) {
    					w += lx[1 + h]; // add bits already decoded
    					h++;
    
    					// compute minimum size table less than or equal to *m bits
    					z = (z = g - w) > mm ? mm : z; // upper limit
    					if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
    						// too few codes for k-w bit table
    						f -= a + 1; // deduct codes from patterns left
    						xp = k;
    						while (++j < z) { // try smaller tables up to z bits
    							if ((f <<= 1) <= c[++xp]) {
    								break; // enough codes to use up j bits
    							}
    							f -= c[xp]; // else deduct codes from patterns
    						}
    					}
    					if (w + j > el && w < el) {
    						j = el - w; // make EOB code end at table
    					}
    					z = 1 << j; // table entries for j-bit table
    					lx[1 + h] = j; // set table size in stack
    
    					// allocate and link in new table
    					q = [];
    					for (o = 0; o < z; o++) {
    						q[o] = new HuftNode();
    					}
    
    					if (!tail) {
    						tail = this.root = new HuftList();
    					} else {
    						tail = tail.next = new HuftList();
    					}
    					tail.next = null;
    					tail.list = q;
    					u[h] = q; // table starts after link
    
    					/* connect to last table, if there is one */
    					if (h > 0) {
    						x[h] = i; // save pattern for backing up
    						r.b = lx[h]; // bits to dump before this table
    						r.e = 16 + j; // bits in this table
    						r.t = q; // pointer to this table
    						j = (i & ((1 << w) - 1)) >> (w - lx[h]);
    						u[h - 1][j].e = r.e;
    						u[h - 1][j].b = r.b;
    						u[h - 1][j].n = r.n;
    						u[h - 1][j].t = r.t;
    					}
    				}
    
    				// set up table entry in r
    				r.b = k - w;
    				if (pidx >= n) {
    					r.e = 99; // out of values--invalid code
    				} else if (p[pidx] < s) {
    					r.e = (p[pidx] < 256 ? 16 : 15); // 256 is end-of-block code
    					r.n = p[pidx++]; // simple code is just the value
    				} else {
    					r.e = e[p[pidx] - s]; // non-simple--look up in lists
    					r.n = d[p[pidx++] - s];
    				}
    
    				// fill code-like entries with r //
    				f = 1 << (k - w);
    				for (j = i >> w; j < z; j += f) {
    					q[j].e = r.e;
    					q[j].b = r.b;
    					q[j].n = r.n;
    					q[j].t = r.t;
    				}
    
    				// backwards increment the k-bit code i
    				for (j = 1 << (k - 1); (i & j) !== 0; j >>= 1) {
    					i ^= j;
    				}
    				i ^= j;
    
    				// backup over finished tables
    				while ((i & ((1 << w) - 1)) !== x[h]) {
    					w -= lx[h]; // don't need to update q
    					h--;
    				}
    			}
    		}
    
    		/* return actual size of base table */
    		this.m = lx[1];
    
    		/* Return true (1) if we were given an incomplete table */
    		this.status = ((y !== 0 && g !== 1) ? 1 : 0);
    	}
    
    
    	/* routines (inflate) */
    
    	function GET_BYTE() {
    		if (inflate_data.length === inflate_pos) {
    			return -1;
    		}
    		return inflate_data[inflate_pos++] & 0xff;
    	}
    
    	function NEEDBITS(n) {
    		while (bit_len < n) {
    			bit_buf |= GET_BYTE() << bit_len;
    			bit_len += 8;
    		}
    	}
    
    	function GETBITS(n) {
    		return bit_buf & MASK_BITS[n];
    	}
    
    	function DUMPBITS(n) {
    		bit_buf >>= n;
    		bit_len -= n;
    	}
    
    	function inflate_codes(buff, off, size) {
    		// inflate (decompress) the codes in a deflated (compressed) block.
    		// Return an error code or zero if it all goes ok.
    		var e; // table entry flag/number of extra bits
    		var t; // (HuftNode) pointer to table entry
    		var n;
    
    		if (size === 0) {
    			return 0;
    		}
    
    		// inflate the coded data
    		n = 0;
    		for (;;) { // do until end of block
    			NEEDBITS(bl);
    			t = tl.list[GETBITS(bl)];
    			e = t.e;
    			while (e > 16) {
    				if (e === 99) {
    					return -1;
    				}
    				DUMPBITS(t.b);
    				e -= 16;
    				NEEDBITS(e);
    				t = t.t[GETBITS(e)];
    				e = t.e;
    			}
    			DUMPBITS(t.b);
    
    			if (e === 16) { // then it's a literal
    				wp &= WSIZE - 1;
    				buff[off + n++] = slide[wp++] = t.n;
    				if (n === size) {
    					return size;
    				}
    				continue;
    			}
    
    			// exit if end of block
    			if (e === 15) {
    				break;
    			}
    
    			// it's an EOB or a length
    
    			// get length of block to copy
    			NEEDBITS(e);
    			copy_leng = t.n + GETBITS(e);
    			DUMPBITS(e);
    
    			// decode distance of block to copy
    			NEEDBITS(bd);
    			t = td.list[GETBITS(bd)];
    			e = t.e;
    
    			while (e > 16) {
    				if (e === 99) {
    					return -1;
    				}
    				DUMPBITS(t.b);
    				e -= 16;
    				NEEDBITS(e);
    				t = t.t[GETBITS(e)];
    				e = t.e;
    			}
    			DUMPBITS(t.b);
    			NEEDBITS(e);
    			copy_dist = wp - t.n - GETBITS(e);
    			DUMPBITS(e);
    
    			// do the copy
    			while (copy_leng > 0 && n < size) {
    				copy_leng--;
    				copy_dist &= WSIZE - 1;
    				wp &= WSIZE - 1;
    				buff[off + n++] = slide[wp++] = slide[copy_dist++];
    			}
    
    			if (n === size) {
    				return size;
    			}
    		}
    
    		method = -1; // done
    		return n;
    	}
    
    	function inflate_stored(buff, off, size) {
    		/* "decompress" an inflated type 0 (stored) block. */
    		var n;
    
    		// go to byte boundary
    		n = bit_len & 7;
    		DUMPBITS(n);
    
    		// get the length and its complement
    		NEEDBITS(16);
    		n = GETBITS(16);
    		DUMPBITS(16);
    		NEEDBITS(16);
    		if (n !== ((~bit_buf) & 0xffff)) {
    			return -1; // error in compressed data
    		}
    		DUMPBITS(16);
    
    		// read and output the compressed data
    		copy_leng = n;
    
    		n = 0;
    		while (copy_leng > 0 && n < size) {
    			copy_leng--;
    			wp &= WSIZE - 1;
    			NEEDBITS(8);
    			buff[off + n++] = slide[wp++] = GETBITS(8);
    			DUMPBITS(8);
    		}
    
    		if (copy_leng === 0) {
    			method = -1; // done
    		}
    		return n;
    	}
    
    	function inflate_fixed(buff, off, size) {
    		// decompress an inflated type 1 (fixed Huffman codes) block.  We should
    		// either replace this with a custom decoder, or at least precompute the
    		// Huffman tables.
    
    		// if first time, set up tables for fixed blocks
    		if (!fixed_tl) {
    			var i; // temporary variable
    			var l = []; // 288 length list for huft_build (initialized below)
    			var h; // HuftBuild
    
    			// literal table
    			for (i = 0; i < 144; i++) {
    				l[i] = 8;
    			}
    			for (null; i < 256; i++) {
    				l[i] = 9;
    			}
    			for (null; i < 280; i++) {
    				l[i] = 7;
    			}
    			for (null; i < 288; i++) { // make a complete, but wrong code set
    				l[i] = 8;
    			}
    			fixed_bl = 7;
    
    			h = new HuftBuild(l, 288, 257, cplens, cplext, fixed_bl);
    			if (h.status !== 0) {
    				console.error("HufBuild error: " + h.status);
    				return -1;
    			}
    			fixed_tl = h.root;
    			fixed_bl = h.m;
    
    			// distance table
    			for (i = 0; i < 30; i++) { // make an incomplete code set
    				l[i] = 5;
    			}
    			fixed_bd = 5;
    
    			h = new HuftBuild(l, 30, 0, cpdist, cpdext, fixed_bd);
    			if (h.status > 1) {
    				fixed_tl = null;
    				console.error("HufBuild error: " + h.status);
    				return -1;
    			}
    			fixed_td = h.root;
    			fixed_bd = h.m;
    		}
    
    		tl = fixed_tl;
    		td = fixed_td;
    		bl = fixed_bl;
    		bd = fixed_bd;
    		return inflate_codes(buff, off, size);
    	}
    
    	function inflate_dynamic(buff, off, size) {
    		// decompress an inflated type 2 (dynamic Huffman codes) block.
    		var i; // temporary variables
    		var j;
    		var l; // last length
    		var n; // number of lengths to get
    		var t; // (HuftNode) literal/length code table
    		var nb; // number of bit length codes
    		var nl; // number of literal/length codes
    		var nd; // number of distance codes
    		var ll = [];
    		var h; // (HuftBuild)
    
    		// literal/length and distance code lengths
    		for (i = 0; i < 286 + 30; i++) {
    			ll[i] = 0;
    		}
    
    		// read in table lengths
    		NEEDBITS(5);
    		nl = 257 + GETBITS(5); // number of literal/length codes
    		DUMPBITS(5);
    		NEEDBITS(5);
    		nd = 1 + GETBITS(5); // number of distance codes
    		DUMPBITS(5);
    		NEEDBITS(4);
    		nb = 4 + GETBITS(4); // number of bit length codes
    		DUMPBITS(4);
    		if (nl > 286 || nd > 30) {
    			return -1; // bad lengths
    		}
    
    		// read in bit-length-code lengths
    		for (j = 0; j < nb; j++) {
    			NEEDBITS(3);
    			ll[border[j]] = GETBITS(3);
    			DUMPBITS(3);
    		}
    		for (null; j < 19; j++) {
    			ll[border[j]] = 0;
    		}
    
    		// build decoding table for trees--single level, 7 bit lookup
    		bl = 7;
    		h = new HuftBuild(ll, 19, 19, null, null, bl);
    		if (h.status !== 0) {
    			return -1; // incomplete code set
    		}
    
    		tl = h.root;
    		bl = h.m;
    
    		// read in literal and distance code lengths
    		n = nl + nd;
    		i = l = 0;
    		while (i < n) {
    			NEEDBITS(bl);
    			t = tl.list[GETBITS(bl)];
    			j = t.b;
    			DUMPBITS(j);
    			j = t.n;
    			if (j < 16) { // length of code in bits (0..15)
    				ll[i++] = l = j; // save last length in l
    			} else if (j === 16) { // repeat last length 3 to 6 times
    				NEEDBITS(2);
    				j = 3 + GETBITS(2);
    				DUMPBITS(2);
    				if (i + j > n) {
    					return -1;
    				}
    				while (j-- > 0) {
    					ll[i++] = l;
    				}
    			} else if (j === 17) { // 3 to 10 zero length codes
    				NEEDBITS(3);
    				j = 3 + GETBITS(3);
    				DUMPBITS(3);
    				if (i + j > n) {
    					return -1;
    				}
    				while (j-- > 0) {
    					ll[i++] = 0;
    				}
    				l = 0;
    			} else { // j === 18: 11 to 138 zero length codes
    				NEEDBITS(7);
    				j = 11 + GETBITS(7);
    				DUMPBITS(7);
    				if (i + j > n) {
    					return -1;
    				}
    				while (j-- > 0) {
    					ll[i++] = 0;
    				}
    				l = 0;
    			}
    		}
    
    		// build the decoding tables for literal/length and distance codes
    		bl = lbits;
    		h = new HuftBuild(ll, nl, 257, cplens, cplext, bl);
    		if (bl === 0) { // no literals or lengths
    			h.status = 1;
    		}
    		if (h.status !== 0) {
    			if (h.status !== 1) {
    				return -1; // incomplete code set
    			}
    			// **incomplete literal tree**
    		}
    		tl = h.root;
    		bl = h.m;
    
    		for (i = 0; i < nd; i++) {
    			ll[i] = ll[i + nl];
    		}
    		bd = dbits;
    		h = new HuftBuild(ll, nd, 0, cpdist, cpdext, bd);
    		td = h.root;
    		bd = h.m;
    
    		if (bd === 0 && nl > 257) { // lengths but no distances
    			// **incomplete distance tree**
    			return -1;
    		}
    /*
    		if (h.status === 1) {
    			// **incomplete distance tree**
    		}
    */
    		if (h.status !== 0) {
    			return -1;
    		}
    
    		// decompress until an end-of-block code
    		return inflate_codes(buff, off, size);
    	}
    
    	function inflate_start() {
    		if (!slide) {
    			slide = []; // new Array(2 * WSIZE); // slide.length is never called
    		}
    		wp = 0;
    		bit_buf = 0;
    		bit_len = 0;
    		method = -1;
    		eof = false;
    		copy_leng = copy_dist = 0;
    		tl = null;
    	}
    
    	function inflate_internal(buff, off, size) {
    		// decompress an inflated entry
    		var n, i;
    
    		n = 0;
    		while (n < size) {
    			if (eof && method === -1) {
    				return n;
    			}
    
    			if (copy_leng > 0) {
    				if (method !== STORED_BLOCK) {
    					// STATIC_TREES or DYN_TREES
    					while (copy_leng > 0 && n < size) {
    						copy_leng--;
    						copy_dist &= WSIZE - 1;
    						wp &= WSIZE - 1;
    						buff[off + n++] = slide[wp++] = slide[copy_dist++];
    					}
    				} else {
    					while (copy_leng > 0 && n < size) {
    						copy_leng--;
    						wp &= WSIZE - 1;
    						NEEDBITS(8);
    						buff[off + n++] = slide[wp++] = GETBITS(8);
    						DUMPBITS(8);
    					}
    					if (copy_leng === 0) {
    						method = -1; // done
    					}
    				}
    				if (n === size) {
    					return n;
    				}
    			}
    
    			if (method === -1) {
    				if (eof) {
    					break;
    				}
    
    				// read in last block bit
    				NEEDBITS(1);
    				if (GETBITS(1) !== 0) {
    					eof = true;
    				}
    				DUMPBITS(1);
    
    				// read in block type
    				NEEDBITS(2);
    				method = GETBITS(2);
    				DUMPBITS(2);
    				tl = null;
    				copy_leng = 0;
    			}
    
    			switch (method) {
    			case STORED_BLOCK:
    				i = inflate_stored(buff, off + n, size - n);
    				break;
    
    			case STATIC_TREES:
    				if (tl) {
    					i = inflate_codes(buff, off + n, size - n);
    				} else {
    					i = inflate_fixed(buff, off + n, size - n);
    				}
    				break;
    
    			case DYN_TREES:
    				if (tl) {
    					i = inflate_codes(buff, off + n, size - n);
    				} else {
    					i = inflate_dynamic(buff, off + n, size - n);
    				}
    				break;
    
    			default: // error
    				i = -1;
    				break;
    			}
    
    			if (i === -1) {
    				if (eof) {
    					return 0;
    				}
    				return -1;
    			}
    			n += i;
    		}
    		return n;
    	}
    
    	function inflate(arr) {
    		var buff = [], i;
    
    		inflate_start();
    		inflate_data = arr;
    		inflate_pos = 0;
    
    		do {
    			i = inflate_internal(buff, buff.length, 1024);
    		} while (i > 0);
    		inflate_data = null; // G.C.
    		return buff;
    	}
    
    	module.exports = inflate;
    }());
    
  provide("deflate-js/lib/rawinflate.js", module.exports);
}(global));

// pakmanager:deflate-js/lib/rawdeflate.js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  /*
     * $Id: rawdeflate.js,v 0.3 2009/03/01 19:05:05 dankogai Exp dankogai $
     *
     * Original:
     *   http://www.onicos.com/staff/iz/amuse/javascript/expert/deflate.txt
     */
    
    /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
     * Version: 1.0.1
     * LastModified: Dec 25 1999
     */
    
    /* Interface:
     * data = deflate(src);
     */
    
    (function () {
    	/* constant parameters */
    	var WSIZE = 32768, // Sliding Window size
    		STORED_BLOCK = 0,
    		STATIC_TREES = 1,
    		DYN_TREES = 2,
    
    	/* for deflate */
    		DEFAULT_LEVEL = 6,
    		FULL_SEARCH = false,
    		INBUFSIZ = 32768, // Input buffer size
    		//INBUF_EXTRA = 64, // Extra buffer
    		OUTBUFSIZ = 1024 * 8,
    		window_size = 2 * WSIZE,
    		MIN_MATCH = 3,
    		MAX_MATCH = 258,
    		BITS = 16,
    	// for SMALL_MEM
    		LIT_BUFSIZE = 0x2000,
    //		HASH_BITS = 13,
    	//for MEDIUM_MEM
    	//	LIT_BUFSIZE = 0x4000,
    	//	HASH_BITS = 14,
    	// for BIG_MEM
    	//	LIT_BUFSIZE = 0x8000,
    		HASH_BITS = 15,
    		DIST_BUFSIZE = LIT_BUFSIZE,
    		HASH_SIZE = 1 << HASH_BITS,
    		HASH_MASK = HASH_SIZE - 1,
    		WMASK = WSIZE - 1,
    		NIL = 0, // Tail of hash chains
    		TOO_FAR = 4096,
    		MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1,
    		MAX_DIST = WSIZE - MIN_LOOKAHEAD,
    		SMALLEST = 1,
    		MAX_BITS = 15,
    		MAX_BL_BITS = 7,
    		LENGTH_CODES = 29,
    		LITERALS = 256,
    		END_BLOCK = 256,
    		L_CODES = LITERALS + 1 + LENGTH_CODES,
    		D_CODES = 30,
    		BL_CODES = 19,
    		REP_3_6 = 16,
    		REPZ_3_10 = 17,
    		REPZ_11_138 = 18,
    		HEAP_SIZE = 2 * L_CODES + 1,
    		H_SHIFT = parseInt((HASH_BITS + MIN_MATCH - 1) / MIN_MATCH, 10),
    
    	/* variables */
    		free_queue,
    		qhead,
    		qtail,
    		initflag,
    		outbuf = null,
    		outcnt,
    		outoff,
    		complete,
    		window,
    		d_buf,
    		l_buf,
    		prev,
    		bi_buf,
    		bi_valid,
    		block_start,
    		ins_h,
    		hash_head,
    		prev_match,
    		match_available,
    		match_length,
    		prev_length,
    		strstart,
    		match_start,
    		eofile,
    		lookahead,
    		max_chain_length,
    		max_lazy_match,
    		compr_level,
    		good_match,
    		nice_match,
    		dyn_ltree,
    		dyn_dtree,
    		static_ltree,
    		static_dtree,
    		bl_tree,
    		l_desc,
    		d_desc,
    		bl_desc,
    		bl_count,
    		heap,
    		heap_len,
    		heap_max,
    		depth,
    		length_code,
    		dist_code,
    		base_length,
    		base_dist,
    		flag_buf,
    		last_lit,
    		last_dist,
    		last_flags,
    		flags,
    		flag_bit,
    		opt_len,
    		static_len,
    		deflate_data,
    		deflate_pos;
    
    	if (LIT_BUFSIZE > INBUFSIZ) {
    		console.error("error: INBUFSIZ is too small");
    	}
    	if ((WSIZE << 1) > (1 << BITS)) {
    		console.error("error: WSIZE is too large");
    	}
    	if (HASH_BITS > BITS - 1) {
    		console.error("error: HASH_BITS is too large");
    	}
    	if (HASH_BITS < 8 || MAX_MATCH !== 258) {
    		console.error("error: Code too clever");
    	}
    
    	/* objects (deflate) */
    
    	function DeflateCT() {
    		this.fc = 0; // frequency count or bit string
    		this.dl = 0; // father node in Huffman tree or length of bit string
    	}
    
    	function DeflateTreeDesc() {
    		this.dyn_tree = null; // the dynamic tree
    		this.static_tree = null; // corresponding static tree or NULL
    		this.extra_bits = null; // extra bits for each code or NULL
    		this.extra_base = 0; // base index for extra_bits
    		this.elems = 0; // max number of elements in the tree
    		this.max_length = 0; // max bit length for the codes
    		this.max_code = 0; // largest code with non zero frequency
    	}
    
    	/* Values for max_lazy_match, good_match and max_chain_length, depending on
    	 * the desired pack level (0..9). The values given below have been tuned to
    	 * exclude worst case performance for pathological files. Better values may be
    	 * found for specific files.
    	 */
    	function DeflateConfiguration(a, b, c, d) {
    		this.good_length = a; // reduce lazy search above this match length
    		this.max_lazy = b; // do not perform lazy search above this match length
    		this.nice_length = c; // quit search above this match length
    		this.max_chain = d;
    	}
    
    	function DeflateBuffer() {
    		this.next = null;
    		this.len = 0;
    		this.ptr = []; // new Array(OUTBUFSIZ); // ptr.length is never read
    		this.off = 0;
    	}
    
    	/* constant tables */
    	var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    	var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    	var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
    	var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    	var configuration_table = [
    		new DeflateConfiguration(0, 0, 0, 0),
    		new DeflateConfiguration(4, 4, 8, 4),
    		new DeflateConfiguration(4, 5, 16, 8),
    		new DeflateConfiguration(4, 6, 32, 32),
    		new DeflateConfiguration(4, 4, 16, 16),
    		new DeflateConfiguration(8, 16, 32, 32),
    		new DeflateConfiguration(8, 16, 128, 128),
    		new DeflateConfiguration(8, 32, 128, 256),
    		new DeflateConfiguration(32, 128, 258, 1024),
    		new DeflateConfiguration(32, 258, 258, 4096)
    	];
    
    
    	/* routines (deflate) */
    
    	function deflate_start(level) {
    		var i;
    
    		if (!level) {
    			level = DEFAULT_LEVEL;
    		} else if (level < 1) {
    			level = 1;
    		} else if (level > 9) {
    			level = 9;
    		}
    
    		compr_level = level;
    		initflag = false;
    		eofile = false;
    		if (outbuf !== null) {
    			return;
    		}
    
    		free_queue = qhead = qtail = null;
    		outbuf = []; // new Array(OUTBUFSIZ); // outbuf.length never called
    		window = []; // new Array(window_size); // window.length never called
    		d_buf = []; // new Array(DIST_BUFSIZE); // d_buf.length never called
    		l_buf = []; // new Array(INBUFSIZ + INBUF_EXTRA); // l_buf.length never called
    		prev = []; // new Array(1 << BITS); // prev.length never called
    
    		dyn_ltree = [];
    		for (i = 0; i < HEAP_SIZE; i++) {
    			dyn_ltree[i] = new DeflateCT();
    		}
    		dyn_dtree = [];
    		for (i = 0; i < 2 * D_CODES + 1; i++) {
    			dyn_dtree[i] = new DeflateCT();
    		}
    		static_ltree = [];
    		for (i = 0; i < L_CODES + 2; i++) {
    			static_ltree[i] = new DeflateCT();
    		}
    		static_dtree = [];
    		for (i = 0; i < D_CODES; i++) {
    			static_dtree[i] = new DeflateCT();
    		}
    		bl_tree = [];
    		for (i = 0; i < 2 * BL_CODES + 1; i++) {
    			bl_tree[i] = new DeflateCT();
    		}
    		l_desc = new DeflateTreeDesc();
    		d_desc = new DeflateTreeDesc();
    		bl_desc = new DeflateTreeDesc();
    		bl_count = []; // new Array(MAX_BITS+1); // bl_count.length never called
    		heap = []; // new Array(2*L_CODES+1); // heap.length never called
    		depth = []; // new Array(2*L_CODES+1); // depth.length never called
    		length_code = []; // new Array(MAX_MATCH-MIN_MATCH+1); // length_code.length never called
    		dist_code = []; // new Array(512); // dist_code.length never called
    		base_length = []; // new Array(LENGTH_CODES); // base_length.length never called
    		base_dist = []; // new Array(D_CODES); // base_dist.length never called
    		flag_buf = []; // new Array(parseInt(LIT_BUFSIZE / 8, 10)); // flag_buf.length never called
    	}
    
    	function deflate_end() {
    		free_queue = qhead = qtail = null;
    		outbuf = null;
    		window = null;
    		d_buf = null;
    		l_buf = null;
    		prev = null;
    		dyn_ltree = null;
    		dyn_dtree = null;
    		static_ltree = null;
    		static_dtree = null;
    		bl_tree = null;
    		l_desc = null;
    		d_desc = null;
    		bl_desc = null;
    		bl_count = null;
    		heap = null;
    		depth = null;
    		length_code = null;
    		dist_code = null;
    		base_length = null;
    		base_dist = null;
    		flag_buf = null;
    	}
    
    	function reuse_queue(p) {
    		p.next = free_queue;
    		free_queue = p;
    	}
    
    	function new_queue() {
    		var p;
    
    		if (free_queue !== null) {
    			p = free_queue;
    			free_queue = free_queue.next;
    		} else {
    			p = new DeflateBuffer();
    		}
    		p.next = null;
    		p.len = p.off = 0;
    
    		return p;
    	}
    
    	function head1(i) {
    		return prev[WSIZE + i];
    	}
    
    	function head2(i, val) {
    		return (prev[WSIZE + i] = val);
    	}
    
    	/* put_byte is used for the compressed output, put_ubyte for the
    	 * uncompressed output. However unlzw() uses window for its
    	 * suffix table instead of its output buffer, so it does not use put_ubyte
    	 * (to be cleaned up).
    	 */
    	function put_byte(c) {
    		outbuf[outoff + outcnt++] = c;
    		if (outoff + outcnt === OUTBUFSIZ) {
    			qoutbuf();
    		}
    	}
    
    	/* Output a 16 bit value, lsb first */
    	function put_short(w) {
    		w &= 0xffff;
    		if (outoff + outcnt < OUTBUFSIZ - 2) {
    			outbuf[outoff + outcnt++] = (w & 0xff);
    			outbuf[outoff + outcnt++] = (w >>> 8);
    		} else {
    			put_byte(w & 0xff);
    			put_byte(w >>> 8);
    		}
    	}
    
    	/* ==========================================================================
    	 * Insert string s in the dictionary and set match_head to the previous head
    	 * of the hash chain (the most recent string with same hash key). Return
    	 * the previous length of the hash chain.
    	 * IN  assertion: all calls to to INSERT_STRING are made with consecutive
    	 *    input characters and the first MIN_MATCH bytes of s are valid
    	 *    (except for the last MIN_MATCH-1 bytes of the input file).
    	 */
    	function INSERT_STRING() {
    		ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + MIN_MATCH - 1] & 0xff)) & HASH_MASK;
    		hash_head = head1(ins_h);
    		prev[strstart & WMASK] = hash_head;
    		head2(ins_h, strstart);
    	}
    
    	/* Send a code of the given tree. c and tree must not have side effects */
    	function SEND_CODE(c, tree) {
    		send_bits(tree[c].fc, tree[c].dl);
    	}
    
    	/* Mapping from a distance to a distance code. dist is the distance - 1 and
    	 * must not have side effects. dist_code[256] and dist_code[257] are never
    	 * used.
    	 */
    	function D_CODE(dist) {
    		return (dist < 256 ? dist_code[dist] : dist_code[256 + (dist >> 7)]) & 0xff;
    	}
    
    	/* ==========================================================================
    	 * Compares to subtrees, using the tree depth as tie breaker when
    	 * the subtrees have equal frequency. This minimizes the worst case length.
    	 */
    	function SMALLER(tree, n, m) {
    		return tree[n].fc < tree[m].fc || (tree[n].fc === tree[m].fc && depth[n] <= depth[m]);
    	}
    
    	/* ==========================================================================
    	 * read string data
    	 */
    	function read_buff(buff, offset, n) {
    		var i;
    		for (i = 0; i < n && deflate_pos < deflate_data.length; i++) {
    			buff[offset + i] = deflate_data[deflate_pos++] & 0xff;
    		}
    		return i;
    	}
    
    	/* ==========================================================================
    	 * Initialize the "longest match" routines for a new file
    	 */
    	function lm_init() {
    		var j;
    
    		// Initialize the hash table. */
    		for (j = 0; j < HASH_SIZE; j++) {
    			// head2(j, NIL);
    			prev[WSIZE + j] = 0;
    		}
    		// prev will be initialized on the fly */
    
    		// Set the default configuration parameters:
    		max_lazy_match = configuration_table[compr_level].max_lazy;
    		good_match = configuration_table[compr_level].good_length;
    		if (!FULL_SEARCH) {
    			nice_match = configuration_table[compr_level].nice_length;
    		}
    		max_chain_length = configuration_table[compr_level].max_chain;
    
    		strstart = 0;
    		block_start = 0;
    
    		lookahead = read_buff(window, 0, 2 * WSIZE);
    		if (lookahead <= 0) {
    			eofile = true;
    			lookahead = 0;
    			return;
    		}
    		eofile = false;
    		// Make sure that we always have enough lookahead. This is important
    		// if input comes from a device such as a tty.
    		while (lookahead < MIN_LOOKAHEAD && !eofile) {
    			fill_window();
    		}
    
    		// If lookahead < MIN_MATCH, ins_h is garbage, but this is
    		// not important since only literal bytes will be emitted.
    		ins_h = 0;
    		for (j = 0; j < MIN_MATCH - 1; j++) {
    			// UPDATE_HASH(ins_h, window[j]);
    			ins_h = ((ins_h << H_SHIFT) ^ (window[j] & 0xff)) & HASH_MASK;
    		}
    	}
    
    	/* ==========================================================================
    	 * Set match_start to the longest match starting at the given string and
    	 * return its length. Matches shorter or equal to prev_length are discarded,
    	 * in which case the result is equal to prev_length and match_start is
    	 * garbage.
    	 * IN assertions: cur_match is the head of the hash chain for the current
    	 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
    	 */
    	function longest_match(cur_match) {
    		var chain_length = max_chain_length; // max hash chain length
    		var scanp = strstart; // current string
    		var matchp; // matched string
    		var len; // length of current match
    		var best_len = prev_length; // best match length so far
    
    		// Stop when cur_match becomes <= limit. To simplify the code,
    		// we prevent matches with the string of window index 0.
    		var limit = (strstart > MAX_DIST ? strstart - MAX_DIST : NIL);
    
    		var strendp = strstart + MAX_MATCH;
    		var scan_end1 = window[scanp + best_len - 1];
    		var scan_end = window[scanp + best_len];
    
    		var i, broke;
    
    		// Do not waste too much time if we already have a good match: */
    		if (prev_length >= good_match) {
    			chain_length >>= 2;
    		}
    
    		// Assert(encoder->strstart <= window_size-MIN_LOOKAHEAD, "insufficient lookahead");
    
    		do {
    			// Assert(cur_match < encoder->strstart, "no future");
    			matchp = cur_match;
    
    			// Skip to next match if the match length cannot increase
    			// or if the match length is less than 2:
    			if (window[matchp + best_len] !== scan_end  ||
    					window[matchp + best_len - 1] !== scan_end1 ||
    					window[matchp] !== window[scanp] ||
    					window[++matchp] !== window[scanp + 1]) {
    				continue;
    			}
    
    			// The check at best_len-1 can be removed because it will be made
    			// again later. (This heuristic is not always a win.)
    			// It is not necessary to compare scan[2] and match[2] since they
    			// are always equal when the other bytes match, given that
    			// the hash keys are equal and that HASH_BITS >= 8.
    			scanp += 2;
    			matchp++;
    
    			// We check for insufficient lookahead only every 8th comparison;
    			// the 256th check will be made at strstart+258.
    			while (scanp < strendp) {
    				broke = false;
    				for (i = 0; i < 8; i += 1) {
    					scanp += 1;
    					matchp += 1;
    					if (window[scanp] !== window[matchp]) {
    						broke = true;
    						break;
    					}
    				}
    
    				if (broke) {
    					break;
    				}
    			}
    
    			len = MAX_MATCH - (strendp - scanp);
    			scanp = strendp - MAX_MATCH;
    
    			if (len > best_len) {
    				match_start = cur_match;
    				best_len = len;
    				if (FULL_SEARCH) {
    					if (len >= MAX_MATCH) {
    						break;
    					}
    				} else {
    					if (len >= nice_match) {
    						break;
    					}
    				}
    
    				scan_end1 = window[scanp + best_len - 1];
    				scan_end = window[scanp + best_len];
    			}
    		} while ((cur_match = prev[cur_match & WMASK]) > limit && --chain_length !== 0);
    
    		return best_len;
    	}
    
    	/* ==========================================================================
    	 * Fill the window when the lookahead becomes insufficient.
    	 * Updates strstart and lookahead, and sets eofile if end of input file.
    	 * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
    	 * OUT assertions: at least one byte has been read, or eofile is set;
    	 *    file reads are performed for at least two bytes (required for the
    	 *    translate_eol option).
    	 */
    	function fill_window() {
    		var n, m;
    
    	 // Amount of free space at the end of the window.
    		var more = window_size - lookahead - strstart;
    
    		// If the window is almost full and there is insufficient lookahead,
    		// move the upper half to the lower one to make room in the upper half.
    		if (more === -1) {
    			// Very unlikely, but possible on 16 bit machine if strstart == 0
    			// and lookahead == 1 (input done one byte at time)
    			more--;
    		} else if (strstart >= WSIZE + MAX_DIST) {
    			// By the IN assertion, the window is not empty so we can't confuse
    			// more == 0 with more == 64K on a 16 bit machine.
    			// Assert(window_size == (ulg)2*WSIZE, "no sliding with BIG_MEM");
    
    			// System.arraycopy(window, WSIZE, window, 0, WSIZE);
    			for (n = 0; n < WSIZE; n++) {
    				window[n] = window[n + WSIZE];
    			}
    
    			match_start -= WSIZE;
    			strstart    -= WSIZE; /* we now have strstart >= MAX_DIST: */
    			block_start -= WSIZE;
    
    			for (n = 0; n < HASH_SIZE; n++) {
    				m = head1(n);
    				head2(n, m >= WSIZE ? m - WSIZE : NIL);
    			}
    			for (n = 0; n < WSIZE; n++) {
    			// If n is not on any hash chain, prev[n] is garbage but
    			// its value will never be used.
    				m = prev[n];
    				prev[n] = (m >= WSIZE ? m - WSIZE : NIL);
    			}
    			more += WSIZE;
    		}
    		// At this point, more >= 2
    		if (!eofile) {
    			n = read_buff(window, strstart + lookahead, more);
    			if (n <= 0) {
    				eofile = true;
    			} else {
    				lookahead += n;
    			}
    		}
    	}
    
    	/* ==========================================================================
    	 * Processes a new input file and return its compressed length. This
    	 * function does not perform lazy evaluationof matches and inserts
    	 * new strings in the dictionary only for unmatched strings or for short
    	 * matches. It is used only for the fast compression options.
    	 */
    	function deflate_fast() {
    		while (lookahead !== 0 && qhead === null) {
    			var flush; // set if current block must be flushed
    
    			// Insert the string window[strstart .. strstart+2] in the
    			// dictionary, and set hash_head to the head of the hash chain:
    			INSERT_STRING();
    
    			// Find the longest match, discarding those <= prev_length.
    			// At this point we have always match_length < MIN_MATCH
    			if (hash_head !== NIL && strstart - hash_head <= MAX_DIST) {
    				// To simplify the code, we prevent matches with the string
    				// of window index 0 (in particular we have to avoid a match
    				// of the string with itself at the start of the input file).
    				match_length = longest_match(hash_head);
    				// longest_match() sets match_start */
    				if (match_length > lookahead) {
    					match_length = lookahead;
    				}
    			}
    			if (match_length >= MIN_MATCH) {
    				// check_match(strstart, match_start, match_length);
    
    				flush = ct_tally(strstart - match_start, match_length - MIN_MATCH);
    				lookahead -= match_length;
    
    				// Insert new strings in the hash table only if the match length
    				// is not too large. This saves time but degrades compression.
    				if (match_length <= max_lazy_match) {
    					match_length--; // string at strstart already in hash table
    					do {
    						strstart++;
    						INSERT_STRING();
    						// strstart never exceeds WSIZE-MAX_MATCH, so there are
    						// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
    						// these bytes are garbage, but it does not matter since
    						// the next lookahead bytes will be emitted as literals.
    					} while (--match_length !== 0);
    					strstart++;
    				} else {
    					strstart += match_length;
    					match_length = 0;
    					ins_h = window[strstart] & 0xff;
    					// UPDATE_HASH(ins_h, window[strstart + 1]);
    					ins_h = ((ins_h << H_SHIFT) ^ (window[strstart + 1] & 0xff)) & HASH_MASK;
    
    				//#if MIN_MATCH !== 3
    				//		Call UPDATE_HASH() MIN_MATCH-3 more times
    				//#endif
    
    				}
    			} else {
    				// No match, output a literal byte */
    				flush = ct_tally(0, window[strstart] & 0xff);
    				lookahead--;
    				strstart++;
    			}
    			if (flush) {
    				flush_block(0);
    				block_start = strstart;
    			}
    
    			// Make sure that we always have enough lookahead, except
    			// at the end of the input file. We need MAX_MATCH bytes
    			// for the next match, plus MIN_MATCH bytes to insert the
    			// string following the next match.
    			while (lookahead < MIN_LOOKAHEAD && !eofile) {
    				fill_window();
    			}
    		}
    	}
    
    	function deflate_better() {
    		// Process the input block. */
    		while (lookahead !== 0 && qhead === null) {
    			// Insert the string window[strstart .. strstart+2] in the
    			// dictionary, and set hash_head to the head of the hash chain:
    			INSERT_STRING();
    
    			// Find the longest match, discarding those <= prev_length.
    			prev_length = match_length;
    			prev_match = match_start;
    			match_length = MIN_MATCH - 1;
    
    			if (hash_head !== NIL && prev_length < max_lazy_match && strstart - hash_head <= MAX_DIST) {
    				// To simplify the code, we prevent matches with the string
    				// of window index 0 (in particular we have to avoid a match
    				// of the string with itself at the start of the input file).
    				match_length = longest_match(hash_head);
    				// longest_match() sets match_start */
    				if (match_length > lookahead) {
    					match_length = lookahead;
    				}
    
    				// Ignore a length 3 match if it is too distant: */
    				if (match_length === MIN_MATCH && strstart - match_start > TOO_FAR) {
    					// If prev_match is also MIN_MATCH, match_start is garbage
    					// but we will ignore the current match anyway.
    					match_length--;
    				}
    			}
    			// If there was a match at the previous step and the current
    			// match is not better, output the previous match:
    			if (prev_length >= MIN_MATCH && match_length <= prev_length) {
    				var flush; // set if current block must be flushed
    
    				// check_match(strstart - 1, prev_match, prev_length);
    				flush = ct_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);
    
    				// Insert in hash table all strings up to the end of the match.
    				// strstart-1 and strstart are already inserted.
    				lookahead -= prev_length - 1;
    				prev_length -= 2;
    				do {
    					strstart++;
    					INSERT_STRING();
    					// strstart never exceeds WSIZE-MAX_MATCH, so there are
    					// always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
    					// these bytes are garbage, but it does not matter since the
    					// next lookahead bytes will always be emitted as literals.
    				} while (--prev_length !== 0);
    				match_available = false;
    				match_length = MIN_MATCH - 1;
    				strstart++;
    				if (flush) {
    					flush_block(0);
    					block_start = strstart;
    				}
    			} else if (match_available) {
    				// If there was no match at the previous position, output a
    				// single literal. If there was a match but the current match
    				// is longer, truncate the previous match to a single literal.
    				if (ct_tally(0, window[strstart - 1] & 0xff)) {
    					flush_block(0);
    					block_start = strstart;
    				}
    				strstart++;
    				lookahead--;
    			} else {
    				// There is no previous match to compare with, wait for
    				// the next step to decide.
    				match_available = true;
    				strstart++;
    				lookahead--;
    			}
    
    			// Make sure that we always have enough lookahead, except
    			// at the end of the input file. We need MAX_MATCH bytes
    			// for the next match, plus MIN_MATCH bytes to insert the
    			// string following the next match.
    			while (lookahead < MIN_LOOKAHEAD && !eofile) {
    				fill_window();
    			}
    		}
    	}
    
    	function init_deflate() {
    		if (eofile) {
    			return;
    		}
    		bi_buf = 0;
    		bi_valid = 0;
    		ct_init();
    		lm_init();
    
    		qhead = null;
    		outcnt = 0;
    		outoff = 0;
    
    		if (compr_level <= 3) {
    			prev_length = MIN_MATCH - 1;
    			match_length = 0;
    		} else {
    			match_length = MIN_MATCH - 1;
    			match_available = false;
    		}
    
    		complete = false;
    	}
    
    	/* ==========================================================================
    	 * Same as above, but achieves better compression. We use a lazy
    	 * evaluation for matches: a match is finally adopted only if there is
    	 * no better match at the next window position.
    	 */
    	function deflate_internal(buff, off, buff_size) {
    		var n;
    
    		if (!initflag) {
    			init_deflate();
    			initflag = true;
    			if (lookahead === 0) { // empty
    				complete = true;
    				return 0;
    			}
    		}
    
    		n = qcopy(buff, off, buff_size);
    		if (n === buff_size) {
    			return buff_size;
    		}
    
    		if (complete) {
    			return n;
    		}
    
    		if (compr_level <= 3) {
    			// optimized for speed
    			deflate_fast();
    		} else {
    			deflate_better();
    		}
    
    		if (lookahead === 0) {
    			if (match_available) {
    				ct_tally(0, window[strstart - 1] & 0xff);
    			}
    			flush_block(1);
    			complete = true;
    		}
    
    		return n + qcopy(buff, n + off, buff_size - n);
    	}
    
    	function qcopy(buff, off, buff_size) {
    		var n, i, j;
    
    		n = 0;
    		while (qhead !== null && n < buff_size) {
    			i = buff_size - n;
    			if (i > qhead.len) {
    				i = qhead.len;
    			}
    			// System.arraycopy(qhead.ptr, qhead.off, buff, off + n, i);
    			for (j = 0; j < i; j++) {
    				buff[off + n + j] = qhead.ptr[qhead.off + j];
    			}
    
    			qhead.off += i;
    			qhead.len -= i;
    			n += i;
    			if (qhead.len === 0) {
    				var p;
    				p = qhead;
    				qhead = qhead.next;
    				reuse_queue(p);
    			}
    		}
    
    		if (n === buff_size) {
    			return n;
    		}
    
    		if (outoff < outcnt) {
    			i = buff_size - n;
    			if (i > outcnt - outoff) {
    				i = outcnt - outoff;
    			}
    			// System.arraycopy(outbuf, outoff, buff, off + n, i);
    			for (j = 0; j < i; j++) {
    				buff[off + n + j] = outbuf[outoff + j];
    			}
    			outoff += i;
    			n += i;
    			if (outcnt === outoff) {
    				outcnt = outoff = 0;
    			}
    		}
    		return n;
    	}
    
    	/* ==========================================================================
    	 * Allocate the match buffer, initialize the various tables and save the
    	 * location of the internal file attribute (ascii/binary) and method
    	 * (DEFLATE/STORE).
    	 */
    	function ct_init() {
    		var n; // iterates over tree elements
    		var bits; // bit counter
    		var length; // length value
    		var code; // code value
    		var dist; // distance index
    
    		if (static_dtree[0].dl !== 0) {
    			return; // ct_init already called
    		}
    
    		l_desc.dyn_tree = dyn_ltree;
    		l_desc.static_tree = static_ltree;
    		l_desc.extra_bits = extra_lbits;
    		l_desc.extra_base = LITERALS + 1;
    		l_desc.elems = L_CODES;
    		l_desc.max_length = MAX_BITS;
    		l_desc.max_code = 0;
    
    		d_desc.dyn_tree = dyn_dtree;
    		d_desc.static_tree = static_dtree;
    		d_desc.extra_bits = extra_dbits;
    		d_desc.extra_base = 0;
    		d_desc.elems = D_CODES;
    		d_desc.max_length = MAX_BITS;
    		d_desc.max_code = 0;
    
    		bl_desc.dyn_tree = bl_tree;
    		bl_desc.static_tree = null;
    		bl_desc.extra_bits = extra_blbits;
    		bl_desc.extra_base = 0;
    		bl_desc.elems = BL_CODES;
    		bl_desc.max_length = MAX_BL_BITS;
    		bl_desc.max_code = 0;
    
    	 // Initialize the mapping length (0..255) -> length code (0..28)
    		length = 0;
    		for (code = 0; code < LENGTH_CODES - 1; code++) {
    			base_length[code] = length;
    			for (n = 0; n < (1 << extra_lbits[code]); n++) {
    				length_code[length++] = code;
    			}
    		}
    	 // Assert (length === 256, "ct_init: length !== 256");
    
    		// Note that the length 255 (match length 258) can be represented
    		// in two different ways: code 284 + 5 bits or code 285, so we
    		// overwrite length_code[255] to use the best encoding:
    		length_code[length - 1] = code;
    
    		// Initialize the mapping dist (0..32K) -> dist code (0..29) */
    		dist = 0;
    		for (code = 0; code < 16; code++) {
    			base_dist[code] = dist;
    			for (n = 0; n < (1 << extra_dbits[code]); n++) {
    				dist_code[dist++] = code;
    			}
    		}
    		// Assert (dist === 256, "ct_init: dist !== 256");
    		// from now on, all distances are divided by 128
    		for (dist >>= 7; code < D_CODES; code++) {
    			base_dist[code] = dist << 7;
    			for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
    				dist_code[256 + dist++] = code;
    			}
    		}
    		// Assert (dist === 256, "ct_init: 256+dist !== 512");
    
    		// Construct the codes of the static literal tree
    		for (bits = 0; bits <= MAX_BITS; bits++) {
    			bl_count[bits] = 0;
    		}
    		n = 0;
    		while (n <= 143) {
    			static_ltree[n++].dl = 8;
    			bl_count[8]++;
    		}
    		while (n <= 255) {
    			static_ltree[n++].dl = 9;
    			bl_count[9]++;
    		}
    		while (n <= 279) {
    			static_ltree[n++].dl = 7;
    			bl_count[7]++;
    		}
    		while (n <= 287) {
    			static_ltree[n++].dl = 8;
    			bl_count[8]++;
    		}
    		// Codes 286 and 287 do not exist, but we must include them in the
    		// tree construction to get a canonical Huffman tree (longest code
    		// all ones)
    		gen_codes(static_ltree, L_CODES + 1);
    
    		// The static distance tree is trivial: */
    		for (n = 0; n < D_CODES; n++) {
    			static_dtree[n].dl = 5;
    			static_dtree[n].fc = bi_reverse(n, 5);
    		}
    
    		// Initialize the first block of the first file:
    		init_block();
    	}
    
    	/* ==========================================================================
    	 * Initialize a new block.
    	 */
    	function init_block() {
    		var n; // iterates over tree elements
    
    		// Initialize the trees.
    		for (n = 0; n < L_CODES;  n++) {
    			dyn_ltree[n].fc = 0;
    		}
    		for (n = 0; n < D_CODES;  n++) {
    			dyn_dtree[n].fc = 0;
    		}
    		for (n = 0; n < BL_CODES; n++) {
    			bl_tree[n].fc = 0;
    		}
    
    		dyn_ltree[END_BLOCK].fc = 1;
    		opt_len = static_len = 0;
    		last_lit = last_dist = last_flags = 0;
    		flags = 0;
    		flag_bit = 1;
    	}
    
    	/* ==========================================================================
    	 * Restore the heap property by moving down the tree starting at node k,
    	 * exchanging a node with the smallest of its two sons if necessary, stopping
    	 * when the heap property is re-established (each father smaller than its
    	 * two sons).
    	 *
    	 * @param tree- tree to restore
    	 * @param k- node to move down
    	 */
    	function pqdownheap(tree, k) {
    		var v = heap[k],
    			j = k << 1; // left son of k
    
    		while (j <= heap_len) {
    			// Set j to the smallest of the two sons:
    			if (j < heap_len && SMALLER(tree, heap[j + 1], heap[j])) {
    				j++;
    			}
    
    			// Exit if v is smaller than both sons
    			if (SMALLER(tree, v, heap[j])) {
    				break;
    			}
    
    			// Exchange v with the smallest son
    			heap[k] = heap[j];
    			k = j;
    
    			// And continue down the tree, setting j to the left son of k
    			j <<= 1;
    		}
    		heap[k] = v;
    	}
    
    	/* ==========================================================================
    	 * Compute the optimal bit lengths for a tree and update the total bit length
    	 * for the current block.
    	 * IN assertion: the fields freq and dad are set, heap[heap_max] and
    	 *    above are the tree nodes sorted by increasing frequency.
    	 * OUT assertions: the field len is set to the optimal bit length, the
    	 *     array bl_count contains the frequencies for each bit length.
    	 *     The length opt_len is updated; static_len is also updated if stree is
    	 *     not null.
    	 */
    	function gen_bitlen(desc) { // the tree descriptor
    		var tree = desc.dyn_tree;
    		var extra = desc.extra_bits;
    		var base = desc.extra_base;
    		var max_code = desc.max_code;
    		var max_length = desc.max_length;
    		var stree = desc.static_tree;
    		var h; // heap index
    		var n, m; // iterate over the tree elements
    		var bits; // bit length
    		var xbits; // extra bits
    		var f; // frequency
    		var overflow = 0; // number of elements with bit length too large
    
    		for (bits = 0; bits <= MAX_BITS; bits++) {
    			bl_count[bits] = 0;
    		}
    
    		// In a first pass, compute the optimal bit lengths (which may
    		// overflow in the case of the bit length tree).
    		tree[heap[heap_max]].dl = 0; // root of the heap
    
    		for (h = heap_max + 1; h < HEAP_SIZE; h++) {
    			n = heap[h];
    			bits = tree[tree[n].dl].dl + 1;
    			if (bits > max_length) {
    				bits = max_length;
    				overflow++;
    			}
    			tree[n].dl = bits;
    			// We overwrite tree[n].dl which is no longer needed
    
    			if (n > max_code) {
    				continue; // not a leaf node
    			}
    
    			bl_count[bits]++;
    			xbits = 0;
    			if (n >= base) {
    				xbits = extra[n - base];
    			}
    			f = tree[n].fc;
    			opt_len += f * (bits + xbits);
    			if (stree !== null) {
    				static_len += f * (stree[n].dl + xbits);
    			}
    		}
    		if (overflow === 0) {
    			return;
    		}
    
    		// This happens for example on obj2 and pic of the Calgary corpus
    
    		// Find the first bit length which could increase:
    		do {
    			bits = max_length - 1;
    			while (bl_count[bits] === 0) {
    				bits--;
    			}
    			bl_count[bits]--; // move one leaf down the tree
    			bl_count[bits + 1] += 2; // move one overflow item as its brother
    			bl_count[max_length]--;
    			// The brother of the overflow item also moves one step up,
    			// but this does not affect bl_count[max_length]
    			overflow -= 2;
    		} while (overflow > 0);
    
    		// Now recompute all bit lengths, scanning in increasing frequency.
    		// h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
    		// lengths instead of fixing only the wrong ones. This idea is taken
    		// from 'ar' written by Haruhiko Okumura.)
    		for (bits = max_length; bits !== 0; bits--) {
    			n = bl_count[bits];
    			while (n !== 0) {
    				m = heap[--h];
    				if (m > max_code) {
    					continue;
    				}
    				if (tree[m].dl !== bits) {
    					opt_len += (bits - tree[m].dl) * tree[m].fc;
    					tree[m].fc = bits;
    				}
    				n--;
    			}
    		}
    	}
    
    	  /* ==========================================================================
    	   * Generate the codes for a given tree and bit counts (which need not be
    	   * optimal).
    	   * IN assertion: the array bl_count contains the bit length statistics for
    	   * the given tree and the field len is set for all tree elements.
    	   * OUT assertion: the field code is set for all tree elements of non
    	   *     zero code length.
    	   * @param tree- the tree to decorate
    	   * @param max_code- largest code with non-zero frequency
    	   */
    	function gen_codes(tree, max_code) {
    		var next_code = []; // new Array(MAX_BITS + 1); // next code value for each bit length
    		var code = 0; // running code value
    		var bits; // bit index
    		var n; // code index
    
    		// The distribution counts are first used to generate the code values
    		// without bit reversal.
    		for (bits = 1; bits <= MAX_BITS; bits++) {
    			code = ((code + bl_count[bits - 1]) << 1);
    			next_code[bits] = code;
    		}
    
    		// Check that the bit counts in bl_count are consistent. The last code
    		// must be all ones.
    		// Assert (code + encoder->bl_count[MAX_BITS]-1 === (1<<MAX_BITS)-1, "inconsistent bit counts");
    		// Tracev((stderr,"\ngen_codes: max_code %d ", max_code));
    
    		for (n = 0; n <= max_code; n++) {
    			var len = tree[n].dl;
    			if (len === 0) {
    				continue;
    			}
    			// Now reverse the bits
    			tree[n].fc = bi_reverse(next_code[len]++, len);
    
    			// Tracec(tree !== static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ", n, (isgraph(n) ? n : ' '), len, tree[n].fc, next_code[len]-1));
    		}
    	}
    
    	/* ==========================================================================
    	 * Construct one Huffman tree and assigns the code bit strings and lengths.
    	 * Update the total bit length for the current block.
    	 * IN assertion: the field freq is set for all tree elements.
    	 * OUT assertions: the fields len and code are set to the optimal bit length
    	 *     and corresponding code. The length opt_len is updated; static_len is
    	 *     also updated if stree is not null. The field max_code is set.
    	 */
    	function build_tree(desc) { // the tree descriptor
    		var tree = desc.dyn_tree;
    		var stree = desc.static_tree;
    		var elems = desc.elems;
    		var n, m; // iterate over heap elements
    		var max_code = -1; // largest code with non zero frequency
    		var node = elems; // next internal node of the tree
    
    		// Construct the initial heap, with least frequent element in
    		// heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
    		// heap[0] is not used.
    		heap_len = 0;
    		heap_max = HEAP_SIZE;
    
    		for (n = 0; n < elems; n++) {
    			if (tree[n].fc !== 0) {
    				heap[++heap_len] = max_code = n;
    				depth[n] = 0;
    			} else {
    				tree[n].dl = 0;
    			}
    		}
    
    		// The pkzip format requires that at least one distance code exists,
    		// and that at least one bit should be sent even if there is only one
    		// possible code. So to avoid special checks later on we force at least
    		// two codes of non zero frequency.
    		while (heap_len < 2) {
    			var xnew = heap[++heap_len] = (max_code < 2 ? ++max_code : 0);
    			tree[xnew].fc = 1;
    			depth[xnew] = 0;
    			opt_len--;
    			if (stree !== null) {
    				static_len -= stree[xnew].dl;
    			}
    			// new is 0 or 1 so it does not have extra bits
    		}
    		desc.max_code = max_code;
    
    		// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
    		// establish sub-heaps of increasing lengths:
    		for (n = heap_len >> 1; n >= 1; n--) {
    			pqdownheap(tree, n);
    		}
    
    		// Construct the Huffman tree by repeatedly combining the least two
    		// frequent nodes.
    		do {
    			n = heap[SMALLEST];
    			heap[SMALLEST] = heap[heap_len--];
    			pqdownheap(tree, SMALLEST);
    
    			m = heap[SMALLEST]; // m = node of next least frequency
    
    			// keep the nodes sorted by frequency
    			heap[--heap_max] = n;
    			heap[--heap_max] = m;
    
    			// Create a new node father of n and m
    			tree[node].fc = tree[n].fc + tree[m].fc;
    			//	depth[node] = (char)(MAX(depth[n], depth[m]) + 1);
    			if (depth[n] > depth[m] + 1) {
    				depth[node] = depth[n];
    			} else {
    				depth[node] = depth[m] + 1;
    			}
    			tree[n].dl = tree[m].dl = node;
    
    			// and insert the new node in the heap
    			heap[SMALLEST] = node++;
    			pqdownheap(tree, SMALLEST);
    
    		} while (heap_len >= 2);
    
    		heap[--heap_max] = heap[SMALLEST];
    
    		// At this point, the fields freq and dad are set. We can now
    		// generate the bit lengths.
    		gen_bitlen(desc);
    
    		// The field len is now set, we can generate the bit codes
    		gen_codes(tree, max_code);
    	}
    
    	/* ==========================================================================
    	 * Scan a literal or distance tree to determine the frequencies of the codes
    	 * in the bit length tree. Updates opt_len to take into account the repeat
    	 * counts. (The contribution of the bit length codes will be added later
    	 * during the construction of bl_tree.)
    	 *
    	 * @param tree- the tree to be scanned
    	 * @param max_code- and its largest code of non zero frequency
    	 */
    	function scan_tree(tree, max_code) {
    		var n, // iterates over all tree elements
    			prevlen = -1, // last emitted length
    			curlen, // length of current code
    			nextlen = tree[0].dl, // length of next code
    			count = 0, // repeat count of the current code
    			max_count = 7, // max repeat count
    			min_count = 4; // min repeat count
    
    		if (nextlen === 0) {
    			max_count = 138;
    			min_count = 3;
    		}
    		tree[max_code + 1].dl = 0xffff; // guard
    
    		for (n = 0; n <= max_code; n++) {
    			curlen = nextlen;
    			nextlen = tree[n + 1].dl;
    			if (++count < max_count && curlen === nextlen) {
    				continue;
    			} else if (count < min_count) {
    				bl_tree[curlen].fc += count;
    			} else if (curlen !== 0) {
    				if (curlen !== prevlen) {
    					bl_tree[curlen].fc++;
    				}
    				bl_tree[REP_3_6].fc++;
    			} else if (count <= 10) {
    				bl_tree[REPZ_3_10].fc++;
    			} else {
    				bl_tree[REPZ_11_138].fc++;
    			}
    			count = 0; prevlen = curlen;
    			if (nextlen === 0) {
    				max_count = 138;
    				min_count = 3;
    			} else if (curlen === nextlen) {
    				max_count = 6;
    				min_count = 3;
    			} else {
    				max_count = 7;
    				min_count = 4;
    			}
    		}
    	}
    
    	/* ==========================================================================
    	 * Send a literal or distance tree in compressed form, using the codes in
    	 * bl_tree.
    	 *
    	 * @param tree- the tree to be scanned
    	 * @param max_code- and its largest code of non zero frequency
    	 */
    	function send_tree(tree, max_code) {
    		var n; // iterates over all tree elements
    		var prevlen = -1; // last emitted length
    		var curlen; // length of current code
    		var nextlen = tree[0].dl; // length of next code
    		var count = 0; // repeat count of the current code
    		var max_count = 7; // max repeat count
    		var min_count = 4; // min repeat count
    
    		// tree[max_code+1].dl = -1; */  /* guard already set */
    		if (nextlen === 0) {
    			max_count = 138;
    			min_count = 3;
    		}
    
    		for (n = 0; n <= max_code; n++) {
    			curlen = nextlen;
    			nextlen = tree[n + 1].dl;
    			if (++count < max_count && curlen === nextlen) {
    				continue;
    			} else if (count < min_count) {
    				do {
    					SEND_CODE(curlen, bl_tree);
    				} while (--count !== 0);
    			} else if (curlen !== 0) {
    				if (curlen !== prevlen) {
    					SEND_CODE(curlen, bl_tree);
    					count--;
    				}
    			// Assert(count >= 3 && count <= 6, " 3_6?");
    				SEND_CODE(REP_3_6, bl_tree);
    				send_bits(count - 3, 2);
    			} else if (count <= 10) {
    				SEND_CODE(REPZ_3_10, bl_tree);
    				send_bits(count - 3, 3);
    			} else {
    				SEND_CODE(REPZ_11_138, bl_tree);
    				send_bits(count - 11, 7);
    			}
    			count = 0;
    			prevlen = curlen;
    			if (nextlen === 0) {
    				max_count = 138;
    				min_count = 3;
    			} else if (curlen === nextlen) {
    				max_count = 6;
    				min_count = 3;
    			} else {
    				max_count = 7;
    				min_count = 4;
    			}
    		}
    	}
    
    	/* ==========================================================================
    	 * Construct the Huffman tree for the bit lengths and return the index in
    	 * bl_order of the last bit length code to send.
    	 */
    	function build_bl_tree() {
    		var max_blindex; // index of last bit length code of non zero freq
    
    		// Determine the bit length frequencies for literal and distance trees
    		scan_tree(dyn_ltree, l_desc.max_code);
    		scan_tree(dyn_dtree, d_desc.max_code);
    
    		// Build the bit length tree:
    		build_tree(bl_desc);
    		// opt_len now includes the length of the tree representations, except
    		// the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
    
    		// Determine the number of bit length codes to send. The pkzip format
    		// requires that at least 4 bit length codes be sent. (appnote.txt says
    		// 3 but the actual value used is 4.)
    		for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
    			if (bl_tree[bl_order[max_blindex]].dl !== 0) {
    				break;
    			}
    		}
    		// Update opt_len to include the bit length tree and counts */
    		opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
    		// Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
    		// encoder->opt_len, encoder->static_len));
    
    		return max_blindex;
    	}
    
    	/* ==========================================================================
    	 * Send the header for a block using dynamic Huffman trees: the counts, the
    	 * lengths of the bit length codes, the literal tree and the distance tree.
    	 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
    	 */
    	function send_all_trees(lcodes, dcodes, blcodes) { // number of codes for each tree
    		var rank; // index in bl_order
    
    		// Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
    		// Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES, "too many codes");
    		// Tracev((stderr, "\nbl counts: "));
    		send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
    		send_bits(dcodes - 1,   5);
    		send_bits(blcodes - 4,  4); // not -3 as stated in appnote.txt
    		for (rank = 0; rank < blcodes; rank++) {
    			// Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    			send_bits(bl_tree[bl_order[rank]].dl, 3);
    		}
    
    		// send the literal tree
    		send_tree(dyn_ltree, lcodes - 1);
    
    		// send the distance tree
    		send_tree(dyn_dtree, dcodes - 1);
    	}
    
    	/* ==========================================================================
    	 * Determine the best encoding for the current block: dynamic trees, static
    	 * trees or store, and output the encoded block to the zip file.
    	 */
    	function flush_block(eof) { // true if this is the last block for a file
    		var opt_lenb, static_lenb, // opt_len and static_len in bytes
    			max_blindex, // index of last bit length code of non zero freq
    			stored_len, // length of input block
    			i;
    
    		stored_len = strstart - block_start;
    		flag_buf[last_flags] = flags; // Save the flags for the last 8 items
    
    		// Construct the literal and distance trees
    		build_tree(l_desc);
    		// Tracev((stderr, "\nlit data: dyn %ld, stat %ld",
    		// encoder->opt_len, encoder->static_len));
    
    		build_tree(d_desc);
    		// Tracev((stderr, "\ndist data: dyn %ld, stat %ld",
    		// encoder->opt_len, encoder->static_len));
    		// At this point, opt_len and static_len are the total bit lengths of
    		// the compressed block data, excluding the tree representations.
    
    		// Build the bit length tree for the above two trees, and get the index
    		// in bl_order of the last bit length code to send.
    		max_blindex = build_bl_tree();
    
    	 // Determine the best encoding. Compute first the block length in bytes
    		opt_lenb = (opt_len + 3 + 7) >> 3;
    		static_lenb = (static_len + 3 + 7) >> 3;
    
    	//  Trace((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u dist %u ", opt_lenb, encoder->opt_len, static_lenb, encoder->static_len, stored_len, encoder->last_lit, encoder->last_dist));
    
    		if (static_lenb <= opt_lenb) {
    			opt_lenb = static_lenb;
    		}
    		if (stored_len + 4 <= opt_lenb && block_start >= 0) { // 4: two words for the lengths
    			// The test buf !== NULL is only necessary if LIT_BUFSIZE > WSIZE.
    			// Otherwise we can't have processed more than WSIZE input bytes since
    			// the last block flush, because compression would have been
    			// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
    			// transform a block into a stored block.
    			send_bits((STORED_BLOCK << 1) + eof, 3);  /* send block type */
    			bi_windup();         /* align on byte boundary */
    			put_short(stored_len);
    			put_short(~stored_len);
    
    			// copy block
    			/*
    				p = &window[block_start];
    				for (i = 0; i < stored_len; i++) {
    					put_byte(p[i]);
    				}
    			*/
    			for (i = 0; i < stored_len; i++) {
    				put_byte(window[block_start + i]);
    			}
    		} else if (static_lenb === opt_lenb) {
    			send_bits((STATIC_TREES << 1) + eof, 3);
    			compress_block(static_ltree, static_dtree);
    		} else {
    			send_bits((DYN_TREES << 1) + eof, 3);
    			send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
    			compress_block(dyn_ltree, dyn_dtree);
    		}
    
    		init_block();
    
    		if (eof !== 0) {
    			bi_windup();
    		}
    	}
    
    	/* ==========================================================================
    	 * Save the match info and tally the frequency counts. Return true if
    	 * the current block must be flushed.
    	 *
    	 * @param dist- distance of matched string
    	 * @param lc- (match length - MIN_MATCH) or unmatched char (if dist === 0)
    	 */
    	function ct_tally(dist, lc) {
    		l_buf[last_lit++] = lc;
    		if (dist === 0) {
    			// lc is the unmatched char
    			dyn_ltree[lc].fc++;
    		} else {
    			// Here, lc is the match length - MIN_MATCH
    			dist--; // dist = match distance - 1
    			// Assert((ush)dist < (ush)MAX_DIST && (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) && (ush)D_CODE(dist) < (ush)D_CODES,  "ct_tally: bad match");
    
    			dyn_ltree[length_code[lc] + LITERALS + 1].fc++;
    			dyn_dtree[D_CODE(dist)].fc++;
    
    			d_buf[last_dist++] = dist;
    			flags |= flag_bit;
    		}
    		flag_bit <<= 1;
    
    		// Output the flags if they fill a byte
    		if ((last_lit & 7) === 0) {
    			flag_buf[last_flags++] = flags;
    			flags = 0;
    			flag_bit = 1;
    		}
    		// Try to guess if it is profitable to stop the current block here
    		if (compr_level > 2 && (last_lit & 0xfff) === 0) {
    			// Compute an upper bound for the compressed length
    			var out_length = last_lit * 8;
    			var in_length = strstart - block_start;
    			var dcode;
    
    			for (dcode = 0; dcode < D_CODES; dcode++) {
    				out_length += dyn_dtree[dcode].fc * (5 + extra_dbits[dcode]);
    			}
    			out_length >>= 3;
    			// Trace((stderr,"\nlast_lit %u, last_dist %u, in %ld, out ~%ld(%ld%%) ", encoder->last_lit, encoder->last_dist, in_length, out_length, 100L - out_length*100L/in_length));
    			if (last_dist < parseInt(last_lit / 2, 10) && out_length < parseInt(in_length / 2, 10)) {
    				return true;
    			}
    		}
    		return (last_lit === LIT_BUFSIZE - 1 || last_dist === DIST_BUFSIZE);
    		// We avoid equality with LIT_BUFSIZE because of wraparound at 64K
    		// on 16 bit machines and because stored blocks are restricted to
    		// 64K-1 bytes.
    	}
    
    	  /* ==========================================================================
    	   * Send the block data compressed using the given Huffman trees
    	   *
    	   * @param ltree- literal tree
    	   * @param dtree- distance tree
    	   */
    	function compress_block(ltree, dtree) {
    		var dist; // distance of matched string
    		var lc; // match length or unmatched char (if dist === 0)
    		var lx = 0; // running index in l_buf
    		var dx = 0; // running index in d_buf
    		var fx = 0; // running index in flag_buf
    		var flag = 0; // current flags
    		var code; // the code to send
    		var extra; // number of extra bits to send
    
    		if (last_lit !== 0) {
    			do {
    				if ((lx & 7) === 0) {
    					flag = flag_buf[fx++];
    				}
    				lc = l_buf[lx++] & 0xff;
    				if ((flag & 1) === 0) {
    					SEND_CODE(lc, ltree); /* send a literal byte */
    					//	Tracecv(isgraph(lc), (stderr," '%c' ", lc));
    				} else {
    					// Here, lc is the match length - MIN_MATCH
    					code = length_code[lc];
    					SEND_CODE(code + LITERALS + 1, ltree); // send the length code
    					extra = extra_lbits[code];
    					if (extra !== 0) {
    						lc -= base_length[code];
    						send_bits(lc, extra); // send the extra length bits
    					}
    					dist = d_buf[dx++];
    					// Here, dist is the match distance - 1
    					code = D_CODE(dist);
    					//	Assert (code < D_CODES, "bad d_code");
    
    					SEND_CODE(code, dtree); // send the distance code
    					extra = extra_dbits[code];
    					if (extra !== 0) {
    						dist -= base_dist[code];
    						send_bits(dist, extra); // send the extra distance bits
    					}
    				} // literal or match pair ?
    				flag >>= 1;
    			} while (lx < last_lit);
    		}
    
    		SEND_CODE(END_BLOCK, ltree);
    	}
    
    	/* ==========================================================================
    	 * Send a value on a given number of bits.
    	 * IN assertion: length <= 16 and value fits in length bits.
    	 *
    	 * @param value- value to send
    	 * @param length- number of bits
    	 */
    	var Buf_size = 16; // bit size of bi_buf
    	function send_bits(value, length) {
    		// If not enough room in bi_buf, use (valid) bits from bi_buf and
    		// (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
    		// unused bits in value.
    		if (bi_valid > Buf_size - length) {
    			bi_buf |= (value << bi_valid);
    			put_short(bi_buf);
    			bi_buf = (value >> (Buf_size - bi_valid));
    			bi_valid += length - Buf_size;
    		} else {
    			bi_buf |= value << bi_valid;
    			bi_valid += length;
    		}
    	}
    
    	/* ==========================================================================
    	 * Reverse the first len bits of a code, using straightforward code (a faster
    	 * method would use a table)
    	 * IN assertion: 1 <= len <= 15
    	 *
    	 * @param code- the value to invert
    	 * @param len- its bit length
    	 */
    	function bi_reverse(code, len) {
    		var res = 0;
    		do {
    			res |= code & 1;
    			code >>= 1;
    			res <<= 1;
    		} while (--len > 0);
    		return res >> 1;
    	}
    
    	/* ==========================================================================
    	 * Write out any remaining bits in an incomplete byte.
    	 */
    	function bi_windup() {
    		if (bi_valid > 8) {
    			put_short(bi_buf);
    		} else if (bi_valid > 0) {
    			put_byte(bi_buf);
    		}
    		bi_buf = 0;
    		bi_valid = 0;
    	}
    
    	function qoutbuf() {
    		var q, i;
    		if (outcnt !== 0) {
    			q = new_queue();
    			if (qhead === null) {
    				qhead = qtail = q;
    			} else {
    				qtail = qtail.next = q;
    			}
    			q.len = outcnt - outoff;
    			// System.arraycopy(outbuf, outoff, q.ptr, 0, q.len);
    			for (i = 0; i < q.len; i++) {
    				q.ptr[i] = outbuf[outoff + i];
    			}
    			outcnt = outoff = 0;
    		}
    	}
    
    	function deflate(arr, level) {
    		var i, j, buff;
    
    		deflate_data = arr;
    		deflate_pos = 0;
    		if (typeof level === "undefined") {
    			level = DEFAULT_LEVEL;
    		}
    		deflate_start(level);
    
    		buff = [];
    
    		do {
    			i = deflate_internal(buff, buff.length, 1024);
    		} while (i > 0);
    
    		deflate_data = null; // G.C.
    		return buff;
    	}
    
    	module.exports = deflate;
    	module.exports.DEFAULT_LEVEL = DEFAULT_LEVEL;
    }());
    
  provide("deflate-js/lib/rawdeflate.js", module.exports);
}(global));

// pakmanager:deflate-js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  (function () {
    	'use strict';
    
    	module.exports = {
    		'inflate':  require('deflate-js/lib/rawinflate.js'),
    		'deflate':  require('deflate-js/lib/rawdeflate.js')
    	};
    }());
    
  provide("deflate-js", module.exports);
}(global));

// pakmanager:gzip-js
(function (context) {
  
  var module = { exports: {} }, exports = module.exports
    , $ = require("ender")
    ;
  
  (function () {
    	'use strict';
    
    	var crc32 = require('crc32'),
    		deflate = require('deflate-js'),
    		// magic numbers marking this file as GZIP
    		ID1 = 0x1F,
    		ID2 = 0x8B,
    		compressionMethods = {
    			'deflate': 8
    		},
    		possibleFlags = {
    			'FTEXT': 0x01,
    			'FHCRC': 0x02,
    			'FEXTRA': 0x04,
    			'FNAME': 0x08,
    			'FCOMMENT': 0x10
    		},
    		osMap = {
    			'fat': 0, // FAT file system (DOS, OS/2, NT) + PKZIPW 2.50 VFAT, NTFS
    			'amiga': 1, // Amiga
    			'vmz': 2, // VMS (VAX or Alpha AXP)
    			'unix': 3, // Unix
    			'vm/cms': 4, // VM/CMS
    			'atari': 5, // Atari
    			'hpfs': 6, // HPFS file system (OS/2, NT 3.x)
    			'macintosh': 7, // Macintosh
    			'z-system': 8, // Z-System
    			'cplm': 9, // CP/M
    			'tops-20': 10, // TOPS-20
    			'ntfs': 11, // NTFS file system (NT)
    			'qdos': 12, // SMS/QDOS
    			'acorn': 13, // Acorn RISC OS
    			'vfat': 14, // VFAT file system (Win95, NT)
    			'vms': 15, // MVS (code also taken for PRIMOS)
    			'beos': 16, // BeOS (BeBox or PowerMac)
    			'tandem': 17, // Tandem/NSK
    			'theos': 18 // THEOS
    		},
    		os = 'unix',
    		DEFAULT_LEVEL = 6;
    
    	function putByte(n, arr) {
    		arr.push(n & 0xFF);
    	}
    
    	// LSB first
    	function putShort(n, arr) {
    		arr.push(n & 0xFF);
    		arr.push(n >>> 8);
    	}
    
    	// LSB first
    	function putLong(n, arr) {
    		putShort(n & 0xffff, arr);
    		putShort(n >>> 16, arr);
    	}
    
    	function putString(s, arr) {
    		var i, len = s.length;
    		for (i = 0; i < len; i += 1) {
    			putByte(s.charCodeAt(i), arr);
    		}
    	}
    
    	function readByte(arr) {
    		return arr.shift();
    	}
    
    	function readShort(arr) {
    		return arr.shift() | (arr.shift() << 8);
    	}
    
    	function readLong(arr) {
    		var n1 = readShort(arr),
    			n2 = readShort(arr);
    
    		// JavaScript can't handle bits in the position 32
    		// we'll emulate this by removing the left-most bit (if it exists)
    		// and add it back in via multiplication, which does work
    		if (n2 > 32768) {
    			n2 -= 32768;
    
    			return ((n2 << 16) | n1) + 32768 * Math.pow(2, 16);
    		}
    
    		return (n2 << 16) | n1;
    	}
    
    	function readString(arr) {
    		var charArr = [];
    
    		// turn all bytes into chars until the terminating null
    		while (arr[0] !== 0) {
    			charArr.push(String.fromCharCode(arr.shift()));
    		}
    
    		// throw away terminating null
    		arr.shift();
    
    		// join all characters into a cohesive string
    		return charArr.join('');
    	}
    
    	/*
    	 * Reads n number of bytes and return as an array.
    	 *
    	 * @param arr- Array of bytes to read from
    	 * @param n- Number of bytes to read
    	 */
    	function readBytes(arr, n) {
    		var i, ret = [];
    		for (i = 0; i < n; i += 1) {
    			ret.push(arr.shift());
    		}
    
    		return ret;
    	}
    
    	/*
    	 * ZIPs a file in GZIP format. The format is as given by the spec, found at:
    	 * http://www.gzip.org/zlib/rfc-gzip.html
    	 *
    	 * Omitted parts in this implementation:
    	 */
    	function zip(data, options) {
    		var flags = 0,
    			level = options.level || DEFAULT_LEVEL,
    			crc, out = [];
    
    		if (typeof data === 'string') {
    			data = Array.prototype.map.call(data, function (char) {
    				return char.charCodeAt(0);
    			});
    		}
    
    		// magic number marking this file as GZIP
    		putByte(ID1, out);
    		putByte(ID2, out);
    
    		putByte(compressionMethods['deflate'], out);
    
    		if (options.name) {
    			flags |= possibleFlags['FNAME'];
    		}
    
    		putByte(flags, out);
    		putLong(options.timestamp || parseInt(Date.now() / 1000, 10), out);
    
    		// put deflate args (extra flags)
    		if (level === 1) {
    			// fastest algorithm
    			putByte(4, out);
    		} else if (level === 9) {
    			// maximum compression (fastest algorithm)
    			putByte(2, out);
    		} else {
    			putByte(0, out);
    		}
    
    		// OS identifier
    		putByte(osMap[os], out);
    
    		if (options.name) {
    			// ignore the directory part
    			putString(options.name.substring(options.name.lastIndexOf('/') + 1), out);
    
    			// terminating null
    			putByte(0, out);
    		}
    
    		deflate.deflate(data, level).forEach(function (byte) {
    			putByte(byte, out);
    		});
    
    		putLong(parseInt(crc32(data), 16), out);
    		putLong(data.length, out);
    
    		return out;
    	}
    
    	function unzip(data, options) {
    		// start with a copy of the array
    		var arr = Array.prototype.slice.call(data, 0),
    			t,
    			compressionMethod,
    			flags,
    			mtime,
    			xFlags,
    			key,
    			os,
    			crc,
    			size,
    			res;
    
    		// check the first two bytes for the magic numbers
    		if (readByte(arr) !== ID1 || readByte(arr) !== ID2) {
    			throw 'Not a GZIP file';
    		}
    
    		t = readByte(arr);
    		t = Object.keys(compressionMethods).some(function (key) {
    			compressionMethod = key;
    			return compressionMethods[key] === t;
    		});
    
    		if (!t) {
    			throw 'Unsupported compression method';
    		}
    
    		flags = readByte(arr);
    		mtime = readLong(arr);
    		xFlags = readByte(arr);
    		t = readByte(arr);
    		Object.keys(osMap).some(function (key) {
    			if (osMap[key] === t) {
    				os = key;
    				return true;
    			}
    		});
    
    		// just throw away the bytes for now
    		if (flags & possibleFlags['FEXTRA']) {
    			t = readShort(arr);
    			readBytes(arr, t);
    		}
    
    		// just throw away for now
    		if (flags & possibleFlags['FNAME']) {
    			readString(arr);
    		}
    
    		// just throw away for now
    		if (flags & possibleFlags['FCOMMENT']) {
    			readString(arr);
    		}
    
    		// just throw away for now
    		if (flags & possibleFlags['FHCRC']) {
    			readShort(arr);
    		}
    
    		if (compressionMethod === 'deflate') {
    			// give deflate everything but the last 8 bytes
    			// the last 8 bytes are for the CRC32 checksum and filesize
    			res = deflate.inflate(arr.splice(0, arr.length - 8));
    		}
    
    		if (flags & possibleFlags['FTEXT']) {
    			res = Array.prototype.map.call(res, function (byte) {
    				return String.fromCharCode(byte);
    			}).join('');
    		}
    
    		crc = readLong(arr);
    		if (crc !== parseInt(crc32(res), 16)) {
    			throw 'Checksum does not match';
    		}
    
    		size = readLong(arr);
    		if (size !== res.length) {
    			throw 'Size of decompressed file not correct';
    		}
    
    		return res;
    	}
    
    	module.exports = {
    		zip: zip,
    		unzip: unzip,
    		get DEFAULT_LEVEL() {
    			return DEFAULT_LEVEL;
    		}
    	};
    }());
    
  provide("gzip-js", module.exports);
}(global));// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:11,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function TIFFParser() {
	this.tiffDataView = undefined;
	this.littleEndian = undefined;
	this.fileDirectories = [];
};

TIFFParser.prototype = {
	isLittleEndian: function () {
		// Get byte order mark.
		var BOM = this.getBytes(2, 0);

		// Find out the endianness.
		if (BOM === 0x4949) {
			this.littleEndian = true;
		} else if (BOM === 0x4D4D) {
			this.littleEndian = false;
		} else {
			console.log( BOM );
			throw TypeError("Invalid byte order value.");
		}

		return this.littleEndian;
	},

	hasTowel: function () {
		// Check for towel.
		if (this.getBytes(2, 2) !== 42) {
			throw RangeError("You forgot your towel!");
			return false;
		}

		return true;
	},

	getFieldTagName: function (fieldTag) {
		// See: http://www.digitizationguidelines.gov/guidelines/TIFF_Metadata_Final.pdf
		// See: http://www.digitalpreservation.gov/formats/content/tiff_tags.shtml
		var fieldTagNames = {
			// TIFF Baseline
			0x013B: 'Artist',
			0x0102: 'BitsPerSample',
			0x0109: 'CellLength',
			0x0108: 'CellWidth',
			0x0140: 'ColorMap',
			0x0103: 'Compression',
			0x8298: 'Copyright',
			0x0132: 'DateTime',
			0x0152: 'ExtraSamples',
			0x010A: 'FillOrder',
			0x0121: 'FreeByteCounts',
			0x0120: 'FreeOffsets',
			0x0123: 'GrayResponseCurve',
			0x0122: 'GrayResponseUnit',
			0x013C: 'HostComputer',
			0x010E: 'ImageDescription',
			0x0101: 'ImageLength',
			0x0100: 'ImageWidth',
			0x010F: 'Make',
			0x0119: 'MaxSampleValue',
			0x0118: 'MinSampleValue',
			0x0110: 'Model',
			0x00FE: 'NewSubfileType',
			0x0112: 'Orientation',
			0x0106: 'PhotometricInterpretation',
			0x011C: 'PlanarConfiguration',
			0x0128: 'ResolutionUnit',
			0x0116: 'RowsPerStrip',
			0x0115: 'SamplesPerPixel',
			0x0131: 'Software',
			0x0117: 'StripByteCounts',
			0x0111: 'StripOffsets',
			0x00FF: 'SubfileType',
			0x0107: 'Threshholding',
			0x011A: 'XResolution',
			0x011B: 'YResolution',

			// TIFF Extended
			0x0146: 'BadFaxLines',
			0x0147: 'CleanFaxData',
			0x0157: 'ClipPath',
			0x0148: 'ConsecutiveBadFaxLines',
			0x01B1: 'Decode',
			0x01B2: 'DefaultImageColor',
			0x010D: 'DocumentName',
			0x0150: 'DotRange',
			0x0141: 'HalftoneHints',
			0x015A: 'Indexed',
			0x015B: 'JPEGTables',
			0x011D: 'PageName',
			0x0129: 'PageNumber',
			0x013D: 'Predictor',
			0x013F: 'PrimaryChromaticities',
			0x0214: 'ReferenceBlackWhite',
			0x0153: 'SampleFormat',
			0x022F: 'StripRowCounts',
			0x014A: 'SubIFDs',
			0x0124: 'T4Options',
			0x0125: 'T6Options',
			0x0145: 'TileByteCounts',
			0x0143: 'TileLength',
			0x0144: 'TileOffsets',
			0x0142: 'TileWidth',
			0x012D: 'TransferFunction',
			0x013E: 'WhitePoint',
			0x0158: 'XClipPathUnits',
			0x011E: 'XPosition',
			0x0211: 'YCbCrCoefficients',
			0x0213: 'YCbCrPositioning',
			0x0212: 'YCbCrSubSampling',
			0x0159: 'YClipPathUnits',
			0x011F: 'YPosition',

			// EXIF
			0x9202: 'ApertureValue',
			0xA001: 'ColorSpace',
			0x9004: 'DateTimeDigitized',
			0x9003: 'DateTimeOriginal',
			0x8769: 'Exif IFD',
			0x9000: 'ExifVersion',
			0x829A: 'ExposureTime',
			0xA300: 'FileSource',
			0x9209: 'Flash',
			0xA000: 'FlashpixVersion',
			0x829D: 'FNumber',
			0xA420: 'ImageUniqueID',
			0x9208: 'LightSource',
			0x927C: 'MakerNote',
			0x9201: 'ShutterSpeedValue',
			0x9286: 'UserComment',

			// IPTC
			0x83BB: 'IPTC',

			// ICC
			0x8773: 'ICC Profile',

			// XMP
			0x02BC: 'XMP',

			// GDAL
			0xA480: 'GDAL_METADATA',
			0xA481: 'GDAL_NODATA',

			// Photoshop
			0x8649: 'Photoshop',
		};

		var fieldTagName;

		if (fieldTag in fieldTagNames) {
			fieldTagName = fieldTagNames[fieldTag];
		} else {
			console.log( "Unknown Field Tag:", fieldTag);
			fieldTagName = "Tag" + fieldTag;
		}

		return fieldTagName;
	},

	getFieldTypeName: function (fieldType) {
		var fieldTypeNames = {
			0x0001: 'BYTE',
			0x0002: 'ASCII',
			0x0003: 'SHORT',
			0x0004: 'LONG',
			0x0005: 'RATIONAL',
			0x0006: 'SBYTE',
			0x0007: 'UNDEFINED',
			0x0008: 'SSHORT',
			0x0009: 'SLONG',
			0x000A: 'SRATIONAL',
			0x000B: 'FLOAT',
			0x000C: 'DOUBLE',
		};

		var fieldTypeName;

		if (fieldType in fieldTypeNames) {
			fieldTypeName = fieldTypeNames[fieldType];
		}

		return fieldTypeName;
	},

	getFieldTypeLength: function (fieldTypeName) {
		var fieldTypeLength;

		if (['BYTE', 'ASCII', 'SBYTE', 'UNDEFINED'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 1;
		} else if (['SHORT', 'SSHORT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 2;
		} else if (['LONG', 'SLONG', 'FLOAT'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 4;
		} else if (['RATIONAL', 'SRATIONAL', 'DOUBLE'].indexOf(fieldTypeName) !== -1) {
			fieldTypeLength = 8;
		}

		return fieldTypeLength;
	},

	getBits: function (numBits, byteOffset, bitOffset) {
		bitOffset = bitOffset || 0;
		var extraBytes = Math.floor(bitOffset / 8);
		var newByteOffset = byteOffset + extraBytes;
		var totalBits = bitOffset + numBits;
		var shiftRight = 32 - numBits;

		if (totalBits <= 0) {
			console.log( numBits, byteOffset, bitOffset );
			throw RangeError("No bits requested");
		} else if (totalBits <= 8) {
			var shiftLeft = 24 + bitOffset;
			var rawBits = this.tiffDataView.getUint8(newByteOffset, this.littleEndian);
		} else if (totalBits <= 16) {
			var shiftLeft = 16 + bitOffset;
			var rawBits = this.tiffDataView.getUint16(newByteOffset, this.littleEndian);
		} else if (totalBits <= 32) {
			var shiftLeft = bitOffset;
			var rawBits = this.tiffDataView.getUint32(newByteOffset, this.littleEndian);
		} else {
			console.log( numBits, byteOffset, bitOffset );
			throw RangeError("Too many bits requested");
		}

		var chunkInfo = {
			'bits': ((rawBits << shiftLeft) >>> shiftRight),
			'byteOffset': newByteOffset + Math.floor(totalBits / 8),
			'bitOffset': totalBits % 8,
		};

		return chunkInfo;
	},

	getBytes: function (numBytes, offset) {
		if (numBytes <= 0) {
			console.log( numBytes, offset );
			throw RangeError("No bytes requested");
		} else if (numBytes <= 1) {
			return this.tiffDataView.getUint8(offset, this.littleEndian);
		} else if (numBytes <= 2) {
			return this.tiffDataView.getUint16(offset, this.littleEndian);
		} else if (numBytes <= 3) {
			return this.tiffDataView.getUint32(offset, this.littleEndian) >>> 8;
		} else if (numBytes <= 4) {
			return this.tiffDataView.getUint32(offset, this.littleEndian);
		} else {
			console.log( numBytes, offset );
			throw RangeError("Too many bytes requested");
		}
	},

	getFieldValues: function (fieldTagName, fieldTypeName, typeCount, valueOffset) {
		var fieldValues = [];

		var fieldTypeLength = this.getFieldTypeLength(fieldTypeName);
		var fieldValueSize = fieldTypeLength * typeCount;

		if (fieldValueSize <= 4) {
			// The value is stored at the big end of the valueOffset.
			if (this.littleEndian === false) {
				var value = valueOffset >>> ((4 - fieldTypeLength) * 8);
			} else {
				var value = valueOffset;
			}

			fieldValues.push(value);
		} else {
			for (var i = 0; i < typeCount; i++) {
				var indexOffset = fieldTypeLength * i;

				if (fieldTypeLength >= 8) {
					if (['RATIONAL', 'SRATIONAL'].indexOf(fieldTypeName) !== -1) {
						// Numerator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset));
						// Denominator
						fieldValues.push(this.getBytes(4, valueOffset + indexOffset + 4));
//					} else if (['DOUBLE'].indexOf(fieldTypeName) !== -1) {
//						fieldValues.push(this.getBytes(4, valueOffset + indexOffset) + this.getBytes(4, valueOffset + indexOffset + 4));
					} else {
						console.log( fieldTypeName, typeCount, fieldValueSize );
						throw TypeError("Can't handle this field type or size");
					}
				} else {
					fieldValues.push(this.getBytes(fieldTypeLength, valueOffset + indexOffset));
				}
			}
		}

		if (fieldTypeName === 'ASCII') {
			fieldValues.forEach(function(e, i, a) { a[i] = String.fromCharCode(e); });
		}

		return fieldValues;
	},

	clampColorSample: function(colorSample, bitsPerSample) {
		var multiplier = Math.pow(2, 8 - bitsPerSample);

		return Math.floor((colorSample * multiplier) + (multiplier - 1));
	},

	makeRGBAFillValue: function(r, g, b, a) {
		if(typeof a === 'undefined') {
			a = 1;
		}

		return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
	},

	parseFileDirectory: function (byteOffset) {
		var numDirEntries = this.getBytes(2, byteOffset);

		var tiffFields = [];

		for (var i = byteOffset + 2, entryCount = 0; entryCount < numDirEntries; i += 12, entryCount++) {
			var fieldTag = this.getBytes(2, i);
			var fieldType = this.getBytes(2, i + 2);
			var typeCount = this.getBytes(4, i + 4);
			var valueOffset = this.getBytes(4, i + 8);

			var fieldTagName = this.getFieldTagName( fieldTag );
			var fieldTypeName = this.getFieldTypeName( fieldType );

			var fieldValues = this.getFieldValues(fieldTagName, fieldTypeName, typeCount, valueOffset);

			tiffFields[fieldTagName] = { 'type': fieldTypeName, 'values': fieldValues };
		}

		this.fileDirectories.push( tiffFields );

		var nextIFDByteOffset = this.getBytes(4, i);

		if (nextIFDByteOffset === 0x00000000) {
			return this.fileDirectories;
		} else {
			return this.parseFileDirectory(nextIFDByteOffset);
		}
	},

	parseTIFF: function (tiffArrayBuffer, canvas) {
		if(!canvas) {
			canvas = document.createElement('canvas');
		}
		this.tiffDataView = new DataView(tiffArrayBuffer);
		this.canvas = canvas;

		this.littleEndian = this.isLittleEndian(this.tiffDataView);

		if (!this.hasTowel(this.tiffDataView, this.littleEndian)) {
			return;
		}

		var firstIFDByteOffset = this.getBytes(4, 4);

		this.fileDirectories = this.parseFileDirectory(firstIFDByteOffset);

		var fileDirectory = this.fileDirectories[0];

		console.log( fileDirectory );

		var imageWidth = fileDirectory.ImageWidth.values[0];
		var imageLength = fileDirectory.ImageLength.values[0];

		this.canvas.width = imageWidth;
		this.canvas.height = imageLength;

		var strips = [];

		var compression = (fileDirectory.Compression) ? fileDirectory.Compression.values[0] : 1;

		var samplesPerPixel = fileDirectory.SamplesPerPixel.values[0];

		var sampleProperties = [];

		var bitsPerPixel = 0;
		var hasBytesPerPixel = false;

		fileDirectory.BitsPerSample.values.forEach(function(bitsPerSample, i, bitsPerSampleValues) {
			sampleProperties[i] = {
				'bitsPerSample': bitsPerSample,
				'hasBytesPerSample': false,
				'bytesPerSample': undefined,
			};

			if ((bitsPerSample % 8) === 0) {
				sampleProperties[i].hasBytesPerSample = true;
				sampleProperties[i].bytesPerSample = bitsPerSample / 8;
			}

			bitsPerPixel += bitsPerSample;
		}, this);

		if ((bitsPerPixel % 8) === 0) {
			hasBytesPerPixel = true;
			var bytesPerPixel = bitsPerPixel / 8;
		}

		var stripOffsetValues = fileDirectory.StripOffsets.values;
		var numStripOffsetValues = stripOffsetValues.length;

		// StripByteCounts is supposed to be required, but see if we can recover anyway.
		if (fileDirectory.StripByteCounts) {
			var stripByteCountValues = fileDirectory.StripByteCounts.values;
		} else {
			console.log("Missing StripByteCounts!");

			// Infer StripByteCounts, if possible.
			if (numStripOffsetValues === 1) {
				var stripByteCountValues = [Math.ceil((imageWidth * imageLength * bitsPerPixel) / 8)];
			} else {
				throw Error("Cannot recover from missing StripByteCounts");
			}
		}

		// Loop through strips and decompress as necessary.
		for (var i = 0; i < numStripOffsetValues; i++) {
			var stripOffset = stripOffsetValues[i];
			strips[i] = [];

			var stripByteCount = stripByteCountValues[i];

			// Loop through pixels.
			for (var byteOffset = 0, bitOffset = 0, jIncrement = 1, getHeader = true, pixel = [], numBytes = 0, sample = 0, currentSample = 0; byteOffset < stripByteCount; byteOffset += jIncrement) {
				// Decompress strip.
				switch (compression) {
					// Uncompressed
					case 1:
						// Loop through samples (sub-pixels).
						for (var m = 0, pixel = []; m < samplesPerPixel; m++) {
							if (sampleProperties[m].hasBytesPerSample) {
								// XXX: This is wrong!
								var sampleOffset = sampleProperties[m].bytesPerSample * m;

								pixel.push(this.getBytes(sampleProperties[m].bytesPerSample, stripOffset + byteOffset + sampleOffset));
							} else {
								var sampleInfo = this.getBits(sampleProperties[m].bitsPerSample, stripOffset + byteOffset, bitOffset);

								pixel.push(sampleInfo.bits);

								byteOffset = sampleInfo.byteOffset - stripOffset;
								bitOffset = sampleInfo.bitOffset;

								throw RangeError("Cannot handle sub-byte bits per sample");
							}
						}

						strips[i].push(pixel);

						if (hasBytesPerPixel) {
							jIncrement = bytesPerPixel;
						} else {
							jIncrement = 0;

							throw RangeError("Cannot handle sub-byte bits per pixel");
						}
					break;

					// CITT Group 3 1-Dimensional Modified Huffman run-length encoding
					case 2:
						// XXX: Use PDF.js code?
					break;

					// Group 3 Fax
					case 3:
						// XXX: Use PDF.js code?
					break;

					// Group 4 Fax
					case 4:
						// XXX: Use PDF.js code?
					break;

					// LZW
					case 5:
						// XXX: Use PDF.js code?
					break;

					// Old-style JPEG (TIFF 6.0)
					case 6:
						// XXX: Use PDF.js code?
					break;

					// New-style JPEG (TIFF Specification Supplement 2)
					case 7:
						// XXX: Use PDF.js code?
					break;

					// PackBits
					case 32773:
						// Are we ready for a new block?
						if (getHeader) {
							getHeader = false;

							var blockLength = 1;
							var iterations = 1;

							// The header byte is signed.
							var header = this.tiffDataView.getInt8(stripOffset + byteOffset, this.littleEndian);

							if ((header >= 0) && (header <= 127)) { // Normal pixels.
								blockLength = header + 1;
							} else if ((header >= -127) && (header <= -1)) { // Collapsed pixels.
								iterations = -header + 1;
							} else /*if (header === -128)*/ { // Placeholder byte?
								getHeader = true;
							}
						} else {
							var currentByte = this.getBytes(1, stripOffset + byteOffset);

							// Duplicate bytes, if necessary.
							for (var m = 0; m < iterations; m++) {
								if (sampleProperties[sample].hasBytesPerSample) {
									// We're reading one byte at a time, so we need to handle multi-byte samples.
									currentSample = (currentSample << (8 * numBytes)) | currentByte;
									numBytes++;

									// Is our sample complete?
									if (numBytes === sampleProperties[sample].bytesPerSample) {
										pixel.push(currentSample);
										currentSample = numBytes = 0;
										sample++;
									}
								} else {
									throw RangeError("Cannot handle sub-byte bits per sample");
								}

								// Is our pixel complete?
								if (sample === samplesPerPixel)
								{
									strips[i].push(pixel);

									pixel = [];
									sample = 0;
								}
							}

							blockLength--;

							// Is our block complete?
							if (blockLength === 0) {
								getHeader = true;
							}
						}

						jIncrement = 1;
					break;

					// Unknown compression algorithm
					default:
						// Do not attempt to parse the image data.
					break;
				}
			}

//			console.log( strips[i] );
		}

//		console.log( strips );

		if (canvas.getContext) {
			var ctx = this.canvas.getContext("2d");

			// Set a default fill style.
			ctx.fillStyle = this.makeRGBAFillValue(255, 255, 255, 0);

			// If RowsPerStrip is missing, the whole image is in one strip.
			if (fileDirectory.RowsPerStrip) {
				var rowsPerStrip = fileDirectory.RowsPerStrip.values[0];
			} else {
				var rowsPerStrip = imageLength;
			}

			var numStrips = strips.length;

			var imageLengthModRowsPerStrip = imageLength % rowsPerStrip;
			var rowsInLastStrip = (imageLengthModRowsPerStrip === 0) ? rowsPerStrip : imageLengthModRowsPerStrip;

			var numRowsInStrip = rowsPerStrip;
			var numRowsInPreviousStrip = 0;

			var photometricInterpretation = fileDirectory.PhotometricInterpretation.values[0];

			var extraSamplesValues = [];
			var numExtraSamples = 0;

			if (fileDirectory.ExtraSamples) {
				extraSamplesValues = fileDirectory.ExtraSamples.values;
				numExtraSamples = extraSamplesValues.length;
			}

			if (fileDirectory.ColorMap) {
				var colorMapValues = fileDirectory.ColorMap.values;
				var colorMapSampleSize = Math.pow(2, sampleProperties[0].bitsPerSample);
			}

			// Loop through the strips in the image.
			for (var i = 0; i < numStrips; i++) {
				// The last strip may be short.
				if ((i + 1) === numStrips) {
					numRowsInStrip = rowsInLastStrip;
				}

				var numPixels = strips[i].length;
				var yPadding = numRowsInPreviousStrip * i;

				// Loop through the rows in the strip.
				for (var y = 0, j = 0; y < numRowsInStrip, j < numPixels; y++) {
					// Loop through the pixels in the row.
					for (var x = 0; x < imageWidth; x++, j++) {
						var pixelSamples = strips[i][j];

						var red = 0;
						var green = 0;
						var blue = 0;
						var opacity = 1.0;

						if (numExtraSamples > 0) {
							for (var k = 0; k < numExtraSamples; k++) {
								if (extraSamplesValues[k] === 1) {
									opacity = pixelSamples[3 + k] / 256;

									break;
								}
							}
						}

						switch (photometricInterpretation) {
							// Bilevel or Grayscale
							// WhiteIsZero
							case 0:
								if (sampleProperties[0].hasBytesPerSample) {
									var invertValue = Math.pow(0x10, sampleProperties[0].bytesPerSample * 2);
								}

								// Invert samples.
								pixelSamples.forEach(function(sample, index, samples) { samples[index] = invertValue - sample; });

							// Bilevel or Grayscale
							// BlackIsZero
							case 1:
								red = green = blue = this.clampColorSample(pixelSamples[0], sampleProperties[0].bitsPerSample);
							break;

							// RGB Full Color
							case 2:
								red = this.clampColorSample(pixelSamples[0], sampleProperties[0].bitsPerSample);
								green = this.clampColorSample(pixelSamples[1], sampleProperties[1].bitsPerSample);
								blue = this.clampColorSample(pixelSamples[2], sampleProperties[2].bitsPerSample);
							break;

							// RGB Color Palette
							case 3:
								if (colorMapValues === undefined) {
									throw Error("Palette image missing color map");
								}

								var colorMapIndex = pixelSamples[0];

								red = this.clampColorSample(colorMapValues[colorMapIndex], 16);
								green = this.clampColorSample(colorMapValues[colorMapSampleSize + colorMapIndex], 16);
								blue = this.clampColorSample(colorMapValues[(2 * colorMapSampleSize) + colorMapIndex], 16);
							break;

							// Transparency mask
							case 4:
								throw RangeError( 'Not Yet Implemented: Transparency mask' );
							break;

							// CMYK
							case 5:
								throw RangeError( 'Not Yet Implemented: CMYK' );
							break;

							// YCbCr
							case 6:
								throw RangeError( 'Not Yet Implemented: YCbCr' );
							break;

							// CIELab
							case 8:
								throw RangeError( 'Not Yet Implemented: CIELab' );
							break;

							// Unknown Photometric Interpretation
							default:
								throw RangeError( 'Unknown Photometric Interpretation:', photometricInterpretation );
							break;
						}

						ctx.fillStyle = this.makeRGBAFillValue(red, green, blue, opacity);
						ctx.fillRect(x, yPadding + y, 1, 1);
					}
				}

				numRowsInPreviousStrip = numRowsInStrip;
			}
		}

/*		for (var i = 0, numFileDirectories = this.fileDirectories.length; i < numFileDirectories; i++) {
			// Stuff
		}*/

		return this.canvas;
	},
}
(function() {
	var circleFnSrc = 'var r = pjs.toRad(value.x);\n' + 'return {\n' + 'x: Math.cos(r) * 70,\n' + 'y: Math.sin(r) * 70\n' + '};';

	this.pjs = this.pjs || {};
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
		},

		_plistfile: function(gui) {
			gui.addFile(this.particleSystem, 'plist');
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
		endScale: 'unsignednumber',
		plist: 'plistfile'
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
	},
	{
		title: 'Import/Export',
		items: ['plist']
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

