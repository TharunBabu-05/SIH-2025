import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// TODO: Move to database in production
const users = [
  {
    id: 1,
    username: 'engineer',
    password: '$2a$10$.qhMnPo5gXHSlIgOdYVYKuqOD5mnAbM2SpgnR54NTFN59WdmMcdV.', // 'engineer123'
    role: 'engineer',
    name: 'Senior Engineer'
  },
  {
    id: 2,
    username: 'worker',
    password: '$2a$10$EcC/ja7IqVzTVyov5tNisOWb7F3632RkwJnX/QBNs5YyBDkJKwaxe', // 'worker123'
    role: 'worker',
    name: 'Field Worker'
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
    const user = users.find(u => u.username === username);
    
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.verifyPassword(password, user.password);
    
    if (!isValid) {
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
