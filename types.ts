
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CREATOR = 'CREATOR',
  APPROVER = 'APPROVER',
  OBSERVER = 'OBSERVER',
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum AssetStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
}

export enum SocialRatio {
  ORIGINAL = 'ORIGINAL',
  TIKTOK_9_16 = 'TIKTOK_9_16',
  INSTA_1_1 = 'INSTA_1_1',
  PORTRAIT_4_5 = 'PORTRAIT_4_5',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
}

export interface Drawing {
  type: 'pen' | 'box';
  points?: {x: number, y: number}[]; // For pen, normalized 0-100
  rect?: { x: number, y: number, w: number, h: number }; // For box, normalized 0-100
  color: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
  resolved: boolean;
  x?: number; // Percentage 0-100 (Pin location)
  y?: number; // Percentage 0-100 (Pin location)
  videoTimestamp?: number; // Seconds
  drawing?: Drawing;
  replies?: Comment[]; // Nested replies
  isInternal?: boolean; // New: For private team comments
}

export interface AssetVersion {
  id: string;
  versionNumber: number;
  url: string; // Image URL or Video URL
  createdAt: number;
  comments: Comment[];
}

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  status: AssetStatus;
  versions: AssetVersion[]; // Stack of versions
  thumbnail: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  assets: Asset[];
}
