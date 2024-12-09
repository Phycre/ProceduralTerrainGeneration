//This is a placeholder. We should make a UI element to modify these values
export default class TreeOptions {
    constructor() {
        this.seed = 0;
        this.ornamentChance = 0.15;
        this.type = 'deciduous';

        // Bark parameters
        this.bark = {
        // The bark texture
        type: 'oak',

        // Tint of the tree trunk
        tint: 0xffffff,

        // Use face normals for shading instead of vertex normals
        flatShading: false,

        // Apply texture to bark
        textured: true,

        // Scale for the texture
        textureScale: { x: 1, y: 1 },
    };

    // Branch parameters
    this.branch = {
        // Number of branch recursion levels. 0 = trunk only
        levels: 3,
  
        // Angle of the child branches relative to the parent branch (degrees)
        angle: {
          1: 70,
          2: 60,
          3: 60,
        },
  
        // Number of children per branch level
        children: {
          0: 7,
          1: 7,
          2: 5,
        },
  
        // External force encouraging tree growth in a particular direction
        force: {
          direction: { x: 0, y: 1, z: 0 },
          strength: 0.07,
        },
  
        // Amount of curling/twisting at each branch level
        gnarliness: {
          0: 0.01,
          1: 0.1,
          2: 0.3,
          3: 0.4,
        },
  
        // Length of each branch level
        length: {
          0: 35,
          1: 30,
          2: 15,
          3: 3,
        },
  
        // Radius of each branch level
        radius: {
          0: 1.5,
          1: 1,
          2: 0.7,
          3: 0.7,
        },
  
        // Number of sections per branch level
        sections: {
          0: 12,
          1: 7,
          2: 4,
          3: 3,
        },
  
        // Number of radial segments per branch level
        segments: {
          0: 8,
          1: 6,
          2: 4,
          3: 3,
        },
  
        // Defines where child branches start forming on the parent branch
        start: {
          1: 0.6,
          2: 0.3,
          3: 0.3,
        },
  
        // Taper at each branch level
        taper: {
          0: 0.5,
          1: 0.4,
          2: 0.5,
          3: 0.5,
        },
  
        // Amount of twist at each branch level
        twist: {
          0: 0,
          1: 0,
          2: 0.2,
          3: 0.5,
        },
      };

      // Leaf parameters
    this.leaves = {
      // Leaf texture to use
      type: 'oak',

      // Whether to use single or double/perpendicular billboards
      billboard: 'double',

      // Angle of leaves relative to parent branch (degrees)
      angle: 10,

      // Number of leaves
      count: 1,

      // Where leaves start to grow on the length of the branch (0 to 1)
      start: 0,

      // Size of the leaves
      size: 2.5,

      // Variance in leaf size between each instance
      sizeVariance: 0.7,

      // Tint color for the leaves
      tint: 0xffffff,

      // Controls transparency of leaf texture
      alphaTest: 0.5,
    };
  
    }

   /**
   * Copies the values from source into this object
   * @param {TreeOptions} source 
   */
  copy(source, target = this) {
    for (let key in source) {
      if (source.hasOwnProperty(key) && target.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null) {
          this.copy(source[key], target[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}

    

