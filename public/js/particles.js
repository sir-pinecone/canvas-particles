/* Author: Michael Campagnaro */

/* From Backbone...thanks! */
// The self-propagating extend function that Backbone classes use.
var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = this.extend;
    return child;
};

// Shared empty constructor function to aid in prototype-chain creation.
var ctor = function(){};

// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
var inherits = function(parent, protoProps, staticProps) {
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call `super()`.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Inherit class (static) properties from parent.
    _.extend(child, parent);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Add static properties to the constructor function, if supplied.
    if (staticProps) _.extend(child, staticProps);

    // Correctly set child's `prototype.constructor`.
    child.prototype.constructor = child;

    // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
};

/* ------------------------------------*/
  
id = 0;
function nextId() {
    return id += 1;
}

function Particle() {
    this.id = nextId();
    this.colour = { 
        r: Math.floor(Math.random() * 255), 
        g: Math.floor(Math.random() * 255), 
        b: Math.floor(Math.random() * 255) 
    };
    this.y = 0;
    this.x = 0;
    this.vX = 0;
    this.vY = 0;

    this.createdAt = (new Date()).getTime();
    this.life = Math.floor(Math.random()* 300 + 1);
    
    this.toDist = canvasProperties.width / 1.15;
    this.stirDist = canvasProperties.width / 16;
    this.blowDist = canvasProperties.width / 1.6;
    this.friction = 0.96;
    
    // for speed/sizing
    this.maxStopSize = 0.4;
    this.slowThreshold = 0.6;
    
    this.isAlive = function(now) {
        return this.life && now - this.createdAt < this.life * 10;
    };
    
    this.createColour = function(colour) {
        if (typeof colour !== 'object') { 
            return "rgb(255, 0, 0)";
        }
        return "rgb(" + colour.r + "," + colour.g + "," + colour.b + ")";
    }
    
    this.checkCanvasBounds = function(nextX, nextY, nextVelX, nextVelY) {
        if (nextX > canvasProperties.width) {
            nextX = canvasProperties.width;
            nextVelX *= -1;
        }
        else if (nextX < 0) {
            nextX = 0;
            nextVelX *= -1;
        }

        if (nextY > canvasProperties.height) {
            nextY = canvasProperties.height;
            nextVelY *= -1;
        }
        else if (nextY < 0) {
            nextY = 0;
            nextVelY *= -1;
        }
        
        return {
            x: nextX,
            y: nextY,
            vX: nextVelX,
            vY: nextVelY
        }
    }
    
    this.update = function(ctx, dt) {
        var x  = this.x;
        var y  = this.y;
        var vX = this.vX;
        var vY = this.vY;

        var dX = x * 10;
        var dY = y * 10; 
        var length = Math.sqrt(dX * dX + dY * dY);
        var angle = Math.atan2(dY , dX);
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        vX *= this.friction;
        vY *= this.friction;

        var absVX = Math.abs(vX);
        var absVY = Math.abs(vY);
        var avgVel = (absVX + absVY) * .5;

        // speed up particles that are slow
        if (absVX < this.slowThreshold) {
            vX *= Math.random() * 2 + 0.2;
        }
        if (absVY < this.slowThreshold) {
            vY *= Math.random() * 2 + 0.2;
        }

        var scaledAvgVel = avgVel * .45;
        var drawRadius = Math.max(Math.min(scaledAvgVel , 9.5), this.maxStopSize);

        var nextX = x + vX;
        var nextY = y + vY;
        
        // keep the particle within the viewable canvas
        var attrs = this.checkCanvasBounds(nextX, nextY, vX, vY);
                
        this.vX = attrs.vX;
        this.vY = attrs.vY;
        this.x = attrs.x;
        this.y = attrs.y;

        ctx.fillStyle = this.createColour(this.colour);
        ctx.beginPath();
        ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();     
    }
}

//---------------------------------------------------------------------
var canvasProperties = {
    width: 0,
    height: 0
}

// emitters
// options { x, y, delay, numParticles, createFunc, modifierFunc }
var ParticleEmitter = function(caller, options) {
    this.caller = caller;
    this.options = options || {};
    this.x = options.x || Math.random() * 100;
    this.y = options.y || Math.random() * 100;
    this.delay = options.delay || Math.random() * 100;
    this.numParticles = options.numParticles || Math.random() * 200;
    this.createFunc = options.createFunc || function(){};
    this.modifier = options.modifierFunc || function(){};

    this.initialize.apply(this, arguments);
};

_.extend(ParticleEmitter.prototype, {
    intervalId: null,
    name: 'bob',

    initialize: function() {},
    
    start: function() {
        var self = this;
        this.intervalId = setInterval(function() { 
            self.createFunc.call(self.caller, self.x, self.y, self.numParticles, self.modifier);
        }, this.delay);
        return this;
    },
    
    stop: function() {
        clearInterval(this.intervalId);
    }
});

ParticleEmitter.extend = extend;

FireworksEmitter = ParticleEmitter.extend({
    initialize: function(options) {
        this.tailModifier = options.tailModifier || this.defaultTailModifier;
    },
    
    defaultTailModifier: function(particle) { 
        return { 
            xVel: Math.sin(particle.id) * 20, 
            yVel: Math.sin(particle.id) * 20, 
            life: particle.life *= 1.4
        };
    },

    start: function() {
        var self = this;
        this.firework();
        this.intervalId = setInterval(function() {
            self.firework();
        }, this.delay);
    },
    
    firework: function() {
        var self = this;
        var explosionDelay = Math.random() * 1250 + 1050;
        var explosionTail = this.createFunc.call(this.caller, this.x, this.y, this.numParticles, this.tailModifier); 
        var len = explosionTail.length;

        // create another blast after a delay
        var explosionInterval = setInterval(function() {
            // find the highest particle
            // todo: need a better way to do this since the max depends on the direction. better to switch over to vectors
            var minX = canvasProperties.width + 1;
            var minY = canvasProperties.height + 1;
            
            for (var i = 0; i < explosionTail.length/2; i++) {
                minX = Math.min(minX, explosionTail[i].x);
                minY = Math.min(minY, explosionTail[i].y);
            }
            
            var rand = Math.random() * 18 + 10;
            self.createFunc.call(self.caller, minX, minY, 300, function(p) {
                return { 
                    xVel: Math.cos(p.id) * rand,
                    yVel: Math.sin(p.id) * rand,
                    life: p.life *= .6,
                    colour: { r: Math.random() * 60 + 80, g: 0, b: Math.random() * 50 + 200 }
                };
            });
            self.createFunc.call(self.caller, minX, minY);
            clearInterval(explosionInterval);
        }, explosionDelay);
    }
});

// ----------------------------------------------
function ParticleApp(canvasId, options) {
    this.options = options || {};
    
    this.canvasId = canvasId;
    this.canvas = null;
    this.ctx = null;

    this.lastTime;
    this.isMouseDown = false;
    
    this.particles = {};
    
    this.initialize();
}

ParticleApp.prototype.initialize = function() {
    this.canvas = document.getElementById(this.canvasId);
    this.canvas.width = $(document).width();
    this.canvas.height = $(document).height();
    // set the global properties
    canvasProperties.width = this.canvas.width;
    canvasProperties.height = this.canvas.height;
    
    this.setHandlers();
    

    if (this.canvas.getContext) {
        this.ctx = this.canvas.getContext("2d");
        this.setup();
        var self = this;
        lastTime = (new Date()).getTime();
        setInterval(function() { self.update() } , 20);
    }
}

ParticleApp.prototype.setHandlers = function() {
    var self = this;
    document.onmouseup = function() { self.onMouseUp() };
}

ParticleApp.prototype.onMouseUp = function(e) {
    var ev = e ? e : window.event;
    var self = this;

    // determine the colour
    var colour = {};
    if (Math.floor(Math.random() * 60) % 2 == 0) {
        // solid colour!
        colour = { r: Math.random() * 100 + 40, g: 0, b: Math.random() * 90 + 150 }
    }
    else {
        // null so that it defaults to the random rainbow
        colour = undefined;
    }
    
    var rand = Math.random() * 12 + 5;
    var type = Math.floor(Math.random() * 20);
    var mod = null;
    if (type % 2 == 0) {
        // ring explosion
        mod = function(p) {
            return { 
                xVel: Math.cos(p.id) * rand * 2,
                yVel: Math.sin(p.id) * rand * 2,
                life: p.life *= .6,
                colour: colour
            };
        };
    }
    else {
        mod = function(p) {
            return { 
                colour: colour
            };
        };
    }

    self.createParticleSet(ev.clientX, ev.clientY, Math.random() * 900 + 10, mod);
    return false;
};

ParticleApp.prototype.setup = function() {
    var self = this;

    emitter = new ParticleEmitter(this, {
        x: 450, 
        y: 450, 
        delay: 80, 
        numParticles: 1,
        createFunc: this.createParticleSet, 
        modifierFunc: function(particle) { 
            return { xVel: 20, yVel: 30, life: particle.life * 2 }; 
        }
    }).start();
    
    fireworks = new FireworksEmitter(this, {
        x: this.canvas.width - 10, 
        y: this.canvas.height - 10, 
        delay: 3200, 
        numParticles: 350, 
        createFunc: this.createParticleSet
    }).start();	
}

ParticleApp.prototype.update = function() {
    var now = (new Date()).getTime();
    var dt = now - this.lastTime;
    this.lastTime = now;
    
    var numAgents = Object.keys(this.particles).length;
    var removeList = [];
    
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "rgba(8,8,12,.65)";
    this.ctx.fillRect(0, 0, this.canvas.width , this.canvas.height );
    this.ctx.globalCompositeOperation = "lighter";

    // update particles
    var self = this;
    Object.keys(this.particles).forEach(function(key) {
        var particle = self.particles[key];
        if (!particle.isAlive(now)) {
            removeList.push(particle.id);
        }
        else {
            particle.update(self.ctx, dt);
        }
    });
    
    this._removeDeadParticles(removeList);
}

ParticleApp.prototype._removeDeadParticles = function(dead) {
    // remove dead particles
    for (var i = 0; i < dead.length; i++) {
        delete this.particles[dead[i]];
    };
}

/* optional: numParticles, modifierFun */
ParticleApp.prototype.createParticleSet = function(x, y, numParticles, modifierFunc) {
    var modifier = modifierFunc;
    
    if (typeof numParticles === 'function') {
        modifier = numParticles;
        numParticles = null;
    }
    
    var particleSet = [];
    var num = numParticles || Math.random() * 200 + 50;
    for (var i = 0; i < num; i++) {
        var p = this.createParticle(x, y, modifier);
        particleSet.push(p);
    }
    return particleSet;
}

ParticleApp.prototype.createParticle = function(x, y, modifierFunc) {
    var m = new Particle();
    m.x  = x || this.canvas.width * .5;
    m.y  = y || this.canvas.height * .5;
    
    var attrs = { 
        xVel: undefined, 
        yVel: undefined,
        life: m.life
    };
    
    if (modifierFunc) {
        attrs = modifierFunc(m);
    }
    
    if (typeof attrs.xVel == 'undefined') attrs.xVel = Math.cos(m.id) * Math.random() * 20;
    if (typeof attrs.yVel == 'undefined') attrs.yVel = Math.sin(m.id) * Math.random() * 20;
    
    m.vX = attrs.xVel;
    m.vY = attrs.yVel;
    m.life = attrs.life || m.life;
    m.colour = attrs.colour || m.colour;
    
    this.particles[m.id] = m;
    return m;
}
