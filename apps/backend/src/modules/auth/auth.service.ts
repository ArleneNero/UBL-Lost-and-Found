import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, servicePosts } from "../../db/schema.js";
import { AuthFailure, AuthUser, TokenPayload } from "./auth.types.js";
import { jwtService, CreateTokenPayload } from "./jwt.service.js";
import { Me, STUDENT_EMAIL_DOMAIN } from "./auth.dto.js";
import {
  DUMMY_BCRYPT_HASH,
  extractStrictStudentNim,
  findDuplicateStudent,
  mapPgUniqueViolation,
  toStudentMe,
} from "./auth.helpers.js";
import {
  requestStudentRegisterOtp as requestStudentRegisterOtpFlow,
  RequestOtpResult,
} from "./auth-otp.service.js";
import {
  studentRegister as studentRegisterFlow,
  StudentRegisterResult,
} from "./auth-register.service.js";
import {
  requestPasswordReset as requestPasswordResetFlow,
  resetPassword as resetPasswordFlow,
} from "./auth-password-reset.service.js";

export class AuthService {
  createToken(payload: CreateTokenPayload, expiresInSeconds: number = 3600): string {
    return jwtService.createToken(payload, expiresInSeconds);
  }

  verifyToken(token: string): TokenPayload | null {
    return jwtService.verifyToken(token);
  }

  async getUserByAuthId(authUserId: string): Promise<AuthUser | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.authUserId, authUserId),
    });
    if (!user) return null;

    return {
      userId: user.userId,
      authUserId: user.authUserId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      studentNumber: user.studentNumber,
    };
  }

  async getOfficerPost(userId: string): Promise<{ postId: number; name: string } | null> {
    const post = await db.query.servicePosts.findFirst({
      where: eq(servicePosts.officerUserId, userId),
    });
    return post ? { postId: post.postId, name: post.name } : null;
  }

  async officerLogin(
    email: string,
    password: string
  ): Promise<
    | { success: true; data: { token: string; user: Me } }
    | { success: false; code: string; message: string }
  > {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user || user.role !== "OFFICER" || !user.passwordHash) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi petugas tidak valid",
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi petugas tidak valid",
      };
    }

    const post = await this.getOfficerPost(user.userId);
    const token = this.createToken({
      sub: user.authUserId,
      email: user.email,
      name: user.fullName,
    });

    return {
      success: true,
      data: {
        token,
        user: {
          user_id: user.userId,
          full_name: user.fullName,
          email: user.email,
          student_number: user.studentNumber,
          role: user.role,
          assigned_post_id: post?.postId ?? null,
          nim_verification_status: "NOT_VERIFIED",
        },
      },
    };
  }

  async bootstrapStudent(
    authUserId: string,
    email: string,
    fullName: string
  ): Promise<{ success: true; data: Me } | AuthFailure> {
    const nimResult = extractStrictStudentNim(email);
    if (!nimResult.valid) {
      return {
        success: false,
        code: nimResult.code,
        message: nimResult.message,
        statusCode: nimResult.statusCode,
      };
    }

    const { normalizedEmail, nim } = nimResult;
    const existing = await db.query.users.findFirst({
      where: eq(users.authUserId, authUserId),
    });

    if (existing) {
      if (existing.role !== "STUDENT") {
        return {
          success: false,
          code: "PROFILE_EXISTS",
          message: "Akun sudah memiliki profil terdaftar",
          statusCode: 403,
        };
      }
      return {
        success: false,
        code: "PROFILE_EXISTS",
        message: "Profil mahasiswa sudah terdaftar",
        statusCode: 409,
      };
    }

    const duplicate = await findDuplicateStudent(normalizedEmail, nim, authUserId);
    if (duplicate) return duplicate;

    try {
      const [created] = await db
        .insert(users)
        .values({
          authUserId,
          email: normalizedEmail,
          fullName: fullName.trim(),
          studentNumber: nim,
          role: "STUDENT",
        })
        .returning();

      return { success: true, data: toStudentMe(created) };
    } catch (err) {
      const uniqueErr = mapPgUniqueViolation(err);
      if (uniqueErr) return uniqueErr;
      throw err;
    }
  }

  async studentLogin(
    email: string,
    password: string
  ): Promise<{ success: true; data: { token: string; user: Me } } | AuthFailure> {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail.endsWith(STUDENT_EMAIL_DOMAIN)) {
      return {
        success: false,
        code: "INVALID_STUDENT_DOMAIN",
        message:
          "Hanya email resmi mahasiswa (@student.budiluhur.ac.id) yang diizinkan untuk akun mahasiswa",
        statusCode: 403,
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user || user.role !== "STUDENT" || !user.passwordHash) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi mahasiswa tidak valid",
        statusCode: 401,
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email atau kata sandi mahasiswa tidak valid",
        statusCode: 401,
      };
    }

    const token = this.createToken({
      sub: user.authUserId,
      email: user.email,
      name: user.fullName,
    });

    return {
      success: true,
      data: { token, user: toStudentMe(user) },
    };
  }

  async requestStudentRegisterOtp(
    fullName: string,
    email: string,
    password: string
  ): Promise<RequestOtpResult> {
    return requestStudentRegisterOtpFlow(fullName, email, password);
  }

  async studentRegister(
    fullName: string,
    email: string,
    password: string,
    otp: string,
    challengeToken: string
  ): Promise<StudentRegisterResult> {
    return studentRegisterFlow(fullName, email, password, otp, challengeToken);
  }

  async requestPasswordReset(
    email: string,
    originUrl?: string
  ): Promise<{ success: boolean; message: string }> {
    return requestPasswordResetFlow(email, originUrl);
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; code?: string; statusCode?: number }> {
    return resetPasswordFlow(token, newPassword);
  }
}

export const authService = new AuthService();
