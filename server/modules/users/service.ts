import { UserRepository } from './repository';
import { DiceRepository } from '../dice/repository';
import { NotFoundError, ConflictError, BadRequestError, UnauthorizedError } from '../../shared/errors';
import type { CreateUserData, UpdateUserData, User, UserProfile, UpdateCurrencyData, LoginData } from './models';

export class UserService {
  constructor(
    private repository = new UserRepository(),
    private diceRepository = new DiceRepository()
  ) {}

  async findAll(): Promise<User[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.repository.findByUsername(username);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async login(data: LoginData): Promise<User> {
    // Find user with password hash
    const userWithPassword = await this.repository.findByUsernameWithPassword(
      data.username
    );

    if (!userWithPassword) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Validate password using same hashing method
    const expectedHash = await this.hashPassword(data.password);

    if (userWithPassword.password_hash !== expectedHash) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Return user without password_hash
    const { password_hash, ...user } = userWithPassword;
    return user;
  }

  async getUserProfile(id: string): Promise<UserProfile> {
    const user = await this.findById(id);
    const stats = await this.repository.getUserStats(id);

    return {
      ...user,
      stats,
    };
  }

  async create(data: CreateUserData): Promise<User> {
    // Check if username already exists
    const existingUsername = await this.repository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await this.repository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictError('Email already exists');
    }

    // Hash password (in production, use bcrypt or similar)
    // For now, we'll use a simple hash placeholder
    const password_hash = await this.hashPassword(data.password);

    const user = await this.repository.create({
      ...data,
      password_hash,
    });

    // Populate player's inventory with 5 dice of each type (common rarity)
    await this.giveStarterDice(user.id);

    return user;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    // Check if user exists
    await this.findById(id);

    // Check username uniqueness if updating username
    if (data.username) {
      const existing = await this.repository.findByUsername(data.username);
      if (existing && existing.id !== id) {
        throw new ConflictError('Username already exists');
      }
    }

    // Check email uniqueness if updating email
    if (data.email) {
      const existing = await this.repository.findByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new ConflictError('Email already exists');
      }
    }

    const updateData: any = { ...data };

    // Hash password if updating
    if (data.password) {
      updateData.password_hash = await this.hashPassword(data.password);
      delete updateData.password;
    }

    const user = await this.repository.update(id, updateData);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async updateCurrency(id: string, data: UpdateCurrencyData): Promise<User> {
    const user = await this.findById(id);

    let updatedUser: User | null;

    if (data.operation === 'add') {
      updatedUser = await this.repository.incrementCurrency(id, data.amount);
    } else if (data.operation === 'subtract') {
      // Check if user has enough currency
      if (user.currency < data.amount) {
        throw new BadRequestError('Insufficient currency');
      }
      updatedUser = await this.repository.decrementCurrency(id, data.amount);
    } else {
      // set
      if (data.amount < 0) {
        throw new BadRequestError('Currency cannot be negative');
      }
      updatedUser = await this.repository.updateCurrency(id, data.amount);
    }

    if (!updatedUser) {
      throw new NotFoundError('User');
    }

    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError('User');
    }
  }

  // Simple password hashing placeholder
  // In production, use bcrypt or argon2
  private async hashPassword(password: string): Promise<string> {
    // This is a placeholder - use proper hashing in production
    // For now, just prefix with 'hashed_' for demonstration
    return `hashed_${password}`;
  }

  // Give new players 5 dice (one random common per notation - d4, d6, d10, d12, d20)
  async giveStarterDice(playerId: string): Promise<void> {
    // Get all common (starter) dice types
    const starterDiceTypes = await this.diceRepository.findDiceTypesByRarity('common');

    // Group by notation, then pick a random one from each group
    const byNotation = new Map<string, typeof starterDiceTypes>();
    for (const diceType of starterDiceTypes) {
      const group = byNotation.get(diceType.dice_notation) ?? [];
      group.push(diceType);
      byNotation.set(diceType.dice_notation, group);
    }

    // Pick one random dice per notation
    const diceToAdd = Array.from(byNotation.entries()).map(([notation, group]) => {
      const randomDice = group[Math.floor(Math.random() * group.length)];
      return {
        dice_type_id: randomDice.id,
        dice_notation: notation,
        is_equipped: true,
      };
    });

    // Batch insert all starter dice at once
    await this.diceRepository.addMultiplePlayerDice(playerId, diceToAdd);
  }
}
