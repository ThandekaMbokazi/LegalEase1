
import { DocumentData, DraftData } from '../types';

export class SecureStorage {
  private static VAULT_PREFIX = 'govguide_vault_v2_';
  private static DRAFT_PREFIX = 'govguide_drafts_v1_';
  private static KEY_ALGO = 'AES-GCM';
  private static KEY_LENGTH = 256;
  private static SALT = 'govguide-v3-e2ee-salt-production';

  private encryptionKey: CryptoKey | null = null;
  private currentUserId: string | null = null;

  constructor() {}

  private getVaultKey(): string {
    if (!this.currentUserId) throw new Error("User context not set.");
    return `${SecureStorage.VAULT_PREFIX}${this.currentUserId}`;
  }

  private getDraftKey(): string {
    if (!this.currentUserId) throw new Error("User context not set.");
    return `${SecureStorage.DRAFT_PREFIX}${this.currentUserId}`;
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  async initializeVault(userId: string, passphrase: string): Promise<boolean> {
    try {
      this.currentUserId = userId;
      const encoder = new TextEncoder();
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      this.encryptionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode(SecureStorage.SALT),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: SecureStorage.KEY_ALGO, length: SecureStorage.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
      return true;
    } catch (e) {
      console.error("Vault initialization failed:", e);
      return false;
    }
  }

  private async encryptAndSave(key: string, data: any): Promise<void> {
    if (!this.encryptionKey) throw new Error("Vault not initialized");
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: SecureStorage.KEY_ALGO, iv },
      this.encryptionKey!,
      encodedData
    );

    const vaultBlob = {
      iv: this.uint8ArrayToBase64(iv),
      data: this.uint8ArrayToBase64(new Uint8Array(encryptedContent))
    };

    localStorage.setItem(key, JSON.stringify(vaultBlob));
  }

  private async decryptAndLoad(key: string): Promise<any> {
    if (!this.encryptionKey) throw new Error("Vault not initialized");
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const { iv, data } = JSON.parse(stored);
    const ivBuffer = this.base64ToUint8Array(iv);
    const dataBuffer = this.base64ToUint8Array(data);

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: SecureStorage.KEY_ALGO, iv: ivBuffer },
      this.encryptionKey!,
      dataBuffer
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedContent));
  }

  async saveHistory(data: DocumentData[]): Promise<void> {
    await this.encryptAndSave(this.getVaultKey(), data);
  }

  async loadHistory(): Promise<DocumentData[]> {
    return (await this.decryptAndLoad(this.getVaultKey())) || [];
  }

  async saveDrafts(data: DraftData[]): Promise<void> {
    await this.encryptAndSave(this.getDraftKey(), data);
  }

  async loadDrafts(): Promise<DraftData[]> {
    return (await this.decryptAndLoad(this.getDraftKey())) || [];
  }

  async clearVault(): Promise<void> {
    this.encryptionKey = null;
    this.currentUserId = null;
  }
}
