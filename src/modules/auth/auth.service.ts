import jwt from 'jsonwebtoken';
import { User, IUser } from './user.model';
import { env } from '../../config/environment';
import { ConflictError, UnauthorizedError } from '../../utils/customErrors';

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  public static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRE as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRE as any,
    });

    return { accessToken, refreshToken };
  }

  public static async register(name: string, email: string, passwordHash: string): Promise<AuthResponse> {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('Email address is already in use');
    }

    // Creating user triggers the Mongoose pre-save hook to encrypt password
    const user = new User({
      name,
      email,
      passwordHash, // This will be hashed on save
    });

    await user.save();

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  public static async login(email: string, passwordHash: string): Promise<AuthResponse> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await user.comparePassword(passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  public static async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      return this.generateTokens(user);
    } catch (err: any) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }
}
