export class UserResponseDto {
    id: number;
    name: string | null;
    email: string;
    emailVerifiedAt: Date | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }
  