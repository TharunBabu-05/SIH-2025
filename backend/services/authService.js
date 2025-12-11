import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// TODO: Move to database in production
const users = [
  {
    id: 1,
    username: 'assistant_engineer',
    password: '$2a$10$SvXh/Q5P4AXVAihpKyf7sOnpeOVJy67yDs0mhRiKKQjIvPPIIQsR.', // '123'
    role: 'assistant_engineer',
    name: 'Assistant Engineer'
  },
  {
    id: 2,
    username: 'junior_engineer',
    password: '$2a$10$SvXh/Q5P4AXVAihpKyf7sOnpeOVJy67yDs0mhRiKKQjIvPPIIQsR.', // '123'
    role: 'junior_engineer',
    name: 'Junior Engineer'
  },
  {
    id: 3,
    username: 'section_officer',
    password: '$2a$10$SvXh/Q5P4AXVAihpKyf7sOnpeOVJy67yDs0mhRiKKQjIvPPIIQsR.', // '123'
    role: 'section_officer',
    name: 'Section Officer'
  },
  {
    id: 4,
    username: 'lineman',
    password: '$2a$10$SvXh/Q5P4AXVAihpKyf7sOnpeOVJy67yDs0mhRiKKQjIvPPIIQsR.', // '123'
    role: 'lineman',
    name: 'Line Man'
  }
];

class AuthService {
  /**
   * Hash password
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Authenticate user
   */
  static async authenticate(username, password) {
    console.log('Backend: Authenticating user:', username);
    console.log('Backend: Password received:', password);
    
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.log('Backend: User not found:', username);
      throw new Error('User not found');
    }
    
    console.log('Backend: User found:', user.username);
    console.log('Backend: Stored hash:', user.password);

    const isValid = await this.verifyPassword(password, user.password);
    console.log('Backend: Password validation result:', isValid);
    
    if (!isValid) {
      console.log('Backend: Invalid password for user:', username);
      throw new Error('Invalid password');
    }

    const token = this.generateToken(user);
    
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    };
  }

  /**
   * Get user by ID
   */
  static getUserById(id) {
    return users.find(u => u.id === id);
  }
}

export default AuthService;
