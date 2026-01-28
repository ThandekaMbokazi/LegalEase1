
import { User } from '../types';

export class AuthService {
  private static STORAGE_KEY = 'govguide_identity_store';

  private async hash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getUsers(): User[] {
    const stored = localStorage.getItem(AuthService.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private saveUsers(users: User[]) {
    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(users));
  }

  async signUp(email: string, displayName: string, password: string, question: string, answer: string): Promise<User> {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) {
      throw new Error("User already exists with this email.");
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      displayName,
      passwordHash: await this.hash(password),
      securityQuestion: question,
      securityAnswerHash: await this.hash(answer.toLowerCase().trim())
    };

    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  }

  async login(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    const user = users.find(u => u.email === email);
    const passHash = await this.hash(password);

    if (!user || user.passwordHash !== passHash) {
      throw new Error("Invalid email or password.");
    }

    return user;
  }

  async updateUser(userId: string, updates: { email: string; displayName: string; securityQuestion: string }, newPassword?: string, newAnswer?: string): Promise<User> {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("User not found.");

    // Check if email already taken by someone else
    const emailConflict = users.find(u => u.email === updates.email && u.id !== userId);
    if (emailConflict) throw new Error("Email is already in use by another account.");

    const updatedUser = { ...users[index], ...updates };
    
    if (newPassword && newPassword.trim().length >= 6) {
      updatedUser.passwordHash = await this.hash(newPassword);
    }
    
    if (newAnswer && newAnswer.trim()) {
      updatedUser.securityAnswerHash = await this.hash(newAnswer.toLowerCase().trim());
    }

    users[index] = updatedUser;
    this.saveUsers(users);
    return updatedUser;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(u => u.email === email) || null;
  }

  async recover(email: string, answer: string, newPassword: string): Promise<void> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.email === email);
    if (userIndex === -1) throw new Error("User not found.");

    const answerHash = await this.hash(answer.toLowerCase().trim());
    if (users[userIndex].securityAnswerHash !== answerHash) {
      throw new Error("Incorrect answer to the security question.");
    }

    users[userIndex].passwordHash = await this.hash(newPassword);
    this.saveUsers(users);
  }
}
